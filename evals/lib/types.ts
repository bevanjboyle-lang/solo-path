// evals/lib/types.ts
//
// WP2 sub-PR D extension: adds Judge 5 (first-move quality) types,
// PipelineOutput captures candidate_hook_insights + candidate_first_moves +
// activation_plan + winner indices, AggregateScores includes first_move_quality
// with renormalised 5-judge weights, ExpectedOutputs carries first_move_must_not_be,
// RunSummary captures winner-vs-mean metrics per WP2 field.
//
// All WP1 sub-PR C types preserved; new fields are additive.
// Mirrors evals/golden_dataset/schemas/profile.schema.json and the FIVE judge
// output schemas in prompts/judges/. Keep these in sync if either changes.

// -----------------------------------------------------------------------------
// Golden dataset profile (mirrors profile.schema.json)
// -----------------------------------------------------------------------------

export interface Questionnaire {
  Q1: string;
  Q2: number;
  Q3a: string;
  Q3b: string;
  Q4: string;
  Q5: "manager" | "senior manager" | "director" | "head of" | "partner" | "other";
  Q6: string;
  Q7: string;
  Q8: string;
  Q9: "low" | "medium" | "high";
  Q10: "low" | "medium" | "high";
  Q11: string;
  Q12: string | null;
  Q13: string;
  Q14: "full-time employed" | "part-time employed" | "contracting" | "between roles" | "self-employed";
  Q15: string;
}

export type EdgeCaseFlag =
  | "partner_level_seniority"
  | "zero_independent_experience"
  | "high_income_urgency"
  | "cv_questionnaire_contradiction"
  | "niche_sector_thin_kb"
  | "senior_with_strong_network"
  | "mid_career_low_confidence";

export type FirstMoveType = "Direct" | "Platform" | "Visibility" | "Community";

export interface ExpectedOutputs {
  primary_archetype_id: string;
  primary_archetype_label: string;
  secondary_archetype_acceptable_ids: string[];
  hook_insight_must_reference: string[];
  hook_insight_must_not_be: string[];
  first_move_acceptable_types: FirstMoveType[];
  /** WP2 sub-PR D addition. Failure modes Judge 5 enforces via override. Empty array on profiles graded before sub-PR D. */
  first_move_must_not_be?: string[];
  recommended_option_must_be_in: string[];
  commercially_distinctive_one_liner: string;
}

export interface Profile {
  profile_id: string;
  label: string;
  domain: string;
  archetype_hint: string;
  questionnaire: Questionnaire;
  cv_extract: Record<string, unknown> | null;
  edge_case_flags: EdgeCaseFlag[];
  expected_outputs: ExpectedOutputs;
  drafted_by: "claude";
  drafted_at?: string;
  graded_by: "pending" | "bevan";
  graded_at: string | null;
  grading_notes?: string;
}

// -----------------------------------------------------------------------------
// Pipeline output (the report we score). Now extended for WP2 captures.
// -----------------------------------------------------------------------------

export interface BusinessOption {
  business_model_id?: string;
  title?: string;
  what_is_being_sold?: string;
  who_buys_it?: string;
  why_credible_for_user?: string;
  first_clients_path?: string;
  pricing?: string;
  time_to_revenue?: string;
  what_makes_this_hard?: string;
  what_could_go_wrong?: string;
  primary_move_type?: "direct" | "platform" | "visibility" | "community" | "mixed";
  structural_warmth?: boolean;
  [key: string]: unknown;
}

export interface GeneratedReport {
  hook_insight?: string;
  profile_interpretation?: string;
  reframe_headline?: string;
  business_options?: BusinessOption[];
  recommended_option_id?: string;
  key_skills_inventory?: unknown[];
  [key: string]: unknown;
}

/**
 * WP2 sub-PR A candidate shape. Each candidate carries the produced hook plus
 * Judge 4's score + sub-scores + must_not_be match. Set by regenerate-hook-insight.
 */
export interface CandidateHookInsight {
  hook_insight: unknown;
  judge_4_score: number;
  judge_4_sub_scores: Judge4SubScores | null;
  judge_4_must_not_be_matched: string | null;
  judge_4_justification: string;
  prompt_hash: string;
  generated_at: string;
}

/**
 * WP2 sub-PR B candidate shape. Mirrors CandidateHookInsight but for first_move.
 */
export interface CandidateFirstMove {
  first_move: unknown;
  judge_5_score: number;
  judge_5_sub_scores: FirstMoveSubScores | null;
  judge_5_must_not_be_matched: string | null;
  judge_5_justification: string;
  prompt_hash: string;
  generated_at: string;
}

export interface PipelineOutput {
  generated_report: GeneratedReport;
  raw_response: unknown; // full payload as returned by the edge function
  duration_ms: number;
  cost_estimate_gbp?: number;
  /** WP2 sub-PR D additions. Null when the relevant regenerator was disabled or not run. */
  candidate_hook_insights?: Array<Record<string, unknown>> | null;
  hook_insight_winner_index?: number | null;
  candidate_first_moves?: Array<Record<string, unknown>> | null;
  first_move_winner_index?: number | null;
  activation_plan?: unknown;
}

// -----------------------------------------------------------------------------
// Judge results
// -----------------------------------------------------------------------------

export interface JudgeResultBase {
  judge_name: string;
  score: number;
  justification: string;
  raw_response: string;
  cost_estimate_gbp: number;
  duration_ms: number;
}

export interface JudgeResultStandard extends JudgeResultBase {
  judge_name: "specificity" | "realism" | "seniority_calibration";
  score: 1 | 2 | 3 | 4 | 5;
}

export interface Judge4SubScores {
  non_obvious: 0 | 1 | 2;
  execution_critical: 0 | 1 | 2;
  profile_specific: 0 | 1;
}

export interface JudgeResultHook extends JudgeResultBase {
  judge_name: "hook_insight_quality";
  score: 0 | 1 | 2 | 3 | 4 | 5;
  sub_scores: Judge4SubScores;
  must_not_be_matched: string | null;
}

/** WP2 sub-PR D: Judge 5 sub-scores. Sum is 0-5. */
export interface FirstMoveSubScores {
  concreteness: 0 | 1 | 2;
  move_type_fit: 0 | 1 | 2;
  smallness: 0 | 1;
}

export interface JudgeResultFirstMove extends JudgeResultBase {
  judge_name: "first_move_quality";
  score: 0 | 1 | 2 | 3 | 4 | 5;
  sub_scores: FirstMoveSubScores;
  must_not_be_matched: string | null;
}

export type JudgeResult = JudgeResultStandard | JudgeResultHook | JudgeResultFirstMove;

// -----------------------------------------------------------------------------
// Per-profile run result
// -----------------------------------------------------------------------------

export interface AggregateScores {
  specificity: number;
  realism: number;
  seniority_calibration: number;
  hook_insight_quality: number;
  /** WP2 sub-PR D addition. 0 when first_move_quality judge wasn't run. */
  first_move_quality: number;
  weighted_aggregate: number;
}

export interface ProfileRunResult {
  profile_id: string;
  profile_label: string;
  domain: string;
  edge_case_flags: EdgeCaseFlag[];
  expected_outputs: ExpectedOutputs;
  pipeline_output: PipelineOutput;
  judge_results: {
    specificity: JudgeResultStandard;
    realism: JudgeResultStandard;
    seniority_calibration: JudgeResultStandard;
    hook_insight_quality: JudgeResultHook;
    /** WP2 sub-PR D addition. Always present after sub-PR D lands. */
    first_move_quality: JudgeResultFirstMove;
  };
  aggregate: AggregateScores;
  /** WP2 sub-PR D additions. winner_vs_mean is null when fewer than 2 candidates were produced. */
  hook_winner_score_vs_mean?: number | null;
  first_move_winner_score_vs_mean?: number | null;
  pipeline_error?: string;
  judge_errors?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Aggregate weights — WP2 sub-PR D renormalisation
// -----------------------------------------------------------------------------
//
// WP1 sub-PR C weights (four judges):
//   hook_insight_quality 0.40
//   specificity          0.25
//   realism              0.20
//   seniority_calibration 0.15
//   (sum 1.00)
//
// WP2 sub-PR D introduces Judge 5 (first_move_quality) with proposed
// design-spec weight 0.30. The other four renormalise to fill the remaining
// 0.70, preserving their relative ratios:
//
//   hook_insight_quality  0.40 × (0.70 / 1.00) = 0.280
//   specificity           0.25 × (0.70 / 1.00) = 0.175
//   realism               0.20 × (0.70 / 1.00) = 0.140
//   seniority_calibration 0.15 × (0.70 / 1.00) = 0.105
//   first_move_quality                          = 0.300
//   sum                                         = 1.000
//
// This keeps the original four-judge relative ranking intact: hook insight
// stays the dominant single judge among the report-stage judges; first_move
// becomes the second-most-weighted overall, reflecting its conversion-critical
// status per the WP2 design.

export const JUDGE_WEIGHTS = {
  hook_insight_quality: 0.28,
  specificity: 0.175,
  realism: 0.14,
  seniority_calibration: 0.105,
  first_move_quality: 0.3,
} as const;

// -----------------------------------------------------------------------------
// Run summary (one per run, written to evals/runs/<ts>_<hash>/summary.json)
// -----------------------------------------------------------------------------

export interface RegressionFlag {
  profile_id: string;
  reason: string;
  prior_score: number;
  current_score: number;
  delta: number;
  per_judge_deltas: Partial<Record<keyof AggregateScores, number>>;
}

/**
 * WP2 sub-PR D win-rate metrics. For each conversion-critical field, captures
 * how much better the best-of-N winner scored versus the mean of all candidates,
 * across profiles where N candidates were produced. Used to validate the
 * brief's acceptance criterion: best-of-3 beats single-shot on ≥7/10 profiles.
 */
export interface WinnerVsMeanSummary {
  /** Number of profiles where the field had ≥2 candidates (i.e. WP2 ran). */
  n_profiles_with_candidates: number;
  /** Number of profiles where winner_score > mean(all candidates). */
  n_winner_beats_mean: number;
  /** Number of profiles where winner_score == max(all candidates). Should equal n_profiles_with_candidates unless pickWinner has a bug. */
  n_winner_is_max: number;
  /** Average delta (winner_score - mean(candidates)) across profiles with ≥2 candidates. */
  avg_delta: number;
  /** Per-profile breakdown: winner_score, mean, delta. */
  per_profile: Record<string, { winner_score: number; mean: number; delta: number; n_candidates: number }>;
}

export interface RunSummary {
  run_id: string;
  started_at: string;
  ended_at: string;
  total_duration_ms: number;
  prompt_hash: string;
  prompt_versions: Record<string, string>;
  profile_count: number;
  successful_profiles: number;
  failed_profiles: number;
  concurrency: number;
  cost_estimate_gbp: number;
  per_judge_averages: AggregateScores;
  per_domain_averages: Record<string, AggregateScores>;
  per_edge_case_averages: Record<string, AggregateScores>;
  per_profile_aggregates: Record<string, number>;
  baseline_run_id: string | null;
  flagged_regressions: RegressionFlag[];
  is_baseline: boolean;
  /** WP2 sub-PR D additions. */
  hook_winner_vs_mean?: WinnerVsMeanSummary;
  first_move_winner_vs_mean?: WinnerVsMeanSummary;
}

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------

export interface RunEvalArgs {
  prompt_hash?: string;
  profiles?: string[];
  concurrency: number;
  out_dir: string;
  golden_dataset_path: string;
  judges_dir: string;
  supabase_url: string;
  supabase_service_role_key: string;
  openai_api_key: string;
  openai_judge_model: string;
  dry_run: boolean;
  baseline_run_id?: string;
  /** WP2 sub-PR D addition. If true, skip generate-plan + Judge 5 + candidate_first_moves capture. Useful for report-only smokes. */
  skip_plan?: boolean;
}
