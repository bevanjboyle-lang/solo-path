// generate-report v45.13 - quality fixes (archetype name + income_outlook word counts) - 2026-05-16
//
// Two quality issues found in v45.12's first real-world run:
//   1. archetype.primary returned "ARCH_RISK" (raw KB ID) instead of human name.
//      The model was copying the bracketed [ARCH_RISK] prefix from the KB
//      injection text rather than the name after it.
//   2. validator overall_score 93/100 with 6 hard failures, all in income_outlook
//      (revenue_sources / assumptions across all 3 years), model hitting word-count
//      floors exactly or slightly under despite the buffer rule.
//
// Fixes:
//   1. KB injection format restructured - ARCHETYPE NAME is now the primary label,
//      Internal ID demoted to a secondary field with explicit "never use in output"
//      note. Plus new "Output field naming rules" section in the prompt explicitly
//      forbids using ARCH_* IDs in archetype.primary/secondary.
//   2. Bump prompt floors for income_outlook.year_N.revenue_sources (25 -> 30) and
//      .assumptions (20 -> 25). Validator floors unchanged - the headroom absorbs
//      the model's chronic under-shoot on these fields.
//   3. FUNCTION_VERSION updated for observability.
//
// All other content identical to v45.12. Pipeline / auth / RLS / schema unchanged.
//
// generate-report v45.12 - canonical full pipeline + auth fixes - 2026-05-15
//
// Restores the FULL v45.8 canonical pipeline ON TOP OF v45.10/v45.11 auth fixes:
//   FIX 1 (deploy-time): verify_jwt:false so gateway doesn't forward inbound
//   anon JWT to PostgREST. FIX 2 (code): makeServiceClient() helper sets
//   explicit Authorization override on supabase client. FIX 3 (frontend, separate
//   commit): .env in solo-path repo updated to point at correct Supabase project
//   (was pointing at Lovable demo - root cause discovered via network panel hover).
//
// generate-report v45.8 - P0B sync hotfix - 2026-05-15 (CONSOLIDATED SINGLE-FILE)
//
// HOTFIX: v45.7 (deployed minutes ago) was shipped with a placeholder
//         p1-system-prompt.ts file. The deploy was constructed by hand and
//         the large p1 content was replaced with a stub string to fit a
//         token budget. v45.7 produces broken reports because the model
//         receives no system instructions.
//
// v45.8 redeploys with the FULL canonical P1 content from the v45.6
// baseline, plus the canonical P0b content from v45.7. To work around
// the multi-file deploy size constraint that caused the v45.7 incident,
// this version inlines all four sibling files (report-schema.ts,
// report-validator.ts, p1-system-prompt.ts, p0b-classifier-prompt.ts)
// into the single index.ts entrypoint. Multi-file structure should be
// reinstated once the deploy mechanism allows it; ADR-015 sync discipline
// applies (the .ts and the .md canonical sources still match).
//
// CONTENT IS IDENTICAL to the multi-file v45.7/v45.8. Only the file layout
// changed for this hotfix. No logic changes.
//
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";
// WP6 guardrail wiring (2026-06-01): strip em dashes (banned AI tell, tone-of-voice.md)
// from every user-facing string before persist, so no surface renders them.
import { sanitiseReportTree } from "../_shared/guardrails.ts";

// =============================================================================
// INLINED FROM report-schema.ts
// =============================================================================

const REPORT_SCHEMA = {
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
      archetype: {
        type: "object",
        additionalProperties: false,
        required: ["primary", "secondary", "confidence", "summary", "editorial_description", "capability_tags"],
        properties: {
          primary: { type: "string" },
          secondary: { type: ["string", "null"] },
          confidence: { type: "number" },
          summary: { type: "string" },
          editorial_description: { type: "string" },
          capability_tags: { type: "array", items: { type: "string" } },
        },
      },
      transferable_value: {
        type: "object",
        additionalProperties: false,
        required: ["what_they_can_sell", "why_buyers_would_pay", "credibility_assets"],
        properties: {
          what_they_can_sell: { type: "string" },
          why_buyers_would_pay: { type: "string" },
          credibility_assets: { type: "array", items: { type: "string" } },
        },
      },
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
            market_demand: { type: "string", enum: ["high", "medium", "low"] },
          },
        },
      },
      options: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rank", "model_name", "business_model_id", "primary_move_type", "structural_warmth", "composite_score", "fit_tags", "source", "positioning", "target_buyer", "what_they_are_buying", "pricing", "time_to_first_revenue", "difficulty_rating", "why_this_works_for_them", "caution_note"],
          properties: {
            rank: { type: "integer" },
            model_name: { type: "string" },
            business_model_id: { type: "string" },
            primary_move_type: { type: "string", enum: ["direct", "platform", "visibility", "community", "mixed"] },
            structural_warmth: { type: "boolean" },
            composite_score: { type: "number" },
            fit_tags: { type: "array", items: { type: "string" } },
            source: { type: "string", enum: ["primary", "secondary"] },
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
            difficulty_rating: { type: "string", enum: ["easy", "moderate", "hard"] },
            why_this_works_for_them: { type: "string" },
            caution_note: { type: ["string", "null"] },
          },
        },
      },
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
      reality_check: {
        type: "object",
        additionalProperties: false,
        required: ["most_likely_failure_mode", "second_failure_mode", "what_they_will_find_hard", "honest_income_outlook"],
        properties: {
          most_likely_failure_mode: { type: "string" },
          second_failure_mode: { type: "string" },
          what_they_will_find_hard: { type: "string" },
          honest_income_outlook: { type: "string" },
        },
      },
      income_outlook: {
        type: "object",
        additionalProperties: false,
        required: ["primary_option_rank", "year_1", "year_2", "year_3", "sensitivity_factors", "income_floor_analysis", "income_notes"],
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
      recommended_selection: {
        type: "object",
        additionalProperties: false,
        required: ["selected_ranks", "rationale"],
        properties: {
          selected_ranks: { type: "array", items: { type: "integer" } },
          rationale: { type: "string" },
        },
      },
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
            required: ["action", "target", "draft_subject", "draft_body", "follow_up_prompt"],
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
              displacement_risk: { type: "string", enum: ["low", "medium", "high"] },
              risk_horizon: { type: "string" },
              content: { type: "string" },
            },
          },
          part_2: {
            type: "object",
            additionalProperties: false,
            required: ["content"],
            properties: { content: { type: "string" } },
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
        required: ["low_gbp", "mid_gbp", "high_gbp", "revenue_build", "revenue_sources", "assumptions"],
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

interface SoloCoreReport {
  archetype: { primary: string; secondary: string | null; confidence: number; summary: string; editorial_description: string; capability_tags: string[]; };
  transferable_value: { what_they_can_sell: string; why_buyers_would_pay: string; credibility_assets: string[]; };
  transferable_skills: Array<{ skill_name: string; strength: number; evidence: string; market_demand: "high" | "medium" | "low"; }>;
  options: Array<{ rank: number; model_name: string; business_model_id: string; primary_move_type: "direct" | "platform" | "visibility" | "community" | "mixed"; structural_warmth: boolean; composite_score: number; fit_tags: string[]; source: "primary" | "secondary"; positioning: string; target_buyer: string; what_they_are_buying: string; pricing: { model: string; range_low_gbp: number; range_high_gbp: number; cadence: string; }; time_to_first_revenue: string; difficulty_rating: "easy" | "moderate" | "hard"; why_this_works_for_them: string; caution_note: string | null; }>;
  recommendation: { recommended_rank: number; rationale: string; key_condition: string; };
  reality_check: { most_likely_failure_mode: string; second_failure_mode: string; what_they_will_find_hard: string; honest_income_outlook: string; };
  income_outlook: { primary_option_rank: number; year_1: YearProjection; year_2: YearProjection; year_3: YearProjection; sensitivity_factors: string; income_floor_analysis: string; income_notes: string; };
  recommended_selection: { selected_ranks: number[]; rationale: string; };
  hook_insight: { headline: string; paragraph: string; first_move: { action: string; target: string; draft_subject: string; draft_body: string; follow_up_prompt: string; }; };
  ai_impact: { part_1: { displacement_risk: "low" | "medium" | "high"; risk_horizon: string; content: string; }; part_2: { content: string; }; part_3: { steps: Array<{ priority: number; action: string; rationale: string; }>; }; };
}
interface YearProjection { low_gbp: number; mid_gbp: number; high_gbp: number; revenue_build: string; revenue_sources: string; assumptions: string; }

// =============================================================================
// INLINED FROM report-validator.ts
// =============================================================================

interface ValidationContext {
  allowed_business_model_ids: Set<string>;
  kb_model_index?: Map<string, { primary_move_type: string; structural_warmth: boolean }>;
}
interface NeverListHit { term: string; location: string; snippet: string; }
interface ValidationResult {
  passed: boolean;
  hard_failures: string[];
  soft_warnings: string[];
  card_scores: Record<string, number>;
  overall_score: number;
  total_word_count: number;
  never_list_hits: NeverListHit[];
  retry_prompt_hints: string[];
}

const NEVER_SKILL_NAMES = ["communication", "leadership", "problem solving", "problem-solving", "teamwork", "time management", "attention to detail", "organisation", "organization", "work ethic", "critical thinking", "interpersonal skills"];
const NEVER_MOTIVATIONAL = ["passion", "passionate", "unleash", "unlock your potential", "game-changer", "game-changing", "synergy", "synergies", "disruptive", "transformative journey", "empowering", "mindset shift", "next-level", "crushing it"];
const NEVER_HEDGE_IN_RECOMMENDATION = ["you might consider", "it could be worth", "perhaps you could", "one option might be"];
const NEVER_VAGUE_TIME = ["^fast$", "^medium$", "^slow$", "^short$", "^medium-term$", "^long-term$"];

function wordCount(str: string | undefined | null): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}
function lower(str: string | undefined | null): string { return (str ?? "").toLowerCase(); }
function containsAny(text: string, terms: string[]): string | null {
  const t = lower(text);
  for (const term of terms) { if (t.includes(term)) return term; }
  return null;
}
function matchesAnyRegex(text: string, patterns: string[]): boolean {
  const t = lower(text).trim();
  return patterns.some((p) => new RegExp(p).test(t));
}
function clamp01to100(x: number): number { return Math.max(0, Math.min(100, Math.round(x))); }

function validateReport(report: Partial<SoloCoreReport>, context: ValidationContext): ValidationResult {
  const hard: string[] = []; const soft: string[] = []; const hints: string[] = [];
  const cardScores: Record<string, number> = {}; const neverHits: NeverListHit[] = [];
  const requiredTopLevel: Array<keyof SoloCoreReport> = ["archetype", "transferable_value", "transferable_skills", "options", "recommendation", "reality_check", "income_outlook", "recommended_selection", "hook_insight", "ai_impact"];
  for (const key of requiredTopLevel) {
    if (!report[key]) { hard.push(`MISSING_CARD:${key}`); hints.push(`Your last output was missing the '${key}' card. Produce it in full per the spec.`); }
  }
  if (report.archetype) {
    const a = report.archetype; const summaryWords = wordCount(a.summary); const editorialWords = wordCount(a.editorial_description); const tags = a.capability_tags ?? [];
    let score = 100;
    if (summaryWords < 30) { hard.push("ARCHETYPE_SUMMARY_TOO_SHORT"); hints.push(`archetype.summary is only ${summaryWords} words - expand to 80-180 words, at least 3 sentences.`); score = 30; }
    else if (summaryWords < 80) { soft.push("archetype.summary under ideal length (80-180 words)"); score = Math.min(score, 70); }
    if (editorialWords < 120) { hard.push("ARCHETYPE_EDITORIAL_TOO_SHORT"); hints.push(`archetype.editorial_description is ${editorialWords} words - expand to 180-320 words across at least 2 paragraphs.`); score = Math.min(score, 30); }
    else if (editorialWords < 180) { soft.push("archetype.editorial_description under ideal length"); score = Math.min(score, 70); }
    if (tags.length < 5 || tags.length > 7) { hard.push("ARCHETYPE_TAG_COUNT"); hints.push(`archetype.capability_tags has ${tags.length} items - produce exactly 6.`); score = Math.min(score, 40); }
    for (const tag of tags) {
      const words = wordCount(tag);
      if (words < 2 || words > 5) { soft.push(`capability tag "${tag}" length unusual`); }
      if (NEVER_SKILL_NAMES.includes(lower(tag))) { hard.push(`ARCHETYPE_GENERIC_TAG:${tag}`); hints.push(`Replace the generic tag "${tag}" with a commercially named capability.`); score = Math.min(score, 30); }
    }
    cardScores.archetype = clamp01to100(score);
  }
  if (report.transferable_value) {
    const tv = report.transferable_value; const sellWords = wordCount(tv.what_they_can_sell); const payWords = wordCount(tv.why_buyers_would_pay); const assets = tv.credibility_assets ?? [];
    let score = 100;
    if (sellWords < 40) { hard.push("TV_SELL_TOO_SHORT"); hints.push(`transferable_value.what_they_can_sell is ${sellWords} words - expand to 60-150.`); score = 30; }
    if (payWords < 40) { hard.push("TV_PAY_TOO_SHORT"); hints.push(`transferable_value.why_buyers_would_pay is ${payWords} words - expand to 60-150 and name a specific buyer archetype or trigger moment.`); score = Math.min(score, 30); }
    if (assets.length !== 3) { hard.push("TV_ASSET_COUNT"); hints.push(`credibility_assets has ${assets.length} items - produce exactly 3.`); score = Math.min(score, 40); }
    assets.forEach((asset, i) => { const w = wordCount(asset); if (w < 8) { hard.push(`TV_ASSET_${i + 1}_TOO_SHORT`); hints.push(`credibility_assets[${i}] is ${w} words - each asset should be 8-25 words and reference a specific fact.`); score = Math.min(score, 40); } });
    cardScores.transferable_value = clamp01to100(score);
  }
  if (report.transferable_skills) {
    const skills = report.transferable_skills; let score = 100;
    if (skills.length !== 6) { hard.push("TS_COUNT"); hints.push(`transferable_skills has ${skills.length} items - produce exactly 6, ranked by strength descending.`); score = 20; }
    for (let i = 1; i < skills.length; i++) { if (skills[i].strength > skills[i - 1].strength) { hard.push("TS_ORDER"); hints.push(`transferable_skills must be ranked by strength descending; swap items so highest strength comes first.`); score = Math.min(score, 50); break; } }
    skills.forEach((s, i) => {
      if (NEVER_SKILL_NAMES.includes(lower(s.skill_name))) { hard.push(`TS_GENERIC_NAME:${s.skill_name}`); hints.push(`transferable_skills[${i}].skill_name "${s.skill_name}" is in the NEVER list - replace with a specific commercially named skill.`); neverHits.push({ term: s.skill_name, location: `transferable_skills[${i}].skill_name`, snippet: s.skill_name }); score = Math.min(score, 20); }
      if (wordCount(s.evidence) < 10) { hard.push(`TS_EVIDENCE_${i + 1}_TOO_SHORT`); hints.push(`transferable_skills[${i}].evidence is ${wordCount(s.evidence)} words - must be 15-40 words and reference Q6/Q7/Q8/Q3b or CV.`); score = Math.min(score, 40); }
    });
    cardScores.transferable_skills = clamp01to100(score);
  }
  if (report.options) {
    const opts = report.options; let score = 100;
    if (opts.length < 7) { hard.push("OPTIONS_COUNT"); hints.push(`options has ${opts.length} items - produce up to 10 (minimum 7), ranked by composite_score descending; never pad with weak or off-domain options.`); score = 20; }
    const commercialModels = new Set<string>();
    opts.forEach((o, i) => {
      if (!o.business_model_id) { hard.push(`OPT_${i + 1}_MISSING_BM_ID`); score = Math.min(score, 20); }
      else if (context.allowed_business_model_ids.size > 0 && !context.allowed_business_model_ids.has(o.business_model_id)) { hard.push(`OPT_${i + 1}_BM_ID_NOT_IN_KB:${o.business_model_id}`); hints.push(`options[${i}].business_model_id "${o.business_model_id}" was not in the injected KB - only recommend models from the provided KB slice.`); score = Math.min(score, 20); }
      if (!o.primary_move_type) { hard.push(`OPT_${i + 1}_MISSING_MOVE_TYPE`); score = Math.min(score, 20); }
      if (o.structural_warmth === undefined || o.structural_warmth === null) { hard.push(`OPT_${i + 1}_MISSING_STRUCTURAL_WARMTH`); score = Math.min(score, 20); }
      if (typeof o.composite_score !== "number") { hard.push(`OPT_${i + 1}_MISSING_COMPOSITE_SCORE`); score = Math.min(score, 20); }
      if (context.kb_model_index?.has(o.business_model_id)) {
        const kbEntry = context.kb_model_index.get(o.business_model_id)!;
        if (kbEntry.primary_move_type !== o.primary_move_type) { hard.push(`OPT_${i + 1}_MOVE_TYPE_DIVERGES_FROM_KB`); hints.push(`options[${i}].primary_move_type disagrees with KB - pass through the KB value unchanged.`); score = Math.min(score, 30); }
        if (kbEntry.structural_warmth !== o.structural_warmth) { hard.push(`OPT_${i + 1}_STRUCTURAL_WARMTH_DIVERGES_FROM_KB`); score = Math.min(score, 30); }
      }
      const wtwWords = wordCount(o.why_this_works_for_them);
      if (!o.why_this_works_for_them) { hard.push(`OPT_${i + 1}_MISSING_WHY`); hints.push(`options[${i}].why_this_works_for_them is missing - every option must have this field.`); score = Math.min(score, 30); }
      else if (o.rank <= 3 && wtwWords < 30) { hard.push(`OPT_${i + 1}_WHY_TOO_SHORT_TOP3`); hints.push(`options[${i}] is Rank <=3; why_this_works_for_them is ${wtwWords} words - expand to 40-90 words referencing specific user evidence.`); score = Math.min(score, 40); }
      else if (o.rank > 3 && wtwWords < 10) { soft.push(`options[${i}].why_this_works_for_them unusually short for lower rank`); }
      const posWords = wordCount(o.positioning);
      if (o.rank <= 3 && posWords < 25) { hard.push(`OPT_${i + 1}_POSITIONING_TOO_SHORT_TOP3`); hints.push(`options[${i}].positioning is ${posWords} words - Rank 1-3 positioning should be 40-90 words.`); score = Math.min(score, 50); }
      if (o.time_to_first_revenue && matchesAnyRegex(o.time_to_first_revenue, NEVER_VAGUE_TIME)) { hard.push(`OPT_${i + 1}_VAGUE_TIME_TO_REV`); hints.push(`options[${i}].time_to_first_revenue "${o.time_to_first_revenue}" is vague - use a real week/month range like "4-8 weeks".`); score = Math.min(score, 40); }
      if (o.pricing?.model) commercialModels.add(lower(o.pricing.model));
    });
    if (opts.length >= 6 && commercialModels.size < 3) { soft.push(`Fewer than 3 commercial model types across options (${Array.from(commercialModels).join(", ")}) - spec requires diversity.`); }
    const anyCaution = opts.some((o) => o.caution_note && o.caution_note.length > 0);
    if (!anyCaution && opts.length > 0) { soft.push("No caution_note on any option - unusual, real options carry real risk."); }
    cardScores.options = clamp01to100(score);
  }
  if (report.recommendation) {
    const r = report.recommendation; let score = 100;
    const ratWords = wordCount(r.rationale); const kcWords = wordCount(r.key_condition);
    if (ratWords < 60) { hard.push("REC_RATIONALE_TOO_SHORT"); hints.push(`recommendation.rationale is ${ratWords} words - expand to 80-160 and reference archetype + seniority + urgency/confidence.`); score = 30; }
    if (kcWords < 15) { hard.push("REC_KEY_CONDITION_TOO_SHORT"); hints.push(`recommendation.key_condition is ${kcWords} words - make it action-forcing and specific (25-60 words).`); score = Math.min(score, 40); }
    const hedgeHit = containsAny(r.rationale ?? "", NEVER_HEDGE_IN_RECOMMENDATION);
    if (hedgeHit) { hard.push(`REC_HEDGE:${hedgeHit}`); hints.push(`recommendation.rationale contains hedge language "${hedgeHit}".`); neverHits.push({ term: hedgeHit, location: "recommendation.rationale", snippet: hedgeHit }); score = Math.min(score, 40); }
    cardScores.recommendation = clamp01to100(score);
  }
  if (report.reality_check) {
    const rc = report.reality_check; let score = 100;
    const fields: Array<[string, string]> = [["most_likely_failure_mode", rc.most_likely_failure_mode ?? ""], ["second_failure_mode", rc.second_failure_mode ?? ""], ["what_they_will_find_hard", rc.what_they_will_find_hard ?? ""], ["honest_income_outlook", rc.honest_income_outlook ?? ""]];
    for (const [name, text] of fields) { const w = wordCount(text); if (w < 25) { hard.push(`RC_${name.toUpperCase()}_TOO_SHORT`); hints.push(`reality_check.${name} is ${w} words - expand to a multi-sentence diagnosis (>=25 words).`); score = Math.min(score, 30); } }
    if (!/£\s?\d/.test(rc.honest_income_outlook ?? "")) { hard.push("RC_INCOME_NO_FIGURE"); hints.push(`reality_check.honest_income_outlook must contain an actual GBP figure.`); score = Math.min(score, 40); }
    cardScores.reality_check = clamp01to100(score);
  }
  if (report.income_outlook) {
    const io = report.income_outlook; let score = 100;
    const years = [io.year_1, io.year_2, io.year_3];
    years.forEach((y, idx) => {
      if (!y) { hard.push(`IO_YEAR_${idx + 1}_MISSING`); score = 0; return; }
      if (typeof y.mid_gbp !== "number") { hard.push(`IO_YEAR_${idx + 1}_MID_MISSING`); score = Math.min(score, 20); }
      if (wordCount(y.revenue_build) < 40) { hard.push(`IO_YEAR_${idx + 1}_REVENUE_BUILD_TOO_SHORT`); hints.push(`income_outlook.year_${idx + 1}.revenue_build is ${wordCount(y.revenue_build)} words - expand to describe month-by-month shape.`); score = Math.min(score, 40); }
      if (wordCount(y.revenue_sources) < 25) { hard.push(`IO_YEAR_${idx + 1}_REVENUE_SOURCES_TOO_SHORT`); score = Math.min(score, 40); }
      if (wordCount(y.assumptions) < 20) { hard.push(`IO_YEAR_${idx + 1}_ASSUMPTIONS_TOO_SHORT`); score = Math.min(score, 40); }
    });
    if (typeof io.year_1?.mid_gbp === "number" && typeof io.year_2?.mid_gbp === "number" && typeof io.year_3?.mid_gbp === "number") {
      if (io.year_1.mid_gbp > io.year_2.mid_gbp || io.year_2.mid_gbp > io.year_3.mid_gbp) { hard.push("IO_MID_NOT_MONOTONIC"); hints.push(`income_outlook mid values must be non-decreasing across years.`); score = Math.min(score, 30); }
    }
    if (wordCount(io.sensitivity_factors) < 40) { hard.push("IO_SENSITIVITY_TOO_SHORT"); score = Math.min(score, 40); }
    if (wordCount(io.income_floor_analysis) < 30) { hard.push("IO_FLOOR_TOO_SHORT"); score = Math.min(score, 40); }
    if (wordCount(io.income_notes) < 40) { hard.push("IO_NOTES_TOO_SHORT"); score = Math.min(score, 40); }
    cardScores.income_outlook = clamp01to100(score);
  }
  if (report.hook_insight) {
    const hi = report.hook_insight; let score = 100;
    const headlineWords = wordCount(hi.headline); const paraWords = wordCount(hi.paragraph);
    if (headlineWords < 6 || headlineWords > 22) { soft.push(`hook_insight.headline length ${headlineWords} words outside 8-18 band`); }
    if (paraWords < 80) { hard.push("HOOK_PARAGRAPH_TOO_SHORT"); hints.push(`hook_insight.paragraph is ${paraWords} words - expand to 120-220 words.`); score = 30; }
    const reframeSignals = ["isn't", "is not", "actually", "beyond", "despite", "under", "not the", "real "];
    const hasReframe = reframeSignals.some((sig) => lower(hi.headline).includes(sig));
    if (!hasReframe) { soft.push("hook_insight.headline lacks a reframe signal"); score = Math.min(score, 60); }
    cardScores.hook_insight = clamp01to100(score);
  }
  if (report.ai_impact) {
    const ai = report.ai_impact; let score = 100;
    if (!ai.part_1?.displacement_risk) { hard.push("AI_P1_MISSING_RISK"); hints.push(`ai_impact.part_1 must include displacement_risk.`); score = 20; }
    if (!ai.part_1?.risk_horizon) { hard.push("AI_P1_MISSING_HORIZON"); hints.push(`ai_impact.part_1 must include risk_horizon.`); score = Math.min(score, 30); }
    if (wordCount(ai.part_1?.content) < 150) { hard.push("AI_P1_CONTENT_TOO_SHORT"); hints.push(`ai_impact.part_1.content is ${wordCount(ai.part_1?.content)} words - expand to 150-280 words.`); score = Math.min(score, 40); }
    if (wordCount(ai.part_2?.content) < 120) { hard.push("AI_P2_CONTENT_TOO_SHORT"); score = Math.min(score, 40); }
    const steps = ai.part_3?.steps ?? [];
    if (steps.length !== 4) { hard.push("AI_P3_STEP_COUNT"); hints.push(`ai_impact.part_3.steps must have exactly 4 items.`); score = Math.min(score, 30); }
    steps.forEach((s, i) => { if (wordCount(s.action) < 10) { hard.push(`AI_P3_STEP_${i + 1}_ACTION_TOO_SHORT`); score = Math.min(score, 40); } });
    cardScores.ai_impact = clamp01to100(score);
  }
  if (report.recommendation && report.income_outlook) {
    if (report.income_outlook.primary_option_rank !== report.recommendation.recommended_rank) { hard.push("XC_INCOME_RANK_MISMATCH"); hints.push(`income_outlook.primary_option_rank (${report.income_outlook.primary_option_rank}) must equal recommendation.recommended_rank (${report.recommendation.recommended_rank}).`); }
  }
  const narrativeBlob = JSON.stringify({ archetype: report.archetype, transferable_value: report.transferable_value, transferable_skills: report.transferable_skills, options: report.options, recommendation: report.recommendation, reality_check: report.reality_check, hook_insight: report.hook_insight, ai_impact: report.ai_impact });
  for (const term of NEVER_MOTIVATIONAL) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(narrativeBlob)) { hard.push(`NEVER_MOTIVATIONAL:${term}`); hints.push(`Remove motivational language "${term}".`); neverHits.push({ term, location: "narrative (global)", snippet: term }); }
  }
  const scores = Object.values(cardScores);
  const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const totalWords = wordCount(report.archetype?.summary) + wordCount(report.archetype?.editorial_description) + wordCount(report.transferable_value?.what_they_can_sell) + wordCount(report.transferable_value?.why_buyers_would_pay) + (report.transferable_skills?.reduce((acc, s) => acc + wordCount(s.evidence), 0) ?? 0) + (report.options?.reduce((acc, o) => acc + wordCount(o.positioning) + wordCount(o.why_this_works_for_them), 0) ?? 0) + wordCount(report.recommendation?.rationale) + wordCount(report.reality_check?.most_likely_failure_mode) + wordCount(report.reality_check?.honest_income_outlook) + wordCount(report.hook_insight?.paragraph) + wordCount(report.ai_impact?.part_1?.content) + wordCount(report.ai_impact?.part_2?.content);
  return { passed: hard.length === 0, hard_failures: hard, soft_warnings: soft, card_scores: cardScores, overall_score: overall, total_word_count: totalWords, never_list_hits: neverHits, retry_prompt_hints: hints };
}

function buildRetryMessage(result: ValidationResult): string {
  if (result.passed) return "";
  const lines = [
    "Your last output failed the Solo quality contract. Fix the following and return the full corrected JSON:",
    "",
    ...result.retry_prompt_hints.map((h) => `- ${h}`),
    "",
    "CRITICAL - WORD-COUNT BUFFER RULE: For every word-count floor mentioned above, you must EXCEED it by at least 5 words. Models often produce 119 words when asked for 120; budget margin so you reliably clear the bar. Aim 5+ words over every floor.",
    "",
    "Do not shorten other cards to compensate. The final report must meet the spec in every card.",
  ];
  return lines.join("\n");
}

// =============================================================================
// INLINED FROM p1-system-prompt.ts (FULL CANONICAL CONTENT)
// =============================================================================

const P1_SYSTEM_PROMPT_TEMPLATE = `You are the intelligence engine for Solo - a product that helps mid-career white-collar professionals identify a realistic, commercially viable Plan B if their employment becomes unstable.

Your job is to analyse a user's professional background and produce a structured, commercially credible solo business recommendation. You are NOT a general-purpose brainstormer. You operate from a curated library of pre-defined archetypes and business models. Your outputs must be grounded in those libraries - do not invent business ideas outside them.

The user is typically a capable, structured professional with 5-12 years of experience. They are anxious about career stability, not naturally entrepreneurial, and need realism not inspiration. Treat them as intelligent adults. Do not flatter them. Do not hype them. Give them an honest, commercially grounded view of their options.

---

## NARRATIVE QUALITY BAR - read this before writing anything

The JSON shape is enforced by the schema. What you have to earn is the **narrative richness**. Every card below has a minimum length and a minimum specificity requirement. If you write a one-sentence most_likely_failure_mode or a generic editorial_description, the validator rejects the output and you get retried with a diff-style correction. Hit the bar on the first pass.

**WORD-COUNT BUFFER RULE (HARD):** For every word-count floor below, you must EXCEED the floor by at least 5 words. Do not write to the floor - write past it. Models often produce 119 words when asked for 120; budget margin so you reliably clear the bar. If a field's floor is 120 words, write 125+. If the floor is 25 words, write 30+. This rule applies on first pass AND on every retry attempt. Failing to clear by 5+ counts as failure even if you're only 1 word over the literal minimum.

**Per-card word-count floors (HARD - validator enforces):**

- archetype.summary: 80 words, at least 3 sentences
- archetype.editorial_description: 180 words, at least 2 paragraphs. Must reference the user's Q6 achievement and Q3b employer context by name.
- archetype.capability_tags: exactly 6 tags, each 2-4 words, each specific (not Communication)
- transferable_value.what_they_can_sell: 60 words, at least 2 sentences, must name a specific service
- transferable_value.why_buyers_would_pay: 60 words, at least 2 sentences, must name a specific buyer archetype or trigger moment
- transferable_value.credibility_assets: exactly 3, each 8-25 words, each must reference a specific fact from user input
- transferable_skills.evidence per skill: 15 words, must reference Q6/Q7/Q8/Q3b/CV
- options Rank 1-3 positioning: 40 words
- options Rank 1-3 target_buyer: 25 words
- options Rank 1-3 why_this_works_for_them: 40 words
- options Rank 4-10 why_this_works_for_them: 15 words (still required)
- recommendation.rationale: 80 words, at least 3 sentences, must reference archetype AND seniority AND (Q9 OR Q10)
- recommendation.key_condition: 25 words, action-forcing
- reality_check.most_likely_failure_mode: 50 words, at least 2 sentences, NAMES the failure mode
- reality_check.second_failure_mode: 30 words
- reality_check.what_they_will_find_hard: 30 words, tied to this user's archetype weakness
- reality_check.honest_income_outlook: 40 words, MUST contain a GBP figure or range
- income_outlook.year_N.revenue_build: 40 words, shows month-by-month shape, not a flat average
- income_outlook.year_N.revenue_sources: 30 words minimum (validator-enforced floor is 25 - target 35+ to clear with the buffer rule below)
- income_outlook.year_N.assumptions: 25 words minimum, specific commercial mechanics (client count, rate, cadence) (validator-enforced floor is 20 - target 30+ to clear with the buffer rule)
- income_outlook.sensitivity_factors: 40 words, identifies 2-3 specific variables with impact
- income_outlook.income_floor_analysis: 30 words, honest worst case
- income_outlook.income_notes: 40 words, references at least one Q-field
- hook_insight.headline: 8-18 words. MUST contain a reframe signal: a contrast word (isn't / not / actually / beyond / despite / under) or a noun reversal (your X isn't X, it's Y). The reframe must land on something NON-OBVIOUS: an edge the user could not name themselves in five minutes of thinking. Generic "ex-[role]" framing, "your experience is valuable", or anything a capable peer at this seniority could author = fail.
- hook_insight.paragraph: 120-160 words. This is the single highest-stakes passage in the report - it is what makes the user feel genuinely SEEN, and it is what they remember. It MUST satisfy all THREE tests at once: (1) NON-OBVIOUS - names a specific framework, intermediary, buyer, or counter-intuitive move the user could not have written themselves; (2) EXECUTION-CRITICAL - implies a clear "if you accept this, do X differently next week" change, not just a pleasant reframe; (3) PROFILE-SPECIFIC - anchors on at least one concrete detail from Q3b / Q6 / Q11 / Q12 (a named achievement, the specific sector/client context, or a real relationship), so the paragraph could NOT be reused for a different user at the same job title by swapping one or two nouns. Avoid these failure modes: motivational reframing that changes no action; "networking is the fastest route to clients"; "the market for X is growing"; "build a personal brand on LinkedIn"; "consider registering as a sole trader"; generic encouragement.
- ai_impact.part_1.content: 150 words
- ai_impact.part_1.displacement_risk: one of low/medium/high - never omitted
- ai_impact.part_1.risk_horizon: e.g. 3-5 years - never omitted
- ai_impact.part_2.content: 120 words
- ai_impact.part_3.steps: exactly 4 steps, each action >=10 words

**Output field naming rules (HARD):**

- archetype.primary and archetype.secondary MUST be the archetype's full human-readable NAME from the library (e.g., "Risk / Audit / Compliance", "Financial Intelligence Operator", "Fractional CFO"). NEVER the internal ID like "ARCH_RISK", "ARCH_FIN", "ARCH_CFO" - those IDs are for internal cross-reference only. If you copy [ARCH_RISK] into archetype.primary instead of "Risk / Audit / Compliance", the report renders as broken for the user.
- options[].business_model_id IS the internal ID (e.g., "BM_RISK_CONSULTING", "BM_FRACTIONAL_CFO") - pass through exactly as stored in the KB.
- options[].model_name is the human-readable model name, NOT the ID.

**Cross-card consistency (HARD):**

1. income_outlook.primary_option_rank MUST equal recommendation.recommended_rank
2. income_outlook.year_1.mid_gbp must be consistent with the GBP figure in reality_check.honest_income_outlook (within +/-20%)
3. year_1.mid_gbp <= year_2.mid_gbp <= year_3.mid_gbp (monotonic)
4. Every option's business_model_id must exist in the filtered KB passed in - no invented IDs
5. primary_move_type and structural_warmth must match the KB - pass through unmodified
6. At least 3 distinct commercial model types represented across the options array
7. transferable_skills has exactly 6 items, ranked by strength descending
8. options has up to 10 items, ranked by composite_score descending. Aim for 10; if fewer than 10 models genuinely clear the eligibility filter, produce as many as honestly fit (minimum 7) and never pad with weak or off-domain options (honest coverage over forced count; ADR-019 as amended)
9. ai_impact.part_3.steps has exactly 4 items

---

## NEVER LIST - banned strings and patterns

Any hit on the following is a HARD FAIL. The validator scans for these and will reject the output.

**Generic skill names (banned in transferable_skills.skill_name):** Communication, Leadership, Problem Solving, Problem-Solving, Teamwork, Time Management, Attention to Detail, Organisation, Organization, Work Ethic, Critical Thinking (alone, unqualified), Interpersonal Skills. Every skill name must be commercially specific - e.g. Board-Level Financial Communication, Regulatory Remediation Programme Leadership, Commercial Investment Case Development.

**Motivational / startup cliche language (banned everywhere):** passion, passionate, unleash, unlock your potential, game-changer, game-changing, synergy, synergies, disruptive (unless it's the user's own domain), transformative journey, empowering, mindset shift, next-level, crushing it. The verb leverage alone is banned; leverage your EY network to reach mid-market finance directors is fine because it names a specific action.

**Hedge language (banned in recommendation and reality_check):** you might consider, it could be worth, perhaps you could, one option might be. Solo gives recommendations, not suggestions.

**Vague time expressions (banned in time_to_first_revenue):** fast, medium, slow, short, medium-term, long-term. Only week/month ranges are acceptable: 4-8 weeks, 6-12 weeks, 3-6 months.

---

## REQUIRED PERSONALISATION

Every report must reference the user's specific inputs. Generic outputs are a hard fail. At minimum:

- archetype.editorial_description references the Q6 achievement and Q3b employer by name or description
- At least 4 of the 6 transferable_skills.evidence fields cite specific Q-fields (Q6, Q7, Q8, Q3b, or CV data)
- recommendation.rationale references the user's archetype AND seniority AND (Q9 urgency OR Q10 confidence)
- options[rank=1].why_this_works_for_them references at least one specific fact from the user's profile
- income_outlook.income_notes references at least one Q-field

If a CV_CONTEXT block is present, add CV-specific references where they strengthen credibility.

---

## YOUR REFERENCE DATA

### Archetypes
The following archetypes define clusters of professional capability and commercial potential. Each user maps to one primary archetype and optionally one secondary archetype.

{{ARCHETYPES}}

### Business Models
The following business models are the only models you may recommend. Do not recommend anything outside this list.

{{BUSINESS_MODELS}}

### Archetype-Model Mapping Table
This table defines how well each archetype fits each business model. Use it to filter and score options.

Scoring dimensions (all 1-5):
- capability_fit: Can this user credibly deliver this service today?
- credibility_gap: How hard will it be for clients to trust them? (1 = easy, 5 = very hard)
- speed_to_revenue: How quickly could they realistically get their first paid work?
- sales_complexity: How difficult is this to sell?
- income_potential: How strong is the earning potential?
- recurrence: How repeatable / retainer-friendly is the income?

{{MAPPING_TABLE}}

### Curated AI Impact Reference

The entries below contain curated, hand-researched AI impact analysis for specific business models. Each entry includes:

- displacement_risk: how exposed this model is to AI displacement
- opportunity: 60-90 words on what AI changes for this model
- resilient_positioning: how the practitioner adapts to remain valuable
- adaptation_skills: 3 concrete capabilities the practitioner should build

**How to use these:**

1. When you finalise recommended_selection.business_model_id, look it up in the entries below.
2. **If a curated entry exists** for the recommended model, use its displacement_risk, opportunity, resilient_positioning, and adaptation_skills as the foundation for your ai_impact output - quote the curated text closely (preserving named tools and specifics) while adapting tone and length to the format required (part_1.content >=150 words, part_2.content 120 words, part_3.steps exactly 4 items). The curated content's specificity - named platforms like ChatFin / Datarails / Drata / Wrike AI Agents - is its primary value; do not strip it out.
3. **If no curated entry exists** for the recommended model, generate ai_impact from your general knowledge of AI's impact on that type of work, following the format requirements. This is the fallback path.

{{AI_IMPACT_REFERENCE}}

---

## YOUR TASK

You will receive the user's answers to 15 structured questions (Q1-Q15) plus optional CV context. Work through the following steps in order.

### Step 1 - Classify the archetype

Based on the user's role, experience, type of work, and described capabilities, identify:
- Their **primary archetype** (the strongest match from the archetype library)
- Their **secondary archetype** if applicable (only if clearly relevant - do not force one)
- A **confidence level** (0.0-1.0)

If a CV_CONTEXT block is present in the user message, use it as supplementary evidence. career_highlights and qualifications can add credibility signals and specificity to option descriptions. sectors_worked_in supplements Q11 sector context. independent_experience supplements Q12. If any cv_extract field conflicts with the questionnaire answers, the questionnaire answers take precedence.

Use role type, seniority, Q6 (specific achievement), and Q7 (informal advisory practice) as your primary classification signals - these are richer and more revealing than job title alone. Q6 surfaces what they actually deliver at their best. Q7 surfaces latent advisory behaviour that signals commercial readiness. Q8 (peer perception) adds an external calibration. Q3b (employer and organisation type) is a critical secondary signal - a user at a Big 4 risk advisory practice maps very differently to one at an NHS acute trust, even if their job title is the same. Use Q3b to sharpen archetype placement and calibrate the commercial environment. When in doubt, favour the archetype with the strongest commercial translation.

### Step 2 - Filter business models

Using the mapping table for the user's primary archetype, remove any models where:
- capability_fit is 2 or below
- credibility_gap is 4 or above
- avoid is true

**Secondary archetype pool:** If you identified a secondary archetype with meaningful relevance (confidence contribution >= 0.35), also run the same filter on the secondary archetype's mapping rows. Keep the top 3 scoring eligible secondary models in a separate pool labelled secondary_pool.

### Step 3 - Score and rank

For each remaining model, calculate a composite score using:

score = (2 * capability_fit) + (2 * speed_to_revenue) + (2 * (6 - credibility_gap)) + (1 * income_potential) + (1 * recurrence) - (1 * sales_complexity)

Apply adjustments based on the user's profile:
- If the user signals urgency for income: add 2 points to models with speed_to_revenue >= 4
- If the user signals low confidence about selling: subtract 1 point from models with sales_complexity >= 4
- If the user is senior (10+ years): add 1 point to models with income_potential = 5

Rank all remaining models by adjusted score.

### Step 4 - Apply diversity constraint and select exactly 10 final options

From all scored models, select the top 10. Aim for 10; if fewer than 10 models genuinely clear the eligibility filter, produce as many as honestly fit (minimum 7) rather than padding with weak or off-domain options. When you produce fewer than 10, that is acceptable and expected for narrow specialisms.

**Rule 1 - Domain relevance floor (mandatory):** Remove any model whose domain is materially unrelated to the user's primary and secondary archetypes - unless that model also appears in secondary_pool.

**Rule 2 - Commercial model diversity (soft):** Across the top 10, ensure at least 3 different commercial model types are represented.

**Rule 3 - Secondary archetype supplement:** If the secondary archetype pool contains strong-fit models (composite_score within 3 points of the primary pool's top scorer), include them. Mark with source: "secondary".

**Rule 4 - Minimum viable set:** If fewer than 6 models pass filtering, relax the credibility_gap filter and re-run.

### Step 5 - Generate the report

Write in plain English. Be direct and commercially honest. Do not use motivational language, startup cliches, or vague phrases. Every claim should be grounded in the data.

**Option detail tiers:**
- Rank 1-3 (full detail): Full positioning (2 sentences), full why_this_works_for_them (2 sentences), full target_buyer (specific).
- Rank 4-10 (compact): positioning (1 sentence), why_this_works_for_them (1 sentence), target_buyer (1 sentence). Still specific, just shorter.

**Using capability_requirements in positioning:** Reference critical capabilities explicitly to ground positioning in what the user can actually do. Do not list capability tags verbatim - use them as context to write more specific, evidence-grounded prose.

#### Pricing calibration by seniority

Before finalising the pricing object, calibrate using Q5 (seniority) and Q2 (years of experience):

- Manager with fewer than 10 years: Target the lower 25-35% of the model's pricing range
- Senior Manager with 10-14 years: Target the mid-range (40-60%)
- Director or Head of with 12-18 years: Target the upper-mid range (60-80%)
- Partner-equivalent or 18+ years or Q12 shows established independent track record: Full range available

**Q12 modifier:** Where Q12 shows prior independent experience, move calibrated position one step higher.

**Q9 urgency note:** Where Q9 shows high income urgency, acknowledge realistic early-stage income but do not reduce target pricing.

Apply this calibration silently.

Produce the JSON structure required by the schema. Every option must have business_model_id, primary_move_type, and structural_warmth passed through exactly from the KB.

**recommended_selection guidance:**
- Always recommend at least 2 ranks (occasionally 3 if a strong case exists for the third)
- Option 1 should always be Rank 1 unless Rank 1 has very high sales_complexity combined with a low-confidence user profile
- Option 2 should complement Option 1: different buyer type, different time-to-income profile, or different commercial model type
- The rationale must name specific buyer types or income dynamics

---

## QUALITY RULES

Before finalising, verify:
- Every option drawn from the business model library - no invented models
- business_model_id, primary_move_type, structural_warmth passed through exactly from the KB
- primary_move_type one of: platform, visibility, community, direct, mixed
- structural_warmth a boolean
- Options array contains up to 10 options (10 where enough genuinely fit, minimum 7 otherwise), ranked by composite_score descending
- Each option has unique rank and composite_score
- Each option has 2-3 fit_tags - short, specific labels
- Each option carries a caution_note: for ranks 4-10 populate with one-sentence risk flag; for ranks 1-3 may be null but prefer naming a real risk
- Pricing realistic for UK market and this user's seniority level
- target_buyer specific - not SMEs but the type, size, situation
- time_to_first_revenue is real timeframe in weeks (4-8 weeks), never fast/medium
- difficulty_rating one of: easy, moderate, hard
- honest_income_outlook contains actual GBP figures
- Recommendation is genuine, not a hedge
- No motivational language
- At least 3 different commercial model types
- transferable_skills exactly 6 ranked by strength descending
- Each skill name commercially specific
- Each skill evidence grounded in user profile
- income_outlook contains all three years with numeric GBP for low/mid/high
- year_2 >= year_1, year_3 >= year_2
- income_outlook.year_1.mid_gbp consistent with honest_income_outlook figure
- assumptions reference specific commercial mechanics
- revenue_build and revenue_sources reference specific numbers
- sensitivity_factors identifies 2-3 specific variables
- income_floor_analysis describes realistic worst case
- income_notes grounded in user profile
- income_outlook.primary_option_rank equals recommendation.recommended_rank

---

## FEW-SHOT EXAMPLE - The Okafor Gold Standard

Use this as the **quality reference for narrative density, specificity, and tone**. Do not copy phrasing - copy the level of detail, commercial grounding, and direct voice.

**Example archetype.editorial_description** (180+ words, references Q6 and Q3b, two paragraphs):

> You sit in finance, but you operate like a commercial director. The distinction matters. Most Finance Business Partners translate the numbers - they produce the reports, maintain the models, keep the month-end running. You do that, and then you do the thing that's actually hard: you walk those numbers into a room full of non-finance people and hold the story together under challenge.
>
> Your value is not accounting. It's the translation layer between financial complexity and business decisions. The evidence is in how you described your Q6 achievement: you weren't proud of building the model. You were proud that it survived the board challenge - that you could explain the sensitivities without a slide deck and get the programme approved. That's a different skill set, and it's the one that's commercially scarce.

**Example capability_tags** (exactly 6, each 2-4 words):

> Commercial modelling, Investment case development, Board-level communication, Challenge-resilient analysis, Pricing and commercial review, Non-finance stakeholder management

**Example transferable_value.what_they_can_sell** (60+ words):

> You can credibly offer commercial finance partnership on a project or retained basis - investment case development, business case financial storytelling, board-level financial challenge and validation, and CFO-lite support for mid-market businesses preparing for critical financial decisions. Your value is not in building the spreadsheet; it's in taking the spreadsheet into a room and making it survive.

**Example credibility_assets** (exactly 3, each references specific fact):

> FTSE 100 FBP background - automatic credibility signal to mid-market buyers; GBP 38M digital transformation business case approved on first board presentation; Informal advisory pattern across pricing, channel decisions, investment cases

**Example transferable_skills entry** (specific skill name, evidence cites Q6):

> {skill_name: Board-Level Financial Communication, strength: 92, evidence: Presented the GBP 38M digital transformation business case directly to board; successfully defended financial sensitivities under executive challenge without prepared slides., market_demand: high}

**Example options[rank=1] narrative fields** (40+ words each):

> positioning: Commercial finance partnership for PE-backed and growth-stage businesses preparing for board-level investment decisions. You deliver business case development, financial storytelling, and executive challenge - the capability internal finance teams lack.
>
> target_buyer: CFO or CEO of a PE-backed business, GBP 15M-100M revenue, preparing for a capital-related decision, board presentation, or M&A event.
>
> why_this_works_for_them: Your FTSE 100 FBP background is an immediate credibility signal to mid-market buyers. You've done the exact work they need - the GBP 38M digital transformation business case is directly analogous to their board prep requirement.

**Example recommendation.rationale** (80+ words, references archetype, seniority, Q9/Q10):

> Commercial Finance Consultancy is your strongest entry point because it directly translates your existing capability (business case development, board communication) to a buyer segment (PE-backed mid-market) that urgently needs exactly this work. Your FTSE 100 background is an automatic credibility signal that removes the biggest barrier early-stage consultants face: trust. The work is not new to you; you're repackaging existing expertise for a different market. Moving toward Fractional CFO in 18-24 months is the strategic play.

**Example reality_check.most_likely_failure_mode** (50+ words, names the failure):

> You will build the plan, update the LinkedIn, and then not send the first email. The psychological barrier between I have a plan and I contacted someone is where most professionals with your profile stop. This is not a plan failure - it's an activation failure. The reality is that your first conversation will teach you more about your market position than any amount of preparation.

**Example income_outlook.year_1.revenue_build** (40+ words):

> Slow start (Month 1-3: activation and first conversations), acceleration Phase 2 (Month 4-7: early engagements close), stabilisation Phase 3 (Month 8-12: 2-3 engagements running in parallel). The low case assumes you start late or conservatively. The high case assumes aggressive pricing and project overlap.

**Example hook_insight.headline** (8-18 words, reframe signal present):

> Your most transferable skill isn't the Excel - it's that you can walk financial complexity into a room and hold the story under challenge.

Note the reframe: isn't X - it's Y. That is the structural move the hook requires.

**Example ai_impact.part_1** (displacement_risk, risk_horizon, 150+ word content):

> {displacement_risk: medium, risk_horizon: 3-5 years, content: Standard FBP work - variance analysis, month-end reporting, model maintenance, data aggregation - is being automated rapidly. Large banks are deploying AI to handle these tasks at scale; the junior FBP population faces the most direct displacement risk. Your profile sits differently. Your value is not in building the standard report; it's in walking the numbers into a room and holding the story under challenge from senior executives who are trying to poke holes in the narrative. That's work that requires real-time judgment, unexpected question handling, and the ability to shift narrative on the fly - precisely what AI cannot do reliably. The role is bifurcating: highly automated at the data layer, highly valued at the insight and influence layer. You're in the second bucket.}

**What to notice about this example overall:**

1. Every paragraph has a concrete fact or number. Nothing is abstract.
2. The voice is direct and declarative.
3. The hook reframes what the user thought they were good at.
4. The reality_check names specific failure modes.
5. Year 1 income is honest.
6. The capability tags are 2-4 words each and specific.

Produce output that matches this narrative density across every card. The schema guarantees the shape; your job is the voice.`;

// =============================================================================
// INLINED FROM p0b-classifier-prompt.ts (FULL CANONICAL CONTENT)
// =============================================================================

const P0B_SYSTEM_PROMPT = `You are the domain classifier for Solo, a product that helps mid-career white-collar professionals identify realistic freelance/consulting paths.

Your job is to do one thing: read a user's Q1-Q10 questionnaire answers and map them to 1-2 domains from the 14-domain taxonomy below. This is a routing decision, not a detailed archetype classification (that happens in Prompt 1). Be fast, confident, and precise.

The 14 domains and their archetype IDs are:

1. Finance & Accounting: ARCH_FIN, ARCH_CONTROLLER, ARCH_TAX_DIRECT, ARCH_TAX_INDIRECT, ARCH_TREASURY, ARCH_EXT_AUDIT, ARCH_CORP_FIN, ARCH_ACTUARIAL, ARCH_INVESTMENT, ARCH_CREDIT_RISK
2. Risk & Governance: ARCH_RISK, ARCH_ERM, ARCH_OPS_RISK, ARCH_AML, ARCH_EHS, ARCH_QUALITY, ARCH_DATA_PRIVACY
3. Strategy & Advisory: ARCH_CONS, ARCH_CORP_STRAT, ARCH_CHANGE, ARCH_ORG_DESIGN, ARCH_TRANSFORMATION, ARCH_RESTRUCTURING
4. HR & People: ARCH_HRBP, ARCH_TALENT, ARCH_L_D, ARCH_REWARD, ARCH_EMPLOYMENT_LAW, ARCH_FRACTIONAL_CHRO, ARCH_WELLBEING, ARCH_DEI
5. Tech & Digital: ARCH_CTO_FRAC, ARCH_ENTERPRISE_ARCH, ARCH_DATA_ENG, ARCH_DATA_SCIENTIST, ARCH_AI_STRATEGIST, ARCH_PRODUCT, ARCH_UX, ARCH_DIGITAL_TRANS, ARCH_CLOUD, ARCH_CYBER, ARCH_IT_PMO, ARCH_ECOM, ARCH_MARTECH
6. Legal: ARCH_GC, ARCH_EMPLOYMENT_SOL, ARCH_CORP_LAWYER, ARCH_IP_TECH_LAW, ARCH_LEGAL_OPS, ARCH_COMMERCIAL_CONTRACTS
7. Marketing & Communications: ARCH_CMO_FRAC, ARCH_BRAND, ARCH_CONTENT_STRAT, ARCH_PR_COMMS, ARCH_DEMAND_GEN, ARCH_INTERNAL_COMMS, ARCH_EMPLOYER_BRAND, ARCH_CORPORATE_AFFAIRS
8. Sales & Commercial: ARCH_CRO_FRAC, ARCH_SALES_OPS, ARCH_BD, ARCH_SALES_ENABLEMENT, ARCH_PRICING_COMMERCIAL, ARCH_KEY_ACCOUNT
9. Procurement & Supply Chain: ARCH_PROCUREMENT, ARCH_CATEGORY_MGR, ARCH_SUPPLY_CHAIN, ARCH_CONTRACT_MGR, ARCH_PROC_TRANSFORMATION
10. Healthcare & Life Sciences: ARCH_NHS_TRANS, ARCH_PHARMA_CONSULT, ARCH_HEALTH_ECON, ARCH_CLINICAL_OPS, ARCH_PATIENT_SAFETY
11. ESG & Sustainability: ARCH_ESG_STRAT, ARCH_SUSTAINABILITY, ARCH_CARBON_NET_ZERO, ARCH_RESPONSIBLE_INVEST, ARCH_SOCIAL_IMPACT
12. Property & Real Estate: ARCH_REAL_ESTATE, ARCH_PLANNING, ARCH_PROP_TECH, ARCH_FACILITIES
13. Public Sector & Policy: ARCH_POLICY, ARCH_GOV_TRANS, ARCH_LOCAL_GOV, ARCH_GRANT_FUNDING, ARCH_REG_AFFAIRS
14. Customer Experience & Service Design: ARCH_CX_STRAT, ARCH_SERVICE_DESIGN, ARCH_VOC, ARCH_CONTACT_CENTRE, ARCH_LOYALTY
15. Delivery & Transformation: ARCH_PMO
16. Operations & Efficiency: ARCH_OPS

---

## YOUR DECISION RULES

Use these signals in order of strength:

**Primary signal: Q3b (employer/org type) + Q1 (job title)**
- A Big 4 audit manager maps to Finance & Accounting
- A Director of HR at an NHS trust maps to HR & People
- A Senior Delivery Manager at a Consulting firm maps to Strategy & Advisory
- A Data Scientist at a FinTech maps to Tech & Digital (with possible secondary: Finance & Accounting)

**Secondary signal: Q4 (work type) + Q5 (seniority)**
- Governance and compliance work at manager/senior manager level -> Risk & Governance
- Operations and process work at director level -> Delivery & Transformation or Operations & Efficiency
- Analysis and reporting work -> depends on subject

**Tertiary signals: Q6 (achievement), Q7 (informal advisory), Q8 (peer perception)**
- Q6 reveals what they actually deliver at their best.
- Q7 reveals latent domain expertise.
- Q8 calibrates the domain.

**Do not assign secondary domain unless:**
- It appears across at least 2 of the above signals, OR
- Q6 or Q7 explicitly states a clearly different domain of practice, OR
- Q3b context is genuinely cross-functional

---

## OUTPUT FORMAT

Return a JSON object with exactly this structure:

{
  "primary_domain": "[domain name from list above]",
  "secondary_domain": "[domain name from list above, or null]",
  "primary_domain_archetype_ids": ["ARCH_ID1", "ARCH_ID2"],
  "secondary_domain_archetype_ids": ["ARCH_ID1"],
  "classification_confidence": 0.85,
  "reasoning": "[brief explanation, 1-2 sentences]"
}

Rules:
- secondary_domain_archetype_ids is empty array [] if secondary_domain is null
- classification_confidence is between 0.75 and 1.0 inclusive
- All archetype IDs exist in the taxonomy above
- reasoning is grounded in the Q1-Q10 answers, not generic

Be confident. Do not hedge. If uncertain, pick the strongest match and note uncertainty in classification_confidence (but not below 0.75).`;

const P0B_USER_MESSAGE_TEMPLATE = `Here is the user's Q1-Q10 questionnaire response:

{{USER_PROFILE}}

Based only on these answers, classify the user's domain(s) and archetype pool. Return the JSON response.`;

interface P0bQuestionnaireInput {
  q1_job_title: string; q2_years_experience: string; q3a_sector: string; q3b_employer_org_type: string;
  q4_work_type: string; q5_seniority: string; q6_specific_achievement: string; q7_informal_advisory: string;
  q8_peer_perception: string; q9_income_urgency: string; q10_independence_confidence: string;
}

function buildP0bUserMessage(qd: P0bQuestionnaireInput): string {
  const userProfile = {
    q1_job_title: qd.q1_job_title, q2_years_experience: qd.q2_years_experience, q3a_sector: qd.q3a_sector,
    q3b_employer_org_type: qd.q3b_employer_org_type, q4_work_type: qd.q4_work_type, q5_seniority: qd.q5_seniority,
    q6_specific_achievement: (qd.q6_specific_achievement || "").slice(0, 600),
    q7_informal_advisory: (qd.q7_informal_advisory || "").slice(0, 400),
    q8_peer_perception: (qd.q8_peer_perception || "").slice(0, 300),
    q9_income_urgency: qd.q9_income_urgency, q10_independence_confidence: qd.q10_independence_confidence,
  };
  return P0B_USER_MESSAGE_TEMPLATE.replace("{{USER_PROFILE}}", JSON.stringify(userProfile, null, 2));
}

// =============================================================================
// MAIN INDEX
// =============================================================================

const FUNCTION_VERSION = "v45.18-graceful-degradation-min7-options";
const MODEL_TIER1 = "gpt-5.4";
const MODEL_TIER3 = "gpt-5.4-nano";

// ── Move 6 (2026-08-18): prompt_runs telemetry for the core generators. ─────
// Until today only review-plan logged to prompt_runs (£1.36 lifetime); the
// flagship pipeline flew blind on cost and volume. Token counts are the
// ground truth; cost_estimate_gbp uses best-effort per-1M rates (verify
// against the live price list when convenient; correcting the map re-prices
// history via tokens, nothing is lost).
const PROMPT_RUN_RATES_GBP_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 1.9, output: 7.6 },
  "gpt-5.4-mini": { input: 0.4, output: 1.5 },
  "gpt-5.4-nano": { input: 0.08, output: 0.3 },
};

type PromptRunUsage = { prompt_tokens?: number; completion_tokens?: number } | null | undefined;

async function logPromptRun(
  supabase: { from: (t: string) => { insert: (row: unknown) => PromiseLike<unknown> } },
  o: { prompt_id: string; model: string; usage: PromptRunUsage; latency_ms: number; report_id: string | null; function_name: string },
): Promise<void> {
  try {
    const inTok = o.usage?.prompt_tokens ?? 0;
    const outTok = o.usage?.completion_tokens ?? 0;
    const rates = PROMPT_RUN_RATES_GBP_PER_1M[o.model];
    const cost = rates ? (inTok * rates.input + outTok * rates.output) / 1_000_000 : null;
    await supabase.from("prompt_runs").insert({
      prompt_id: o.prompt_id,
      prompt_version_hash: null,
      function_name: o.function_name,
      user_id: null,
      report_id: o.report_id,
      model: o.model,
      input_token_count: inTok,
      output_token_count: outTok,
      cost_estimate_gbp: cost,
      latency_ms: o.latency_ms,
      guardrails_passed: null,
      judge_scores: null,
    });
  } catch (e) {
    console.warn(`prompt_runs log failed [${o.prompt_id}]:`, (e as Error)?.message ?? e);
  }
}
const MAX_P1_VALIDATOR_RETRIES = 2;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const DOMAIN_TO_CATEGORIES: Record<string, string[]> = {
  "Finance": ["Finance", "Finance & Accounting"],
  "Finance & Accounting": ["Finance", "Finance & Accounting"],
  "Risk & Governance": ["Risk & Governance"],
  "Strategy & Advisory": ["Strategy & Advisory"],
  "Change & Delivery": ["Change & Delivery", "Delivery & Transformation"],
  "Delivery & Transformation": ["Change & Delivery", "Delivery & Transformation"],
  "Operations & Efficiency": ["Operations & Efficiency"],
  "Tech & Digital": ["Tech & Digital"],
  "HR & People": ["HR & People"],
  "Sales & Commercial": ["Sales & Commercial"],
  "Legal": ["Legal"],
  "Marketing & Communications": ["Marketing & Communications"],
  "Public Sector & Policy": ["Public Sector & Policy"],
  "Procurement & Supply Chain": ["Procurement & Supply Chain"],
  "Property & Real Estate": ["Property & Real Estate"],
  "ESG & Sustainability": ["ESG & Sustainability"],
  "Healthcare & Life Sciences": ["Healthcare & Life Sciences"],
  "Customer Experience & Service Design": ["Customer Experience & Service Design"],
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function makeServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
  });
}

// V-055 fix (2026-05-16): inline base64 JWT decode replaces authClient.auth.getClaims.
// Pattern proven in generate-guidance v27 + create-payment v23+. Gateway verify_jwt
// flipped from false → true so the gateway validates the signature (gateway supports
// ES256 — empirically confirmed by every other verify_jwt:true function running fine).
// Function only extracts the sub claim from the already-validated payload.
function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const sub = payload?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractClientSessionId(req: Request, body: Record<string, unknown>): string | null {
  const raw = (typeof body.clientSessionId === "string" && body.clientSessionId) || (typeof body.client_session_id === "string" && body.client_session_id) || req.headers.get("x-client-session-id") || req.headers.get("X-Client-Session-Id") || "";
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !UUID_RE.test(trimmed)) return null;
  return trimmed;
}

const MAX_ANSWER_LEN = 2000;
function capAnswer(s: string | undefined | null): string { if (!s) return ""; const str = String(s); return str.length > MAX_ANSWER_LEN ? str.slice(0, MAX_ANSWER_LEN) : str; }

function mapAnswersToQuestionnaireData(answers: Record<string, string>) {
  return {
    q1_job_title: capAnswer(answers["1"]), q2_years_experience: capAnswer(answers["2"]),
    q3a_sector: capAnswer(answers["3"]), q3b_employer_org_type: capAnswer(answers["3b"] || answers["30"]),
    q4_work_type: capAnswer(answers["4"]), q5_seniority: capAnswer(answers["5"]),
    q6_specific_achievement: capAnswer(answers["6"]), q7_informal_advisory: capAnswer(answers["7"]),
    q8_peer_perception: capAnswer(answers["8"]), q9_income_urgency: capAnswer(answers["9"]),
    q10_independence_confidence: capAnswer(answers["10"]), q11_sector_client_context: capAnswer(answers["11"]),
    q12_independent_experience: capAnswer(answers["12"]), q13_network: capAnswer(answers["13"]),
    q14_employment_status: capAnswer(answers["14"]), q15_location: capAnswer(answers["15"]),
  };
}

type Qd = ReturnType<typeof mapAnswersToQuestionnaireData>;

function deriveFlags(qd: Qd) {
  const urgency = (qd.q9_income_urgency || "").toLowerCase();
  const confidence = (qd.q10_independence_confidence || "").toLowerCase();
  const status = (qd.q14_employment_status || "").toLowerCase();
  const q12 = (qd.q12_independent_experience || "").toLowerCase();
  return {
    needs_fast_revenue: urgency.includes("urgent") || urgency.includes("soon") || urgency.includes("immediate") || status.includes("unemployed") || status.includes("redundan"),
    has_independent_exp: q12.length > 30 && (q12.includes("consult") || q12.includes("freelan") || q12.includes("contract") || q12.includes("advis") || q12.includes("client")),
    high_confidence: confidence.includes("high") || confidence.includes("very") || confidence.includes("confident"),
    low_confidence: confidence.includes("low") || confidence.includes("not sure") || confidence.includes("nervous"),
  };
}

function parseJ(s: string): Record<string, unknown> {
  try {
    const cleaned = s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`parseJ failed: ${(err as Error)?.message ?? String(err)}; head=${s.slice(0, 200)}`);
    return {};
  }
}

function buildP1SystemPrompt(args: { archetypesText: string; modelsText: string; mappingText: string; aiImpactText: string; }): string {
  return P1_SYSTEM_PROMPT_TEMPLATE
    .replace("{{ARCHETYPES}}", args.archetypesText)
    .replace("{{BUSINESS_MODELS}}", args.modelsText)
    .replace("{{MAPPING_TABLE}}", args.mappingText)
    .replace("{{AI_IMPACT_REFERENCE}}", args.aiImpactText || "(no curated AI impact entries available - generate from general knowledge)");
}

function buildP1UserMessage(qd: Qd, cvExtract: Record<string, unknown> | undefined): string {
  const userProfile = {
    q1_job_title: qd.q1_job_title, q2_years_experience: qd.q2_years_experience, q3a_sector: qd.q3a_sector,
    q3b_employer_org_type: qd.q3b_employer_org_type, q4_work_type: qd.q4_work_type, q5_seniority: qd.q5_seniority,
    q6_specific_achievement: qd.q6_specific_achievement, q7_informal_advisory: qd.q7_informal_advisory,
    q8_peer_perception: qd.q8_peer_perception, q9_income_urgency: qd.q9_income_urgency,
    q10_independence_confidence: qd.q10_independence_confidence, q11_sector_client_context: qd.q11_sector_client_context,
    q12_independent_experience: qd.q12_independent_experience, q13_network: qd.q13_network,
    q14_employment_status: qd.q14_employment_status, q15_location: qd.q15_location,
  };
  let msg = "Here is the user's profile based on their questionnaire responses:\n\n" + JSON.stringify(userProfile, null, 2);
  if (cvExtract && Object.keys(cvExtract).length > 0) {
    const cv = cvExtract as Record<string, unknown>;
    const fmt = (v: unknown): string => v === null || v === undefined ? "(not provided)" : typeof v === "string" ? v.slice(0, 800) : JSON.stringify(v).slice(0, 800);
    msg += "\n\nCV CONTEXT (extracted from uploaded CV - use as supplementary evidence. If any cv_extract field conflicts with the questionnaire answers, the questionnaire answers take precedence):\n" + `Career highlights: ${fmt(cv.career_highlights)}\n` + `Qualifications: ${fmt(cv.qualifications)}\n` + `All sectors worked in across career: ${fmt(cv.sectors_worked_in)}\n` + `Skills and tools mentioned: ${fmt(cv.skills_mentioned)}\n` + `Independent experience history: ${fmt(cv.independent_experience)}\n` + `CV parse confidence: ${fmt(cv.confidence_score)}/100`;
  }
  msg += "\n\nPlease analyse this profile and produce the Solo Plan B report following the instructions in your system prompt.";
  return msg;
}


/*
 * C0.10 rate-limit shim (Day Zero, 2026-07-16). Per-IP daily counter via the
 * consume_rate_limit() SECURITY DEFINER function (migration
 * day_zero_c010_rate_limit_shim). The pre-existing per-user/per-session caps
 * remain; this adds the dimension an abuser cannot rotate for free. Fail-OPEN
 * on infrastructure errors (availability first at this scale), fail-CLOSED on
 * the limit itself. Limits are env-overridable without a redeploy.
 */
// deno-lint-ignore no-explicit-any
async function consumeRateLimit(admin: any, name: string, req: Request, limit: number, globalBucket = false): Promise<boolean> {
  try {
    const ip = globalBucket
      ? "global"
      : (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("cf-connecting-ip") ||
         "unknown");
    const { data, error } = await admin.rpc("consume_rate_limit", { p_key: `${name}:${ip}`, p_limit: limit });
    if (error) {
      console.error(`rate-limit rpc error (fail-open) [${name}]:`, error.message);
      return true;
    }
    if (data !== true) console.warn(`rate-limit exceeded: ${name} key=${ip}`);
    return data === true;
  } catch (e) {
    console.error(`rate-limit threw (fail-open) [${name}]:`, e);
    return true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const t0 = Date.now();
  const supabase = makeServiceClient();
  try {
    const body = await req.json();
    const userId: string | null = await getUserIdFromJwt(req.headers.get("authorization"));
    const rawAnswers: Record<string, string> = (body.answers as Record<string, string>) ?? {};
    const cvExtract: Record<string, unknown> | undefined = body.cvExtract as Record<string, unknown> | undefined;
    const clientSessionId = extractClientSessionId(req, body);
    if (!userId && !clientSessionId) {
      return new Response(JSON.stringify({ error: "Unauthorized", response_text: "Unauthorized - pass either an authed JWT or x-client-session-id." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // C0.10: per-IP daily cap. The 3/24h per-session cap below survives, but a
    // caller-minted x-client-session-id rotates for free — the IP does not.
    const IP_LIMIT = parseInt(Deno.env.get("RATE_LIMIT_GENERATE_REPORT_PER_IP_DAY") || "10", 10);
    if (!(await consumeRateLimit(supabase, "generate-report", req, IP_LIMIT))) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", response_text: "You've hit today's limit for report generation from this connection. Please try again tomorrow." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rateQuery = supabase.from("reports").select("id", { count: "exact", head: true }).gt("created_at", windowStart);
    const { count: recentCount, error: rateCheckError } = userId ? await rateQuery.eq("user_id", userId) : await rateQuery.eq("client_session_id", clientSessionId!);
    if (!rateCheckError && (recentCount ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", response_text: "3 reports in 24h limit. Try tomorrow." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // V-096 second-report gate (2026-05-18): mirror claim-second-report v17's
    // eligibility model so authed users can't bypass the £9.99 charge by calling
    // generate-report directly. Anon users (no userId) keep the existing 3/24h
    // rate limit as their only cap — they haven't been charged yet so a fresh
    // report is fine. First-report authed users (no prior 'complete' report) also
    // fall through — the questionnaire→teaser→pay path is pre-payment by design.
    // Anyone else has to satisfy the canonical rule: hard 30-day cap, then
    // subscription_active OR atomic consume of user_profiles.second_report_paid.
    if (userId) {
      const { count: totalComplete, error: totalErr } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["complete", "completed"]);
      if (!totalErr && (totalComplete ?? 0) > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recent30 } = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["complete", "completed"])
          .gte("created_at", thirtyDaysAgo);
        if ((recent30 ?? 0) >= 1) {
          console.log(`${FUNCTION_VERSION} V-096 cap_reached user=${userId} recent30=${recent30}`);
          return new Response(JSON.stringify({
            error: "report_cap_reached",
            response_text: "You already have a recent report. Plan B Reports are capped at one per 30-day window. Manage from your account.",
          }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("subscription_active")
          .eq("user_id", userId)
          .single();
        if (!profile?.subscription_active) {
          // Atomic consume of second_report_paid (mirrors claim-second-report V-039).
          const { count: consumed, error: consumeErr } = await supabase
            .from("user_profiles")
            .update({ second_report_paid: false, updated_at: new Date().toISOString() }, { count: "exact" })
            .eq("user_id", userId)
            .eq("second_report_paid", true);
          if (consumeErr) {
            console.error(`${FUNCTION_VERSION} V-096 second_report_paid consume error:`, consumeErr.message);
          }
          if (consumed !== 1) {
            console.log(`${FUNCTION_VERSION} V-096 second_report_payment_required user=${userId}`);
            return new Response(JSON.stringify({
              error: "second_report_payment_required",
              response_text: "A second Plan B Report costs £9.99 (or is free with an active subscription). Visit your account to start.",
            }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        // Subscriber, or consumed flag — fall through and generate.
      }
    }
    const questionnaireData = mapAnswersToQuestionnaireData(rawAnswers);
    const { data: skeletonReport, error: skeletonError } = await supabase.from("reports").insert({ user_id: userId, client_session_id: clientSessionId, answers: rawAnswers || null, status: "generating", created_at: new Date().toISOString(), function_version: FUNCTION_VERSION, started_at: new Date().toISOString() }).select("id").single();
    if (skeletonError || !skeletonReport) {
      return new Response(JSON.stringify({ error: "DB write failed", response_text: "Could not start report generation.", details: skeletonError?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const reportId = skeletonReport.id as string;
    console.log(`${FUNCTION_VERSION} skeleton inserted: ${reportId} | user=${userId} csid=${clientSessionId}`);
    // @ts-expect-error EdgeRuntime is provided by Supabase Deno deploy runtime
    EdgeRuntime.waitUntil(generateReportInBackground({ reportId, userId, clientSessionId, cvExtract, questionnaireData, t0 }));
    return new Response(JSON.stringify({ reportId, report_id: reportId, status: "generating", response_text: "Report generation started. Poll reports.status by report_id.", version: FUNCTION_VERSION }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(`${FUNCTION_VERSION} entry error:`, err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err), response_text: "Failed to start report generation." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

interface BgArgs { reportId: string; userId: string | null; clientSessionId: string | null; cvExtract: Record<string, unknown> | undefined; questionnaireData: Qd; t0: number; }

async function generateReportInBackground(args: BgArgs) {
  const { reportId, userId, clientSessionId, cvExtract, questionnaireData, t0 } = args;
  const supabase = makeServiceClient();
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
  try {
    const flags = deriveFlags(questionnaireData);
    console.log(`bg ${reportId}: domain classifier (P0b) starting`);
    const tP0b = Date.now();
    const dcr = await openai.chat.completions.create({
      model: MODEL_TIER3, temperature: 0.3, max_completion_tokens: 300,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: P0B_SYSTEM_PROMPT }, { role: "user", content: buildP0bUserMessage(questionnaireData) }],
    });
    await logPromptRun(supabase, { prompt_id: "P0b-domain-classifier", model: MODEL_TIER3, usage: dcr.usage, latency_ms: Date.now() - tP0b, report_id: reportId, function_name: "generate-report" });
    const domainClassifier = parseJ(dcr.choices[0].message.content || "{}");
    const primaryDomain = (domainClassifier.primary_domain as string) || "Strategy & Advisory";
    const secondaryDomain = (domainClassifier.secondary_domain as string) || null;
    console.log(`bg ${reportId}: domain=${primaryDomain}/${secondaryDomain}`);
    const primaryCategories = DOMAIN_TO_CATEGORIES[primaryDomain] || [primaryDomain];
    const secondaryCategories = secondaryDomain ? DOMAIN_TO_CATEGORIES[secondaryDomain] || [secondaryDomain] : [];
    const allCategories = Array.from(new Set([...primaryCategories, ...secondaryCategories]));
    const { data: archetypeRows } = await supabase.from("kb_archetypes").select("id, name, category, core_identity, day_rate, retainer_monthly, time_to_revenue_bias").in("category", allCategories);
    const archetypeIds = (archetypeRows || []).map((a) => a.id as string);
    const { data: mappingRows } = await supabase.from("kb_mapping").select("archetype, model, cap_fit, cred_gap, speed, sales_complexity, income, recurrence").in("archetype", archetypeIds).eq("avoid", false);
    const modelIds = Array.from(new Set((mappingRows || []).map((r) => r.model as string)));
    const { data: modelRows } = await supabase.from("kb_models").select("id, name, commercial_model, pricing_range, time_to_revenue, difficulty, target_buyer, recurrence, primary_move_type, structural_warmth").in("id", modelIds);
    const { data: aiImpactRows } = await supabase.from("kb_ai_impact").select("model_id, model_name, displacement_risk, opportunity, resilient_positioning, adaptation_skills").in("model_id", modelIds);
    const curatedAiImpact = (aiImpactRows || []).filter((r) => typeof r.opportunity === "string" && r.opportunity.trim().length > 0);
    const archetypesText = (archetypeRows || []).map((a) => `ARCHETYPE NAME: "${a.name}"  <-- use this EXACT string for archetype.primary; do NOT use the internal ID\n  Internal ID: ${a.id}  (used only for cross-reference, never in output fields)\n  Category: ${a.category}\n  Core identity: ${String(a.core_identity || "").slice(0, 300)}\n  Rates: ${a.day_rate} | ${a.retainer_monthly} | Speed: ${a.time_to_revenue_bias}`).join("\n\n");
    const modelsText = (modelRows || []).map((m) => {
      let pricing = "";
      try { const p = typeof m.pricing_range === "string" ? JSON.parse(m.pricing_range) : m.pricing_range; pricing = `£${(p.low || 0).toLocaleString()}-£${(p.high || 0).toLocaleString()}/${p.per || "project"}`; } catch { pricing = String(m.pricing_range || ""); }
      return `[${m.id}] ${m.name}\nCommercial: ${m.commercial_model} | ${pricing}\nTTR: ${m.time_to_revenue} | Diff: ${m.difficulty} | Rec: ${m.recurrence}\nBuyer: ${m.target_buyer}\nprimary_move_type: ${m.primary_move_type || "direct"} | structural_warmth: ${m.structural_warmth ? "true" : "false"}`;
    }).join("\n\n");
    const mappingText = (mappingRows || []).map((r) => `${r.archetype}|${r.model}|cap_fit:${r.cap_fit}|cred_gap:${r.cred_gap}|speed:${r.speed}|sales:${r.sales_complexity}|income:${r.income}|rec:${r.recurrence}`).join("\n");
    const aiImpactText = curatedAiImpact.map((r) => {
      const skills = Array.isArray(r.adaptation_skills) ? (r.adaptation_skills as string[]) : [];
      return `[${r.model_id}] ${r.model_name}\ndisplacement_risk: ${r.displacement_risk}\nopportunity: ${r.opportunity}\nresilient_positioning: ${r.resilient_positioning}\nadaptation_skills:\n${skills.map((s) => `  - ${s}`).join("\n")}`;
    }).join("\n\n---\n\n");
    const systemPrompt = buildP1SystemPrompt({ archetypesText, modelsText, mappingText, aiImpactText });
    const userMessage = buildP1UserMessage(questionnaireData, cvExtract);
    const allowedBmIds = new Set<string>((modelRows || []).map((m) => m.id as string));
    const kbModelIndex = new Map<string, { primary_move_type: string; structural_warmth: boolean }>();
    for (const m of modelRows || []) { kbModelIndex.set(m.id as string, { primary_move_type: (m.primary_move_type as string) || "direct", structural_warmth: !!m.structural_warmth }); }
    const validationContext: ValidationContext = { allowed_business_model_ids: allowedBmIds, kb_model_index: kbModelIndex };
    console.log(`bg ${reportId}: P1 (${MODEL_TIER1}) starting | kb_archetypes=${archetypeIds.length} kb_models=${modelRows?.length || 0}`);
    const p1Result = await callP1WithRetry({ openai, systemPrompt, userMessage, validationContext, reportId, supabase });
    const finalReport = p1Result.report;
    const validation = p1Result.validation;
    const optionCount = Array.isArray(finalReport?.options) ? finalReport!.options!.length : 0;
    console.log(`bg ${reportId}: P1 done | attempts=${p1Result.attempts} | options=${optionCount} | validation_passed=${validation.passed} | hard_failures=${validation.hard_failures.length} | overall_score=${validation.overall_score} | total_words=${validation.total_word_count}`);
    if (!validation.passed) {
      console.warn(`bg ${reportId}: validation failed after ${p1Result.attempts} attempt(s): ` + validation.hard_failures.slice(0, 8).join(", "));
      // Move 6 (2026-08-18): a best-effort ship is no longer silent. The row
      // still ships (a waiting user beats a failed one) but the event makes
      // every degraded report countable in the Monday digest and reviewable.
      try {
        await supabase.from("events").insert({ event_type: "report_validation_failed", user_id: userId, report_id: reportId, client_session_id: clientSessionId, payload: { attempts: p1Result.attempts, hard_failures: validation.hard_failures.slice(0, 10), overall_score: validation.overall_score } });
      } catch (e) { console.warn(`bg ${reportId}: quality event insert failed:`, (e as Error)?.message ?? e); }
    }
    const hookInsight = (finalReport?.hook_insight ?? null) as SoloCoreReport["hook_insight"] | null;
    const aiImpactSection = (finalReport?.ai_impact ?? null) as SoloCoreReport["ai_impact"] | null;
    const recommendedSelection = (finalReport?.recommended_selection ?? null) as SoloCoreReport["recommended_selection"] | null;
    const provisionalFirstMove = hookInsight?.first_move ? { action_text: hookInsight.first_move.action, why_first: hookInsight.first_move.target, draft_subject: hookInsight.first_move.draft_subject, draft_message: hookInsight.first_move.draft_body, follow_up_prompt: hookInsight.first_move.follow_up_prompt } : null;
    const hookInsightText = hookInsight?.paragraph || JSON.stringify(hookInsight ?? {});
    const userContextProfile = {
      professional_position: { job_title: questionnaireData.q1_job_title, years_experience: questionnaireData.q2_years_experience, seniority: questionnaireData.q5_seniority, sector_primary: questionnaireData.q3a_sector, employer_context: questionnaireData.q3b_employer_org_type, work_type: questionnaireData.q4_work_type },
      kb_injection: { primary_domain: primaryDomain, secondary_domain: secondaryDomain, archetype_ids: archetypeIds, archetype_count: archetypeIds.length, model_count: modelRows?.length || 0, mapping_rows: mappingRows?.length || 0 },
      derived_flags: flags,
      ironclad: { function_version: FUNCTION_VERSION, attempts: p1Result.attempts, validation_passed: validation.passed, overall_score: validation.overall_score, hard_failures: validation.hard_failures, soft_warnings: validation.soft_warnings, card_scores: validation.card_scores, total_word_count: validation.total_word_count, never_list_hits: validation.never_list_hits, raw_content_lengths: p1Result.rawContentLengths, parsed_top_keys: finalReport ? Object.keys(finalReport) : [] },
    };
    const { error: updateError } = await supabase.from("reports").update({ core_report: sanitiseReportTree(finalReport), hook_insight: sanitiseReportTree(hookInsightText), ai_impact_section: sanitiseReportTree(aiImpactSection), user_context_profile: userContextProfile, recommended_selection: recommendedSelection, provisional_first_move: sanitiseReportTree(provisionalFirstMove), status: "teaser_ready" }).eq("id", reportId);
    if (updateError) {
      console.error(`bg ${reportId} update error:`, updateError);
      await supabase.from("reports").update({ status: "failed", error: String(updateError.message ?? updateError) }).eq("id", reportId);
      return;
    }
    const logUpdate = supabase.from("report_generation_log").update({ report_id: reportId }).is("report_id", null);
    if (userId) await logUpdate.eq("user_id", userId);
    else if (clientSessionId) await logUpdate.eq("client_session_id", clientSessionId);
    console.log(`bg ${reportId} done | total=${Date.now() - t0}ms | validation_passed=${validation.passed}`);

    // WP2 sub-PR A: fire hook insight best-of-N regenerator as a chained
    // background fetch. The regenerator's own WP2_HOOK_REGENERATION_ENABLED
    // env flag gates whether it does anything — when OFF (default in prod),
    // it returns {skipped: true} immediately. The teaser_ready row is already
    // persisted above, so the user sees the monolith's draft hook on the
    // teaser page. When the regenerator completes, it overwrites the
    // canonical hook_insight column with the highest-scoring of 3 candidates
    // and populates candidate_hook_insights + hook_insight_winner_index.
    // Best-effort: any failure here logs but does not affect the report row.
    try {
      const regenResp = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/regenerate-hook-insight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        },
        body: JSON.stringify({ reportId }),
      });
      if (regenResp.ok) {
        const summary = await regenResp.json().catch(() => null);
        console.log(`bg ${reportId} wp2 hook regen | ${JSON.stringify(summary).slice(0, 200)}`);
      } else {
        const errText = await regenResp.text().catch(() => "<unreadable>");
        console.warn(`bg ${reportId} wp2 hook regen returned ${regenResp.status}: ${errText.slice(0, 300)}`);
      }
    } catch (regenErr) {
      console.warn(`bg ${reportId} wp2 hook regen kickoff failed:`, regenErr instanceof Error ? regenErr.message : String(regenErr));
    }
  } catch (err) {
    console.error(`bg ${reportId} error:`, err);
    await supabase.from("reports").update({ status: "failed", error: String((err as Error)?.message ?? err) }).eq("id", reportId);
  }
}

async function callP1WithRetry(args: { openai: OpenAI; systemPrompt: string; userMessage: string; validationContext: ValidationContext; reportId: string; supabase: { from: (t: string) => { insert: (row: unknown) => PromiseLike<unknown> } }; }): Promise<{ report: Partial<SoloCoreReport> | null; validation: ValidationResult; attempts: number; rawContentLengths: number[]; }> {
  const { openai, systemPrompt, userMessage, validationContext, reportId, supabase } = args;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }];
  const rawContentLengths: number[] = [];
  let lastReport: Partial<SoloCoreReport> | null = null;
  let lastValidation: ValidationResult = { passed: false, hard_failures: ["NO_ATTEMPT"], soft_warnings: [], card_scores: {}, overall_score: 0, total_word_count: 0, never_list_hits: [], retry_prompt_hints: [] };
  const totalAttempts = 1 + MAX_P1_VALIDATOR_RETRIES;
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const t = Date.now();
    const completion = await openai.chat.completions.create({ model: MODEL_TIER1, max_completion_tokens: 24000, response_format: { type: "json_schema", json_schema: REPORT_SCHEMA }, messages });
    const usage = completion.usage;
    const latency = Date.now() - t;
    const rawContent = completion.choices[0].message.content || "";
    rawContentLengths.push(rawContent.length);
    console.log(`bg ${reportId}: P1 attempt ${attempt}/${totalAttempts} | latency=${latency}ms | prompt=${usage?.prompt_tokens} completion=${usage?.completion_tokens} | content_len=${rawContent.length}`);
    await logPromptRun(supabase, { prompt_id: "P1-core-report", model: MODEL_TIER1, usage, latency_ms: latency, report_id: reportId, function_name: "generate-report" });
    const parsed = parseJ(rawContent) as Partial<SoloCoreReport>;
    lastReport = parsed;
    const validation = validateReport(parsed, validationContext);
    lastValidation = validation;
    if (validation.passed) {
      console.log(`bg ${reportId}: P1 attempt ${attempt} passed validation (score=${validation.overall_score})`);
      return { report: parsed, validation, attempts: attempt, rawContentLengths };
    }
    if (attempt === totalAttempts) {
      console.warn(`bg ${reportId}: P1 attempt ${attempt} (final) failed validation; ${validation.hard_failures.length} hard failures, writing best-effort.`);
      break;
    }
    const retryMsg = buildRetryMessage(validation);
    console.log(`bg ${reportId}: P1 attempt ${attempt} failed validation (${validation.hard_failures.length} hard); retrying with ${validation.retry_prompt_hints.length} correction hints.`);
    messages.push({ role: "assistant", content: rawContent });
    messages.push({ role: "user", content: retryMsg });
  }
  return { report: lastReport, validation: lastValidation, attempts: totalAttempts, rawContentLengths };
}
