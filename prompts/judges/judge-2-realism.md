<!--
prompt_version: 1.0
prompt_name: judge-2-realism
prompt_hash: 9f9f8659cf22471ee115dc3c92e2632f00733169833f8f46b1b9840f5f4f0330
model: gpt-4o
last_updated: 2026-05-27
-->

# Judge 2 — Realism

**Version:** 1.0 — 2026-05-27
**Model:** gpt-4o (per WP1 design v1.1 decision 6)
**Aggregate weight:** 0.20 (see `admin/wp1-eval-harness-design.md` §Sub-PR B aggregate score)

---

## What this judge scores (and only this)

Whether the generated report's pricing bands, time-to-revenue claims, and first-client paths are commercially plausible for this archetype, sector, and seniority. Plausible to a senior practitioner who actually buys or sells this kind of work in the UK market.

This judge does NOT score: profile-specificity (Judge 1), pricing-vs-seniority match precisely (Judge 3), or hook insight quality (Judge 4). It scores whether the commercial claims would read as real to a buyer or to a former practitioner of the archetype.

A realistic report quotes pricing in bands that match what UK / European mid-cap and enterprise buyers actually pay for this archetype's services, names time-to-first-revenue in weeks or months that match the sales-cycle reality of the archetype, and names first-client paths (referral patterns, intermediaries, platforms, communities) that genuinely source work for this archetype in the UK.

An unrealistic report quotes pricing 2-3x above or below the real band, claims time-to-revenue impossible for the sales cycle ("3-month enterprise procurement cycle, you'll have your first client in 4 weeks"), or names first-client paths that do not actually source work for this archetype (e.g. recommending Upwork for a Senior FP&A fractional CFO).

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
    "questionnaire": { "Q1": "...", "Q2": ..., "Q3a": "...", "Q3b": "...", "Q4": "...", "Q5": "...", "Q6": "...", "Q7": "...", "Q8": "...", "Q9": "...", "Q10": "...", "Q11": "...", "Q12": ... , "Q13": "...", "Q14": "...", "Q15": "..." }
  },
  "generated_report": {
    "recommended_option_id": "...",
    "business_options": [ ... ],
    "first_clients_path": "...",
    "pricing": "...",
    "time_to_revenue": "...",
    ... other fields ...
  }
}
```

You will NOT be given the KB pricing bands. Use your own knowledge of UK / European professional-services and consulting markets to judge plausibility. Sub-PR C will pass relevant context where the harness has it, but Judge 2 must function as a general commercial-reality check first.

---

## What to do

1. Read the profile. Note `Q3a` sector, `Q5` seniority, `Q2` years experience, `Q14` employment status, `Q11` buyer context (the named buyer types and how they buy), `Q15` location.

2. Read the generated report's recommended option, focusing on: `pricing`, `time_to_revenue`, `first_clients_path`, `who_buys_it`, and any field that makes a commercial claim about how money flows.

3. Apply the three sub-tests in order. Each can pass, partially pass, or fail.

**Sub-test A — Pricing band realism.**
Does the quoted pricing fall within the band a UK buyer of this archetype's services actually pays in 2026? Consider: day rate, project fee, retainer monthly fee, equity-bearing engagement. A Senior Manager fractional CFO charges £600 to £1,100 / day in 2026, not £200 / day and not £2,500 / day. A Partner-level strategy advisor charges £1,500 to £3,000 / day, not £800.

**Sub-test B — Time-to-revenue plausibility.**
Does the quoted time-to-first-revenue match the buyer's sales cycle? Enterprise B2B with procurement involvement is 8 to 16 weeks minimum from cold. Warm-network advisory engagements with former CFOs / VPs / Partners can close in 2 to 4 weeks. Platform / marketplace inbound (where the platform genuinely sources work for this archetype) is typically 4 to 12 weeks to first paid client. Saying "first revenue in 2 weeks" for a cold enterprise sale is implausible regardless of how good the user is.

**Sub-test C — First-client-path plausibility.**
Are the named channels (referrals, intermediaries, platforms, communities, professional bodies, sector events) actual sources of work for this archetype in the UK in 2026? A regulatory-affairs specialist gets first clients via biotech CMO networks, MHRA-adjacent communities, and direct introductions, not via Bark.com. A senior FP&A lead gets first fractional-CFO work via PE operating-partner intros, ex-colleagues now in CFO seats, and the FD Centre / Cooper Parry-tier referral networks, not via Fiverr.

4. Score on the 1-5 scale below.

5. Return a single JSON object with the score and a one-sentence justification.

---

## Output schema (strict)

Respond with this JSON object only. No prose around it.

```json
{
  "score": <integer in [1, 2, 3, 4, 5]>,
  "justification": "<one sentence, max 240 chars, citing the most concrete commercial claim from the report (pricing figure, time-to-revenue claim, or named channel) and your read of whether it matches market reality>"
}
```

---

## Scoring guide

**5 — Reads commercially sound across all three sub-tests.**
Pricing falls inside the real UK band for this archetype × seniority × buyer type. Time-to-revenue matches the sales cycle of the named buyers in `Q11`. First-client paths name channels that actually source work for this archetype. A senior practitioner reading the report would not flag any commercial claim as off.

**4 — One sub-test is slightly off but not commercially damaging.**
Pricing is within 20% of the real band, or time-to-revenue is on the optimistic / pessimistic edge of plausibility but not impossible, or one first-client channel is weak even though the others are real. The report would not embarrass the user in front of a prospect but a senior practitioner would correct one claim.

**3 — One sub-test is meaningfully wrong, two are sound.**
Pricing is 30-50% off, OR time-to-revenue is unrealistic for the named sales cycle by a factor of 2-3x, OR the first-client path includes one mainstream-but-wrong channel (e.g. recommending LinkedIn organic posting as the primary first-client channel for a regulatory-affairs specialist whose Q11 says they get work via direct CMO intros). The user would notice in execution that one claim does not match reality.

**2 — Two sub-tests are wrong.**
Pricing is 50%+ off AND time-to-revenue is implausible, OR pricing is wrong AND the first-client path names channels that don't source work for this archetype. The user would burn a meaningful amount of time chasing the wrong things on the report's advice.

**1 — Commercially nonsensical.**
Pricing contradicts the archetype's real band by more than 100% (e.g. Senior FP&A fractional CFO at £150 / day, or Senior Procurement Manager at £3,000 / day). First-client path names channels that do not source work for this archetype at all (e.g. Upwork for fractional CFO, Bark for rare-disease regulatory advisory). Time-to-revenue claims are impossible given the named sales cycle. Or the report contradicts a hard fact stated in the profile (e.g. claims warm-network conversion when Q12 = null and Q13 = narrow with explicit no-warm-leads framing).

---

## Calibration notes

- Pricing realism is the most load-bearing of the three sub-tests because pricing is the most precise commercial claim. Time-to-revenue and first-client-path can be soft language; pricing is a number.
- The `Q15` location matters: London-based fractional pricing is at the top of the UK band; regional pricing is 15-30% lower for the same archetype × seniority. A London-flagged Senior Manager FP&A priced at £550 / day is realistic for regional England but borderline for central London.
- For `high_income_urgency` edge cases (GP_012, GP_031), the realism test pays extra attention to first-client-path: the report cannot promise a 4-week revenue path if the channel named genuinely needs 12-16 weeks to deliver, regardless of urgency.
- For `niche_sector_thin_kb` edge cases (GP_018, GP_033), expect higher-than-typical pricing bands because the niche-specialism premium is real. A rare-disease regulatory advisor at £1,400 / day or a niche supply-chain specialist at £1,200 / day is plausible even though it would be high for the generalist version of the same archetype.
- Where Q14 = "between roles" with Q9 = high (GP_031), the report should signal that initial engagements may be priced at a slight discount to win the first cash-positive month. A report that quotes top-of-band pricing for the user's first engagement post-redundancy is mildly unrealistic; not a 1 but probably a 3.
