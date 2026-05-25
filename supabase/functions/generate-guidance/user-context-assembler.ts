// generate-guidance/user-context-assembler.ts
//
// Server-side context assembly for generate-guidance v26 (canonical reconciliation).
//
// Per the spec at admin/generate-guidance-canonical-reconciliation-design.md §5:
// the function takes only module_id + module_answers from the frontend. All user
// context is assembled server-side from Supabase. This eliminates the trust boundary
// and ensures the same context is used regardless of which client calls.
//
// Schema canonical: prompts/prompt-8-guidance-module.md §USER CONTEXT SCHEMA, plus
// two documented extensions:
//   1. Portfolio-aware plan section (selected_strands array + primary_strand_id)
//   2. business_profile section (operational state of the user's independent practice)

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Schema types ──────────────────────────────────────────────────────────────

export interface UserContext {
  questionnaire: Record<string, string | null>;
  plan: PlanContext | null;
  cv_extract: CvExtractContext | null;
  tracker: TrackerContext | null;
  business_profile: BusinessProfileContext | null;
  completed_modules: Record<string, CompletedModuleEntry>;
}

export interface PlanContext {
  primary_archetype: string;
  hook_insight_headline: string | null;
  selected_strands: PlanStrand[];
  primary_strand_id: string | null;
  primary_strand_commercial_type: string | null;
}

export interface PlanStrand {
  strand_id: string;
  rank: number;
  model_name: string;
  commercial_type: string | null;
  primary_move_type: string | null;
  structural_warmth: boolean | null;
  what_they_can_sell: string | null;
  target_buyer: string | null;
  pricing_range: string | null;
}

export interface CvExtractContext {
  career_highlights: string[] | null;
  qualifications: string[] | null;
  sectors_worked_in: string[] | null;
  skills_mentioned: string[] | null;
  independent_experience: string | null;
}

export interface TrackerContext {
  current_day: number | null;
  current_phase: string | null;
  progress_pct: number | null;
  running_narrative: string | null;
  checkin_trajectory: "on_track" | "drifting" | "significantly_behind" | "not_started";
  circumstance_changes: string | null;
}

export interface BusinessProfileContext {
  legal_structure: string | null;
  legal_structure_decided_at: string | null;
  vat_status: string | null;
  ir35_exposure: string | null;
  day_rate_pence: number | null;
  hourly_rate_pence: number | null;
  target_annual_income_pence: number | null;
  has_professional_indemnity: boolean | null;
  has_public_liability: boolean | null;
  has_income_protection: boolean | null;
  ico_registered: boolean | null;
  self_assessment_registered: boolean | null;
  pension_setup: boolean | null;
  domain_name: string | null;
  linkedin_url: string | null;
  accounting_software: string | null;
}

export interface CompletedModuleEntry {
  name: string;
  output: Record<string, unknown>;
  completed_at: string;
  track: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const QUESTIONNAIRE_KEY_MAP: Record<string, string> = {
  "1":  "q1_job_title",
  "2":  "q2_years_experience",
  "3":  "q3a_sector",
  "3b": "q3b_employer_org_type",
  "30": "q3b_employer_org_type",          // legacy alias
  "4":  "q4_work_type",
  "5":  "q5_seniority",
  "6":  "q6_specific_achievement",
  "7":  "q7_informal_advisory",
  "8":  "q8_peer_perception",
  "9":  "q9_income_urgency",
  "10": "q10_independence_confidence",
  "11": "q11_sector_client_context",
  "12": "q12_independent_experience",
  "13": "q13_network",
  "14": "q14_employment_status",
  "15": "q15_location",
};

function buildQuestionnaireBlock(answers: Record<string, unknown> | null): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const v of Object.values(QUESTIONNAIRE_KEY_MAP)) {
    out[v] = null;
  }
  if (!answers) return out;
  for (const [key, value] of Object.entries(answers)) {
    const mapped = QUESTIONNAIRE_KEY_MAP[key];
    if (mapped && (value === null || typeof value === "string" || typeof value === "number")) {
      out[mapped] = value === null ? null : String(value);
    }
  }
  return out;
}

function derivePrimaryStrandId(
  selectedStrands: PlanStrand[],
  focusStrands: string[] | null,
): string | null {
  if (focusStrands && focusStrands.length > 0) {
    return focusStrands[0];
  }
  if (selectedStrands.length === 0) return null;
  // Prefer rank 1; otherwise lowest rank
  const sortedByRank = [...selectedStrands].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return sortedByRank[0]?.strand_id ?? null;
}

function buildPlanBlock(
  coreReport: Record<string, unknown> | null,
  selectedStrandsRaw: unknown,
  focusStrands: string[] | null,
): PlanContext | null {
  if (!coreReport) return null;

  // Archetype: canonical shape uses archetype.primary; fall back to archetype.name (legacy)
  const archetype = (coreReport.archetype ?? null) as { primary?: string; name?: string } | null;
  const primaryArchetype = archetype?.primary || archetype?.name || "";

  // Hook insight headline
  let hookInsightHeadline: string | null = null;
  const hookInsight = (coreReport.hook_insight ?? null) as { headline?: string } | string | null;
  if (typeof hookInsight === "string") {
    hookInsightHeadline = hookInsight;
  } else if (hookInsight && typeof hookInsight === "object") {
    hookInsightHeadline = hookInsight.headline ?? null;
  }

  // Selected strands — normalise into PlanStrand[]
  const strands: PlanStrand[] = [];
  if (Array.isArray(selectedStrandsRaw)) {
    for (const raw of selectedStrandsRaw as Record<string, unknown>[]) {
      const strand_id = (raw.strand_id as string) || "";
      if (!strand_id) continue;
      const option = (raw.option as Record<string, unknown>) || {};
      strands.push({
        strand_id,
        rank: (raw.rank as number) ?? 0,
        model_name: (raw.model_name as string) || (option.model_name as string) || "",
        commercial_type: (option.commercial_model as string) || (raw.commercial_type as string) || null,
        primary_move_type: (raw.primary_move_type as string) || (option.primary_move_type as string) || null,
        structural_warmth: (raw.structural_warmth as boolean) ?? (option.structural_warmth as boolean) ?? null,
        what_they_can_sell: (option.what_they_can_sell as string) || null,
        target_buyer: (option.target_buyer as string) || null,
        pricing_range: typeof option.pricing === "object" && option.pricing !== null
          ? JSON.stringify(option.pricing)
          : (option.pricing as string) || (option.day_rate_band as string) || null,
      });
    }
  }

  const primaryStrandId = derivePrimaryStrandId(strands, focusStrands);
  const primaryStrand = strands.find(s => s.strand_id === primaryStrandId);

  return {
    primary_archetype: primaryArchetype,
    hook_insight_headline: hookInsightHeadline,
    selected_strands: strands,
    primary_strand_id: primaryStrandId,
    primary_strand_commercial_type: primaryStrand?.commercial_type ?? null,
  };
}

function buildCvExtractBlock(cvExtract: Record<string, unknown> | null): CvExtractContext | null {
  if (!cvExtract || typeof cvExtract !== "object") return null;
  return {
    career_highlights: (cvExtract.career_highlights as string[]) ?? null,
    qualifications: (cvExtract.qualifications as string[]) ?? null,
    sectors_worked_in: (cvExtract.sectors_worked_in as string[]) ?? null,
    skills_mentioned: (cvExtract.skills_mentioned as string[]) ?? null,
    independent_experience: (cvExtract.independent_experience as string) ?? null,
  };
}

function buildTrackerBlock(
  tracker: Record<string, unknown> | null,
): TrackerContext | null {
  if (!tracker) {
    return {
      current_day: null,
      current_phase: null,
      progress_pct: null,
      running_narrative: null,
      checkin_trajectory: "not_started",
      circumstance_changes: null,
    };
  }

  const currentDay = (tracker.current_day as number) ?? null;
  const tasksCompleted = (tracker.tasks_completed as number) ?? null;
  const tasksTotal = (tracker.tasks_total as number) ?? null;
  let progressPct: number | null = null;
  if (tasksTotal && tasksTotal > 0 && typeof tasksCompleted === "number") {
    progressPct = Math.round((tasksCompleted / tasksTotal) * 100);
  }

  let trajectory: TrackerContext["checkin_trajectory"] = "not_started";
  const planState = (tracker.plan_state as string) ?? "";
  if (planState === "active" || planState === "pending") trajectory = "on_track";
  if ((tracker.replan_pending as boolean) === true) trajectory = "significantly_behind";

  return {
    current_day: currentDay,
    current_phase: null,  // Derivation deferred — would need to read working_plan and find current phase
    progress_pct: progressPct,
    running_narrative: (tracker.running_narrative as string) ?? null,
    checkin_trajectory: trajectory,
    circumstance_changes: null,
  };
}

function buildBusinessProfileBlock(
  bp: Record<string, unknown> | null,
): BusinessProfileContext | null {
  if (!bp) return null;
  return {
    legal_structure: (bp.legal_structure as string) ?? null,
    legal_structure_decided_at: (bp.legal_structure_decided_at as string) ?? null,
    vat_status: (bp.vat_status as string) ?? null,
    ir35_exposure: (bp.ir35_exposure as string) ?? null,
    day_rate_pence: (bp.day_rate_pence as number) ?? null,
    hourly_rate_pence: (bp.hourly_rate_pence as number) ?? null,
    target_annual_income_pence: (bp.target_annual_income_pence as number) ?? null,
    has_professional_indemnity: (bp.has_professional_indemnity as boolean) ?? null,
    has_public_liability: (bp.has_public_liability as boolean) ?? null,
    has_income_protection: (bp.has_income_protection as boolean) ?? null,
    ico_registered: (bp.ico_registered as boolean) ?? null,
    self_assessment_registered: (bp.self_assessment_registered as boolean) ?? null,
    pension_setup: (bp.pension_setup as boolean) ?? null,
    domain_name: (bp.domain_name as string) ?? null,
    linkedin_url: (bp.linkedin_url as string) ?? null,
    accounting_software: (bp.accounting_software as string) ?? null,
  };
}

function buildCompletedModulesBlock(
  completions: Array<Record<string, unknown>>,
): Record<string, CompletedModuleEntry> {
  const out: Record<string, CompletedModuleEntry> = {};
  for (const c of completions) {
    const mid = c.module_id as number | undefined;
    if (typeof mid !== "number") continue;
    out[String(mid)] = {
      name: (c.module_name as string) || `Module ${mid}`,
      output: (c.output as Record<string, unknown>) || {},
      completed_at: (c.completed_at as string) || "",
      track: (c.track as string) ?? null,
    };
  }
  return out;
}

// ─── Main assembler ────────────────────────────────────────────────────────────

export async function assembleUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserContext> {
  const [profileResult, qResult, reportResult, trackerResult, businessResult, completionsResult] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("cv_extract, subscription_active, subscription_plan")
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("questionnaire_responses")
        .select("answers")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("reports")
        .select("core_report, selected_strands, focus_strands, hook_insight, user_context_profile")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("tracker_sessions")
        .select("current_day, running_narrative, strand_status, focus_strands, last_checkin_mode, plan_state, status, tasks_completed, tasks_total, replan_pending")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("guidance_module_completions")
        .select("module_id, module_name, output, completed_at, track")
        .eq("user_id", userId),
    ]);

  const profile = (profileResult.data ?? null) as Record<string, unknown> | null;
  const qAnswers = (qResult.data?.answers ?? null) as Record<string, unknown> | null;
  const report = (reportResult.data ?? null) as Record<string, unknown> | null;
  const trackerRaw = (trackerResult.data ?? null) as Record<string, unknown> | null;
  const businessRaw = (businessResult.data ?? null) as Record<string, unknown> | null;
  const completionsRaw = (completionsResult.data ?? []) as Array<Record<string, unknown>>;

  // Focus strands may come from either reports row or tracker row; tracker wins if present
  const focusStrandsTracker = (trackerRaw?.focus_strands as string[] | null) ?? null;
  const focusStrandsReport = (report?.focus_strands as string[] | null) ?? null;
  const focusStrands = focusStrandsTracker ?? focusStrandsReport;

  return {
    questionnaire: buildQuestionnaireBlock(qAnswers),
    plan: report ? buildPlanBlock(
      (report.core_report as Record<string, unknown>) ?? null,
      report.selected_strands,
      focusStrands,
    ) : null,
    cv_extract: buildCvExtractBlock((profile?.cv_extract as Record<string, unknown>) ?? null),
    tracker: buildTrackerBlock(trackerRaw),
    business_profile: buildBusinessProfileBlock(businessRaw),
    completed_modules: buildCompletedModulesBlock(completionsRaw),
  };
}

// ─── v28 addition: reference-items menu fetch ──────────────────────────────────

export interface ReferenceItemMenuEntry {
  id: number;
  content_type: string;
  title: string;
  one_line_description: string;
}

/**
 * Fetch the curated reference items applicable to this module from the
 * module_reference_items table (created in schema v1 Phase A on 2026-05-25).
 *
 * The N:N relationship is encoded by the integer-array column
 * applicable_module_ids, GIN-indexed. We query with the array-contains
 * operator for fast filtering.
 *
 * Returns an empty array if the table is empty for this module or the query
 * fails. The LLM gets an empty menu and returns an empty reference_layer_ids
 * array; the rest of the output is unaffected.
 */
export async function fetchApplicableReferenceItems(
  supabase: SupabaseClient,
  moduleId: number,
): Promise<ReferenceItemMenuEntry[]> {
  const { data, error } = await supabase
    .from("module_reference_items")
    .select("id, content_type, title, one_line_description")
    .contains("applicable_module_ids", [moduleId])
    .order("id", { ascending: true });

  if (error) {
    console.error(`fetchApplicableReferenceItems failed for module ${moduleId}:`, error);
    return [];
  }

  return (data as ReferenceItemMenuEntry[]) ?? [];
}
