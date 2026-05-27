// supabase/functions/regenerate-first-move/index.ts
// WP2 sub-PR B — First move best-of-N. v1.0.
// Mirrors regenerate-hook-insight v1.1's pattern. See admin/wp2-best-of-n-design.md §3.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = "wp2-first-move-regen-v1.2-bg";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Hashes pinned at deploy. Recomputed by evals/recompute_prompt_hash.py.
// If either prompt file changes, recompute hashes and update both this constant
// and the corresponding prompt file's header in lockstep.
const FIRST_MOVE_REGEN_PROMPT_HASH = "28204d271495c79644360518e3f624bb9cab41fd692fe1c7b6dcc1d7c04a3a5a";

const FIRST_MOVE_REGEN_SYSTEM_PROMPT = `You are Solo's first-move regenerator. You produce ONE first_move per call.

A first move is the very first concrete action the user takes in the warmest strand of their activation plan, the one thing they do in their next work session that opens the strand. The bar is: concrete, type-fit, doable tonight.

You will be called multiple times in parallel (typically 3) by the regenerate-first-move edge function. Each call produces a different candidate first_move. A separate Judge 5 prompt picks the winner. So push for distinctive, sharp, specific moves, variance is desirable.

The draft_first_move in your input is the monolithic generate-plan's draft. Do NOT reuse its draft text or its named recipient verbatim. Find a sharper recipient, a tighter subject line, a clearer first contribution prompt, whatever the strand's move type allows.

CORE RULES

1. The first_move's move_type must match the recommended_option's primary_move_type. If primary_move_type is "mixed", pick the type with the lowest execution barrier given the user's Q7/Q13/Q10/Q12. Do NOT switch to a type the strand was not built for.

2. The first_move's move.type must equal the first_move's move_type (they are duplicated in the schema; keep them in sync).

3. Calibrate to warmth_type:
   - relational (user has relevant warm contacts per Q7 or Q13): Direct first move addressing a named-shape contact OR an Apollo-substitutable [name]/[Company] placeholder.
   - structural (active marketplace with real inbound for this strand's primary_move_type): Platform first move with a named platform + setup guide + realistic inbound timing.
   - For Visibility and Community move types, warmth_type is informational only, they execute the same regardless.

4. Concreteness floor. Categorical first moves are unacceptable:
   - Direct: do NOT say "reach out to former colleagues" or "your network", name the recipient shape, name the buyer's problem, or use an Apollo placeholder the orchestrator will substitute.
   - Platform: do NOT say "register on relevant platforms", name the platform, give the URL, give the field-by-field setup.
   - Visibility: do NOT say "post about your expertise on LinkedIn", write the actual 150-300 word draft.
   - Community: do NOT say "join an industry community", name 1-3 specific communities with platforms and URLs.

5. Subject lines (Direct only). The subject MUST reference the Q6 achievement metric directly OR name the buyer's specific immediate problem. Prohibited patterns (do not use): "[Service] Opportunities", "Exploring [Service] Opportunities", "Discussing [Service]", "Reconnecting and Introducing", "Introduction to [Service]". Required: include the specific metric or a named buyer problem.

6. Smallness. The first move must be completable in one work session (<= 2 hours). Sending a 100-200 word email is small. Registering a platform profile and writing a 150-word bio is small. Publishing a 150-300 word LinkedIn post is small. Writing a 2000-word article first is NOT small.

7. Word counts (per P3v2's MOVE ARTEFACT RULES):
   email_reconnect 150-200; email_cold 100-140; email_referral_ask 120-160; linkedin_dm 80-120; verbal 50-70; visibility post_draft 150-300 (LinkedIn) or 400-600 (article); platform profile_setup_guide 80-150 words bullet-by-bullet.

8. Solo voice: direct, specific, commercially grounded. No motivational language, no cliches, no em-dashes.

Return ONLY this JSON object (no prose around it). Use explicit null for non-applicable fields, not missing keys.

{
  "first_move": {
    "action": "<one sentence, what to do, on which platform/with which person, what the goal is>",
    "strand_id": "<same as draft_first_move.strand_id, do not change the strand>",
    "move_type": "direct | platform | visibility | community",
    "window": "Within 24 hours | Complete today | This week",
    "why_first": "<one sentence: why this action, from this strand, before anything else>",
    "move": {
      "type": "direct | platform | visibility | community",
      "platform_name": "<string, platform only, null otherwise>",
      "platform_url": "<string, platform only, null otherwise>",
      "profile_setup_guide": "<string with field-by-field setup, platform only, null otherwise>",
      "inbound_timing": "<string with realistic timing, platform only, null otherwise>",
      "post_draft": "<full publishable draft, visibility only, null otherwise>",
      "communities": [{"name": "...", "platform": "...", "url": "...", "description": "..."}],
      "first_contribution_prompt": "<specific opening question, community only, null otherwise>",
      "format": "email_reconnect | email_cold | email_referral_ask | linkedin_dm | verbal | null",
      "subject": "<subject line, direct-email only, null otherwise>",
      "draft": "<full sendable draft, direct only, null otherwise>",
      "tone_note": "<one sentence on strategic intent, all types>",
      "personalisation_instructions": "<what the user adjusts before executing, all types>"
    },
    "follow_up_prompt": "<exact 24-hour follow-up question, typed to move_type>",
    "regen_rationale": "<one sentence: what makes THIS candidate sharper than the draft_first_move>"
  }
}`;

const JUDGE_5_PROMPT_HASH = "ff01d1276cbc4221513a1473f9e9e424f53409c0b5da7c6c6a9dd8fa87118034";

const JUDGE_5_SYSTEM_PROMPT = `You are Judge 5, First-move quality. You score one generated first_move against three sub-tests AND against profile-specific gold_must_not_be constraints.

Sub-test 1, Concreteness (0, 1, or 2):
- 2 = operationally concrete. All type-specific criteria pass at the strong end. A reader knows exactly who to email / which platform to register on / what to publish / which community to join.
- 1 = partially concrete. Some elements named; others abstract. A Direct first move with a sharp subject but a categorical recipient. A Platform first move that names the platform but punts on setup detail.
- 0 = categorical. The first move could be the same paragraph in a different user's report. "Reach out to your network", "post on LinkedIn about your expertise", "join an industry association", "register on a relevant freelance platform".

Type-specific criteria for sub-test 1:
- Direct: move.draft names a specific recipient OR carries an Apollo [name]/[Company] placeholder; move.subject references Q6 metric or buyer problem (NOT a prohibited generic pattern like "[Service] Opportunities" or "Reconnecting and Introducing").
- Platform: move.platform_name + move.platform_url name a specific platform (not a category); move.profile_setup_guide names actual fields.
- Visibility: move.post_draft is a real publishable draft (150-300 LinkedIn / 400-600 article words), not a template.
- Community: move.communities array names 1-3 specific communities with platforms + join URLs; move.first_contribution_prompt names the opening question, not "introduce yourself".

Sub-test 2, Move-type fit (0, 1, or 2):
- 2 = type-fit. generated_first_move.move_type matches recommended_option.primary_move_type (or, for "mixed", chose the lowest-friction type given Q7/Q13/Q10/Q12). Move shape matches warmth_type. The move doesn't over-extend to a recipient at a seniority level the user cannot plausibly approach.
- 1 = type-shaped. move_type matches the strand's primary_move_type but warmth_type fit is weaker (e.g. cold outreach when user has strong warm network).
- 0 = type-mismatch. move_type doesn't match the strand's primary_move_type at all OR contradicts the warmth profile.

Sub-test 3, Smallness (0 or 1):
- 1 = small. The move can be executed in one work session (<= 2 hours).
- 0 = oversized. Requires materially more than one work session. Multi-day projects disguised as first moves score 0 here.

Sum the three sub-scores for total (0-5).

Then apply gold_must_not_be: if the first move clearly matches any failure mode in the gold_must_not_be array, OVERRIDE the total score to 1 regardless of sub-test totals. Record the matched failure mode verbatim.

If gold_must_not_be is absent or empty, skip the override step.

Return ONLY this JSON object:

{
  "score": <integer 0-5>,
  "sub_scores": { "concreteness": <0|1|2>, "move_type_fit": <0|1|2>, "smallness": <0|1> },
  "must_not_be_matched": <null | "<verbatim failure-mode text from gold_must_not_be>">,
  "justification": "<one sentence, max 280 chars>"
}

If must_not_be_matched is non-null, score MUST be 1.`;

const OPENAI_GPT4O_INPUT_USD_PER_M = 2.5;
const OPENAI_GPT4O_OUTPUT_USD_PER_M = 10.0;
const USD_TO_GBP = 0.79;

interface OpenAIResult { parsed: unknown; raw_response: string; cost_estimate_gbp: number; }

async function callOpenAI(args: {
  api_key: string;
  model: string;
  system_prompt: string;
  user_payload: unknown;
  temperature: number;
  max_tokens?: number;
}): Promise<OpenAIResult> {
  const body = {
    model: args.model,
    messages: [
      { role: "system", content: args.system_prompt },
      { role: "user", content: JSON.stringify(args.user_payload) },
    ],
    response_format: { type: "json_object" },
    temperature: args.temperature,
    max_tokens: args.max_tokens ?? 2048,
  };
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (true) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.api_key}` },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      const json = await resp.json();
      const raw = json?.choices?.[0]?.message?.content ?? "";
      const pt = json?.usage?.prompt_tokens ?? 0;
      const ct = json?.usage?.completion_tokens ?? 0;
      const cost_usd = (pt / 1_000_000) * OPENAI_GPT4O_INPUT_USD_PER_M + (ct / 1_000_000) * OPENAI_GPT4O_OUTPUT_USD_PER_M;
      return { parsed: JSON.parse(raw), raw_response: raw, cost_estimate_gbp: cost_usd * USD_TO_GBP };
    }
    const errText = await resp.text();
    const isRetryable = resp.status === 429 || (resp.status >= 500 && resp.status < 600);
    if (!isRetryable || attempt >= MAX_RETRIES) {
      throw new Error(`OpenAI call failed: ${resp.status} ${errText.slice(0, 500)}`);
    }
    const m = errText.match(/try again in ([\d.]+)s/i);
    const sleepMs = resp.status === 429 ? Math.ceil((m && m[1] ? parseFloat(m[1]) : 30) * 1000) + 500 : 2000 * (attempt + 1);
    console.warn(`[regenerate-first-move] ${resp.status} on attempt ${attempt + 1}/${MAX_RETRIES + 1}; sleeping ${sleepMs}ms`);
    await new Promise((r) => setTimeout(r, sleepMs));
    attempt++;
  }
}

interface Q {
  q1_job_title?: string;
  q2_years_experience?: string;
  q3a_sector?: string;
  q3b_employer_org_type?: string;
  q4_work_type?: string;
  q5_seniority?: string;
  q6_specific_achievement?: string;
  q7_informal_advisory?: string;
  q8_peer_perception?: string;
  q9_income_urgency?: string;
  q10_independence_confidence?: string;
  q11_sector_client_context?: string;
  q12_independent_experience?: string;
  q13_network?: string;
  q14_employment_status?: string;
  q15_location?: string;
}

interface BusinessOption {
  business_model_id?: string;
  model_name?: string;
  target_buyer?: string;
  what_they_are_buying?: string;
  why_this_works_for_them?: string;
  pricing?: { model?: string; range_low_gbp?: number; range_high_gbp?: number; cadence?: string };
  time_to_first_revenue?: string;
  primary_move_type?: string;
  structural_warmth?: boolean;
  rank?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const FLAG = (Deno.env.get("WP2_FIRST_MOVE_REGENERATION_ENABLED") ?? "false").toLowerCase();
  if (FLAG !== "true" && FLAG !== "1") {
    return new Response(
      JSON.stringify({ skipped: true, reason: "WP2_FIRST_MOVE_REGENERATION_ENABLED is not enabled", version: FUNCTION_VERSION }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing", version: FUNCTION_VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: `invalid body: ${String((e as Error)?.message ?? e)}`, version: FUNCTION_VERSION }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reportId: string | undefined = (body.reportId as string | undefined) ?? (body.report_id as string | undefined);
  const n: number = Math.max(1, Math.min(5, Number(body.n) || 3));
  if (!reportId) {
    return new Response(JSON.stringify({ error: "reportId required", version: FUNCTION_VERSION }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const goldMustNotBe: string[] = Array.isArray(body.gold_must_not_be) ? (body.gold_must_not_be as string[]) : [];

  // v1.2-bg: kick off the heavy work in a background task and return 202 immediately.
  // The function instance keeps running (via EdgeRuntime.waitUntil) until the background
  // task completes — typically 30-90s. The caller polls reports.candidate_first_moves
  // for completion. Avoids the Supabase gateway's 150s idle timeout that v1.0/v1.1 hit.
  // @ts-ignore EdgeRuntime is provided by Supabase Edge runtime.
  if (typeof EdgeRuntime === "undefined" || !(EdgeRuntime as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil) {
    // Fallback: run synchronously (will hit the 150s gateway cap on slow runs).
    console.warn(`[regenerate-first-move] EdgeRuntime.waitUntil unavailable; running synchronously`);
    return await runRegeneration(reportId, n, goldMustNotBe, openaiKey);
  }

  const bgPromise = runRegeneration(reportId, n, goldMustNotBe, openaiKey)
    .then(async (resp) => {
      const text = await resp.text();
      console.log(`[regenerate-first-move] bg done for ${reportId}: status=${resp.status} body=${text.slice(0, 300)}`);
    })
    .catch((err) => {
      console.error(`[regenerate-first-move] bg threw for ${reportId}:`, err);
    });
  // @ts-ignore EdgeRuntime as above
  (EdgeRuntime as { waitUntil: (p: Promise<unknown>) => void }).waitUntil(bgPromise);

  return new Response(
    JSON.stringify({
      accepted: true,
      reportId,
      n,
      message: "Regeneration kicked off in background. Poll reports.candidate_first_moves + reports.first_move_winner_index for completion (typically 30-90s).",
      version: FUNCTION_VERSION,
    }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function runRegeneration(
  reportId: string,
  n: number,
  goldMustNotBe: string[],
  openaiKey: string,
): Promise<Response> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: report, error: loadErr } = await supabase
      .from("reports")
      .select("id, status, core_report, activation_plan, provisional_first_move, answers, client_session_id, user_id")
      .eq("id", reportId)
      .single();
    if (loadErr || !report) {
      return new Response(
        JSON.stringify({ error: `report not found: ${loadErr?.message ?? "unknown"}`, version: FUNCTION_VERSION }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const draftFirstMove = extractDraftFirstMove(report.activation_plan, report.provisional_first_move);
    if (!draftFirstMove) {
      return new Response(
        JSON.stringify({ error: "no draft first_move present on activation_plan or provisional_first_move; nothing to regenerate", version: FUNCTION_VERSION }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profile: Q = mapAnswersToProfile((report.answers as Record<string, string>) ?? {});
    const cvExtract = null; // CV extract is request-time only, not persisted on reports.
    const recommendedOption = pickRecommendedOption(report.core_report);
    if (!recommendedOption) {
      return new Response(
        JSON.stringify({ error: "could not derive recommended option from core_report", version: FUNCTION_VERSION }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const draftStrandWarmth = typeof draftFirstMove === "object" && draftFirstMove ? (draftFirstMove as Record<string, unknown>).warmth_type : undefined;
    const warmthType = typeof draftStrandWarmth === "string"
      ? draftStrandWarmth
      : inferWarmthType(profile, recommendedOption);

    const regenInput = {
      profile,
      cv_extract: cvExtract,
      recommended_option: recommendedOption,
      warmth_type: warmthType,
      draft_first_move: draftFirstMove,
    };

    const t0 = Date.now();
    const regenResults = await Promise.all(
      Array.from({ length: n }, () =>
        callOpenAI({
          api_key: openaiKey,
          model: "gpt-4o-2024-08-06",
          system_prompt: FIRST_MOVE_REGEN_SYSTEM_PROMPT,
          user_payload: regenInput,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      ),
    );

    const judgeResults = await Promise.all(
      regenResults.map((r) => {
        const firstMove = (r.parsed as { first_move?: unknown }).first_move;
        return callOpenAI({
          api_key: openaiKey,
          model: "gpt-4o-2024-08-06",
          system_prompt: JUDGE_5_SYSTEM_PROMPT,
          user_payload: {
            profile: mapProfileForJudge(profile),
            cv_extract: cvExtract,
            recommended_option: recommendedOption,
            warmth_type: warmthType,
            generated_first_move: firstMove,
            gold_must_not_be: goldMustNotBe,
          },
          temperature: 0,
          max_tokens: 1024,
        });
      }),
    );

    const totalRegenCost = regenResults.reduce((a, r) => a + r.cost_estimate_gbp, 0);
    const totalJudgeCost = judgeResults.reduce((a, r) => a + r.cost_estimate_gbp, 0);

    const generatedAt = new Date().toISOString();
    const candidates = regenResults.map((r, i) => {
      const judge = judgeResults[i].parsed as {
        score?: number;
        sub_scores?: unknown;
        must_not_be_matched?: string | null;
        justification?: string;
      };
      return {
        first_move: (r.parsed as { first_move?: unknown }).first_move,
        judge_5_score: typeof judge.score === "number" ? judge.score : 0,
        judge_5_sub_scores: judge.sub_scores ?? null,
        judge_5_must_not_be_matched: judge.must_not_be_matched ?? null,
        judge_5_justification: judge.justification ?? "",
        prompt_hash: FIRST_MOVE_REGEN_PROMPT_HASH,
        generated_at: generatedAt,
      };
    });

    const winnerIndex = pickWinner(candidates);
    const winnerFirstMoveRaw = candidates[winnerIndex].first_move;
    const winnerFirstMove = stripRegenRationale(winnerFirstMoveRaw);

    const updatedActivationPlan = mergeFirstMoveIntoPlan(report.activation_plan, winnerFirstMove);

    const { error: writeErr } = await supabase
      .from("reports")
      .update({
        activation_plan: updatedActivationPlan,
        provisional_first_move: winnerFirstMove,
        candidate_first_moves: candidates,
        first_move_winner_index: winnerIndex,
      })
      .eq("id", reportId);
    if (writeErr) {
      return new Response(
        JSON.stringify({ error: `db write failed: ${writeErr.message}`, version: FUNCTION_VERSION }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        reportId,
        winner_index: winnerIndex,
        winning_score: candidates[winnerIndex].judge_5_score,
        candidates_count: candidates.length,
        cost_estimate_gbp: Math.round((totalRegenCost + totalJudgeCost) * 1000) / 1000,
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
}

function mapAnswersToProfile(answers: Record<string, string>): Q {
  const cap = (s: string | undefined) => (s ? String(s).slice(0, 2000) : "");
  return {
    q1_job_title: cap(answers["1"]),
    q2_years_experience: cap(answers["2"]),
    q3a_sector: cap(answers["3"]),
    q3b_employer_org_type: cap(answers["3b"] || answers["30"]),
    q4_work_type: cap(answers["4"]),
    q5_seniority: cap(answers["5"]),
    q6_specific_achievement: cap(answers["6"]),
    q7_informal_advisory: cap(answers["7"]),
    q8_peer_perception: cap(answers["8"]),
    q9_income_urgency: cap(answers["9"]),
    q10_independence_confidence: cap(answers["10"]),
    q11_sector_client_context: cap(answers["11"]),
    q12_independent_experience: cap(answers["12"]),
    q13_network: cap(answers["13"]),
    q14_employment_status: cap(answers["14"]),
    q15_location: cap(answers["15"]),
  };
}

function mapProfileForJudge(p: Q): Record<string, unknown> {
  return {
    Q1: p.q1_job_title, Q2: p.q2_years_experience, Q3a: p.q3a_sector, Q3b: p.q3b_employer_org_type,
    Q4: p.q4_work_type, Q5: p.q5_seniority, Q6: p.q6_specific_achievement, Q7: p.q7_informal_advisory,
    Q8: p.q8_peer_perception, Q9: p.q9_income_urgency, Q10: p.q10_independence_confidence,
    Q11: p.q11_sector_client_context, Q12: p.q12_independent_experience, Q13: p.q13_network,
    Q14: p.q14_employment_status, Q15: p.q15_location,
  };
}

function pickRecommendedOption(coreReport: unknown): BusinessOption | null {
  if (!coreReport || typeof coreReport !== "object") return null;
  const core = coreReport as Record<string, unknown>;
  const recommendation = core.recommendation as Record<string, unknown> | undefined;
  const recommendedRank = typeof recommendation?.recommended_rank === "number" ? recommendation.recommended_rank : null;
  if (recommendedRank === null) return null;
  const options = Array.isArray(core.options) ? (core.options as BusinessOption[]) : [];
  return options.find((o) => Number(o.rank) === recommendedRank) ?? null;
}

function extractDraftFirstMove(activationPlan: unknown, provisional: unknown): unknown {
  if (provisional && typeof provisional === "object" && Object.keys(provisional as object).length > 0) {
    return provisional;
  }
  if (activationPlan && typeof activationPlan === "object") {
    const fm = (activationPlan as Record<string, unknown>).first_move;
    if (fm && typeof fm === "object") return fm;
  }
  return null;
}

function inferWarmthType(profile: Q, recommended: BusinessOption): "relational" | "structural" {
  if (recommended.structural_warmth === true) return "structural";
  const q7 = (profile.q7_informal_advisory ?? "").toLowerCase();
  const q13 = (profile.q13_network ?? "").toLowerCase();
  const relationalSignals = [
    q7.includes("yes"),
    q7.includes("regularly"),
    q7.includes("ongoing"),
    q13.includes("strong"),
    q13.includes("medium"),
    q13.includes("extensive"),
  ];
  return relationalSignals.some(Boolean) ? "relational" : "structural";
}

function stripRegenRationale(firstMove: unknown): unknown {
  if (!firstMove || typeof firstMove !== "object") return firstMove;
  const copy: Record<string, unknown> = { ...(firstMove as Record<string, unknown>) };
  delete copy.regen_rationale;
  return copy;
}

function mergeFirstMoveIntoPlan(plan: unknown, winnerFirstMove: unknown): unknown {
  if (!plan || typeof plan !== "object") {
    return { first_move: winnerFirstMove };
  }
  return { ...(plan as Record<string, unknown>), first_move: winnerFirstMove };
}

function pickWinner(candidates: Array<{ judge_5_score: number; judge_5_sub_scores: unknown }>): number {
  let best = 0;
  let bestScore = -1;
  let bestSubSum = -1;
  for (let i = 0; i < candidates.length; i++) {
    const score = candidates[i].judge_5_score;
    const subs = candidates[i].judge_5_sub_scores as Record<string, number> | null;
    const subSum = subs ? (Number(subs.concreteness) || 0) + (Number(subs.move_type_fit) || 0) + (Number(subs.smallness) || 0) : 0;
    if (score > bestScore || (score === bestScore && subSum > bestSubSum)) {
      best = i;
      bestScore = score;
      bestSubSum = subSum;
    }
  }
  return best;
}
