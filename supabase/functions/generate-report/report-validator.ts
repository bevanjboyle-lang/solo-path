/**
 * Solo Report Content Validator
 *
 * Edge-function-local copy synced from prompts/report-validator.ts (the canonical
 * source of truth, per ADR-019). If this file drifts from prompts/report-validator.ts,
 * the canonical wins and this copy must be brought back into line.
 *
 * Runtime enforcement of the narrative-quality rubric defined in
 * admin/report-quality-spec.md. Runs after OpenAI returns a structurally
 * valid report (schema already enforced by structured outputs).
 *
 * Called by: supabase/functions/generate-report (v45+)
 * Returns:    ValidationResult — drives retry loop and observability logging
 *
 * DESIGN:
 *   - Pure function: (report, context) -> ValidationResult
 *   - Zero external deps; Deno-compatible
 *   - Every check references an ID from report-quality-spec.md so logs are
 *     traceable back to the spec.
 *   - Hard failures trigger retry; soft warnings are logged only.
 *
 * To bump: update report-quality-spec.md, then update this file, then
 * re-run the parity suite (tests/scripts/run_parity_suite.py).
 */

import type { SoloCoreReport } from "./report-schema.ts";

// ============================================================================
// Types
// ============================================================================

export interface ValidationContext {
  /** KB ids the prompt was allowed to use (for business_model_id cross-check). */
  allowed_business_model_ids: Set<string>;
  /**
   * Optional: expected move-type and warmth mapping from KB. When provided,
   * the validator checks that each option carries KB-authoritative values.
   */
  kb_model_index?: Map<
    string,
    { primary_move_type: string; structural_warmth: boolean }
  >;
}

export interface CardScore {
  card: string;
  score: number; // 0–100
  word_count: number;
}

export interface NeverListHit {
  term: string;
  location: string;
  snippet: string;
}

export interface ValidationResult {
  passed: boolean;
  hard_failures: string[];
  soft_warnings: string[];
  card_scores: Record<string, number>;
  overall_score: number;
  total_word_count: number;
  never_list_hits: NeverListHit[];
  retry_prompt_hints: string[]; // Human-readable fixes to feed to the retry message
}

// ============================================================================
// Constants — NEVER list from spec §4
// ============================================================================

const NEVER_SKILL_NAMES = [
  "communication",
  "leadership",
  "problem solving",
  "problem-solving",
  "teamwork",
  "time management",
  "attention to detail",
  "organisation",
  "organization",
  "work ethic",
  "critical thinking",
  "interpersonal skills",
];

const NEVER_MOTIVATIONAL = [
  "passion",
  "passionate",
  "unleash",
  "unlock your potential",
  "game-changer",
  "game-changing",
  "synergy",
  "synergies",
  "disruptive",
  "transformative journey",
  "empowering",
  "mindset shift",
  "next-level",
  "crushing it",
];

const NEVER_HEDGE_IN_RECOMMENDATION = [
  "you might consider",
  "it could be worth",
  "perhaps you could",
  "one option might be",
];

const NEVER_VAGUE_TIME = [
  "^fast$",
  "^medium$",
  "^slow$",
  "^short$",
  "^medium-term$",
  "^long-term$",
];

// ============================================================================
// Helpers
// ============================================================================

function wordCount(str: string | undefined | null): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function lower(str: string | undefined | null): string {
  return (str ?? "").toLowerCase();
}

function containsAny(text: string, terms: string[]): string | null {
  const t = lower(text);
  for (const term of terms) {
    if (t.includes(term)) return term;
  }
  return null;
}

function matchesAnyRegex(text: string, patterns: string[]): boolean {
  const t = lower(text).trim();
  return patterns.some((p) => new RegExp(p).test(t));
}

function clamp01to100(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}

// ============================================================================
// Main entrypoint
// ============================================================================

export function validateReport(
  report: Partial<SoloCoreReport>,
  context: ValidationContext,
): ValidationResult {
  const hard: string[] = [];
  const soft: string[] = [];
  const hints: string[] = [];
  const cardScores: Record<string, number> = {};
  const neverHits: NeverListHit[] = [];

  // ------------------------------------------------------------------
  // Required top-level cards (spec §1)
  // ------------------------------------------------------------------
  const requiredTopLevel: Array<keyof SoloCoreReport> = [
    "archetype",
    "transferable_value",
    "transferable_skills",
    "options",
    "recommendation",
    "reality_check",
    "income_outlook",
    "first_steps",
    "recommended_selection",
    "hook_insight",
    "ai_impact",
  ];
  for (const key of requiredTopLevel) {
    if (!report[key]) {
      hard.push(`MISSING_CARD:${key}`);
      hints.push(`Your last output was missing the '${key}' card. Produce it in full per the spec.`);
    }
  }

  // ------------------------------------------------------------------
  // Card: archetype (spec §2.1)
  // ------------------------------------------------------------------
  if (report.archetype) {
    const a = report.archetype;
    const summaryWords = wordCount(a.summary);
    const editorialWords = wordCount(a.editorial_description);
    const tags = a.capability_tags ?? [];

    let score = 100;
    if (summaryWords < 30) {
      hard.push("ARCHETYPE_SUMMARY_TOO_SHORT");
      hints.push(`archetype.summary is only ${summaryWords} words — expand to 80–180 words, ≥3 sentences.`);
      score = 30;
    } else if (summaryWords < 80) {
      soft.push("archetype.summary under ideal length (80–180 words)");
      score = Math.min(score, 70);
    }

    if (editorialWords < 120) {
      hard.push("ARCHETYPE_EDITORIAL_TOO_SHORT");
      hints.push(`archetype.editorial_description is ${editorialWords} words — expand to 180–320 words across ≥2 paragraphs.`);
      score = Math.min(score, 30);
    } else if (editorialWords < 180) {
      soft.push("archetype.editorial_description under ideal length");
      score = Math.min(score, 70);
    }

    if (tags.length < 5 || tags.length > 7) {
      hard.push("ARCHETYPE_TAG_COUNT");
      hints.push(`archetype.capability_tags has ${tags.length} items — produce exactly 6.`);
      score = Math.min(score, 40);
    }
    for (const tag of tags) {
      const words = wordCount(tag);
      if (words < 2 || words > 5) {
        soft.push(`capability tag "${tag}" length unusual`);
      }
      if (NEVER_SKILL_NAMES.includes(lower(tag))) {
        hard.push(`ARCHETYPE_GENERIC_TAG:${tag}`);
        hints.push(`Replace the generic tag "${tag}" with a commercially named capability.`);
        score = Math.min(score, 30);
      }
    }

    cardScores.archetype = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: transferable_value (spec §2.2)
  // ------------------------------------------------------------------
  if (report.transferable_value) {
    const tv = report.transferable_value;
    const sellWords = wordCount(tv.what_they_can_sell);
    const payWords = wordCount(tv.why_buyers_would_pay);
    const assets = tv.credibility_assets ?? [];
    let score = 100;

    if (sellWords < 40) {
      hard.push("TV_SELL_TOO_SHORT");
      hints.push(`transferable_value.what_they_can_sell is ${sellWords} words — expand to 60–150.`);
      score = 30;
    }
    if (payWords < 40) {
      hard.push("TV_PAY_TOO_SHORT");
      hints.push(`transferable_value.why_buyers_would_pay is ${payWords} words — expand to 60–150 and name a specific buyer archetype or trigger moment.`);
      score = Math.min(score, 30);
    }
    if (assets.length !== 3) {
      hard.push("TV_ASSET_COUNT");
      hints.push(`credibility_assets has ${assets.length} items — produce exactly 3.`);
      score = Math.min(score, 40);
    }
    assets.forEach((asset, i) => {
      const w = wordCount(asset);
      if (w < 8) {
        hard.push(`TV_ASSET_${i + 1}_TOO_SHORT`);
        hints.push(`credibility_assets[${i}] is ${w} words — each asset should be 8–25 words and reference a specific fact.`);
        score = Math.min(score, 40);
      }
    });

    cardScores.transferable_value = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: transferable_skills (spec §2.3) — EXACTLY 6
  // ------------------------------------------------------------------
  if (report.transferable_skills) {
    const skills = report.transferable_skills;
    let score = 100;

    if (skills.length !== 6) {
      hard.push("TS_COUNT");
      hints.push(`transferable_skills has ${skills.length} items — produce exactly 6, ranked by strength descending.`);
      score = 20;
    }

    // Descending strength check
    for (let i = 1; i < skills.length; i++) {
      if (skills[i].strength > skills[i - 1].strength) {
        hard.push("TS_ORDER");
        hints.push(`transferable_skills must be ranked by strength descending; swap items so highest strength comes first.`);
        score = Math.min(score, 50);
        break;
      }
    }

    skills.forEach((s, i) => {
      if (NEVER_SKILL_NAMES.includes(lower(s.skill_name))) {
        hard.push(`TS_GENERIC_NAME:${s.skill_name}`);
        hints.push(`transferable_skills[${i}].skill_name "${s.skill_name}" is in the NEVER list — replace with a specific commercially named skill.`);
        neverHits.push({
          term: s.skill_name,
          location: `transferable_skills[${i}].skill_name`,
          snippet: s.skill_name,
        });
        score = Math.min(score, 20);
      }
      if (wordCount(s.evidence) < 10) {
        hard.push(`TS_EVIDENCE_${i + 1}_TOO_SHORT`);
        hints.push(`transferable_skills[${i}].evidence is ${wordCount(s.evidence)} words — must be 15–40 words and reference Q6/Q7/Q8/Q3b or CV.`);
        score = Math.min(score, 40);
      }
    });

    cardScores.transferable_skills = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: options (spec §2.4) — ADR-019 tightens to exactly 10
  // ------------------------------------------------------------------
  if (report.options) {
    const opts = report.options;
    let score = 100;

    if (opts.length !== 10) {
      hard.push("OPTIONS_COUNT");
      hints.push(`options has ${opts.length} items — produce exactly 10, ranked by composite_score descending (per ADR-019 / canonical 10-options product rule).`);
      score = 20;
    }

    const commercialModels = new Set<string>();
    opts.forEach((o, i) => {
      // Required passthrough fields
      if (!o.business_model_id) {
        hard.push(`OPT_${i + 1}_MISSING_BM_ID`);
        score = Math.min(score, 20);
      } else if (context.allowed_business_model_ids.size > 0 &&
                 !context.allowed_business_model_ids.has(o.business_model_id)) {
        hard.push(`OPT_${i + 1}_BM_ID_NOT_IN_KB:${o.business_model_id}`);
        hints.push(`options[${i}].business_model_id "${o.business_model_id}" was not in the injected KB — only recommend models from the provided KB slice.`);
        score = Math.min(score, 20);
      }
      if (!o.primary_move_type) {
        hard.push(`OPT_${i + 1}_MISSING_MOVE_TYPE`);
        score = Math.min(score, 20);
      }
      if (o.structural_warmth === undefined || o.structural_warmth === null) {
        hard.push(`OPT_${i + 1}_MISSING_STRUCTURAL_WARMTH`);
        score = Math.min(score, 20);
      }
      if (typeof o.composite_score !== "number") {
        hard.push(`OPT_${i + 1}_MISSING_COMPOSITE_SCORE`);
        score = Math.min(score, 20);
      }

      // KB consistency cross-check (when KB index provided)
      if (context.kb_model_index?.has(o.business_model_id)) {
        const kbEntry = context.kb_model_index.get(o.business_model_id)!;
        if (kbEntry.primary_move_type !== o.primary_move_type) {
          hard.push(`OPT_${i + 1}_MOVE_TYPE_DIVERGES_FROM_KB`);
          hints.push(`options[${i}].primary_move_type disagrees with KB — pass through the KB value unchanged.`);
          score = Math.min(score, 30);
        }
        if (kbEntry.structural_warmth !== o.structural_warmth) {
          hard.push(`OPT_${i + 1}_STRUCTURAL_WARMTH_DIVERGES_FROM_KB`);
          score = Math.min(score, 30);
        }
      }

      // Narrative richness — why_this_works_for_them required on ALL ranks
      const wtwWords = wordCount(o.why_this_works_for_them);
      if (!o.why_this_works_for_them) {
        hard.push(`OPT_${i + 1}_MISSING_WHY`);
        hints.push(`options[${i}].why_this_works_for_them is missing — every option must have this field, even short ones.`);
        score = Math.min(score, 30);
      } else if (o.rank <= 3 && wtwWords < 30) {
        hard.push(`OPT_${i + 1}_WHY_TOO_SHORT_TOP3`);
        hints.push(`options[${i}] is Rank ≤3; why_this_works_for_them is ${wtwWords} words — expand to 40–90 words referencing specific user evidence.`);
        score = Math.min(score, 40);
      } else if (o.rank > 3 && wtwWords < 10) {
        soft.push(`options[${i}].why_this_works_for_them unusually short for lower rank`);
      }

      // Positioning length check
      const posWords = wordCount(o.positioning);
      if (o.rank <= 3 && posWords < 25) {
        hard.push(`OPT_${i + 1}_POSITIONING_TOO_SHORT_TOP3`);
        hints.push(`options[${i}].positioning is ${posWords} words — Rank 1-3 positioning should be 40–90 words.`);
        score = Math.min(score, 50);
      }

      // time_to_first_revenue must not be vague
      if (o.time_to_first_revenue && matchesAnyRegex(o.time_to_first_revenue, NEVER_VAGUE_TIME)) {
        hard.push(`OPT_${i + 1}_VAGUE_TIME_TO_REV`);
        hints.push(`options[${i}].time_to_first_revenue "${o.time_to_first_revenue}" is vague — use a real week/month range like "4–8 weeks".`);
        score = Math.min(score, 40);
      }

      // Collect commercial model types
      if (o.pricing?.model) commercialModels.add(lower(o.pricing.model));
    });

    if (opts.length >= 6 && commercialModels.size < 3) {
      soft.push(
        `Fewer than 3 commercial model types across options (${Array.from(commercialModels).join(", ")}) — spec requires diversity.`,
      );
    }

    // Soft: no caution notes across all options
    const anyCaution = opts.some((o) => o.caution_note && o.caution_note.length > 0);
    if (!anyCaution && opts.length > 0) {
      soft.push("No caution_note on any option — unusual, real options carry real risk.");
    }

    cardScores.options = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: recommendation (spec §2.5)
  // ------------------------------------------------------------------
  if (report.recommendation) {
    const r = report.recommendation;
    let score = 100;
    const ratWords = wordCount(r.rationale);
    const kcWords = wordCount(r.key_condition);

    if (ratWords < 60) {
      hard.push("REC_RATIONALE_TOO_SHORT");
      hints.push(`recommendation.rationale is ${ratWords} words — expand to 80–160 and reference archetype + seniority + urgency/confidence.`);
      score = 30;
    }
    if (kcWords < 15) {
      hard.push("REC_KEY_CONDITION_TOO_SHORT");
      hints.push(`recommendation.key_condition is ${kcWords} words — make it action-forcing and specific (25–60 words).`);
      score = Math.min(score, 40);
    }

    const hedgeHit = containsAny(r.rationale ?? "", NEVER_HEDGE_IN_RECOMMENDATION);
    if (hedgeHit) {
      hard.push(`REC_HEDGE:${hedgeHit}`);
      hints.push(`recommendation.rationale contains hedge language "${hedgeHit}" — the recommendation must be a genuine recommendation, not a hedge.`);
      neverHits.push({ term: hedgeHit, location: "recommendation.rationale", snippet: hedgeHit });
      score = Math.min(score, 40);
    }

    cardScores.recommendation = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: reality_check (spec §2.6)
  // ------------------------------------------------------------------
  if (report.reality_check) {
    const rc = report.reality_check;
    let score = 100;
    const fields: Array<[string, string]> = [
      ["most_likely_failure_mode", rc.most_likely_failure_mode ?? ""],
      ["second_failure_mode", rc.second_failure_mode ?? ""],
      ["what_they_will_find_hard", rc.what_they_will_find_hard ?? ""],
      ["honest_income_outlook", rc.honest_income_outlook ?? ""],
    ];
    for (const [name, text] of fields) {
      const w = wordCount(text);
      if (w < 25) {
        hard.push(`RC_${name.toUpperCase()}_TOO_SHORT`);
        hints.push(`reality_check.${name} is ${w} words — this was the Henderson regression; expand each field to a multi-sentence diagnosis (≥25 words).`);
        score = Math.min(score, 30);
      }
    }

    // honest_income_outlook must contain a £ figure
    if (!/£\s?\d/.test(rc.honest_income_outlook ?? "")) {
      hard.push("RC_INCOME_NO_FIGURE");
      hints.push(`reality_check.honest_income_outlook must contain an actual GBP figure like "£30,000–£55,000 in Year 1".`);
      score = Math.min(score, 40);
    }

    cardScores.reality_check = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: income_outlook (spec §2.7, §5)
  // ------------------------------------------------------------------
  if (report.income_outlook) {
    const io = report.income_outlook;
    let score = 100;
    const years = [io.year_1, io.year_2, io.year_3];
    years.forEach((y, idx) => {
      if (!y) {
        hard.push(`IO_YEAR_${idx + 1}_MISSING`);
        score = 0;
        return;
      }
      if (typeof y.mid_gbp !== "number") {
        hard.push(`IO_YEAR_${idx + 1}_MID_MISSING`);
        score = Math.min(score, 20);
      }
      if (wordCount(y.revenue_build) < 40) {
        hard.push(`IO_YEAR_${idx + 1}_REVENUE_BUILD_TOO_SHORT`);
        hints.push(`income_outlook.year_${idx + 1}.revenue_build is ${wordCount(y.revenue_build)} words — expand to describe month-by-month shape (≥40 words).`);
        score = Math.min(score, 40);
      }
      if (wordCount(y.revenue_sources) < 25) {
        hard.push(`IO_YEAR_${idx + 1}_REVENUE_SOURCES_TOO_SHORT`);
        score = Math.min(score, 40);
      }
      if (wordCount(y.assumptions) < 20) {
        hard.push(`IO_YEAR_${idx + 1}_ASSUMPTIONS_TOO_SHORT`);
        score = Math.min(score, 40);
      }
    });
    // Monotonic mid
    if (
      typeof io.year_1?.mid_gbp === "number" &&
      typeof io.year_2?.mid_gbp === "number" &&
      typeof io.year_3?.mid_gbp === "number"
    ) {
      if (io.year_1.mid_gbp > io.year_2.mid_gbp || io.year_2.mid_gbp > io.year_3.mid_gbp) {
        hard.push("IO_MID_NOT_MONOTONIC");
        hints.push(`income_outlook mid values must be non-decreasing across years.`);
        score = Math.min(score, 30);
      }
    }
    if (wordCount(io.salary_replacement_analysis) < 50) {
      hard.push("IO_SALARY_REPLACEMENT_TOO_SHORT");
      score = Math.min(score, 40);
    }
    if (wordCount(io.sensitivity_factors) < 40) {
      hard.push("IO_SENSITIVITY_TOO_SHORT");
      score = Math.min(score, 40);
    }
    if (wordCount(io.income_floor_analysis) < 30) {
      hard.push("IO_FLOOR_TOO_SHORT");
      score = Math.min(score, 40);
    }
    if (wordCount(io.income_notes) < 40) {
      hard.push("IO_NOTES_TOO_SHORT");
      score = Math.min(score, 40);
    }

    cardScores.income_outlook = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: first_steps (spec §2.8) — exactly 5
  // ------------------------------------------------------------------
  if (report.first_steps) {
    const fs = report.first_steps;
    let score = 100;
    if (fs.length !== 5) {
      hard.push("FS_COUNT");
      hints.push(`first_steps has ${fs.length} items — produce exactly 5.`);
      score = 20;
    }
    fs.forEach((step, i) => {
      if (wordCount(step) < 20) {
        hard.push(`FS_${i + 1}_TOO_SHORT`);
        hints.push(`first_steps[${i}] is ${wordCount(step)} words — each step must be specific and actionable (≥20 words).`);
        score = Math.min(score, 40);
      }
    });
    // first_steps[0] must include a time deadline
    const step0 = fs[0] ?? "";
    if (
      !/within\s+\d/.test(step0) &&
      !/by\s+(end|next|this|the)/i.test(step0) &&
      !/\d+\s+(day|week|month)/i.test(step0)
    ) {
      hard.push("FS_0_NO_DEADLINE");
      hints.push(`first_steps[0] must include an explicit time deadline (e.g. "within 7 days", "by end of this week") and reference Q6 or Q7.`);
      score = Math.min(score, 40);
    }
    cardScores.first_steps = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: hook_insight (spec §2.9)
  // ------------------------------------------------------------------
  if (report.hook_insight) {
    const hi = report.hook_insight;
    let score = 100;
    const headlineWords = wordCount(hi.headline);
    const paraWords = wordCount(hi.paragraph);

    if (headlineWords < 6 || headlineWords > 22) {
      soft.push(`hook_insight.headline length ${headlineWords} words outside 8–18 band`);
    }
    if (paraWords < 80) {
      hard.push("HOOK_PARAGRAPH_TOO_SHORT");
      hints.push(`hook_insight.paragraph is ${paraWords} words — expand to 120–220 words.`);
      score = 30;
    }

    // Reframe test: headline must contain a contrast signal
    const reframeSignals = ["isn't", "is not", "actually", "beyond", "despite", "under", "not the", "real "];
    const hasReframe = reframeSignals.some((sig) =>
      lower(hi.headline).includes(sig)
    );
    if (!hasReframe) {
      soft.push("hook_insight.headline lacks a reframe signal (isn't / not / actually / beyond / despite)");
      score = Math.min(score, 60);
    }

    cardScores.hook_insight = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Card: ai_impact (spec §2.10)
  // ------------------------------------------------------------------
  if (report.ai_impact) {
    const ai = report.ai_impact;
    let score = 100;
    if (!ai.part_1?.displacement_risk) {
      hard.push("AI_P1_MISSING_RISK");
      hints.push(`ai_impact.part_1 must include displacement_risk (low/medium/high).`);
      score = 20;
    }
    if (!ai.part_1?.risk_horizon) {
      hard.push("AI_P1_MISSING_HORIZON");
      hints.push(`ai_impact.part_1 must include risk_horizon (e.g. "3-5 years").`);
      score = Math.min(score, 30);
    }
    if (wordCount(ai.part_1?.content) < 150) {
      hard.push("AI_P1_CONTENT_TOO_SHORT");
      hints.push(`ai_impact.part_1.content is ${wordCount(ai.part_1?.content)} words — expand to 150–280 words.`);
      score = Math.min(score, 40);
    }
    if (wordCount(ai.part_2?.content) < 120) {
      hard.push("AI_P2_CONTENT_TOO_SHORT");
      score = Math.min(score, 40);
    }
    const steps = ai.part_3?.steps ?? [];
    if (steps.length !== 4) {
      hard.push("AI_P3_STEP_COUNT");
      hints.push(`ai_impact.part_3.steps must have exactly 4 items, each with priority / action / rationale.`);
      score = Math.min(score, 30);
    }
    steps.forEach((s, i) => {
      if (wordCount(s.action) < 10) {
        hard.push(`AI_P3_STEP_${i + 1}_ACTION_TOO_SHORT`);
        score = Math.min(score, 40);
      }
    });

    cardScores.ai_impact = clamp01to100(score);
  }

  // ------------------------------------------------------------------
  // Cross-card consistency (spec §3)
  // ------------------------------------------------------------------
  if (report.recommendation && report.income_outlook) {
    if (report.income_outlook.primary_option_rank !== report.recommendation.recommended_rank) {
      hard.push("XC_INCOME_RANK_MISMATCH");
      hints.push(`income_outlook.primary_option_rank (${report.income_outlook.primary_option_rank}) must equal recommendation.recommended_rank (${report.recommendation.recommended_rank}).`);
    }
  }

  // ------------------------------------------------------------------
  // NEVER list scan — across all narrative fields (motivational)
  // ------------------------------------------------------------------
  const narrativeBlob = JSON.stringify({
    archetype: report.archetype,
    transferable_value: report.transferable_value,
    transferable_skills: report.transferable_skills,
    options: report.options,
    recommendation: report.recommendation,
    reality_check: report.reality_check,
    hook_insight: report.hook_insight,
    ai_impact: report.ai_impact,
  });
  for (const term of NEVER_MOTIVATIONAL) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(narrativeBlob)) {
      hard.push(`NEVER_MOTIVATIONAL:${term}`);
      hints.push(`Remove motivational language "${term}" — Solo's voice is direct, specific, commercially grounded.`);
      neverHits.push({ term, location: "narrative (global)", snippet: term });
    }
  }

  // ------------------------------------------------------------------
  // Aggregate
  // ------------------------------------------------------------------
  const scores = Object.values(cardScores);
  const overall = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const totalWords =
    wordCount(report.archetype?.summary) +
    wordCount(report.archetype?.editorial_description) +
    wordCount(report.transferable_value?.what_they_can_sell) +
    wordCount(report.transferable_value?.why_buyers_would_pay) +
    (report.transferable_skills?.reduce((acc, s) => acc + wordCount(s.evidence), 0) ?? 0) +
    (report.options?.reduce(
      (acc, o) =>
        acc + wordCount(o.positioning) + wordCount(o.why_this_works_for_them),
      0,
    ) ?? 0) +
    wordCount(report.recommendation?.rationale) +
    wordCount(report.reality_check?.most_likely_failure_mode) +
    wordCount(report.reality_check?.honest_income_outlook) +
    wordCount(report.hook_insight?.paragraph) +
    wordCount(report.ai_impact?.part_1?.content) +
    wordCount(report.ai_impact?.part_2?.content);

  return {
    passed: hard.length === 0,
    hard_failures: hard,
    soft_warnings: soft,
    card_scores: cardScores,
    overall_score: overall,
    total_word_count: totalWords,
    never_list_hits: neverHits,
    retry_prompt_hints: hints,
  };
}

// ============================================================================
// Retry-message builder — feeds back hard failures as a correction prompt
// ============================================================================

export function buildRetryMessage(result: ValidationResult): string {
  if (result.passed) return "";
  const lines = [
    "Your last output failed the Solo quality contract. Fix the following and return the full corrected JSON:",
    "",
    ...result.retry_prompt_hints.map((h) => `- ${h}`),
    "",
    "CRITICAL — WORD-COUNT BUFFER RULE: For every word-count floor mentioned above, you must EXCEED it by at least 5 words. Do not write to the floor — write past it. Models often produce 119 words when asked for 120; budget margin so you reliably clear the bar. If a hint says 'expand to 120–220 words', write 125+. If it says '≥25 words', write 30+. Aim 5+ words over every floor; one word over is not enough.",
    "",
    "Do not shorten other cards to compensate. The final report must meet the spec in every card.",
  ];
  return lines.join("\n");
}
