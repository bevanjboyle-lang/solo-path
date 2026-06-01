<!--
prompt_version: 1.0
prompt_name: judge-6-recommendation-rationale
prompt_hash: fdd031e90fa6cd66e32abbad933bdad5945f8b5165943325c076f70a818a8eb4
model: gpt-5.4
last_updated: 2026-06-01
-->

# Judge 6 — Recommendation rationale (reasons, not restates)

**Version:** 1.0 — 2026-06-01
**Model:** gpt-5.4
**Origin:** AI product pre-pass 2026-06-01 caught report 773a2230's portfolio rationale literally restating the user's selection ("User selected a portfolio of 3 strands…") instead of reasoning. This judge makes that failure mode visible and scored.

---

## What this judge scores (and only this)

Whether `core_report.recommendation.rationale` (and, for portfolios, the strand-selection logic) genuinely **reasons** about why the recommended path fits THIS user — naming the differentiating edge, the trade-off against weaker options, and the key condition — rather than **restating** the selection, listing the options, or offering generic encouragement.

It does NOT score hook quality (Judge 4), pricing realism (Judge 2/7), or whole-report specificity (Judge 1).

## Inputs

```json
{
  "profile": { "profile_id": "...", "questionnaire": { "Q1": "...", "...": "..." } },
  "generated_recommendation": "<recommendation.rationale text (+ key_condition if present)>",
  "generated_options_summary": "<the option names/positionings the recommendation is choosing among>",
  "gold_rationale_must_reason_not_restate": "<the profile's expected_outputs.rationale_must_reason_not_restate, if present>"
}
```

## What to do — three sub-tests (sum to 0–5; 2+2+1)

### Sub-test 1 — Reasons rather than restates (0, 1, or 2)
- **2** = explains WHY this path given the user's specific profile: names the differentiating edge (from Q6/Q8/Q11), and why this option beats the alternatives for this person.
- **1** = gives some reasoning but leans on generic merit ("this has the best upside") without tying it to the user's specifics.
- **0** = restates the choice or lists the options/strands with no causal "because". The 773a2230 pattern ("user selected 3 strands…") scores 0 here.

### Sub-test 2 — Names the real trade-off / key condition (0, 1, or 2)
- **2** = states honestly what makes this path hard or what must be true for it to work (a real key_condition), and — for a multi-strand portfolio — acknowledges the focus/dilution trade-off rather than ignoring it.
- **1** = gestures at a condition or risk but vaguely.
- **0** = no trade-off, no condition; pure upside.

### Sub-test 3 — Internally consistent with the rest of the report (0 or 1)
- **1** = the recommendation does not contradict the report's own reality_check (e.g. it does not recommend breadth right after the reality_check warns breadth dilutes the wedge, without addressing the tension).
- **0** = the recommendation contradicts the report's own stated risks without acknowledgement.

If `gold_rationale_must_reason_not_restate` is present and the rationale clearly violates it (restates the selection), override `score` to 1.

## Output schema (strict)

```json
{
  "score": 0,
  "sub_scores": { "reasons_not_restates": 0, "names_tradeoff": 0, "internally_consistent": 0 },
  "restate_violation": false,
  "justification": "<=280 chars, cite the specific phrase that earned or lost the points"
}
```
`restate_violation: true` forces `score` to 1.

## Scoring guide
- **5** = reasons from the user's specifics, names a real trade-off/condition, internally consistent.
- **3** = reasons partially OR names a condition but not both well.
- **1** = restates the selection / lists options with no causal reasoning, or contradicts the report's own reality check.
- **0** = no rationale present.
