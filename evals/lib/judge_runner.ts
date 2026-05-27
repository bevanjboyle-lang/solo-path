// evals/lib/judge_runner.ts
//
// Runs the four WP1 judges against a single (profile, generated_report) pair.
// Loads each judge's prompt body from prompts/judges/*.md, strips the HTML
// header comment, passes the rest as the system prompt to gpt-4o.
//
// Each judge gets a specific user-payload shape per its prompt's Inputs section.

import { join } from "https://deno.land/std@0.220.0/path/mod.ts";
import { callOpenAIJudge } from "./openai_judge.ts";
import type {
  GeneratedReport,
  Judge4SubScores,
  JudgeResult,
  JudgeResultHook,
  JudgeResultStandard,
  Profile,
} from "./types.ts";

const JUDGE_FILES = {
  specificity: "judge-1-specificity.md",
  realism: "judge-2-realism.md",
  seniority_calibration: "judge-3-seniority-calibration.md",
  hook_insight_quality: "judge-4-hook-insight-quality.md",
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
        Q3b: profile.questionnaire.Q3b, // needed for head-of disambiguation
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

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface RunJudgesArgs {
  profile: Profile;
  generated_report: GeneratedReport;
  openai_api_key: string;
  openai_judge_model: string;
  judges_dir: string;
  /** Optional: pass the KB pricing band for the recommended option to Judge 3. */
  kb_pricing_band?: unknown;
}

export interface RunJudgesResult {
  specificity: JudgeResultStandard;
  realism: JudgeResultStandard;
  seniority_calibration: JudgeResultStandard;
  hook_insight_quality: JudgeResultHook;
  total_cost_estimate_gbp: number;
}

export async function runAllJudges(args: RunJudgesArgs): Promise<RunJudgesResult> {
  const cache: PromptCache = {};

  const specificityPrompt = await loadJudgePrompt(args.judges_dir, "specificity", cache);
  const realismPrompt = await loadJudgePrompt(args.judges_dir, "realism", cache);
  const seniorityPrompt = await loadJudgePrompt(args.judges_dir, "seniority_calibration", cache);
  const hookPrompt = await loadJudgePrompt(args.judges_dir, "hook_insight_quality", cache);

  // Run all four judges in parallel for this profile.
  const [specRaw, realRaw, senRaw, hookRaw] = await Promise.all([
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
  ]);

  // Parse + validate each judge's output.
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

  const subScores = asSubScores(hookObj.sub_scores);
  let hookScore = asHookScore(hookObj.score);
  const matched = hookObj.must_not_be_matched;
  const mustNotBeMatched = typeof matched === "string" && matched.trim().length > 0 ? matched : null;
  // Per Judge 4 prompt: must_not_be_matched override forces score to 1.
  if (mustNotBeMatched && hookScore !== 1) {
    // The judge should have done this itself but enforce defensively.
    hookScore = 1;
  }

  const hook_insight_quality: JudgeResultHook = {
    judge_name: "hook_insight_quality",
    score: hookScore,
    sub_scores: subScores,
    must_not_be_matched: mustNotBeMatched,
    justification: String(hookObj.justification ?? ""),
    raw_response: hookRaw.raw_response,
    cost_estimate_gbp: hookRaw.cost_estimate_gbp,
    duration_ms: hookRaw.duration_ms,
  };

  return {
    specificity,
    realism,
    seniority_calibration,
    hook_insight_quality,
    total_cost_estimate_gbp:
      specRaw.cost_estimate_gbp +
      realRaw.cost_estimate_gbp +
      senRaw.cost_estimate_gbp +
      hookRaw.cost_estimate_gbp,
  };
}

export function computeAggregate(judges: RunJudgesResult): {
  specificity: number;
  realism: number;
  seniority_calibration: number;
  hook_insight_quality: number;
  weighted_aggregate: number;
} {
  const s = judges.specificity.score;
  const r = judges.realism.score;
  const c = judges.seniority_calibration.score;
  const h = judges.hook_insight_quality.score;
  const weighted = h * 0.4 + s * 0.25 + r * 0.2 + c * 0.15;
  return {
    specificity: s,
    realism: r,
    seniority_calibration: c,
    hook_insight_quality: h,
    weighted_aggregate: Math.round(weighted * 1000) / 1000,
  };
}

export type { JudgeResult };
