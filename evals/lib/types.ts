// evals/lib/types.ts
//
// Shared TypeScript types for the WP1 eval harness.
// Mirrors evals/golden_dataset/schemas/profile.schema.json and the four judge
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
// Pipeline output (the report we score). Shape is permissive — the canonical
// report schema lives at prompts/schemas/report-schema.ts and may evolve under
// WP3. The harness captures whatever the live pipeline returned.
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

export interface PipelineOutput {
  generated_report: GeneratedReport;
  raw_response: unknown; // the full payload as returned by the edge function
  duration_ms: number;
  cost_estimate_gbp?: number;
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

export type JudgeResult = JudgeResultStandard | JudgeResultHook;

// -----------------------------------------------------------------------------
// Per-profile run result
// -----------------------------------------------------------------------------

export interface AggregateScores {
  specificity: number;
  realism: number;
  seniority_calibration: number;
  hook_insight_quality: number;
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
  };
  aggregate: AggregateScores;
  pipeline_error?: string;
  judge_errors?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Aggregate weights per WP1 design v1.1 §Sub-PR B
// -----------------------------------------------------------------------------

export const JUDGE_WEIGHTS = {
  hook_insight_quality: 0.4,
  specificity: 0.25,
  realism: 0.2,
  seniority_calibration: 0.15,
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

export interface RunSummary {
  run_id: string;
  started_at: string;
  ended_at: string;
  total_duration_ms: number;
  prompt_hash: string;
  prompt_versions: Record<string, string>; // populated by sub-PR D
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
}

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------

export interface RunEvalArgs {
  prompt_hash?: string;
  profiles?: string[]; // subset of profile_ids; default = all
  concurrency: number;
  out_dir: string;
  golden_dataset_path: string;
  judges_dir: string;
  supabase_url: string;
  supabase_service_role_key: string;
  openai_api_key: string;
  openai_judge_model: string;
  dry_run: boolean;
  baseline_run_id?: string; // override auto-detection
}
