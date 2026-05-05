/**
 * Canonical JSON Schema for Solo report output.
 *
 * Edge-function-local copy synced from prompts/report-schema.ts (the canonical
 * source of truth, per ADR-019). If this file drifts from prompts/report-schema.ts,
 * the canonical wins and this copy must be brought back into line.
 *
 * USAGE: passed to OpenAI `response_format: { type: "json_schema", json_schema: REPORT_SCHEMA, strict: true }`
 * to guarantee structural correctness of the core-report response.
 *
 * This schema enforces SHAPE ONLY (presence, type, enum, required fields).
 * Narrative length, richness, never-list terms, and cross-card consistency
 * are enforced by `report-validator.ts`, which runs after the API call.
 *
 * Reference: admin/report-quality-spec.md
 * Related: prompts/prompt-1-core-report.md (narrative rubric), ADR-019.
 *
 * OpenAI strict-mode constraints observed:
 *   - Every object must have additionalProperties: false
 *   - Every property must appear in `required`
 *   - Number/integer types use `type` only; no minLength / maxLength / minItems
 *   - Unions use anyOf (not oneOf) or nullable pattern
 */

export const REPORT_SCHEMA = {
  name: "solo_core_report",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "archetype",
      "transferable_value",
      "transferable_skills",
      "options",
      "recommendation",
      "reality_check",
      "income_outlook",
      "recommended_selection",
      "hook_insight",
      "ai_impact",
    ],
    properties: {
      // ================================================================
      // 1. Archetype
      // ================================================================
      archetype: {
        type: "object",
        additionalProperties: false,
        required: [
          "primary",
          "secondary",
          "confidence",
          "summary",
          "editorial_description",
          "capability_tags",
        ],
        properties: {
          primary: { type: "string" },
          secondary: { type: ["string", "null"] },
          confidence: { type: "number" },
          summary: { type: "string" },
          editorial_description: { type: "string" },
          capability_tags: {
            type: "array",
            items: { type: "string" },
          },
        },
      },

      // ================================================================
      // 2. Transferable value
      // ================================================================
      transferable_value: {
        type: "object",
        additionalProperties: false,
        required: [
          "what_they_can_sell",
          "why_buyers_would_pay",
          "credibility_assets",
        ],
        properties: {
          what_they_can_sell: { type: "string" },
          why_buyers_would_pay: { type: "string" },
          credibility_assets: {
            type: "array",
            items: { type: "string" },
          },
        },
      },

      // ================================================================
      // 3. Transferable skills (exactly 6, enforced in validator)
      // ================================================================
      transferable_skills: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["skill_name", "strength", "evidence", "market_demand"],
          properties: {
            skill_name: { type: "string" },
            strength: { type: "number" },
            evidence: { type: "string" },
            market_demand: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
        },
      },

      // ================================================================
      // 4. Options (exactly 10, enforced in validator per ADR-019)
      // ================================================================
      options: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "rank",
            "model_name",
            "business_model_id",
            "primary_move_type",
            "structural_warmth",
            "composite_score",
            "fit_tags",
            "source",
            "positioning",
            "target_buyer",
            "what_they_are_buying",
            "pricing",
            "time_to_first_revenue",
            "difficulty_rating",
            "why_this_works_for_them",
            "caution_note",
          ],
          properties: {
            rank: { type: "integer" },
            model_name: { type: "string" },
            business_model_id: { type: "string" },
            primary_move_type: {
              type: "string",
              enum: ["direct", "platform", "visibility", "community", "mixed"],
            },
            structural_warmth: { type: "boolean" },
            composite_score: { type: "number" },
            fit_tags: {
              type: "array",
              items: { type: "string" },
            },
            source: {
              type: "string",
              enum: ["primary", "secondary"],
            },
            positioning: { type: "string" },
            target_buyer: { type: "string" },
            what_they_are_buying: { type: "string" },
            pricing: {
              type: "object",
              additionalProperties: false,
              required: ["model", "range_low_gbp", "range_high_gbp", "cadence"],
              properties: {
                model: { type: "string" },
                range_low_gbp: { type: "number" },
                range_high_gbp: { type: "number" },
                cadence: { type: "string" },
              },
            },
            time_to_first_revenue: { type: "string" },
            difficulty_rating: {
              type: "string",
              enum: ["easy", "moderate", "hard"],
            },
            why_this_works_for_them: { type: "string" },
            // caution_note is nullable; many options won't carry one
            caution_note: { type: ["string", "null"] },
          },
        },
      },

      // ================================================================
      // 5. Recommendation
      // ================================================================
      recommendation: {
        type: "object",
        additionalProperties: false,
        required: ["recommended_rank", "rationale", "key_condition"],
        properties: {
          recommended_rank: { type: "integer" },
          rationale: { type: "string" },
          key_condition: { type: "string" },
        },
      },

      // ================================================================
      // 6. Reality check
      // ================================================================
      reality_check: {
        type: "object",
        additionalProperties: false,
        required: [
          "most_likely_failure_mode",
          "second_failure_mode",
          "what_they_will_find_hard",
          "honest_income_outlook",
        ],
        properties: {
          most_likely_failure_mode: { type: "string" },
          second_failure_mode: { type: "string" },
          what_they_will_find_hard: { type: "string" },
          honest_income_outlook: { type: "string" },
        },
      },

      // ================================================================
      // 7. Income outlook
      //   Note: `current_salary_gbp` and `salary_replacement_analysis` were
      //   removed in F68 cleanup (2026-05-05). The questionnaire never
      //   collected salary; the schema fabricated it. Year-1/2/3 trajectory
      //   carries the income story without a baseline comparison.
      // ================================================================
      income_outlook: {
        type: "object",
        additionalProperties: false,
        required: [
          "primary_option_rank",
          "year_1",
          "year_2",
          "year_3",
          "sensitivity_factors",
          "income_floor_analysis",
          "income_notes",
        ],
        properties: {
          primary_option_rank: { type: "integer" },
          year_1: { $ref: "#/$defs/yearProjection" },
          year_2: { $ref: "#/$defs/yearProjection" },
          year_3: { $ref: "#/$defs/yearProjection" },
          sensitivity_factors: { type: "string" },
          income_floor_analysis: { type: "string" },
          income_notes: { type: "string" },
        },
      },

      // ================================================================
      // 8. Recommended selection
      //   Per project memory `project_canonical_10_options_5_selected.md`:
      //   `selected_ranks` is an array of 1..5 ints from options[].rank.
      // ================================================================
      recommended_selection: {
        type: "object",
        additionalProperties: false,
        required: ["selected_ranks", "rationale"],
        properties: {
          selected_ranks: {
            type: "array",
            items: { type: "integer" },
          },
          rationale: { type: "string" },
        },
      },

      // ================================================================
      // 9. Hook insight
      // ================================================================
      hook_insight: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "paragraph", "first_move"],
        properties: {
          headline: { type: "string" },
          paragraph: { type: "string" },
          first_move: {
            type: "object",
            additionalProperties: false,
            required: [
              "action",
              "target",
              "draft_subject",
              "draft_body",
              "follow_up_prompt",
            ],
            properties: {
              action: { type: "string" },
              target: { type: "string" },
              draft_subject: { type: "string" },
              draft_body: { type: "string" },
              follow_up_prompt: { type: "string" },
            },
          },
        },
      },

      // ================================================================
      // 10. AI impact (three-part)
      // ================================================================
      ai_impact: {
        type: "object",
        additionalProperties: false,
        required: ["part_1", "part_2", "part_3"],
        properties: {
          part_1: {
            type: "object",
            additionalProperties: false,
            required: ["displacement_risk", "risk_horizon", "content"],
            properties: {
              displacement_risk: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
              risk_horizon: { type: "string" },
              content: { type: "string" },
            },
          },
          part_2: {
            type: "object",
            additionalProperties: false,
            required: ["content"],
            properties: {
              content: { type: "string" },
            },
          },
          part_3: {
            type: "object",
            additionalProperties: false,
            required: ["steps"],
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["priority", "action", "rationale"],
                  properties: {
                    priority: { type: "integer" },
                    action: { type: "string" },
                    rationale: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    $defs: {
      yearProjection: {
        type: "object",
        additionalProperties: false,
        required: [
          "low_gbp",
          "mid_gbp",
          "high_gbp",
          "revenue_build",
          "revenue_sources",
          "assumptions",
        ],
        properties: {
          low_gbp: { type: "number" },
          mid_gbp: { type: "number" },
          high_gbp: { type: "number" },
          revenue_build: { type: "string" },
          revenue_sources: { type: "string" },
          assumptions: { type: "string" },
        },
      },
    },
  },
} as const;

// TypeScript type derived from the schema for use in validator + edge function
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

export interface YearProjection {
  low_gbp: number;
  mid_gbp: number;
  high_gbp: number;
  revenue_build: string;
  revenue_sources: string;
  assumptions: string;
}
