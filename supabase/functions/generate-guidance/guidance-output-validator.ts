// generate-guidance/guidance-output-validator.ts
//
// Per-module output validator with retry-message builder.
// ADR-009 / ADR-019 ironclad pattern.
//
// The schema layer (guidance-output-schemas.ts + OpenAI strict json_schema mode)
// enforces SHAPE. This validator enforces SUBSTANCE: every required field is
// present, non-empty, and meets minimum-length floors.

import type { RichModule } from "../_shared/modules-library-rich.ts";

export interface ValidationResult {
  passed: boolean;
  missing: string[];
  too_short: Array<{ field: string; word_count: number; floor: number }>;
  empty: string[];
}

// Per-output-type word-count floors. These prevent the model from producing a
// schema-valid response that's actually a one-line stub.
const FLOOR_BY_TYPE: Record<string, Record<string, number>> = {
  decision_with_rationale: {
    rationale: 50,
    recommendation: 5,
  },
  sequenced_checklist: {
    summary: 20,
  },
  pricing_recommendation: {
    rate_recommendation: 30,
    rate_rationale: 50,
    rate_structure_guide: 40,
    negotiation_framework: 40,
    rate_review_timeline: 25,
  },
  rate_setting: {
    rate_recommendation: 30,
    rate_rationale: 50,
  },
  risk_profile: {
    risk_level: 5,
    rationale: 50,
  },
  contract_checklist: {
    summary: 20,
  },
  insurance_brief: {
    summary: 20,
  },
  action_plan: {
    summary: 20,
  },
  domain_email_linkedin_action_plan: {
    summary: 20,
  },
  sector_independence_guide: {
    summary: 30,
  },
};

const DEFAULT_FLOOR_WORDS = 8;

function countWords(s: unknown): number {
  if (typeof s !== "string") return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function validateGuidanceOutput(
  output: Record<string, unknown>,
  module: RichModule,
): ValidationResult {
  const requiredKeys = Object.keys(module.output_structure || {});
  const floorsForType = FLOOR_BY_TYPE[module.output_type] || {};

  const missing: string[] = [];
  const empty: string[] = [];
  const too_short: ValidationResult["too_short"] = [];

  for (const key of requiredKeys) {
    if (!(key in output) || output[key] == null) {
      missing.push(key);
      continue;
    }
    const value = output[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        empty.push(key);
        continue;
      }
      const floor = floorsForType[key] ?? DEFAULT_FLOOR_WORDS;
      const wc = countWords(trimmed);
      if (wc < floor) {
        too_short.push({ field: key, word_count: wc, floor });
      }
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        empty.push(key);
      }
    }
    // Other types (objects, numbers, booleans) pass shape check; type validity is
    // already guaranteed by the strict json_schema layer.
  }

  return {
    passed: missing.length === 0 && empty.length === 0 && too_short.length === 0,
    missing,
    too_short,
    empty,
  };
}

export function buildGuidanceRetryMessage(validation: ValidationResult, module: RichModule): string {
  const parts: string[] = [
    "Your previous response did not meet the canonical quality bar for this module. Fix the issues below and return a new JSON object matching the same output_structure.",
  ];

  if (validation.missing.length > 0) {
    parts.push(`\nMissing required fields: ${validation.missing.join(", ")}.`);
    parts.push("Every key in the module's output_structure must appear in your response.");
  }

  if (validation.empty.length > 0) {
    parts.push(`\nEmpty or null fields that should be populated: ${validation.empty.join(", ")}.`);
    parts.push("These fields must contain substantive content.");
  }

  if (validation.too_short.length > 0) {
    parts.push("\nFields below the minimum word-count floor for this module's output_type:");
    for (const t of validation.too_short) {
      parts.push(`  - ${t.field}: ${t.word_count} words (floor: ${t.floor}+ words). Expand with specific detail grounded in this user's actual context.`);
    }
    parts.push(`\nNote: this module's output_type is "${module.output_type}". Each field must be substantive and reference the user's actual archetype, sector, prior modules, or tracker progress — not generic guidance.`);
  }

  parts.push("\nReturn only the JSON object. No preamble, no explanation.");

  return parts.join("\n");
}
