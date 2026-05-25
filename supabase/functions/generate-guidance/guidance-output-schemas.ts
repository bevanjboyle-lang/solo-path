// generate-guidance/guidance-output-schemas.ts (v28)
//
// Universal ModuleOutputV3 strict json_schema for OpenAI response_format.
// One schema, used across all 32 modules per Q1a (locked 2026-05-25 design session).
//
// v27 used per-module dynamic schemas built from each module's bespoke
// output_structure. v28 replaces that with a single canonical shape:
//   short_version + playbook[] + reference_layer_ids[] + check_in_commitment + caveat_personalised_tail
//
// OpenAI strict-mode constraints (per ADR-019 / report-schema.ts pattern):
//   - additionalProperties: false on every object
//   - Every property must appear in `required`
//
// Source of truth: admin/canonical-guidance-module-1-addendum-and-schema-v28-draft.md §2.

// ===== Runtime TypeScript types =====

export interface Commitment {
  action: string;
  target_day: number;
  verification_question: string;
}

export interface CheckInCommitment {
  summary_prose: string;
  commitments: Commitment[];
}

export interface PlaybookStep {
  title: string;
  personalised_lead: string;
  what_it_is: string;
  how: string;
  cost: string;
  pitfall: string;
  what_to_expect_next: string;
}

export interface ModuleOutputV3 {
  short_version: string;
  playbook: PlaybookStep[];
  reference_layer_ids: number[];
  check_in_commitment: CheckInCommitment;
  caveat_personalised_tail: string;
}

// The persisted shape on guidance_module_completions.output has the same
// fields except the caveat is the FULL concatenated string (curated base +
// personalised tail) rather than just the tail. The edge function performs
// the concatenation post-generation, pre-persistence.
export interface PersistedModuleOutput {
  short_version: string;
  playbook: PlaybookStep[];
  reference_layer_ids: number[];
  check_in_commitment: CheckInCommitment;
  caveat: string;
}

// ===== OpenAI structured-output schema =====

export const MODULE_OUTPUT_V3_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "ModuleOutputV3",
    strict: true as const,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "short_version",
        "playbook",
        "reference_layer_ids",
        "check_in_commitment",
        "caveat_personalised_tail",
      ],
      properties: {
        short_version: {
          type: "string",
          description: "120-200 words. The punchy lead carrying the module's recommendation or top-line.",
        },
        playbook: {
          type: "array",
          description: "4-6 action steps, every step actionable per Path C discipline.",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "personalised_lead",
              "what_it_is",
              "how",
              "cost",
              "pitfall",
              "what_to_expect_next",
            ],
            properties: {
              title: {
                type: "string",
                description: "Short, declarative, starts with numeral. Optional timing hint in parentheses.",
              },
              personalised_lead: {
                type: "string",
                description: "1-3 sentences referencing user-specific data by specific value.",
              },
              what_it_is: {
                type: "string",
                description: "1-3 sentences naming the thing the user is doing.",
              },
              how: {
                type: "string",
                description: "Procedural detail. URL, form name, broker route. Drawn from curated knowledge; concrete enough to act on.",
              },
              cost: {
                type: "string",
                description: "Money, time, or effort cost. Concrete.",
              },
              pitfall: {
                type: "string",
                description: "One specific behaviour or assumption the user is likely to fall into, stated as observed behaviour.",
              },
              what_to_expect_next: {
                type: "string",
                description: "What the user can expect after taking the action. Concrete and named.",
              },
            },
          },
        },
        reference_layer_ids: {
          type: "array",
          description: "Integer IDs picked from the reference item menu in display order. 6-10 items (or fewer if the menu is shorter).",
          items: {
            type: "integer",
          },
        },
        check_in_commitment: {
          type: "object",
          additionalProperties: false,
          required: ["summary_prose", "commitments"],
          properties: {
            summary_prose: {
              type: "string",
              description: "40-80 words. The paragraph the user reads at the end of the module naming what Solo will ask about.",
            },
            commitments: {
              type: "array",
              description: "1-3 machine-readable commitments matched to the playbook actions Solo will verify in the daily check-in.",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["action", "target_day", "verification_question"],
                properties: {
                  action: {
                    type: "string",
                    description: "Verb-phrase Solo tracks. Short.",
                  },
                  target_day: {
                    type: "integer",
                    description: "Tracker day 1-30 by which Solo expects this commitment to be begun.",
                  },
                  verification_question: {
                    type: "string",
                    description: "Exact text Solo will ask in the check-in. Yes/no question.",
                  },
                },
              },
            },
          },
        },
        caveat_personalised_tail: {
          type: "string",
          description: "One final sentence referencing the user's specific sector or structure choice. The edge function concatenates the curated caveat base (with [DATE] substituted) before this tail to produce the full caveat persisted on the record.",
        },
      },
    },
  },
} as const;

// Version marker (matched in deploy verification greps)
export const MODULE_OUTPUT_V3_SCHEMA_VERSION = "v28-module-output-v3";
