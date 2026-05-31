// evals/lib/judge_runner.ts
//
// WP2 sub-PR D extension: adds Judge 5 (first-move quality) to the judge
// suite. Renormalises computeAggregate to the five-judge weight scheme in
// types.ts. Adds buildFirstMoveQualityInput which constructs Judge 5's input
// from the captured activation_plan + recommended option metadata.
//
// All WP1 sub-PR C judges preserved; sub-PR D additions are additive.

import { join } from "https://deno.land/std@0.220.0/path/mod.ts";
import { callOpenAIJudge } from "./openai_judge.ts";
import type {
  FirstMoveSubScores,
  GeneratedReport,
  Judge4SubScores,
  JudgeResult,
  JudgeResultFirstMove,
  JudgeResultHook,
  JudgeResultStandard,
  PipelineOutput,
  Profile,
} from "./types.ts";
import { JUDGE_WEIGHTS } from "./types.ts";

const JUDGE_FILES = {
  specificity: "judge-1-specificity.md",
  realism: "judge-2-realism.md",
  seniority_calibration: "judge-3-seniority-calibration.md",
  hook_insight_quality: "judge-4-hook-insight-quality.md",
  first_move_quality: "judge-5-first-move-quality.md",
} as const;

type JudgeName = keyof typeof JUDGE_FILES;

interface PromptCache {
  [name: string]: string;
}

async function loadJudgePrompt(judgesDir: string, judgeName: JudgeName, cache: PromptCache): Promise<string> {
  if (cache[judgeName]) return cache[judgeName];
  const path = join(judgesDir, JUDGE_FILES[judgeName]);
  const full = await Deno.readTextFile(path);
  const stripped = full.replace(/^<!--[\s\S]*?-->\s*/, "");
  cache[judgeName] = stripped;
  return stripped;
}

// -----------------------------------------------------------------------------
// Per-judge input builders
// -----------------------------------------------------------------------------

function buildSpecificityInput(profile: Profile, report: GeneratedReport): unknown {
  return {
    profile: {
      profile_id: profile.profile_id,
      label: profile.label,
      domain: profile.domain,
      questionnaire: profile.questionnaire,
      cv_extract: profile.cv_extract,
    },
    generated_report: report,
  };
}

function buildRealismInput(profile: Profile, report: GeneratedReport): unknown {
  return {
    profile: {
      profile_id: profile.profile_id,
      label: profile.label,
      domain: profile.domain,
      archetype_hint: profile.archetype_hint,
      questionnaire: profile.questionnaire,
    },
    generated_report: report,
  };
}

function buildSeniorityCalibrationInput(
  profile: Profile,
  report: GeneratedReport,
  kbPricingBand: unknown,
): unknown {
  return {
    profile: {
      profile_id: profile.profile_id,
      label: profile.label,
      domain: profile.domain,
      archetype_hint: profile.archetype_hint,
      questionnaire: {
        Q1: profile.questionnaire.Q1,
        Q2: profile.questionnaire.Q2,
        Q5: profile.questionnaire.Q5,
        Q3b: profile.questionnaire.Q3b,
      },
    },
    generated_report: {
      recommended_option_id: report.recommended_option_id,
      pricing: extractRecommendedOptionPricing(report),
      business_options: report.business_options,
    },
    kb_pricing_band: kbPricingBand,
  };
}

function buildHookInsightInput(profile: Profile, report: GeneratedReport): unknown {
  return {
    profile: {
      profile_id: profile.profile_id,
      label: profile.label,
      domain: profile.domain,
      archetype_hint: profile.archetype_hint,
      questionnaire: profile.questionnaire,
      cv_extract: profile.cv_extract,
    },
    generated_hook_insight: report.hook_insight ?? "",
    gold_must_reference: profile.expected_outputs.hook_insight_must_reference,
    gold_must_not_be: profile.expected_outputs.hook_insight_must_not_be,
  };
}

// WP2 sub-PR D: Judge 5 input. Extracts first_move from activation_plan (the
// post-WP2-sub-PR-B winner has already been promoted into
// activation_plan.first_move by the regenerator), looks up the recommended
// option from core_report.options + recommendation.recommended_rank to provide
// primary_move_type + structural_warmth + target_buyer, derives warmth_type
// from Q7 + Q13 + structural_warmth as a fallback.
function buildFirstMoveQualityInput(
  profile: Profile,
  report: GeneratedReport,
  pipeline: PipelineOutput,
): unknown {
  const activationPlan = (pipeline.activation_plan ?? {}) as Record<string, unknown>;
  const generatedFirstMove = activationPlan.first_move ?? null;

  // Recover recommended option from the canonical core_report kept in
  // generated_report._canonical_core_report (pipeline_runner stashes it there).
  const canonicalCore = (report as Record<string, unknown>)._canonical_core_report as
    | Record<string, unknown>
    | undefined;
  const recommended = pickRecommendedOptionForJudge(canonicalCore);

  const warmthType = inferWarmthType(profile, recommended);

  return {
    profile: {
      profile_id: profile.profile_id,
      label: profile.label,
      domain: profile.domain,
      archetype_hint: profile.archetype_hint,
      questionnaire: profile.questionnaire,
      cv_extract: profile.cv_extract,
    },
    recommended_option: recommended,
    warmth_type: warmthType,
    generated_first_move: generatedFirstMove,
    gold_must_not_be: profile.expected_outputs.first_move_must_not_be ?? [],
  };
}

function pickRecommendedOptionForJudge(core: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!core) return null;
  const recommendation = (core.recommendation ?? {}) as Record<string, unknown>;
  const recommendedRank =
    typeof recommendation.recommended_rank === "number" ? recommendation.recommended_rank : null;
  const options = Array.isArray(core.options) ? (core.options as Array<Record<string, unknown>>) : [];
  const found = recommendedRank !== null ? options.find((o) => Number(o.rank) === recommendedRank) : undefined;
  if (!found) return null;
  return {
    business_model_id: found.business_model_id ?? null,
    model_name: found.model_name ?? null,
    target_buyer: found.target_buyer ?? null,
    primary_move_type: found.primary_move_type ?? null,
    structural_warmth: found.structural_warmth ?? false,
    pricing: found.pricing ?? null,
  };
}

function inferWarmthType(
  profile: Profile,
  recommended: Record<string, unknown> | null,
): "relational" | "structural" {
  if (recommended && recommended.structural_warmth === true) return "structural";
  const q7 = String(profile.questionnaire.Q7 ?? "").toLowerCase();
  const q13 = String(profile.questionnaire.Q13 ?? "").toLowerCase();
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

function extractRecommendedOptionPricing(report: GeneratedReport): string | undefined {
  const recId = report.recommended_option_id;
  if (!recId || !Array.isArray(report.business_options)) return undefined;
  const rec = report.business_options.find((o) => o.business_model_id === recId);
  return rec?.pricing;
}

// -----------------------------------------------------------------------------
// Validators for judge JSON outputs
// -----------------------------------------------------------------------------

function asStandardScore(x: unknown): 1 | 2 | 3 | 4 | 5 {
  if (typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= 5) return x as 1 | 2 | 3 | 4 | 5;
  throw new Error(`Expected integer score in [1, 5], got ${JSON.stringify(x)}`);
}

function asHookScore(x: unknown): 0 | 1 | 2 | 3 | 4 | 5 {
  if (typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 5) return x as 0 | 1 | 2 | 3 | 4 | 5;
  throw new Error(`Expected integer score in [0, 5], got ${JSON.stringify(x)}`);
}

function asSubScores(x: unknown): Judge4SubScores {
  const o = x as Record<string, unknown>;
  const no = o?.non_obvious;
  const ec = o?.execution_critical;
  const ps = o?.profile_specific;
  if (typeof no !== "number" || typeof ec !== "number" || typeof ps !== "number") {
    throw new Error(`Hook judge sub_scores malformed: ${JSON.stringify(x)}`);
  }
  if (![0, 1, 2].includes(no)) throw new Error(`non_obvious must be 0|1|2, got ${no}`);
  if (![0, 1, 2].includes(ec)) throw new Error(`execution_critical must be 0|1|2, got ${ec}`);
  if (![0, 1].includes(ps)) throw new Error(`profile_specific must be 0|1, got ${ps}`);
  return { non_obvious: no as 0 | 1 | 2, execution_critical: ec as 0 | 1 | 2, profile_specific: ps as 0 | 1 };
}

// WP2 sub-PR D: validator for Judge 5 sub-scores.
function asFirstMoveSubScores(x: unknown): FirstMoveSubScores {
  const o = x as Record<string, unknown>;
  const c = o?.concreteness;
  const t = o?.move_type_fit;
  const s = o?.smallness;
  if (typeof c !== "number" || typeof t !== "number" || typeof s !== "number") {
    throw new Error(`First-move judge sub_scores malformed: ${JSON.stringify(x)}`);
  }
  if (![0, 1, 2].includes(c)) throw new Error(`concreteness must be 0|1|2, got ${c}`);
  if (![0, 1, 2].includes(t)) throw new Error(`move_type_fit must be 0|1|2, got ${t}`);
  if (![0, 1].includes(s)) throw new Error(`smallness must be 0|1, got ${s}`);
  return { concreteness: c as 0 | 1 | 2, move_type_fit: t as 0 | 1 | 2, smallness: s as 0 | 1 };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface RunJudgesArgs {
  profile: Profile;
  generated_report: GeneratedReport;
  /** WP2 sub-PR D: required for Judge 5 input construction (activation_plan + first_move). */
  pipeline_output: PipelineOutput;
  openai_api_key: string;
  openai_judge_model: string;
  judges_dir: string;
  kb_pricing_band?: unknown;
  /** WP2 sub-PR D: skip Judge 5 if no first_move was captured (e.g. skip_plan=true). */
  skip_first_move_judge?: boolean;
}

export interface RunJudgesResult {
  specificity: JudgeResultStandard;
  realism: JudgeResultStandard;
  seniority_calibration: JudgeResultStandard;
  hook_insight_quality: JudgeResultHook;
  /** WP2 sub-PR D addition. Synthetic zero-score result when skip_first_move_judge=true. */
  first_move_quality: JudgeResultFirstMove;
  total_cost_estimate_gbp: number;
}

export async function runAllJudges(args: RunJudgesArgs): Promise<RunJudgesResult> {
  const cache: PromptCache = {};

  const specificityPrompt = await loadJudgePrompt(args.judges_dir, "specificity", cache);
  const realismPrompt = await loadJudgePrompt(args.judges_dir, "realism", cache);
  const seniorityPrompt = await loadJudgePrompt(args.judges_dir, "seniority_calibration", cache);
  const hookPrompt = await loadJudgePrompt(args.judges_dir, "hook_insight_quality", cache);

  const shouldRunFirstMoveJudge =
    !args.skip_first_move_judge && hasFirstMove(args.pipeline_output);
  const firstMovePrompt = shouldRunFirstMoveJudge
    ? await loadJudgePrompt(args.judges_dir, "first_move_quality", cache)
    : null;

  // Run all judges in parallel for this profile.
  const judgePromises: Array<Promise<{ parsed: unknown; raw_response: string; cost_estimate_gbp: number; duration_ms: number }>> = [
    callOpenAIJudge({
      api_key: args.openai_api_key,
      model: args.openai_judge_model,
      system_prompt: specificityPrompt,
      user_payload_json: buildSpecificityInput(args.profile, args.generated_report),
    }),
    callOpenAIJudge({
      api_key: args.openai_api_key,
      model: args.openai_judge_model,
      system_prompt: realismPrompt,
      user_payload_json: buildRealismInput(args.profile, args.generated_report),
    }),
    callOpenAIJudge({
      api_key: args.openai_api_key,
      model: args.openai_judge_model,
      system_prompt: seniorityPrompt,
      user_payload_json: buildSeniorityCalibrationInput(args.profile, args.generated_report, args.kb_pricing_band ?? null),
    }),
    callOpenAIJudge({
      api_key: args.openai_api_key,
      model: args.openai_judge_model,
      system_prompt: hookPrompt,
      user_payload_json: buildHookInsightInput(args.profile, args.generated_report),
    }),
  ];
  if (shouldRunFirstMoveJudge && firstMovePrompt) {
    judgePromises.push(
      callOpenAIJudge({
        api_key: args.openai_api_key,
        model: args.openai_judge_model,
        system_prompt: firstMovePrompt,
        user_payload_json: buildFirstMoveQualityInput(args.profile, args.generated_report, args.pipeline_output),
      }),
    );
  }

  const results = await Promise.all(judgePromises);
  const [specRaw, realRaw, senRaw, hookRaw, fmRaw] = results;

  const specObj = specRaw.parsed as Record<string, unknown>;
  const realObj = realRaw.parsed as Record<string, unknown>;
  const senObj = senRaw.parsed as Record<string, unknown>;
  const hookObj = hookRaw.parsed as Record<string, unknown>;

  const specificity: JudgeResultStandard = {
    judge_name: "specificity",
    score: asStandardScore(specObj.score),
    justification: String(specObj.justification ?? ""),
    raw_response: specRaw.raw_response,
    cost_estimate_gbp: specRaw.cost_estimate_gbp,
    duration_ms: specRaw.duration_ms,
  };

  const realism: JudgeResultStandard = {
    judge_name: "realism",
    score: asStandardScore(realObj.score),
    justification: String(realObj.justification ?? ""),
    raw_response: realRaw.raw_response,
    cost_estimate_gbp: realRaw.cost_estimate_gbp,
    duration_ms: realRaw.duration_ms,
  };

  const seniority_calibration: JudgeResultStandard = {
    judge_name: "seniority_calibration",
    score: asStandardScore(senObj.score),
    justification: String(senObj.justification ?? ""),
    raw_response: senRaw.raw_response,
    cost_estimate_gbp: senRaw.cost_estimate_gbp,
    duration_ms: senRaw.duration_ms,
  };

  const hookSubScores = asSubScores(hookObj.sub_scores);
  let hookScore = asHookScore(hookObj.score);
  const hookMatched = hookObj.must_not_be_matched;
  const hookMustNotBeMatched = typeof hookMatched === "string" && hookMatched.trim().length > 0 ? hookMatched : null;
  if (hookMustNotBeMatched && hookScore !== 1) hookScore = 1;

  const hook_insight_quality: JudgeResultHook = {
    judge_name: "hook_insight_quality",
    score: hookScore,
    sub_scores: hookSubScores,
    must_not_be_matched: hookMustNotBeMatched,
    justification: String(hookObj.justification ?? ""),
    raw_response: hookRaw.raw_response,
    cost_estimate_gbp: hookRaw.cost_estimate_gbp,
    duration_ms: hookRaw.duration_ms,
  };

  // Assemble Judge 5 result. Synthetic zero-score when skipped or absent.
  let first_move_quality: JudgeResultFirstMove;
  let fmCost = 0;
  if (shouldRunFirstMoveJudge && fmRaw) {
    const fmObj = fmRaw.parsed as Record<string, unknown>;
    const fmSubScores = asFirstMoveSubScores(fmObj.sub_scores);
    let fmScore = asHookScore(fmObj.score);
    const fmMatched = fmObj.must_not_be_matched;
    const fmMustNotBeMatched = typeof fmMatched === "string" && fmMatched.trim().length > 0 ? fmMatched : null;
    if (fmMustNotBeMatched && fmScore !== 1) fmScore = 1;

    first_move_quality = {
      judge_name: "first_move_quality",
      score: fmScore,
      sub_scores: fmSubScores,
      must_not_be_matched: fmMustNotBeMatched,
      justification: String(fmObj.justification ?? ""),
      raw_response: fmRaw.raw_response,
      cost_estimate_gbp: fmRaw.cost_estimate_gbp,
      duration_ms: fmRaw.duration_ms,
    };
    fmCost = fmRaw.cost_estimate_gbp;
  } else {
    first_move_quality = {
      judge_name: "first_move_quality",
      score: 0,
      sub_scores: { concreteness: 0, move_type_fit: 0, smallness: 0 },
      must_not_be_matched: null,
      justification: shouldRunFirstMoveJudge
        ? "no first_move captured in pipeline_output (activation_plan.first_move absent)"
        : "first-move judge skipped (skip_first_move_judge=true)",
      raw_response: "",
      cost_estimate_gbp: 0,
      duration_ms: 0,
    };
  }

  return {
    specificity,
    realism,
    seniority_calibration,
    hook_insight_quality,
    first_move_quality,
    total_cost_estimate_gbp:
      specRaw.cost_estimate_gbp +
      realRaw.cost_estimate_gbp +
      senRaw.cost_estimate_gbp +
      hookRaw.cost_estimate_gbp +
      fmCost,
  };
}

function hasFirstMove(pipeline: PipelineOutput): boolean {
  const ap = pipeline.activation_plan as Record<string, unknown> | null | undefined;
  if (!ap || typeof ap !== "object") return false;
  const fm = ap.first_move;
  return fm !== null && fm !== undefined && typeof fm === "object" && Object.keys(fm as object).length > 0;
}

export function computeAggregate(judges: RunJudgesResult): {
  specificity: number;
  realism: number;
  seniority_calibration: number;
  hook_insight_quality: number;
  first_move_quality: number;
  weighted_aggregate: number;
} {
  const s = judges.specificity.score;
  const r = judges.realism.score;
  const c = judges.seniority_calibration.score;
  const h = judges.hook_insight_quality.score;
  const fm = judges.first_move_quality.score;
  const weighted =
    h * JUDGE_WEIGHTS.hook_insight_quality +
    s * JUDGE_WEIGHTS.specificity +
    r * JUDGE_WEIGHTS.realism +
    c * JUDGE_WEIGHTS.seniority_calibration +
    fm * JUDGE_WEIGHTS.first_move_quality;
  return {
    specificity: s,
    realism: r,
    seniority_calibration: c,
    hook_insight_quality: h,
    first_move_quality: fm,
    weighted_aggregate: Math.round(weighted * 1000) / 1000,
  };
}

export type { JudgeResult };
