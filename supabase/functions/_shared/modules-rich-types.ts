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
  track: "A" | "B" | "C" | "D" | "E";
  access_tier: "tranche_1" | "subscription";
  applicable_sectors: string[] | null;
  applicable_archetypes?: string[] | null;
  prerequisite_module: number | null;
  area: string;
  trigger_phase: string;
  estimated_minutes: number;
  output_type: string;
  description: string;
  questions: RichModuleQuestion[];
  decision_logic?: Record<string, string>;
  ico_logic?: Record<string, unknown>;
  output_structure: Record<string, string>;
}
