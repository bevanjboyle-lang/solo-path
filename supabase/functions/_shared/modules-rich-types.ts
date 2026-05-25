// _shared/modules-rich-types.ts
// Shared types for the rich module library (split into chunks for file-size manageability).

export interface RichModuleQuestion {
  id: string;
  text: string;
  type: "text" | "choice" | "number";
  options?: string[];
  optional?: boolean;
  placeholder?: string;
  pre_populate_from?: string;
}

export interface RichModule {
  id: number;
  name: string;
  // Track F (Rejection & Resilience) added 2026-05-18 for coaching layer
  // Phase 5b (admin/coaching-layer-design.md v1.10 §4.4).
  track: "A" | "B" | "C" | "D" | "E" | "F";
  access_tier: "tranche_1" | "subscription";
  applicable_sectors: string[] | null;
  applicable_archetypes?: string[] | null;
  prerequisite_module: number | null;
  area: string;
  trigger_phase: string;
  estimated_minutes: number;
  output_type: string;
  description: string;
  // 2026-05-25 Option B reconciliation: one-line value-promise shown on the
  // article-detail view in the /library drawer ("You'll get…"). Migrated from
  // the now-retired _shared/modules-library.ts. Optional during migration so
  // partially-populated module files still typecheck; Library.tsx falls back
  // to the description when absent. Once all 32 modules carry a value, this
  // field can be tightened to required.
  what_you_get?: string;
  questions: RichModuleQuestion[];
  decision_logic?: Record<string, string>;
  ico_logic?: Record<string, unknown>;
  output_structure: Record<string, string>;
  // v28 (2026-05-26): module_addendum carries the per-module Part B knowledge
  // block consumed by generate-guidance v28. Optional during workstream
  // rollout, modules without an addendum return 422 from v28 (see
  // admin/canonical-guidance-v28-implementation-design.md §2.5).
  module_addendum?: ModuleAddendum;
}

// v28 module addendum. Part B of the three-part prompt composition
// (Part A = shared canonical prefix, Part B = this addendum,
// Part C = runtime user context). Authored per module as part of the
// guidance enrichment workstream content phase.
export interface ModuleAddendum {
  module_decision_frame: string;
  module_specific_knowledge: string;
  curated_caveat_base: string;
  curated_caveat_verified_date: string;
  commitments_template: ModuleCommitmentTemplate[];
  prerequisite_outputs: unknown;
}

export interface ModuleCommitmentTemplate {
  action_hint: string;
  target_day: number;
  verification_question: string;
}
