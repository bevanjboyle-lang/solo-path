/**
 * Canonical TypeScript type mirrors for the Solo report + plan output shapes.
 *
 * This file is a frontend-side build-time copy of the canonical schema files in
 * `prompts/` (the canonical source of truth, per ADR-019) and the deployed copies
 * under `supabase/functions/generate-report/` and `supabase/functions/generate-plan/`.
 *
 * Canonical sources mirrored here:
 *   - prompts/report-schema.ts                       — `SoloCoreReport`, `YearProjection`
 *   - prompts/activation-plan-schema.ts              — `ActivationPlanOutput` + sub-types
 *   - prompts/market-snapshot-schema.ts              — `MarketSnapshotOutput`
 *
 * Deployed mirrors (kept in lockstep):
 *   - supabase/functions/generate-report/report-schema.ts
 *   - supabase/functions/generate-plan/activation-plan-schema.ts
 *   - supabase/functions/generate-plan/market-snapshot-schema.ts
 *
 * SYNC DISCIPLINE:
 *   If this file drifts from the canonical schemas in `prompts/`, the canonical
 *   wins and this copy must be brought back into line. Do not extend this file
 *   with frontend-only fields — add a wrapper type instead (see `ReportRow`).
 *
 * Reference: ADR-019 (ironclad rewrite — canonical schema in repo, validator + retry)
 */

// ============================================================================
// 1. Core report (SoloCoreReport) — mirrors prompts/report-schema.ts
// ============================================================================

export interface YearProjection {
  low_gbp: number;
  mid_gbp: number;
  high_gbp: number;
  revenue_build: string;
  revenue_sources: string;
  assumptions: string;
}

export interface SoloCoreReport {
  archetype: {
    primary: string;
    secondary: string | null;
    confidence: number;
    summary: string;
    editorial_description: string;
    capability_tags: string[];
  };
  transferable_value: {
    what_they_can_sell: string;
    why_buyers_would_pay: string;
    credibility_assets: string[];
  };
  transferable_skills: Array<{
    skill_name: string;
    strength: number;
    evidence: string;
    market_demand: "high" | "medium" | "low";
  }>;
  options: Array<{
    rank: number;
    model_name: string;
    business_model_id: string;
    primary_move_type: "direct" | "platform" | "visibility" | "community" | "mixed";
    structural_warmth: boolean;
    composite_score: number;
    fit_tags: string[];
    source: "primary" | "secondary";
    positioning: string;
    target_buyer: string;
    what_they_are_buying: string;
    pricing: {
      model: string;
      range_low_gbp: number;
      range_high_gbp: number;
      cadence: string;
    };
    time_to_first_revenue: string;
    difficulty_rating: "easy" | "moderate" | "hard";
    why_this_works_for_them: string;
    caution_note: string | null;
    /** Phase C (2026-08-18) honest tiers. Optional: reports generated before
     *  generate-report v46 carry none of these three fields, and every
     *  renderer must keep working without them. */
    tier?: "front_runner" | "credible" | "stretch";
    /** Set only when two options are genuinely level; names the tie and the
     *  situational tiebreak. */
    tie_note?: string | null;
    /** Deterministic evidence block attached in code by generate-report v46:
     *  live Radar signals, the hand-reviewed rate band, or an honest
     *  coverage note. Never model-generated. */
    evidence?: Array<{
      kind: "radar" | "rate" | "coverage";
      title?: string;
      summary?: string | null;
      source_name?: string | null;
      source_type?: string | null;
      buyer?: string | null;
      value_text?: string | null;
      deadline?: string | null;
      week_start?: string | null;
      url?: string | null;
      text?: string;
    }>;
  }>;
  recommendation: {
    recommended_rank: number;
    rationale: string;
    key_condition: string;
  };
  reality_check: {
    most_likely_failure_mode: string;
    second_failure_mode: string;
    what_they_will_find_hard: string;
    honest_income_outlook: string;
  };
  income_outlook: {
    primary_option_rank: number;
    year_1: YearProjection;
    year_2: YearProjection;
    year_3: YearProjection;
    sensitivity_factors: string;
    income_floor_analysis: string;
    income_notes: string;
  };
  recommended_selection: {
    selected_ranks: number[];
    rationale: string;
  };
  hook_insight: {
    headline: string;
    paragraph: string;
    first_move: {
      action: string;
      target: string;
      draft_subject: string;
      draft_body: string;
      follow_up_prompt: string;
    };
  };
  ai_impact: {
    part_1: {
      displacement_risk: "low" | "medium" | "high";
      risk_horizon: string;
      content: string;
    };
    part_2: {
      content: string;
    };
    part_3: {
      steps: Array<{
        priority: number;
        action: string;
        rationale: string;
      }>;
    };
  };
}

// ============================================================================
// 2. Activation plan (ActivationPlanOutput) — mirrors prompts/activation-plan-schema.ts
// ============================================================================

export type MoveType =
  | "direct"
  | "platform"
  | "visibility"
  | "community"
  | "mixed";

export type DirectFormat =
  | "email_reconnect"
  | "email_cold"
  | "email_referral_ask"
  | "linkedin_dm"
  | "verbal";

export type SignalWeight =
  | "negative"
  | "neutral"
  | "moderate"
  | "strong"
  | "very_strong";

export type TaskType =
  | "foundation"
  | "outreach"
  | "content"
  | "research"
  | "admin"
  | "activation";

export type OutreachSubtype = "warm" | "cold";

export type TemplateType =
  | "reconnect_email"
  | "linkedin_dm"
  | "referral_ask_email"
  | "verbal_positioning_statement";

export interface CommunityRef {
  name: string;
  platform: string;
  url: string;
  description: string;
}

/**
 * Move artefact — flat representation across all four variants.
 * Per-variant fields are nullable when not applicable to the active `type`.
 */
export interface Move {
  type: "direct" | "platform" | "visibility" | "community";
  // Direct
  format: DirectFormat | null;
  subject: string | null;
  draft: string | null;
  // Platform
  platform_name: string | null;
  platform_url: string | null;
  profile_setup_guide: string | null;
  inbound_timing: string | null;
  // Visibility
  post_draft: string | null;
  // Community
  communities: CommunityRef[] | null;
  first_contribution_prompt: string | null;
  // Shared
  tone_note: string;
  personalisation_instructions: string;
}

export interface ApolloQuery {
  person_titles: string[];
  sector_keywords: string;
  seniority_levels: string[];
  location: string;
  company_size_ranges: string[];
}

export interface TimeAllocationEntry {
  strand_key: string;
  minutes: string;
}

export interface Task {
  task_id: string;
  strand_id: string;
  task_type: TaskType;
  move_type: MoveType | null;
  description: string;
  outreach_subtype: OutreachSubtype | null;
  apollo_query: ApolloQuery | null;
  move: Move | null;
  outreach_draft: string | null;
  // Runtime additions written after the canonical schema:
  //   - status, update_notes — written by process-checkin via plan_updates
  //     (values: "completed" | "missed" | "moved").
  //   - sent_at, plus the "sent" status — written by the mark-task-sent
  //     edge function when the user taps "Mark as sent" on /plan.
  //   - response_received, response_logged_at — written by mark-task-response
  //     when the user taps "Got a reply" or "No reply yet" on a sent Direct
  //     task. Feeds the Non-Response Catcher suppression rule (Phase 3 of
  //     the coaching layer; admin/coaching-layer-design.md §4.2).
  //       response_received === true  → reply landed; Catcher suppressed.
  //       response_received === false → user logged the silence; Catcher
  //                                     still fires at 5-day mark.
  //       response_received === null  → no signal yet; Catcher fires at
  //                                     5-day mark.
  // See admin/coaching-layer-design.md (Phase 1 + Phase 3, 2026-05-18).
  status?: "completed" | "missed" | "moved" | "sent" | null;
  sent_at?: string | null;
  update_notes?: string | null;
  response_received?: boolean | null;
  response_logged_at?: string | null;
}

export interface DayDetail {
  day: string;
  label: string;
  time_required: string;
  // Note: schema is an array, but the deployed adapter converts it to an object
  // form (Record<string, string>) before persistence. Components must handle both.
  time_allocation: TimeAllocationEntry[] | Record<string, string>;
  tasks: Task[];
}

export interface Phase {
  phase: string;
  days: string;
  goal: string;
  strand_focus: string;
  days_detail: DayDetail[];
}

export interface PortfolioStrandSummary {
  strand_id: string;
  model_name: string;
  rank: number;
  why_included: string;
  time_weight: number;
}

export interface TractionSignal {
  signal: string;
  weight: SignalWeight;
}

export interface TractionSignalGroup {
  strand_id: string;
  model_name: string;
  signals: TractionSignal[];
}

export interface ReviewBlock {
  trigger_day: number;
  questions: string[];
}

export interface NetworkTemplate {
  type: TemplateType;
  strand_id: string;
  use_case: string;
  subject: string | null;
  content: string;
}

export interface ActivationPlanOutput {
  portfolio_summary: {
    strand_count: number;
    strands: PortfolioStrandSummary[];
    strategy: string;
    effort_distribution: string;
  };
  first_move: {
    action: string;
    strand_id: string;
    move_type: MoveType;
    window: string;
    why_first: string;
    move: Move;
    follow_up_prompt: string;
  };
  activation_plan: {
    summary: string;
    pacing_note: string;
    network_note: string;
    phases: Phase[];
    success_metric: string;
  };
  traction_signals: TractionSignalGroup[];
  portfolio_review_guide: {
    review_1: ReviewBlock;
    review_2: ReviewBlock;
  };
  network_toolkit: {
    intro: string;
    templates: NetworkTemplate[];
  };
}

// ============================================================================
// 3. Market snapshot (MarketSnapshotOutput) — mirrors prompts/market-snapshot-schema.ts
// ============================================================================

export interface MarketSnapshotOutput {
  sections: {
    demand_signal: string;
    pricing_benchmark: string;
    competitor_landscape: string;
    market_entry_insight: string;
    honest_assessment: string;
  };
}

// ============================================================================
// 4. Unified report row — frontend-only wrapper for the `reports` table
//
// Combines the canonical jsonb columns with the legacy text columns kept for
// backward compatibility (export-pdf, edge function inputs, etc). The `reports`
// table is the source of truth; this type is a frontend convenience.
// ============================================================================

export interface ReportRow {
  id: string;
  status:
    | "pending"
    | "generating"
    | "teaser_ready"
    | "pending_selection"
    | "generating_plan"
    | "complete"
    | "failed";
  /** Legacy text column. Superseded by `core_report.hook_insight`. */
  hook_insight: string | null;
  core_report: SoloCoreReport | null;
  activation_plan: ActivationPlanOutput | null;
  /**
   * Per-strand market snapshots, keyed by strand_id. Each value is the
   * canonical `MarketSnapshotOutput["sections"]` plus envelope fields
   * (`strand_id`, `model_name`, `location`) added by `generate-plan`.
   */
  market_snapshots: Record<
    string,
    {
      strand_id: string;
      model_name: string;
      location: string;
      sections: MarketSnapshotOutput["sections"];
    }
  > | null;
  /** Legacy text column kept for export-pdf compatibility. */
  market_snapshot: string | null;
  recommended_selection: SoloCoreReport["recommended_selection"] | null;
  /** Duplicate jsonb column of `core_report.ai_impact`. */
  ai_impact_section: SoloCoreReport["ai_impact"] | null;
  selected_strands: Array<{
    strand_id: string;
    rank: number;
    option: SoloCoreReport["options"][number];
    primary_move_type: string;
    structural_warmth: boolean;
    warmth_type: "relational" | "structural";
  }> | null;
  selected_option_rank: number | null;
}
