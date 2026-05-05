/**
 * Canonical JSON Schema for Solo activation-plan output (Prompt 3 / generate-plan).
 *
 * USAGE: passed to OpenAI `response_format: { type: "json_schema", json_schema: ACTIVATION_PLAN_SCHEMA }`
 * to guarantee structural correctness of the activation-plan response.
 *
 * This schema enforces SHAPE ONLY (presence, type, enum, required fields).
 * Narrative quality, move-type-vs-strand alignment, and field-of-play differentiation
 * rules are enforced by prompt-level QUALITY RULES + downstream validators.
 *
 * Reference: prompts/prompt-3-portfolio-activation.md (canonical prompt + OUTPUT FORMAT)
 * Related: ADR-019 (ironclad rewrite — canonical schema in repo, validator + retry)
 *
 * SYNC DISCIPLINE: this schema is the source of truth for the activation-plan response
 * shape. The deployed `generate-plan` edge function imports it directly. If the canonical
 * prompt's OUTPUT FORMAT changes, update this file in the same commit and re-deploy.
 *
 * OpenAI strict-mode constraints observed:
 *   - Every object must have additionalProperties: false
 *   - Every property must appear in `required`
 *   - Number/integer types use `type` only; no minLength / maxLength / minItems
 *   - Unions use anyOf (not oneOf) or nullable pattern
 *   - All optional-by-variant fields are present-but-nullable (flat schema for the Move object)
 *
 * NOTE on the Move object: the canonical prompt describes four type-tagged variants
 * (direct / platform / visibility / community). To stay strict-mode-friendly we use
 * a single flat object with all possible fields nullable. The `type` discriminator + the
 * prompt-level "Move artefacts must match the strand's primary_move_type" QUALITY RULE
 * govern which fields are populated. A Direct move has platform_name=null, etc.
 *
 * NOTE on network_toolkit templates: the canonical prompt describes 4 template variants
 * where 3 use `body` (emails, DMs) and 1 uses `statement` (verbal_positioning_statement).
 * For schema simplicity we collapse these into a unified `content` field. Type discriminates
 * which variant it is. `subject` is nullable for non-email types.
 */

export const ACTIVATION_PLAN_SCHEMA = {
  name: "solo_activation_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "portfolio_summary",
      "first_move",
      "activation_plan",
      "traction_signals",
      "portfolio_review_guide",
      "network_toolkit",
    ],
    properties: {
      // ================================================================
      // 1. Portfolio summary
      // ================================================================
      portfolio_summary: {
        type: "object",
        additionalProperties: false,
        required: [
          "strand_count",
          "strands",
          "strategy",
          "effort_distribution",
        ],
        properties: {
          strand_count: { type: "integer" },
          strands: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "strand_id",
                "model_name",
                "rank",
                "why_included",
                "time_weight",
              ],
              properties: {
                strand_id: { type: "string" },
                model_name: { type: "string" },
                rank: { type: "integer" },
                why_included: { type: "string" },
                time_weight: { type: "number" },
              },
            },
          },
          strategy: { type: "string" },
          effort_distribution: { type: "string" },
        },
      },

      // ================================================================
      // 2. First move
      // ================================================================
      first_move: {
        type: "object",
        additionalProperties: false,
        required: [
          "action",
          "strand_id",
          "move_type",
          "window",
          "why_first",
          "move",
          "follow_up_prompt",
        ],
        properties: {
          action: { type: "string" },
          strand_id: { type: "string" },
          move_type: {
            type: "string",
            enum: ["direct", "platform", "visibility", "community", "mixed"],
          },
          window: { type: "string" },
          why_first: { type: "string" },
          move: { $ref: "#/$defs/move" },
          follow_up_prompt: { type: "string" },
        },
      },

      // ================================================================
      // 3. Activation plan
      // ================================================================
      activation_plan: {
        type: "object",
        additionalProperties: false,
        required: [
          "summary",
          "pacing_note",
          "network_note",
          "phases",
          "success_metric",
        ],
        properties: {
          summary: { type: "string" },
          pacing_note: { type: "string" },
          network_note: { type: "string" },
          phases: {
            type: "array",
            items: { $ref: "#/$defs/phase" },
          },
          success_metric: { type: "string" },
        },
      },

      // ================================================================
      // 4. Traction signals
      // ================================================================
      traction_signals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["strand_id", "model_name", "signals"],
          properties: {
            strand_id: { type: "string" },
            model_name: { type: "string" },
            signals: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["signal", "weight"],
                properties: {
                  signal: { type: "string" },
                  weight: {
                    type: "string",
                    enum: [
                      "negative",
                      "neutral",
                      "moderate",
                      "strong",
                      "very_strong",
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // ================================================================
      // 5. Portfolio review guide
      // ================================================================
      portfolio_review_guide: {
        type: "object",
        additionalProperties: false,
        required: ["review_1", "review_2"],
        properties: {
          review_1: { $ref: "#/$defs/reviewBlock" },
          review_2: { $ref: "#/$defs/reviewBlock" },
        },
      },

      // ================================================================
      // 6. Network toolkit
      // ================================================================
      network_toolkit: {
        type: "object",
        additionalProperties: false,
        required: ["intro", "templates"],
        properties: {
          intro: { type: "string" },
          templates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "type",
                "strand_id",
                "use_case",
                "subject",
                "content",
              ],
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "reconnect_email",
                    "linkedin_dm",
                    "referral_ask_email",
                    "verbal_positioning_statement",
                  ],
                },
                strand_id: { type: "string" },
                use_case: { type: "string" },
                // subject: present for emails, null for linkedin_dm and verbal
                subject: { type: ["string", "null"] },
                // content: holds `body` for emails+DMs, `statement` for verbal_positioning_statement
                content: { type: "string" },
              },
            },
          },
        },
      },
    },

    // ================================================================
    // Shared sub-schemas
    // ================================================================
    $defs: {
      // ----------------------------------------------------------------
      // Move object — flat representation of all four variants.
      // Type discriminates; per-variant fields are nullable when not applicable.
      // ----------------------------------------------------------------
      move: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          // Direct fields
          "format",
          "subject",
          "draft",
          // Platform fields
          "platform_name",
          "platform_url",
          "profile_setup_guide",
          "inbound_timing",
          // Visibility fields
          "post_draft",
          // Community fields
          "communities",
          "first_contribution_prompt",
          // Shared fields (all types)
          "tone_note",
          "personalisation_instructions",
        ],
        properties: {
          type: {
            type: "string",
            enum: ["direct", "platform", "visibility", "community"],
          },
          // ---- Direct-only fields (nullable for other types) ----
          format: {
            type: ["string", "null"],
            enum: [
              "email_reconnect",
              "email_cold",
              "email_referral_ask",
              "linkedin_dm",
              "verbal",
              null,
            ],
          },
          subject: { type: ["string", "null"] },
          draft: { type: ["string", "null"] },
          // ---- Platform-only fields ----
          platform_name: { type: ["string", "null"] },
          platform_url: { type: ["string", "null"] },
          profile_setup_guide: { type: ["string", "null"] },
          inbound_timing: { type: ["string", "null"] },
          // ---- Visibility-only fields ----
          post_draft: { type: ["string", "null"] },
          // ---- Community-only fields ----
          communities: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "platform", "url", "description"],
                  properties: {
                    name: { type: "string" },
                    platform: { type: "string" },
                    url: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
              { type: "null" },
            ],
          },
          first_contribution_prompt: { type: ["string", "null"] },
          // ---- Shared fields (all types) ----
          tone_note: { type: "string" },
          personalisation_instructions: { type: "string" },
        },
      },

      // ----------------------------------------------------------------
      // Phase — one of the 4 phases of the activation plan
      // ----------------------------------------------------------------
      phase: {
        type: "object",
        additionalProperties: false,
        required: ["phase", "days", "goal", "strand_focus", "days_detail"],
        properties: {
          phase: { type: "string" },
          days: { type: "string" },
          goal: { type: "string" },
          strand_focus: { type: "string" },
          days_detail: {
            type: "array",
            items: { $ref: "#/$defs/dayDetail" },
          },
        },
      },

      // ----------------------------------------------------------------
      // DayDetail — one day inside a phase
      // ----------------------------------------------------------------
      dayDetail: {
        type: "object",
        additionalProperties: false,
        required: [
          "day",
          "label",
          "time_required",
          "time_allocation",
          "tasks",
        ],
        properties: {
          day: { type: "string" },
          label: { type: "string" },
          time_required: { type: "string" },
          // time_allocation is a free-form map of strand_id (or "shared") -> minutes string.
          // Strict mode requires a known shape, so we model as an object with no required keys
          // by treating it as an array of {strand_key, minutes} entries.
          time_allocation: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["strand_key", "minutes"],
              properties: {
                strand_key: { type: "string" },
                minutes: { type: "string" },
              },
            },
          },
          tasks: {
            type: "array",
            items: { $ref: "#/$defs/task" },
          },
        },
      },

      // ----------------------------------------------------------------
      // Task — one task inside a day
      // ----------------------------------------------------------------
      task: {
        type: "object",
        additionalProperties: false,
        required: [
          "task_id",
          "strand_id",
          "task_type",
          "move_type",
          "description",
          "outreach_subtype",
          "apollo_query",
          "move",
          "outreach_draft",
        ],
        properties: {
          task_id: { type: "string" },
          strand_id: { type: "string" },
          task_type: {
            type: "string",
            enum: [
              "foundation",
              "outreach",
              "content",
              "research",
              "admin",
              "activation",
            ],
          },
          // move_type: nullable on non-activation tasks
          move_type: {
            type: ["string", "null"],
            enum: [
              "direct",
              "platform",
              "visibility",
              "community",
              "mixed",
              null,
            ],
          },
          description: { type: "string" },
          // outreach_subtype: only set on outreach/activation tasks; null otherwise
          outreach_subtype: {
            type: ["string", "null"],
            enum: ["warm", "cold", null],
          },
          // apollo_query: only present on cold outreach tasks; null otherwise
          apollo_query: {
            anyOf: [
              { $ref: "#/$defs/apolloQuery" },
              { type: "null" },
            ],
          },
          // move: populated for activation tasks; null otherwise
          move: {
            anyOf: [
              { $ref: "#/$defs/move" },
              { type: "null" },
            ],
          },
          // outreach_draft: legacy field for backwards compatibility — null for new tasks
          outreach_draft: { type: ["string", "null"] },
        },
      },

      // ----------------------------------------------------------------
      // Apollo query — Apollo contact-search parameters for cold outreach tasks
      // ----------------------------------------------------------------
      apolloQuery: {
        type: "object",
        additionalProperties: false,
        required: [
          "person_titles",
          "sector_keywords",
          "seniority_levels",
          "location",
          "company_size_ranges",
        ],
        properties: {
          person_titles: {
            type: "array",
            items: { type: "string" },
          },
          sector_keywords: { type: "string" },
          seniority_levels: {
            type: "array",
            items: { type: "string" },
          },
          location: { type: "string" },
          company_size_ranges: {
            type: "array",
            items: { type: "string" },
          },
        },
      },

      // ----------------------------------------------------------------
      // Review block — used for review_1 and review_2 inside portfolio_review_guide
      // ----------------------------------------------------------------
      reviewBlock: {
        type: "object",
        additionalProperties: false,
        required: ["trigger_day", "questions"],
        properties: {
          trigger_day: { type: "integer" },
          questions: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

// ================================================================
// TypeScript types derived from the schema for use in the edge function
// ================================================================

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
}

export interface DayDetail {
  day: string;
  label: string;
  time_required: string;
  time_allocation: TimeAllocationEntry[];
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
