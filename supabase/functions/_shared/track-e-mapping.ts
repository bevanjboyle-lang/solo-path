// V-057 (vibe code review 2026-05-14): single source of truth for Track-E
// (sector specialism) module selection. Previously duplicated as inline regex
// in stripe-subscription-webhook (getApplicableTrackEModules) and
// get-library-content (getTrackEModulesForUser) — the two copies had drifted.
//
// Track-E modules 20-25 are sector-specific. Each user gets the modules whose
// sector matches their questionnaire answers (q3a sector + q11 sector_client_context)
// and/or their assigned archetype name.
//
// Why regex (still): q3a and q11 are free-text in the questionnaire today. When
// they become structured dropdown values, this can be rewritten as a direct map
// lookup. For now we centralise the regex so updates land in one place.
//
// Coverage by module:
//   20 — Financial Services (banking, insurance, asset mgmt, FS risk/compliance, treasury, audit)
//   21 — Public Sector (government, NHS, local authority)
//   22 — Technology / Digital (software, data, cyber, product)
//   23 — Healthcare & Life Sciences (pharma, clinical, medical, biotech)
//   24 — Professional Services (legal, consulting, HR, executive coaching)
//   25 — Marketing / Creative / Communications (brand, content, design, PR)
//
// Treasury was previously missed by the get-library-content regex; it's now
// included under module 20 per the V-057 example case in the findings register.

// Patterns are the SUPERSET of the two prior copies (stripe-subscription-webhook
// was more comprehensive than get-library-content). Treasury also added under
// module 20 per the V-057 example case in the findings register.
const TRACK_E_PATTERNS: Array<{ moduleId: number; pattern: RegExp }> = [
  {
    moduleId: 20,
    pattern: /financial services|banking|insurance|asset management|wealth|fintech|risk.*compli|compliance.*risk|audit|treasury/,
  },
  {
    moduleId: 21,
    pattern: /public sector|government|local authority|nhs|central government|defence|education|regulatory bod/,
  },
  {
    moduleId: 22,
    pattern: /technology|digital|software|data.*analytic|analytic.*data|\bai\b|machine learning|cloud|cybersecurity|product manager|product director|\btech\b/,
  },
  {
    moduleId: 23,
    pattern: /healthcare|\bnhs\b|life sciences|pharma|medical device|biotech|clinical|health tech/,
  },
  {
    moduleId: 24,
    pattern: /legal|management consult|strategy consult|\bhr\b|people.*consult|executive coach|talent|organisational development|\bod\b|professional services/,
  },
  {
    moduleId: 25,
    pattern: /marketing|creative|advertising|\bbrand\b|content|\bdesign\b|communications|\bpr\b|public relations|digital marketing|growth market/,
  },
];

/**
 * Returns the Track-E module IDs applicable to the given user signals.
 *
 * @param q3a - questionnaire q3a (sector dropdown — currently free text)
 * @param q11 - questionnaire q11 (sector_client_context — free text)
 * @param archetype - optional: assigned archetype name (e.g. "Treasury & Cash Management Specialist")
 *                    helps catch sector-canonical archetype names that aren't reflected in q3a.
 *                    stripe-subscription-webhook passes this; get-library-content doesn't have it
 *                    at call time and may pass "".
 */
export function getApplicableTrackEModules(
  q3a: string,
  q11: string,
  archetype: string = "",
): number[] {
  const haystack = `${q3a} ${q11} ${archetype}`.toLowerCase();
  return TRACK_E_PATTERNS
    .filter(({ pattern }) => pattern.test(haystack))
    .map(({ moduleId }) => moduleId);
}
