// lib/guardrails.ts
//
// WP2 Track B — Work Package 6: Programmatic guardrails layer.
//
// Solo Bible §12 lists bad-output characteristics that were previously enforced
// "by hope". This module enforces them by code. Every prompt output should pass
// through guardrails before being returned to the user.
//
// Design principles
//   - Pure + deterministic. No I/O, no LLM calls, no Deno/Node globals. Safe to
//     import from any edge function or from the eval harness.
//   - Dependency-injected. Banned lists and pricing ranges have canonical
//     defaults but are overridable, so the false-positive rate can be tuned
//     (WP6 acceptance criterion: FP < 5% on legitimate outputs).
//   - Tiered severity so a single noisy single-word match never hard-blocks a
//     report:
//       block     — pipeline failure / must regenerate (missing field, draft too
//                   long, pricing out of range).
//       sanitise  — auto-fixable in place (em dashes → comma). Never blocks.
//       flag      — recorded for review; does not block. Banned phrases split
//                   into STRICT (essentially never legitimate → counts as a
//                   real catch) and CONTEXTUAL (usually-but-not-always bad →
//                   review-only, kept out of the hard FP math).
//
// Canonical sources encoded here:
//   - branding/tone-of-voice.md banned list (hype words, clichés, empty
//     positives, weasel words, false urgency, em dash, "X is not Y, it is Z").
//   - system-hardening-brief-v1.md WP6 explicit phrase list + checks.
//
// Wiring (deferred to WP10): generate-report / generate-plan / draft-outreach
// call runReportGuardrails / runDraftGuardrails after the LLM step and before
// persist. `block`/`regenerate` results drive a single bounded regeneration;
// `sanitise` results replace the text in place. See WP10 in the hardening brief.

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Severity = "block" | "sanitise" | "flag";

export type CheckName =
  | "banned_phrase"
  | "em_dash"
  | "not_y_construction"
  | "draft_length"
  | "required_field"
  | "pricing_sanity"
  | "exclamation";

export interface Violation {
  check: CheckName;
  severity: Severity;
  /** Human-readable explanation. */
  detail: string;
  /** The offending substring, where applicable. */
  match?: string;
  /** The field path, where applicable (required_field / pricing_sanity). */
  field?: string;
  /** STRICT banned phrases count as real catches; CONTEXTUAL are review-only. */
  strict?: boolean;
}

export interface GuardrailResult {
  /** True when no `block` violation remains after sanitisation. */
  passed: boolean;
  /** True when the caller should regenerate (any block-severity violation). */
  regenerate: boolean;
  violations: Violation[];
  /** Present for single-text checks (draft guardrails): the auto-fixed text. */
  sanitised_text?: string;
}

export interface PricingRange {
  min_gbp: number;
  max_gbp: number;
}

export interface GuardrailOptions {
  /** Max words for outreach / move drafts. Brief WP6: 250. */
  max_draft_words?: number;
  /** business_model_id → {min_gbp, max_gbp}. Omit to skip pricing sanity. */
  pricing_ranges?: Record<string, PricingRange>;
  /** Extra strict phrases to add to the canonical list. */
  extra_strict_phrases?: string[];
  /** Extra contextual (review-only) phrases. */
  extra_contextual_phrases?: string[];
  /** Treat contextual single-word matches as strict catches (default false). */
  contextual_as_strict?: boolean;
  /** Minimum number of business options a report must carry. Canonical: P1
   * produces 10 (see project rule "10 options, up to 5 selected"); the brief's
   * floor is 3. Default 3 keeps the check a floor, not an exact match. */
  min_options?: number;
}

// -----------------------------------------------------------------------------
// Canonical banned lists (from branding/tone-of-voice.md + brief WP6)
// -----------------------------------------------------------------------------

// STRICT: multi-word phrases and unambiguous hype that essentially never appear
// in legitimate Solo copy. A match here is a real catch.
export const BANNED_PHRASES_STRICT: string[] = [
  // Brief WP6 explicit list + LLM signatures the user has flagged.
  "hope this message finds you well",
  "hope this email finds you well",
  "i wanted to reach out",
  "unlock your potential",
  "unlock your entrepreneurial potential",
  "in today's fast-paced world",
  "in todays fast-paced world",
  // tone-of-voice hype words (unambiguous).
  "supercharge",
  "unleash",
  "game-changing",
  "game changing",
  "revolutionary",
  "best-in-class",
  "best in class",
  "world-class",
  "world class",
  "cutting-edge",
  "cutting edge",
  // American startup clichés (unambiguous).
  "crushing it",
  "founder mindset",
  "level up",
  "move fast",
  // empty positives that signal AI copy.
  "thrilled to",
  "delighted to",
  // false urgency.
  "limited time",
  "don't miss out",
  "dont miss out",
  "act now",
  "today only",
];

// CONTEXTUAL: single words that are usually bad but occasionally legitimate
// (financial "leverage", "type scale", "unique selling point"). Flagged as
// review-only by default to keep the false-positive rate under 5%. Flip
// contextual_as_strict to escalate.
export const BANNED_WORDS_CONTEXTUAL: string[] = [
  "unlock",
  "unleash",
  "transform",
  "disruption",
  "empower",
  "synergy",
  "synergies",
  "ecosystem",
  "seamless",
  "journey",
  "hustle",
  "grind",
  "iterate",
  "amazing",
  "incredible",
  "exciting",
  "passionate",
  "fantastic",
  "comprehensive",
  "holistic",
  "innovative",
  "unique",
  "leverage",
  "leveraging",
  "leveraged",
  "leverages",
];

// Required top-level report fields (brief WP6).
export const REQUIRED_REPORT_FIELDS = [
  "hook_insight",
  "options",
  "recommendation",
  "ai_impact",
  "first_move",
] as const;

// -----------------------------------------------------------------------------
// Text helpers
// -----------------------------------------------------------------------------

/**
 * Replace em dashes (and the en dash used as a clause break) with a comma.
 * Mirrors the runtime stripper pattern already used in p-catcher-prompt.ts
 * (see memory: feedback_llm_em_dash_sanitiser_pattern). Collapses surrounding
 * whitespace so "word — word" → "word, word".
 */
export function stripEmDashes(text: string): { text: string; count: number } {
  if (!text) return { text: text ?? "", count: 0 };
  const matches = text.match(/\s*[—–]\s*/g);
  const count = matches ? matches.length : 0;
  const cleaned = text.replace(/\s*[—–]\s*/g, ", ");
  return { text: cleaned, count };
}

/**
 * Deep-copy a value and strip em/en dashes (→ comma) from every string leaf.
 * This is the in-place sanitisation that `runReportGuardrails` reports as
 * `sanitise` severity but does not itself apply. Generators call this on the
 * assembled report object immediately before persist, so no surface ever
 * renders the banned em-dash AI tell. Object KEYS are left untouched; only
 * string VALUES are cleaned. Pure + deterministic.
 *
 * Note: this fixes em dashes only. The "X is not Y, it is Z" construction and a
 * restate-not-reason rationale are NOT auto-rewritten here (rewriting prose
 * blind risks changing meaning) — those are handled by prompt instruction +
 * the judges, which drive regeneration.
 */
export function sanitiseReportTree<T>(value: T): T {
  if (typeof value === "string") return stripEmDashes(value).text as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitiseReportTree(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitiseReportTree(v);
    }
    return out as unknown as T;
  }
  return value;
}

function wordCount(text: string): number {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Case-insensitive whole-phrase search returning each distinct match found. */
function findPhrases(text: string, phrases: string[]): string[] {
  if (!text) return [];
  const hay = text.toLowerCase();
  const found: string[] = [];
  for (const p of phrases) {
    const needle = p.toLowerCase();
    // Word-boundary match for single words; substring for multi-word phrases
    // (multi-word phrases already carry their own boundaries).
    if (/\s/.test(needle) || /[^a-z0-9]/.test(needle)) {
      if (hay.includes(needle)) found.push(p);
    } else {
      const re = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i");
      if (re.test(text)) found.push(p);
    }
  }
  return found;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// -----------------------------------------------------------------------------
// Individual checks
// -----------------------------------------------------------------------------

export function checkBannedPhrases(text: string, opts: GuardrailOptions = {}): Violation[] {
  const violations: Violation[] = [];
  const strict = [...BANNED_PHRASES_STRICT, ...(opts.extra_strict_phrases ?? [])];
  const contextual = [...BANNED_WORDS_CONTEXTUAL, ...(opts.extra_contextual_phrases ?? [])];

  for (const m of findPhrases(text, strict)) {
    violations.push({
      check: "banned_phrase",
      severity: "flag",
      strict: true,
      match: m,
      detail: `Banned phrase (strict): "${m}"`,
    });
  }
  for (const m of findPhrases(text, contextual)) {
    violations.push({
      check: "banned_phrase",
      severity: "flag",
      strict: Boolean(opts.contextual_as_strict),
      match: m,
      detail: `Banned word (contextual, review): "${m}"`,
    });
  }
  return violations;
}

/**
 * Detect the "X is not Y, it is Z" / "X isn't Y, it's Z" LLM construction
 * (tone-of-voice.md). Conservative: requires the explicit not/isn't ... it is/
 * it's pattern so legitimate negation ("this is not included") doesn't trip it.
 */
export function checkNotYConstruction(text: string): Violation[] {
  if (!text) return [];
  const re = /\b(is not|isn't|are not|aren't|is n't)\b[^.,;!?]{1,80}?,\s*(it'?s|it is|they'?re|they are)\b/gi;
  const violations: Violation[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    violations.push({
      check: "not_y_construction",
      severity: "flag",
      strict: true,
      match: m[0].slice(0, 80),
      detail: `"X is not Y, it is Z" construction (LLM tell). Reorder as "Z, not Y".`,
    });
  }
  return violations;
}

export function checkExclamation(text: string): Violation[] {
  if (!text || !text.includes("!")) return [];
  return [{
    check: "exclamation",
    severity: "flag",
    strict: true,
    detail: "Exclamation mark in product copy (banned by tone-of-voice.md).",
    match: "!",
  }];
}

/** Outreach / move drafts must be under max_draft_words (brief WP6: 250). */
export function checkDraftLength(draft: string, opts: GuardrailOptions = {}): Violation | null {
  const max = opts.max_draft_words ?? 250;
  const wc = wordCount(draft);
  if (wc > max) {
    return {
      check: "draft_length",
      severity: "block",
      detail: `Draft is ${wc} words; limit is ${max}. Regenerate with an explicit shorter-form instruction.`,
    };
  }
  return null;
}

/** Em dashes are auto-sanitised, never blocking; we still record the count. */
export function checkEmDashes(text: string): Violation[] {
  const { count } = stripEmDashes(text);
  if (count === 0) return [];
  return [{
    check: "em_dash",
    severity: "sanitise",
    strict: true,
    match: "—",
    detail: `${count} em/en dash(es) present; auto-replaced with comma.`,
  }];
}

/**
 * Required-field presence. Accepts the canonical core_report shape. A report
 * must carry a non-empty hook_insight, at least min_options business options,
 * a recommendation, an AI-impact section, and a first_move. Missing field is a
 * `block` (pipeline failure, not silent partial output).
 *
 * The first_move lives on the activation_plan (plan stage), so it is only
 * checked when an activation_plan is supplied.
 */
export function checkRequiredReportFields(
  report: Record<string, unknown>,
  opts: GuardrailOptions = {},
): Violation[] {
  const violations: Violation[] = [];
  const minOptions = opts.min_options ?? 3;

  const core = pickCore(report);

  if (isEmpty(core.hook_insight) && isEmpty(report.hook_insight)) {
    violations.push(reqMiss("hook_insight"));
  }

  const options = Array.isArray(core.options) ? core.options : [];
  if (options.length < minOptions) {
    violations.push({
      check: "required_field",
      severity: "block",
      field: "options",
      detail: `Report has ${options.length} option(s); minimum is ${minOptions}.`,
    });
  }

  if (isEmpty(core.recommendation)) violations.push(reqMiss("recommendation"));

  // AI-impact section may live as ai_impact / ai_impact_section / on core.
  const aiImpact = core.ai_impact ?? core.ai_impact_section ?? report.ai_impact_section ?? report.ai_impact;
  if (isEmpty(aiImpact)) violations.push(reqMiss("ai_impact"));

  // first_move only exists once a plan has been generated.
  const ap = report.activation_plan as Record<string, unknown> | undefined;
  if (ap && typeof ap === "object") {
    const fm = ap.first_move ?? report.provisional_first_move;
    if (isEmpty(fm)) violations.push(reqMiss("first_move"));
  }

  return violations;
}

function reqMiss(field: string): Violation {
  return {
    check: "required_field",
    severity: "block",
    field,
    detail: `Required field "${field}" is missing or empty.`,
  };
}

function pickCore(report: Record<string, unknown>): Record<string, unknown> {
  const core = report.core_report;
  if (core && typeof core === "object") return core as Record<string, unknown>;
  return report;
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/**
 * Pricing sanity. For each option, the quoted pricing range must fall within
 * the canonical business_models.json range for that model. Any figure outside
 * the range (with a small tolerance) is a `block` → regenerate. No-op when
 * pricing_ranges is not supplied.
 */
export function checkPricingSanity(
  report: Record<string, unknown>,
  opts: GuardrailOptions = {},
): Violation[] {
  const ranges = opts.pricing_ranges;
  if (!ranges) return [];
  const core = pickCore(report);
  const options = Array.isArray(core.options) ? (core.options as Array<Record<string, unknown>>) : [];
  const violations: Violation[] = [];
  const TOL = 0.01; // 1% tolerance for rounding.

  for (const o of options) {
    const id = typeof o.business_model_id === "string" ? o.business_model_id : null;
    if (!id || !ranges[id]) continue;
    const { min_gbp, max_gbp } = ranges[id];
    const pricing = (o.pricing ?? {}) as Record<string, unknown>;
    const low = typeof pricing.range_low_gbp === "number" ? pricing.range_low_gbp : null;
    const high = typeof pricing.range_high_gbp === "number" ? pricing.range_high_gbp : null;

    if (low !== null && low < min_gbp * (1 - TOL)) {
      violations.push(pricingViol(id, `low £${low} below KB min £${min_gbp}`));
    }
    if (high !== null && high > max_gbp * (1 + TOL)) {
      violations.push(pricingViol(id, `high £${high} above KB max £${max_gbp}`));
    }
  }
  return violations;
}

function pricingViol(id: string, detail: string): Violation {
  return {
    check: "pricing_sanity",
    severity: "block",
    field: id,
    detail: `Pricing out of KB range for ${id}: ${detail}. Regenerate.`,
  };
}

// -----------------------------------------------------------------------------
// Orchestrators
// -----------------------------------------------------------------------------

/**
 * Guardrails for a single free-text draft (outreach / move drafts). Sanitises
 * em dashes in place, flags banned phrases + constructions, blocks on length.
 */
export function runDraftGuardrails(draft: string, opts: GuardrailOptions = {}): GuardrailResult {
  const violations: Violation[] = [];

  const em = checkEmDashes(draft);
  violations.push(...em);
  const { text: sanitised } = stripEmDashes(draft);

  // Run phrase/construction checks against the sanitised text.
  violations.push(...checkBannedPhrases(sanitised, opts));
  violations.push(...checkNotYConstruction(sanitised));

  const lengthViol = checkDraftLength(sanitised, opts);
  if (lengthViol) violations.push(lengthViol);

  const regenerate = violations.some((v) => v.severity === "block");
  return {
    passed: !regenerate,
    regenerate,
    violations,
    sanitised_text: sanitised,
  };
}

/**
 * Guardrails for a full generated report. Required-field + pricing checks block
 * and drive regeneration; banned-phrase / construction / exclamation checks run
 * over the report's visible prose and flag. Em dashes across prose are reported
 * as sanitise (callers strip them field-by-field before persist).
 */
export function runReportGuardrails(
  report: Record<string, unknown>,
  opts: GuardrailOptions = {},
): GuardrailResult {
  const violations: Violation[] = [];

  violations.push(...checkRequiredReportFields(report, opts));
  violations.push(...checkPricingSanity(report, opts));

  const prose = collectReportProse(report);
  violations.push(...checkEmDashes(prose));
  violations.push(...checkBannedPhrases(prose, opts));
  violations.push(...checkNotYConstruction(prose));
  violations.push(...checkExclamation(prose));

  const regenerate = violations.some((v) => v.severity === "block");
  return { passed: !regenerate, regenerate, violations };
}

/**
 * Flatten the user-visible prose of a report into one string for phrase checks.
 * Walks core_report.hook_insight, options, recommendation, and ai_impact text.
 * Intentionally shallow: only string leaves under the visible sections.
 */
export function collectReportProse(report: Record<string, unknown>): string {
  const core = pickCore(report);
  const parts: string[] = [];
  collectStrings(core.hook_insight, parts);
  collectStrings(core.recommendation, parts);
  collectStrings(core.ai_impact ?? core.ai_impact_section ?? report.ai_impact_section, parts);
  const options = Array.isArray(core.options) ? core.options : [];
  for (const o of options) collectStrings(o, parts);
  const ap = report.activation_plan;
  if (ap) collectStrings((ap as Record<string, unknown>).first_move, parts);
  return parts.join("\n");
}

function collectStrings(v: unknown, acc: string[], depth = 0): void {
  if (depth > 6 || v === null || v === undefined) return;
  if (typeof v === "string") {
    if (v.trim()) acc.push(v);
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) collectStrings(x, acc, depth + 1);
    return;
  }
  if (typeof v === "object") {
    for (const x of Object.values(v as Record<string, unknown>)) collectStrings(x, acc, depth + 1);
  }
}

// -----------------------------------------------------------------------------
// Catch-rate / false-positive metrics (WP6 acceptance helper)
// -----------------------------------------------------------------------------

export interface CorpusMetrics {
  total: number;
  flagged: number;
  blocked: number;
  strict_flagged: number;
  catch_rate: number;        // fraction with ≥1 strict violation (block or strict flag)
  false_positive_rate: number; // among items asserted legitimate, fraction flagged strict
}

/**
 * Run guardrails over a labelled corpus and compute catch + false-positive
 * rates (WP6 acceptance criterion). `legitimate` items SHOULD pass; `bad` items
 * SHOULD be caught. Items without a label count toward catch rate only.
 */
export function scoreCorpus(
  items: Array<{ report: Record<string, unknown>; legitimate?: boolean }>,
  opts: GuardrailOptions = {},
): CorpusMetrics {
  let flagged = 0;
  let blocked = 0;
  let strictFlagged = 0;
  let legitimateCount = 0;
  let legitimateStrictHits = 0;
  let badCount = 0;
  let badCaught = 0;

  for (const item of items) {
    const res = runReportGuardrails(item.report, opts);
    const hasStrict = res.violations.some((v) => v.severity === "block" || v.strict);
    if (res.violations.length > 0) flagged++;
    if (res.regenerate) blocked++;
    if (hasStrict) strictFlagged++;

    if (item.legitimate === true) {
      legitimateCount++;
      if (hasStrict) legitimateStrictHits++;
    } else if (item.legitimate === false) {
      badCount++;
      if (hasStrict) badCaught++;
    }
  }

  return {
    total: items.length,
    flagged,
    blocked,
    strict_flagged: strictFlagged,
    catch_rate: badCount > 0 ? round(badCaught / badCount) : round(strictFlagged / Math.max(1, items.length)),
    false_positive_rate: legitimateCount > 0 ? round(legitimateStrictHits / legitimateCount) : 0,
  };
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
