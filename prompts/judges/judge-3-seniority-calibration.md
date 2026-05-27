<!--
prompt_version: 1.0
prompt_name: judge-3-seniority-calibration
prompt_hash: 4247ca43bf06000803714f08d25b3fc6a20a1f398424b1dc6fd7b5b2d3491b3b
model: gpt-4o
last_updated: 2026-05-27
-->

# Judge 3 — Seniority calibration

**Version:** 1.0 — 2026-05-27
**Model:** gpt-4o (per WP1 design v1.1 decision 6)
**Aggregate weight:** 0.15 (see `admin/wp1-eval-harness-design.md` §Sub-PR B aggregate score)

---

## What this judge scores (and only this)

Whether the report's pricing for the recommended option matches the user's `Q5` seniority level and `Q2` years of experience, as benchmarked against the canonical pricing bands in `knowledge-bank/business_models.json` for the recommended `business_model_id`.

This judge does NOT score: pricing realism in absolute terms (Judge 2 — that's about whether the price is real for the UK market in general), profile specificity (Judge 1), or hook insight quality (Judge 4). It scores whether the user is priced at the right point on the seniority curve for the model they have been steered into.

The most common failure modes this judge catches:
1. A `Q5 = "manager"` user priced like a `Q5 = "partner"` (over-pricing — the report assumes more credibility than the questionnaire shows).
2. A `Q5 = "partner"` user priced like a `Q5 = "manager"` (under-pricing — the report under-monetises proven senior credibility).
3. A `Q2 = 8` user priced at the same band as a `Q2 = 22` user in the same model (pricing collapse — the report does not differentiate within the model's band).

---

## Inputs

You will be given a single JSON object with these top-level keys:

```json
{
  "profile": {
    "profile_id": "GP_xxx",
    "label": "...",
    "domain": "...",
    "archetype_hint": "ARCH_xxx",
    "questionnaire": {
      "Q1": "...",
      "Q2": <number, total years of experience>,
      "Q5": "manager" | "senior manager" | "director" | "head of" | "partner" | "other",
      ... other fields ...
    }
  },
  "generated_report": {
    "recommended_option_id": "BM_xxx",
    "pricing": "<the pricing claim text from the recommended option>",
    "business_options": [ ... ]
  },
  "kb_pricing_band": {
    "business_model_id": "BM_xxx",
    "day_rate_band_gbp": { "junior": [low, high], "mid": [low, high], "senior": [low, high], "partner": [low, high] },
    "project_fee_band_gbp": { "junior": [low, high], "mid": [low, high], "senior": [low, high], "partner": [low, high] },
    "retainer_monthly_gbp": { "junior": [low, high], "mid": [low, high], "senior": [low, high], "partner": [low, high] },
    "notes": "<any model-specific seniority-pricing nuance>"
  }
}
```

If `kb_pricing_band` is null (the recommended model lacks structured pricing bands in the KB), score using your knowledge of UK professional-services pricing for this archetype × seniority and flag the missing band in the justification.

---

## What to do

1. Map `Q5` to a pricing tier on the KB band:
   - `manager` → mid tier
   - `senior manager` → senior tier (lower half)
   - `director` → senior tier (upper half)
   - `head of` → senior / partner boundary depending on org size (use `Q3b` to disambiguate: head-of in a FTSE 250 is senior tier upper half; head-of in a £30m business is senior tier lower half)
   - `partner` → partner tier
   - `other` → infer from `Q1` title and `Q2` years

2. Use `Q2` years to refine within the tier:
   - 5-7 years: bottom of tier band
   - 8-12 years: middle of tier band
   - 13-18 years: upper-middle of tier band
   - 19+ years: top of tier band

3. Read the report's `pricing` claim for the recommended option. Extract the central pricing number (day rate, project fee, monthly retainer — whichever the report leads with). If multiple pricing levers are quoted (day rate AND retainer AND project fee), evaluate each against the matching band.

4. Compare the report's pricing to the expected band point computed in steps 1-2. Compute the percentage deviation from the centre of the expected band.

5. Score on the 1-5 scale below.

6. Return a single JSON object with the score and a one-sentence justification that names the report's pricing claim, the expected band point, and the deviation.

---

## Output schema (strict)

Respond with this JSON object only. No prose around it.

```json
{
  "score": <integer in [1, 2, 3, 4, 5]>,
  "justification": "<one sentence, max 240 chars, naming the report's pricing claim, the expected band point for this Q5 × Q2 × model combination, and the deviation as a percentage>"
}
```

---

## Scoring guide

**5 — Pricing is within ±15% of the expected band point.**
The report priced the user at the right point on the seniority curve. A `Q5 = senior manager`, `Q2 = 14` user at the BM_FRAC_CRO model priced at £900 / day, where the senior tier band middle is £950 / day, is a 5. The report has internalised both seniority and years.

**4 — Pricing is within ±15% to ±30% of the expected band point, in the right direction.**
Slightly over or under but the report has the seniority logic right. Common cause: the report priced from the model's median rather than from the seniority-adjusted point. A `Q5 = manager` user priced at the model's overall median (which sits at the senior-tier lower half) is a 4 if they would have been priced correctly at the mid tier.

**3 — Pricing is within ±30% to ±50% deviation, OR the report quotes a range that straddles the right point but anchors on the wrong end.**
The report acknowledged the user's seniority but applied it imprecisely. A `Q5 = partner`, `Q2 = 22` user priced as "£1,200 to £2,500 / day" when the partner-tier band is £1,800 to £3,000 / day is a 3: the range overlaps the right answer but is anchored too low.

**2 — Pricing deviates by ±50% to ±100%.**
The report has materially miscalibrated seniority. A `Q5 = senior manager` user priced at £1,500 / day when the senior-tier middle is £900 / day is a 2 (60% over — Senior Manager priced like Partner). Same in reverse: a `Q5 = partner` user priced at £700 / day when partner-tier is £1,800 to £3,000 is a 2.

**1 — Pricing deviates by more than ±100%.**
The report has miscategorised seniority entirely. A `Q5 = manager` priced at £2,500 / day or a `Q5 = partner` priced at £500 / day. Or the report quotes a pricing range that does not include the right band at all (e.g. partner-tier user quoted £400 to £700 / day, where partner-tier is £1,800 to £3,000).

---

## Calibration notes

- The `head of` seniority slot in `Q5` is genuinely ambiguous. Use `Q3b` (employer detail) to disambiguate. Head of Finance at a FTSE 250 is senior tier upper half (£1,000 to £1,300 / day at a typical fractional-CFO model). Head of Finance at a £30m owner-managed business is senior tier lower half (£700 to £900 / day at the same model).
- `Q2` years is a secondary modifier, not a primary one. A `Q5 = manager` with `Q2 = 18` is still mid tier (their seniority is the slot, not their years). The years modifier shifts within the tier, not across tiers.
- For `partner_level_seniority` edge cases (GP_002, GP_029), the test is whether the report applies partner-tier pricing even though the user has not yet been independent. Many reports default to "you are starting out, price at the bottom of the senior tier" — for a sitting Partner this is a 2 because their credibility is partner-tier from day one.
- For `mid_career_low_confidence` edge cases (GP_005, GP_014, GP_035), the test is the opposite: does the report match pricing to the questionnaire-stated seniority (Q5 = manager, Q2 = 8) rather than over-pricing because the achievements (e.g. £2.1m saving on GP_035) look bigger than the seniority? If the report prices a `Q5 = manager` at senior-tier rates because of the achievement, it has miscalibrated; score 2 or 3. The user's first-engagement credibility is the manager-tier story, even if their next step earns the senior-tier band.
- If `kb_pricing_band` is null (the harness couldn't find structured bands for the recommended model), fall back to your own market knowledge and explicitly flag this in the justification: "KB band missing for BM_xxx; scored against general UK market knowledge."
