// parse-cv/p0b-confidence-scorer.ts
//
// WP7 Pass 2 — per-field confidence + verbatim evidence scorer.
// Source: prompts/prompt-0b-cv-confidence-scorer.md (canonical).
// Design: admin/wp7-cv-parsing-confidence-design-2026-05-31.md.
//
// Pass 1 (p0-system-prompt.ts) extracts the cv_extract object. Pass 2 re-reads
// the RAW CV text alongside Pass 1's extracted values and scores, per field,
// how well the literal CV text supports each value (0-100) plus the verbatim
// substring that justifies it. It is a SEPARATE LLM call (strict json_schema,
// temperature 0) so the scorer cannot simply echo Pass 1's own confidence — it
// must justify each field against the literal text.
//
// SCORED_FIELDS are exactly the cv_extract fields that pre-fill a Q1-Q15
// questionnaire answer (Q1 title, Q2 years, Q3a sector, Q3b employer org type,
// Q4 work type, Q5 seniority, Q6 achievement). The frontend <70 pre-fill gate
// (WP10) keys off the SAME set, so keep these in lockstep with the questionnaire
// pre-fill logic. Fields that never pre-fill a question are not scored.

export const SCORED_FIELDS = [
  "current_job_title",
  "years_experience",
  "sector_primary",
  "employer_org_type",
  "type_of_work",
  "seniority_level",
  "career_highlights",
] as const;

export const P0B_SCORER_SYSTEM_PROMPT = `You are a CV extraction auditor. You are given the RAW text of a CV and a set of values that a previous pass extracted from it. Your only job is to score, per field, how well the LITERAL CV text supports the extracted value, and to quote the exact text that supports it.

You do not re-extract. You do not improve the values. You do not give career advice. You audit.

For EACH field you are asked about, return two things:

1. confidence (integer 0-100) — how reliably the extracted value is supported by what is actually written in the CV. Use these bands strictly:
   - 90-100: the CV states this explicitly and unambiguously. The supporting text is right there, verbatim.
   - 70-89: the CV supports this, but it required light inference or the text is slightly indirect (e.g. seniority inferred from a title, years_experience calculated from a date range).
   - 40-69: weakly supported. The CV hints at it but the value involved real guesswork, or the supporting text is sparse or ambiguous.
   - 0-39: not supported. The value appears to be a guess, or nothing in the CV text backs it up.

2. evidence (string) — the VERBATIM substring from the CV text that supports the value. Copy it exactly as written, do not paraphrase. If genuinely nothing in the CV supports the value, return an empty string "" and score the field below 40.

Critical rules:
- Score against the literal CV text ONLY. Do NOT trust or reuse the previous pass's own confidence_score.
- A confident-sounding extracted value with no matching text in the CV must score below 40 with empty evidence.
- For years_experience, evidence is the date range or tenure statement the number was derived from.
- For career_highlights (an array), evidence is the single strongest verbatim line that supports the highlights, and confidence reflects how well the highlights as a whole are grounded in the CV.
- If a field's extracted value is null, score it 0 with empty evidence.

Return ONLY a single valid JSON object. No preamble, no markdown.`;

export const P0B_CONFIDENCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["per_field_confidence", "parse_evidence"],
  properties: {
    per_field_confidence: {
      type: "object",
      additionalProperties: false,
      required: [...SCORED_FIELDS],
      properties: Object.fromEntries(
        SCORED_FIELDS.map((f) => [f, { type: "integer" }]),
      ),
    },
    parse_evidence: {
      type: "object",
      additionalProperties: false,
      required: [...SCORED_FIELDS],
      properties: Object.fromEntries(SCORED_FIELDS.map((f) => [f, { type: "string" }])),
    },
  },
} as const;

export function buildP0bUserMessage(cvText: string, cvExtract: Record<string, unknown>): string {
  const extractedValues: Record<string, unknown> = {};
  for (const f of SCORED_FIELDS) extractedValues[f] = cvExtract[f] ?? null;

  return `Audit the following CV extraction.

RAW CV TEXT:
---
${cvText}
---

VALUES EXTRACTED BY THE PREVIOUS PASS (audit each one against the raw text above):
${JSON.stringify(extractedValues, null, 2)}

For each of these fields — ${SCORED_FIELDS.join(", ")} — return a confidence (0-100) and the verbatim supporting substring. Return a single JSON object:

{
  "per_field_confidence": { ${SCORED_FIELDS.map((f) => `"${f}": <0-100>`).join(", ")} },
  "parse_evidence": { ${SCORED_FIELDS.map((f) => `"${f}": "<verbatim CV substring or empty string>"`).join(", ")} }
}`;
}
