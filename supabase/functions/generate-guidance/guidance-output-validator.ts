// generate-guidance/guidance-output-validator.ts (v28)
//
// ModuleOutputV3 substance validator with retry-message builder.
// ADR-009 / ADR-019 ironclad pattern.
//
// The schema layer (guidance-output-schemas.ts + OpenAI strict json_schema mode)
// enforces SHAPE. This validator enforces SUBSTANCE plus the seven additional
// voice constraints baked into the canonical prompt.
//
// Source of truth for checks: admin/canonical-guidance-v28-implementation-design.md §2.3.

import {
  BANNED_WORDS_LIST,
  FORBIDDEN_PATTERNS,
} from "./p8-system-prompt.ts";
import type {
  ModuleOutputV3,
  PlaybookStep,
} from "./guidance-output-schemas.ts";

// ===== Validation result types =====

export interface BannedWordHit {
  word: string;
  field: string;
}

export interface ForbiddenPatternHit {
  pattern_name: string;
  field: string;
  example: string; // the matched substring
  message: string;
}

export interface WordCountViolation {
  field: string;
  word_count: number;
  min: number;
  max: number;
}

export interface ValidationResult {
  passed: boolean;
  // legacy compatibility fields (kept from v27 shape so the log table doesn't churn)
  missing: string[];
  too_short: Array<{ field: string; word_count: number; floor: number }>;
  empty: string[];
  // v28 new checks
  banned_words: BannedWordHit[];
  forbidden_patterns: ForbiddenPatternHit[];
  word_count_violations: WordCountViolation[];
  step_count_violation: boolean;
  target_day_violations: number[]; // out-of-range target_day values
  reference_count_warning: boolean; // <4 items picked (warning only when menu has 4+)
}

// ===== Word-count ranges (v28 canonical) =====

interface WordCountRange {
  min: number;
  max: number;
}

const WORD_COUNT_RANGES: Record<string, WordCountRange> = {
  short_version: { min: 120, max: 200 },
  "check_in_commitment.summary_prose": { min: 40, max: 80 },
};

const PLAYBOOK_STEP_MIN_LEAD_WORDS = 8;
const PLAYBOOK_STEP_MIN_FIELD_WORDS = 4;
const PLAYBOOK_MIN_STEPS = 4;
const PLAYBOOK_MAX_STEPS = 6;

const TARGET_DAY_MIN = 1;
const TARGET_DAY_MAX = 30;

// ===== Helpers =====

function countWords(s: unknown): number {
  if (typeof s !== "string") return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function findBannedWords(text: string, field: string): BannedWordHit[] {
  if (!text) return [];
  const hits: BannedWordHit[] = [];
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS_LIST) {
    // Whole-word/whole-phrase check. For multi-word phrases use plain
    // substring match (phrases like "reach out" don't word-bound cleanly).
    if (word.includes(" ")) {
      if (lower.includes(word.toLowerCase())) {
        hits.push({ word, field });
      }
    } else {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) {
        hits.push({ word, field });
      }
    }
  }
  return hits;
}

function findForbiddenPatterns(text: string, field: string): ForbiddenPatternHit[] {
  if (!text) return [];
  const hits: ForbiddenPatternHit[] = [];
  for (const fp of FORBIDDEN_PATTERNS) {
    // Reset lastIndex so global regexes work correctly per call
    fp.pattern.lastIndex = 0;
    const match = fp.pattern.exec(text);
    if (match) {
      hits.push({
        pattern_name: fp.name,
        field,
        example: match[0].slice(0, 120),
        message: fp.message,
      });
    }
  }
  return hits;
}

// Walk every string in the output, collecting voice violations with their
// field path for diagnostic clarity.
function collectAllStringFields(output: ModuleOutputV3): Array<{ field: string; value: string }> {
  const out: Array<{ field: string; value: string }> = [];
  out.push({ field: "short_version", value: output.short_version });
  out.push({ field: "caveat_personalised_tail", value: output.caveat_personalised_tail });
  out.push({ field: "check_in_commitment.summary_prose", value: output.check_in_commitment?.summary_prose ?? "" });
  for (const c of (output.check_in_commitment?.commitments ?? [])) {
    out.push({ field: "check_in_commitment.commitments[].action", value: c.action ?? "" });
    out.push({ field: "check_in_commitment.commitments[].verification_question", value: c.verification_question ?? "" });
  }
  (output.playbook ?? []).forEach((step, i) => {
    out.push({ field: `playbook[${i}].title`, value: step.title ?? "" });
    out.push({ field: `playbook[${i}].personalised_lead`, value: step.personalised_lead ?? "" });
    out.push({ field: `playbook[${i}].what_it_is`, value: step.what_it_is ?? "" });
    out.push({ field: `playbook[${i}].how`, value: step.how ?? "" });
    out.push({ field: `playbook[${i}].cost`, value: step.cost ?? "" });
    out.push({ field: `playbook[${i}].pitfall`, value: step.pitfall ?? "" });
    out.push({ field: `playbook[${i}].what_to_expect_next`, value: step.what_to_expect_next ?? "" });
  });
  return out;
}

// ===== Validator =====

export function validateModuleOutputV3(
  output: ModuleOutputV3,
  context: { referenceMenuSize: number } = { referenceMenuSize: 0 },
): ValidationResult {
  const missing: string[] = [];
  const empty: string[] = [];
  const too_short: ValidationResult["too_short"] = [];
  const banned_words: BannedWordHit[] = [];
  const forbidden_patterns: ForbiddenPatternHit[] = [];
  const word_count_violations: WordCountViolation[] = [];
  const target_day_violations: number[] = [];
  let step_count_violation = false;
  let reference_count_warning = false;

  // Shape sanity checks (schema should have caught these, but defence in depth)
  if (!output || typeof output !== "object") {
    return {
      passed: false,
      missing: ["entire_output"],
      too_short: [],
      empty: [],
      banned_words: [],
      forbidden_patterns: [],
      word_count_violations: [],
      step_count_violation: false,
      target_day_violations: [],
      reference_count_warning: false,
    };
  }

  if (typeof output.short_version !== "string") missing.push("short_version");
  if (!Array.isArray(output.playbook)) missing.push("playbook");
  if (!Array.isArray(output.reference_layer_ids)) missing.push("reference_layer_ids");
  if (!output.check_in_commitment || typeof output.check_in_commitment !== "object") {
    missing.push("check_in_commitment");
  } else {
    if (typeof output.check_in_commitment.summary_prose !== "string") {
      missing.push("check_in_commitment.summary_prose");
    }
    if (!Array.isArray(output.check_in_commitment.commitments)) {
      missing.push("check_in_commitment.commitments");
    }
  }
  if (typeof output.caveat_personalised_tail !== "string") {
    missing.push("caveat_personalised_tail");
  }

  // If shape is broken, return early; substance checks would error
  if (missing.length > 0) {
    return {
      passed: false,
      missing,
      too_short,
      empty,
      banned_words,
      forbidden_patterns,
      word_count_violations,
      step_count_violation: false,
      target_day_violations,
      reference_count_warning,
    };
  }

  // ===== Word counts =====

  const shortVersionWc = countWords(output.short_version);
  const shortVersionRange = WORD_COUNT_RANGES.short_version;
  if (shortVersionWc < shortVersionRange.min || shortVersionWc > shortVersionRange.max) {
    word_count_violations.push({
      field: "short_version",
      word_count: shortVersionWc,
      min: shortVersionRange.min,
      max: shortVersionRange.max,
    });
  }

  const summaryProseWc = countWords(output.check_in_commitment.summary_prose);
  const summaryProseRange = WORD_COUNT_RANGES["check_in_commitment.summary_prose"];
  if (summaryProseWc < summaryProseRange.min || summaryProseWc > summaryProseRange.max) {
    word_count_violations.push({
      field: "check_in_commitment.summary_prose",
      word_count: summaryProseWc,
      min: summaryProseRange.min,
      max: summaryProseRange.max,
    });
  }

  // ===== Playbook length =====

  if (output.playbook.length < PLAYBOOK_MIN_STEPS || output.playbook.length > PLAYBOOK_MAX_STEPS) {
    step_count_violation = true;
  }

  // ===== Per-step substance =====

  output.playbook.forEach((step: PlaybookStep, i: number) => {
    const lead_wc = countWords(step.personalised_lead);
    if (lead_wc < PLAYBOOK_STEP_MIN_LEAD_WORDS) {
      too_short.push({
        field: `playbook[${i}].personalised_lead`,
        word_count: lead_wc,
        floor: PLAYBOOK_STEP_MIN_LEAD_WORDS,
      });
    }
    // Each of the structural fields must have meaningful content
    const structuralFields: Array<keyof PlaybookStep> = [
      "what_it_is", "how", "cost", "pitfall", "what_to_expect_next",
    ];
    for (const field of structuralFields) {
      const value = step[field];
      if (typeof value !== "string" || value.trim() === "") {
        empty.push(`playbook[${i}].${field}`);
        continue;
      }
      const wc = countWords(value);
      if (wc < PLAYBOOK_STEP_MIN_FIELD_WORDS) {
        too_short.push({
          field: `playbook[${i}].${field}`,
          word_count: wc,
          floor: PLAYBOOK_STEP_MIN_FIELD_WORDS,
        });
      }
    }
  });

  // ===== Commitments and target_day =====

  const commitments = output.check_in_commitment.commitments;
  if (commitments.length < 1 || commitments.length > 3) {
    word_count_violations.push({
      field: "check_in_commitment.commitments[].length",
      word_count: commitments.length,
      min: 1,
      max: 3,
    });
  }
  commitments.forEach((c, i) => {
    if (!Number.isInteger(c.target_day) || c.target_day < TARGET_DAY_MIN || c.target_day > TARGET_DAY_MAX) {
      target_day_violations.push(c.target_day);
    }
    if (typeof c.action !== "string" || c.action.trim() === "") {
      empty.push(`check_in_commitment.commitments[${i}].action`);
    }
    if (typeof c.verification_question !== "string" || c.verification_question.trim() === "") {
      empty.push(`check_in_commitment.commitments[${i}].verification_question`);
    }
  });

  // ===== Reference layer count =====

  if (context.referenceMenuSize >= PLAYBOOK_MIN_STEPS && output.reference_layer_ids.length < 4) {
    reference_count_warning = true;
  }

  // ===== Banned words and forbidden patterns across all strings =====

  const allFields = collectAllStringFields(output);
  for (const { field, value } of allFields) {
    banned_words.push(...findBannedWords(value, field));
    forbidden_patterns.push(...findForbiddenPatterns(value, field));
  }

  const passed =
    missing.length === 0 &&
    empty.length === 0 &&
    too_short.length === 0 &&
    banned_words.length === 0 &&
    forbidden_patterns.length === 0 &&
    word_count_violations.length === 0 &&
    !step_count_violation &&
    target_day_violations.length === 0;

  return {
    passed,
    missing,
    too_short,
    empty,
    banned_words,
    forbidden_patterns,
    word_count_violations,
    step_count_violation,
    target_day_violations,
    reference_count_warning,
  };
}

// ===== Retry message builder =====

export function buildV3RetryMessage(result: ValidationResult): string {
  const parts: string[] = [
    "Your previous response did not meet the canonical quality bar for this module. Fix the issues below and return a new JSON object matching the ModuleOutputV3 schema.",
  ];

  if (result.missing.length > 0) {
    parts.push(`\nMissing required fields: ${result.missing.join(", ")}.`);
    parts.push("Every required field must appear in your response.");
  }

  if (result.empty.length > 0) {
    parts.push(`\nEmpty fields that should be populated: ${result.empty.join(", ")}.`);
    parts.push("These fields must contain substantive content.");
  }

  if (result.too_short.length > 0) {
    parts.push("\nFields below the minimum word count:");
    for (const t of result.too_short) {
      parts.push(`  - ${t.field}: ${t.word_count} words (floor: ${t.floor}+ words).`);
    }
  }

  if (result.word_count_violations.length > 0) {
    parts.push("\nFields outside the required word-count range:");
    for (const v of result.word_count_violations) {
      parts.push(`  - ${v.field}: ${v.word_count} (must be ${v.min}-${v.max}).`);
    }
  }

  if (result.step_count_violation) {
    parts.push(`\nPlaybook step count is out of range. Required: 4-6 action steps. Refactor rationale or forward-looking content into short_version rather than padding or stripping playbook steps.`);
  }

  if (result.target_day_violations.length > 0) {
    parts.push(`\nCommitment target_day out of range (must be integer 1-30): ${result.target_day_violations.join(", ")}.`);
  }

  if (result.banned_words.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const b of result.banned_words) {
      grouped[b.field] = grouped[b.field] || [];
      grouped[b.field].push(b.word);
    }
    parts.push("\nBanned words found (per tone-of-voice.md v1.2 §'What to avoid'). Rewrite to remove them:");
    for (const [field, words] of Object.entries(grouped)) {
      parts.push(`  - ${field}: ${Array.from(new Set(words)).join(", ")}`);
    }
  }

  if (result.forbidden_patterns.length > 0) {
    parts.push("\nForbidden patterns found. These are hard voice failures:");
    const seen = new Set<string>();
    for (const f of result.forbidden_patterns) {
      const key = `${f.field}::${f.pattern_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(`  - ${f.field} contains "${f.pattern_name}": ${f.message}`);
    }
  }

  if (result.reference_count_warning) {
    parts.push("\nFewer than 4 reference items picked from a menu that contains at least 4. Pick at least 4 most-relevant items unless the menu is genuinely shorter.");
  }

  parts.push("\nReturn only the JSON object. No preamble, no explanation, no markdown fencing.");

  return parts.join("\n");
}

// Version marker
export const VALIDATOR_VERSION = "v28-canonical-substance";
