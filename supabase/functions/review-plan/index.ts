// supabase/functions/review-plan/index.ts
//
// WP8 — P3b Plan Consistency Reviewer (Phase 1: standalone reviewer engine).
// Design: admin/wp8-p3b-plan-consistency-design-2026-05-31.md.
//
// Reads a report's activation_plan (the full P3 output) + Q6, runs the five hard
// consistency checks via one frontier LLM call (strict json_schema, temperature 0),
// and RETURNS a verdict + problem list + regeneration_instruction. It is a PURE
// reviewer: read-only, no DB writes, no flag. The regeneration loop + quality_failure
// event logging + fallback live in generate-plan (Phase 2 wiring), which gates the
// kickoff behind WP8_PLAN_REVIEW_ENABLED. verify_jwt:false so generate-plan's
// server-side background task can call it without a gateway token (the lesson from
// the regen-kickoff 401).
//
// The five checks (see design §"P3b checklist"):
//   1. established_contact      — outreach drafts reference only contact types prior tasks established
//   2. phase_sequencing         — each phase achievable from prior phases' outputs
//   3. q6_war_story             — Q6 achievement present in Phase 1 + referenced at the first hook moment
//   4. first_move_recipient_match — first_move.move draft matches first_move.action's stated recipient type
//   5. day_count                — exactly 30 days (computed in code, handed to the model as ground truth)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { complete } from "./llm_client.ts";

const FUNCTION_VERSION = "wp8-p3b-reviewer-v2-prompt-runs-logging";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const P3B_PROMPT_HASH = "PENDING_PRECOMMIT_HOOK"; // prompts/prompt-3b-plan-consistency-reviewer.md

const P3B_SYSTEM_PROMPT = `You are P3b — the Solo Plan Consistency Reviewer. You are given a generated 30-day activation plan and the user's Q6 career achievement. Your only job is to find INTERNAL logical inconsistencies before the user sees the plan. You do not rewrite, you do not improve, you do not comment on quality or tone. You audit for self-consistency against five hard checks.

Run exactly these five checks:

1. established_contact — Every outreach draft (in first_move.move, in task.move drafts, and in network_toolkit templates) may only reference a contact TYPE that an earlier task in the plan has already told the user to identify, list, or establish. A draft addressed to "your former VP of Sales" is a FAIL if no prior task said to list warm senior contacts. severity: blocking.

2. phase_sequencing — Each phase's tasks must be achievable using only what prior phases produced. A Phase 2 task that assumes a Phase 1 output the plan never specified is a FAIL. severity: blocking.

3. q6_war_story — The user's Q6 achievement must actually appear as raw material in Phase 1, and the plan's first hook moment (first_move and/or the earliest content/outreach task) must reference it. If Q6 is absent from Phase 1 or never used, FAIL. severity: blocking.

4. first_move_recipient_match — first_move.move's draft/format must match the recipient type stated in first_move.action. If action says "email a former colleague" but the move is a cold platform message (or a draft to a stranger), FAIL. severity: blocking.

5. day_count — The plan must cover exactly 30 days. You are given computed_day_count (counted in code from the plan's phases). If computed_day_count is not 30, FAIL. severity: blocking.

Rules:
- Report a problem ONLY when you can point to a specific location (e.g. "phase 2, task t_2_3", "first_move.move.draft", "network_toolkit.templates[1]").
- verdict is "fail" if and only if there is at least one problem with severity "blocking". Otherwise "pass".
- If verdict is "pass", problems is an empty array and regeneration_instruction is null.
- If verdict is "fail", regeneration_instruction is a single concrete paragraph telling the P3 generator exactly what to change on the next attempt (name the checks that failed and the fix), so a regeneration can target the specific breaks.
- Be precise and conservative: do not invent problems. A plan that genuinely passes all five checks must return "pass".

Return ONLY a single valid JSON object matching the schema. No preamble, no markdown.`;

const P3B_SCHEMA = {
  name: "p3b_consistency_review",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "problems", "regeneration_instruction"],
    properties: {
      verdict: { type: "string", enum: ["pass", "fail"] },
      problems: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["check", "severity", "detail", "location"],
          properties: {
            check: {
              type: "string",
              enum: [
                "established_contact",
                "phase_sequencing",
                "q6_war_story",
                "first_move_recipient_match",
                "day_count",
              ],
            },
            severity: { type: "string", enum: ["blocking", "advisory"] },
            detail: { type: "string" },
            location: { type: "string" },
          },
        },
      },
      regeneration_instruction: { type: ["string", "null"] },
    },
  },
} as const;

/** Count distinct day numbers across all phases' days_detail entries. */
function countPlanDays(innerPlan: any): number {
  const days = new Set<number>();
  const phases = Array.isArray(innerPlan?.phases) ? innerPlan.phases : [];
  for (const ph of phases) {
    const dd = Array.isArray(ph?.days_detail) ? ph.days_detail : [];
    for (const d of dd) {
      const m = String(d?.day ?? "").match(/\d+/);
      if (m) days.add(parseInt(m[0], 10));
    }
  }
  return days.size;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const reportId: string | undefined = body.reportId ?? body.report_id;
    if (!reportId) {
      return new Response(JSON.stringify({ error: "reportId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: report, error: loadErr } = await supabase
      .from("reports")
      .select("id, answers, activation_plan")
      .eq("id", reportId)
      .single();
    if (loadErr || !report) {
      return new Response(
        JSON.stringify({ error: `report not found: ${loadErr?.message ?? "unknown"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const plan = report.activation_plan as Record<string, any> | null;
    if (!plan || !plan.activation_plan) {
      return new Response(
        JSON.stringify({ error: "report has no populated activation_plan to review", version: FUNCTION_VERSION }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const answers = (report.answers as Record<string, string>) ?? {};
    const q6 = answers["6"] ?? "";
    const innerPlan = plan.activation_plan;
    const computedDayCount = countPlanDays(innerPlan);

    const reviewerInput = {
      q6_achievement: q6,
      computed_day_count: computedDayCount,
      first_move: plan.first_move ?? null,
      phases: innerPlan.phases ?? [],
      network_templates: plan.network_toolkit?.templates ?? [],
    };

    const t0 = Date.now();
    const result = await complete({
      prompt_id: "P3b-plan-consistency-reviewer",
      system_prompt: P3B_SYSTEM_PROMPT,
      user_payload: reviewerInput,
      api_key: openaiKey,
      response_schema: P3B_SCHEMA,
      temperature: 0,
      max_tokens: 1500,
      prompt_version_hash: P3B_PROMPT_HASH,
      // WP5: route cost/usage logging to public.prompt_runs.
      supabase,
      function_name: "review-plan",
      report_id: reportId,
    });

    const parsed = (result.parsed as {
      verdict?: string;
      problems?: unknown[];
      regeneration_instruction?: string | null;
    } | null) ?? null;

    if (!parsed || (parsed.verdict !== "pass" && parsed.verdict !== "fail")) {
      return new Response(
        JSON.stringify({
          error: "reviewer returned unparseable verdict",
          raw: result.raw.slice(0, 300),
          version: FUNCTION_VERSION,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const problems = Array.isArray(parsed.problems) ? parsed.problems : [];
    const blockingCount = problems.filter((p) => (p as { severity?: string })?.severity === "blocking").length;

    return new Response(
      JSON.stringify({
        reportId,
        verdict: parsed.verdict,
        blocking_count: blockingCount,
        problems,
        regeneration_instruction: parsed.regeneration_instruction ?? null,
        computed_day_count: computedDayCount,
        cost_estimate_gbp: result.cost_estimate_gbp,
        duration_ms: Date.now() - t0,
        version: FUNCTION_VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message ?? e), version: FUNCTION_VERSION }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
