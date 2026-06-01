<!--
prompt_version: 1.0
prompt_name: judge-8-graceful-failure
prompt_hash: 3b1e9f31b7a80b4bda9c82192d506ccd7c8e1b3f5ec607f3da3b6a84b3408d7b
model: gpt-5.4
last_updated: 2026-06-01
-->

# Judge 8 — Graceful failure on edge profiles

**Version:** 1.0 — 2026-06-01
**Model:** gpt-5.4
**Origin:** AI product pre-pass 2026-06-01 scored D9 (segment fit & graceful failure) at 2.5 — the plan leans on a warm budget-holder network many users don't have, and UK-first assumptions may leak to non-UK users. This judge runs ONLY on profiles carrying `edge_case_flags` and checks the output degrades gracefully instead of breaking or quietly mis-serving.

If a profile has no `edge_case_flags`, this judge is not run (the harness skips it and it does not enter the aggregate for that profile).

## Inputs

```json
{
  "profile": {
    "edge_case_flags": ["thin_network", "non_uk", "below_icp_experience_floor", "ambiguous_archetype", "..."],
    "questionnaire": { "...": "..." }
  },
  "generated_first_move": "<first_move: action + move type>",
  "generated_plan_summary": "<activation_plan summary + phase goals + a sample of day tasks>",
  "generated_market_snapshot": "<market snapshot text>",
  "gold_graceful_failure_expectations": "<the profile's expected_outputs.graceful_failure_expectations>",
  "gold_first_move_must_not_be_type": ["<types the first move must NOT be, if specified>"]
}
```

## What to do

Read `gold_graceful_failure_expectations` — it states what graceful handling looks like for THIS profile's flags. Then score whether the generated output meets it. Apply the flag-specific checks below.

### Flag: thin_network
- PASS signal: first move and early plan tasks are structural / platform / visibility / community — reaching a COLD market. No dependence on "contact people you know / your network".
- FAIL signal: the plan's first-client path assumes warm contacts (e.g. "reach out to 15 people in your network"). If `gold_first_move_must_not_be_type` includes "Direct" and the first move is Direct-to-warm-network, that is a fail.

### Flag: non_uk
- PASS: localised to the user's country OR clearly flags that guidance is UK-centred. Pricing in a sensible currency frame.
- FAIL: silently applies UK-only constructs (IR35, Companies House, HMRC, sole-trader-vs-Ltd, £ benchmarks) to a non-UK user as fact.

### Flag: below_icp_experience_floor
- PASS: honest about limited track record; tempered pricing; longer ramp; modest entry; no salary-replacement implication.
- FAIL: sells the same confident senior-independent story as a 12-year manager.

### Flag: ambiguous_archetype / blended_role
- PASS: preserves the cross-functional edge; closest match + acknowledges the blend (bible §13).
- FAIL: flattens the profile into one ill-fitting label and loses the distinctive join.

## Scoring (0–5)
- **5** = meets the graceful_failure_expectations on every flag; degrades cleanly.
- **3** = handles one flag well, soft on another.
- **1** = hits the named failure mode for a flag (e.g. assumes a warm network the user doesn't have; applies UK constructs to a non-UK user).
- **0** = breaks outright (empty/garbled output, or actively harmful advice for the edge condition).

## Output schema (strict)

```json
{
  "score": 0,
  "per_flag": [ { "flag": "thin_network", "handled": false, "note": "<short>" } ],
  "named_failure_mode_hit": false,
  "justification": "<=280 chars"
}
```
`named_failure_mode_hit: true` caps `score` at 1.
