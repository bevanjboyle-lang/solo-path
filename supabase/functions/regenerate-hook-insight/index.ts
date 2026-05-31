// supabase/functions/regenerate-hook-insight/index.ts
// WP2 sub-PR A — Hook insight best-of-N. v1.1: drops cv_extract from select (column doesn't exist on reports).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = "wp2-hook-regen-v1.1-cv-fix";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOOK_REGEN_PROMPT_HASH = "2fac5c5223de4e98be7e08887e7018d9eeb56828b2f9441e0130aa9bcdea7761";

const HOOK_REGEN_SYSTEM_PROMPT = `You are the Solo hook-insight regenerator. You produce ONE hook insight per call.

The hook insight must pass all three Solo Bible §12 tests:
1. Non-obvious — could not be derived by the user in 5 minutes of thinking
2. Execution-critical — materially changes what the user does next week
3. Profile-specific — references concrete details from Q3b / Q6 / Q11 / Q12

You will be called multiple times in parallel (typically 3) by the regenerate-hook-insight edge function. Each call produces a different candidate hook. A separate Judge 4 prompt picks the winner. So push for distinctive, sharp, specific insights — variance is desirable.

The draft_hook_insight in your input is the monolithic P1's draft. Do NOT reuse its framing. Find a different angle, a different sharp end.

Generate ONE hook insight composed of:
- headline: 8-18 words with a reframe signal (a contrast word: isn't / not / actually / beyond / despite / under, OR a noun reversal: your X isn't X, it's Y)
- paragraph: 80-120 words that name at least one concrete detail from Q3b / Q6 / Q11 / Q12 and imply a clear "if you accept this, do X differently" move

Avoid these failure modes:
- "Networking is the fastest route to first clients."
- "The market for [archetype] services is growing."
- "Consider registering as a sole trader."
- "Build a personal brand on LinkedIn."
- Anything that could read for a different user at the same Q1 / Q3a / Q5 without changing more than a couple of nouns
- Motivational reframing that doesn't change action
- Generic "ex-[role]" framing that any senior practitioner could have authored

Solo voice: direct, specific, commercially grounded. No motivational language, no clichés, no em-dashes.

Return ONLY this JSON object (no prose around it):

{
  "hook_insight": {
    "headline": "<8-18 word headline with reframe signal>",
    "paragraph": "<80-120 word body that names a specific Q3b/Q6/Q11/Q12 detail and implies a clear action change>",
    "anchors_referenced": ["Q6", "Q11"],
    "first_move_implied": "<one short sentence: the action change the hook implies>"
  }
}

anchors_referenced is a non-empty subset of ["Q3b", "Q6", "Q11", "Q12", "Q13"].`;

const JUDGE_4_PROMPT_HASH = "bf3f3fff4b3036a2cc19f85c0a295f66fd2a54b27f79d4ae18a825d514388854";

const JUDGE_4_SYSTEM_PROMPT = `You are Judge 4 — Hook insight quality. You score one generated hook against the Solo Bible §12 three-test rubric AND against profile-specific gold_must_reference / gold_must_not_be constraints.

Apply three sub-tests:

Sub-test 1 — Non-obvious (0, 1, or 2):
- 2 = unmistakably non-obvious; names a specific framework / intermediary / counter-intuitive move
- 1 = somewhat non-obvious; specific anchor but underlying point would surface for the user in a longer think
- 0 = obvious; capable user at this title and seniority could have written it themselves in under 5 minutes

Sub-test 2 — Execution-critical (0, 1, or 2):
- 2 = action-changing; clear "if you accept this, do X differently" implication
- 1 = action-shaping; implies direction shift but doesn't name the action change cleanly
- 0 = informational; describes situation but doesn't imply an action change

Sub-test 3 — Profile-specific (0 or 1):
- 1 = profile-specific; references at least one concrete detail from Q3b / Q6 / Q11 / Q12 OR matches at least one gold_must_reference item
- 0 = generic; references only archetype / sector / title

Sum the three sub-scores for total (0-5).

Then apply gold_must_not_be: if the hook clearly matches any failure mode in the gold_must_not_be array, OVERRIDE the total score to 1 regardless of sub-test totals. Record the matched failure mode verbatim.

Return ONLY this JSON object:

{
  "score": <integer 0-5>,
  "sub_scores": { "non_obvious": <0|1|2>, "execution_critical": <0|1|2>, "profile_specific": <0|1> },
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
    max_tokens: args.max_tokens ?? 1024,
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
    console.warn(`[regenerate-hook-insight] ${resp.status} on attempt ${attempt + 1}/${MAX_RETRIES + 1}; sleeping ${sleepMs}ms`);
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

  const FLAG = (Deno.env.get("WP2_HOOK_REGENERATION_ENABLED") ?? "false").toLowerCase();
  if (FLAG !== "true" && FLAG !== "1") {
    return new Response(
      JSON.stringify({ skipped: true, reason: "WP2_HOOK_REGENERATION_ENABLED is not enabled", version: FUNCTION_VERSION }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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
    const n: number = Math.max(1, Math.min(5, Number(body.n) || 3));
    if (!reportId) {
      return new Response(JSON.stringify({ error: "reportId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // v1.1 FIX: dropped cv_extract from select (column doesn't exist on reports).
    // CV extract is request-time only, not persisted. Pass null to downstream prompts.
    const { data: report, error: loadErr } = await supabase
      .from("reports")
      .select("id, status, core_report, hook_insight, answers, client_session_id, user_id")
      .eq("id", reportId)
      .single();
    if (loadErr || !report) {
      return new Response(
        JSON.stringify({ error: `report not found: ${loadErr?.message ?? "unknown"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profile: Q = mapAnswersToProfile((report.answers as Record<string, string>) ?? {});
    const cvExtract = null; // v1.1: not stored on reports row
    const recommendedOption = pickRecommendedOption(report.core_report);
    if (!recommendedOption) {
      return new Response(
        JSON.stringify({ error: "could not derive recommended option from core_report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const draftHook = stringifyHookInsight(report.core_report, report.hook_insight);

    const regenInput = { profile, cv_extract: cvExtract, recommended_option: recommendedOption, draft_hook_insight: draftHook };

    const t0 = Date.now();
    const regenResults = await Promise.all(
      Array.from({ length: n }, () =>
        callOpenAI({
          api_key: openaiKey,
          model: "gpt-4o-2024-08-06",
          system_prompt: HOOK_REGEN_SYSTEM_PROMPT,
          user_payload: regenInput,
          temperature: 0.7,
        }),
      ),
    );

    const goldMustReference: string[] = (body.gold_must_reference as string[]) ?? [];
    const goldMustNotBe: string[] = (body.gold_must_not_be as string[]) ?? [];

    const judgeResults = await Promise.all(
      regenResults.map((r) => {
        const hook = (r.parsed as { hook_insight?: unknown }).hook_insight;
        const flatHook = flattenHookForJudge(hook);
        return callOpenAI({
          api_key: openaiKey,
          model: "gpt-4o-2024-08-06",
          system_prompt: JUDGE_4_SYSTEM_PROMPT,
          user_payload: {
            profile: mapProfileForJudge(profile),
            cv_extract: cvExtract,
            generated_hook_insight: flatHook,
            gold_must_reference: goldMustReference,
            gold_must_not_be: goldMustNotBe,
          },
          temperature: 0,
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
        hook_insight: (r.parsed as { hook_insight?: unknown }).hook_insight,
        judge_4_score: typeof judge.score === "number" ? judge.score : 0,
        judge_4_sub_scores: judge.sub_scores ?? null,
        judge_4_must_not_be_matched: judge.must_not_be_matched ?? null,
        judge_4_justification: judge.justification ?? "",
        prompt_hash: HOOK_REGEN_PROMPT_HASH,
        generated_at: generatedAt,
      };
    });

    const winnerIndex = pickWinner(candidates);
    const winnerHook = candidates[winnerIndex].hook_insight;

    const winnerHookFlat = flattenHookForJudge(winnerHook);
    const { error: writeErr } = await supabase
      .from("reports")
      .update({
        hook_insight: winnerHookFlat,
        candidate_hook_insights: candidates,
        hook_insight_winner_index: winnerIndex,
      })
      .eq("id", reportId);
    if (writeErr) {
      return new Response(
        JSON.stringify({ error: `db write failed: ${writeErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        reportId,
        winner_index: winnerIndex,
        winning_score: candidates[winnerIndex].judge_4_score,
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
});

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

function stringifyHookInsight(coreReport: unknown, hookInsightCol: unknown): string {
  if (coreReport && typeof coreReport === "object") {
    const hook = (coreReport as Record<string, unknown>).hook_insight as Record<string, unknown> | undefined;
    if (hook && typeof hook === "object") {
      const headline = typeof hook.headline === "string" ? hook.headline : "";
      const paragraph = typeof hook.paragraph === "string" ? hook.paragraph : "";
      return [headline, paragraph].filter(Boolean).join(" — ");
    }
  }
  return typeof hookInsightCol === "string" ? hookInsightCol : "";
}

function flattenHookForJudge(hook: unknown): string {
  if (!hook || typeof hook !== "object") return typeof hook === "string" ? hook : "";
  const h = hook as Record<string, unknown>;
  const headline = typeof h.headline === "string" ? h.headline : "";
  const paragraph = typeof h.paragraph === "string" ? h.paragraph : "";
  return [headline, paragraph].filter(Boolean).join(" — ");
}

function pickWinner(candidates: Array<{ judge_4_score: number; judge_4_sub_scores: unknown }>): number {
  let best = 0;
  let bestScore = -1;
  let bestSubSum = -1;
  for (let i = 0; i < candidates.length; i++) {
    const score = candidates[i].judge_4_score;
    const subs = candidates[i].judge_4_sub_scores as Record<string, number> | null;
    const subSum = subs ? (Number(subs.non_obvious) || 0) + (Number(subs.execution_critical) || 0) + (Number(subs.profile_specific) || 0) : 0;
    if (score > bestScore || (score === bestScore && subSum > bestSubSum)) {
      best = i;
      bestScore = score;
      bestSubSum = subSum;
    }
  }
  return best;
}
