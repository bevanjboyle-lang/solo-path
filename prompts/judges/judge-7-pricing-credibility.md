<!--
prompt_version: 1.0
prompt_name: judge-7-pricing-credibility
prompt_hash: e06d0e88beae6ea716b71d7aa3c9c39516f0e385883bfabcd8cca01912d6f835
model: gpt-5.4
last_updated: 2026-06-01
-->

# Judge 7 — Pricing credibility (option bands vs honest first-year reality)

**Version:** 1.0 — 2026-06-01
**Model:** gpt-5.4
**Origin:** AI product pre-pass 2026-06-01. Report 773a2230 showed option bands (£26–38k strategy projects) sitting in tension with the honest income outlook (£0–5k in months 1–2). A buyer who anchors on the band and earns the floor feels misled. This judge scores whether option pricing is reconcilable with the report's own first-year story AND with the user's actual track record.

Distinct from Judge 3 (seniority calibration: is pricing right for the user's level *within the model's range*). Judge 7 asks the different question: **does the pricing the report shows hang together as one honest story for someone with no independent track record yet?**

## Inputs

```json
{
  "profile": { "questionnaire": { "Q2": 0, "Q5": "...", "Q12": "...", "Q13": "..." } },
  "generated_options_pricing": "<each recommended option's pricing band + model/cadence>",
  "generated_income_outlook": "<income_outlook: year_1 low/mid/high + revenue_build narrative>",
  "generated_reality_check": "<reality_check text>"
}
```

## What to do — three sub-tests (sum to 0–5; 2+2+1)

### Sub-test 1 — Bands reconcilable with year-1 outlook (0, 1, or 2)
- **2** = the option bands and the year-1 income build tell ONE coherent story (e.g. a £15–22k project band is consistent with a year-1 mid of £65k = ~3–4 projects, and the build narrative explains the ramp).
- **1** = reconcilable only with generous assumptions; the link is left implicit.
- **0** = the headline band and the honest outlook contradict (e.g. £26–38k bands but a year-1 build that implies one small sale) with no bridge — the misleading-anchor failure mode.

### Sub-test 2 — Calibrated to no-track-record start (0, 1, or 2)
- **2** = pricing/outlook explicitly reflect that the user has little/no independent track record yet (Q12 thin/null): entry pricing or a wedge offer, longer ramp, earned-rate framing.
- **1** = some acknowledgement of the cold start.
- **0** = prices the user at established-firm rates from day one as if the track record already exists.

### Sub-test 3 — Honest, not inflated (0 or 1)
- **1** = the numbers feel commercially conservative-but-not-dull (bible §23); no fantasy replacement-income-by-month-3 claim.
- **0** = inflated or implies fast salary replacement.

## Output schema (strict)

```json
{
  "score": 0,
  "sub_scores": { "bands_reconcilable": 0, "calibrated_to_cold_start": 0, "honest_not_inflated": 0 },
  "anchor_mismatch": false,
  "justification": "<=280 chars citing the specific band and the year-1 figure it does/doesn't reconcile with"
}
```
`anchor_mismatch: true` (sub-test 1 = 0) caps `score` at 2.

## Scoring guide
- **5** = one coherent, honest pricing story calibrated to a cold start.
- **3** = mostly coherent but soft on the cold-start calibration or the band↔outlook bridge.
- **1–2** = headline bands and honest outlook contradict each other (the misleading-anchor pattern).
- **0** = no pricing or no income outlook present to assess.
