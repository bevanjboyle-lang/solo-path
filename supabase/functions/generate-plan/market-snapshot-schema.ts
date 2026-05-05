/**
 * Canonical JSON Schema for Solo market-snapshot output (Prompt 4 / generate-plan).
 *
 * USAGE: passed to OpenAI `response_format: { type: "json_schema", json_schema: MARKET_SNAPSHOT_SCHEMA }`
 * to guarantee structural correctness of the per-strand market-snapshot response.
 *
 * This schema enforces SHAPE ONLY (presence, type, required fields).
 * Locality, honesty, and pricing-figure rules are enforced by prompt-level QUALITY RULES.
 *
 * Reference: prompts/prompt-4-market-snapshot.md (canonical prompt + OUTPUT FORMAT)
 * Related: ADR-019 (ironclad rewrite — canonical schema in repo, validator + retry)
 *
 * SYNC DISCIPLINE: this schema is the source of truth for the market-snapshot response
 * shape. The deployed `generate-plan` edge function imports it directly. If the canonical
 * prompt's OUTPUT FORMAT changes, update this file in the same commit and re-deploy.
 *
 * Note: the prompt returns the inner `{ sections }` object; the caller (generate-plan)
 * wraps it with `strand_id`, `model_name`, and `location` envelope fields before persisting
 * to `reports.market_snapshots[strand_id]`. The wrapper fields are not part of this schema.
 *
 * OpenAI strict-mode constraints observed:
 *   - Every object must have additionalProperties: false
 *   - Every property must appear in `required`
 */

export const MARKET_SNAPSHOT_SCHEMA = {
  name: "solo_market_snapshot",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["sections"],
    properties: {
      sections: {
        type: "object",
        additionalProperties: false,
        required: [
          "demand_signal",
          "pricing_benchmark",
          "competitor_landscape",
          "market_entry_insight",
          "honest_assessment",
        ],
        properties: {
          demand_signal: { type: "string" },
          pricing_benchmark: { type: "string" },
          competitor_landscape: { type: "string" },
          market_entry_insight: { type: "string" },
          honest_assessment: { type: "string" },
        },
      },
    },
  },
} as const;

// TypeScript type derived from the schema for use in the edge function
export interface MarketSnapshotOutput {
  sections: {
    demand_signal: string;
    pricing_benchmark: string;
    competitor_landscape: string;
    market_entry_insight: string;
    honest_assessment: string;
  };
}
