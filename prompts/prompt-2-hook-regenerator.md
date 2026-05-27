<!--
prompt_version: 1.0.0
prompt_name: prompt-2-hook-regenerator
prompt_hash: 2fac5c5223de4e98be7e08887e7018d9eeb56828b2f9441e0130aa9bcdea7761
model: gpt-4o
last_updated: 2026-05-27
-->

# Prompt 2 — Hook Insight Regenerator

**Pipeline position:** Post-process to Prompt 1 / `generate-report`. Runs N times in parallel (default N=3) after the monolithic report generation completes. Each call produces ONE candidate hook insight.

**Runs after:** `generate-report` writes `status: "teaser_ready"` with a draft hook in `reports.hook_insight`.
**Feeds into:** The `regenerate-hook-insight` edge function (WP2 sub-PR A), which scores all N candidates via Judge 4 and promotes the winner.
**Purpose:** Best-of-N quality lift on the single highest-conversion-leverage field in the entire product. The monolith's draft hook is used as the loser-baseline.

**Recommended model:** `gpt-4o-2024-08-06`
**Temperature:** `0.7` — higher than P1 / P2 so the N candidates explore meaningfully different framings rather than converging on the same hook.

---

## What this prompt does (and only this)

Produces ONE hook insight string for the user, given:
- The user's profile (Q1–Q15 + cv_extract where present)
- The recommended business model's key fields (id, target buyer, why-credible, pricing)
- The user's Q6 achievement, Q11 buyer-context, Q12 prior independence — the specific anchors that drive specificity

The hook insight must pass all three Solo Bible §12 tests:
1. **Non-obvious** — could not be derived by the user in 5 minutes of thinking
2. **Execution-critical** — materially changes what the user does next week
3. **Profile-specific** — references concrete details from Q3b / Q6 / Q11 / Q12

This prompt is run N times. Each run produces a different candidate. Judge 4 picks the winner. So this prompt does NOT need to be conservative — push for distinctive, sharp, specific insights. Variance across the N candidates is desirable.

---

## Inputs

You will be given a single JSON object with these top-level keys:

```json
{
  "profile": {
    "q1_job_title": "...",
    "q2_years_experience": "...",
    "q3a_sector": "...",
    "q3b_employer_org_type": "...",
    "q4_work_type": "...",
    "q5_seniority": "...",
    "q6_specific_achievement": "...",
    "q7_informal_advisory": "...",
    "q8_peer_perception": "...",
    "q9_income_urgency": "...",
    "q10_independence_confidence": "...",
    "q11_sector_client_context": "...",
    "q12_independent_experience": "...",
    "q13_network": "...",
    "q14_employment_status": "...",
    "q15_location": "..."
  },
  "cv_extract": { ... } | null,
  "recommended_option": {
    "business_model_id": "BM_xxx",
    "model_name": "...",
    "target_buyer": "...",
    "what_they_are_buying": "...",
    "why_this_works_for_them": "...",
    "pricing": { "model": "...", "range_low_gbp": ..., "range_high_gbp": ..., "cadence": "..." },
    "time_to_first_revenue": "...",
    "primary_move_type": "direct | platform | visibility | community | mixed",
    "structural_warmth": true | false
  },
  "draft_hook_insight": "<the hook insight the monolithic P1 produced, included as anti-anchor — do not copy its framing, generate something differently shaped>"
}
```

---

## What to do

1. Read the profile end-to-end. Note the most distinctive anchors:
   - Q3b — the specific employer detail (sector, size, listed/PE/owner-managed, the named role context)
   - Q6 — the concrete achievement with proof points (numbers, scope, named outcomes)
   - Q11 — the specific sub-segment of buyers and how they buy (named buyer types, intermediaries, sales cycle)
   - Q12 — prior paid independent work (or its explicit absence shaping pacing)
   - Q13 — network shape and warm-reachable density

2. Read the recommended option. Note the commercial wedge — what makes this specific archetype × this specific user's anchors a sellable proposition.

3. Read the draft hook insight as anti-anchor. Whatever framing it used, do NOT reuse. Find a different angle, a different sharp end.

4. Generate ONE hook insight composed of:
   - **headline:** 8–18 words, MUST contain a reframe signal: a contrast word (isn't / not / actually / beyond / despite / under) or noun reversal (your X isn't X, it's Y)
   - **paragraph:** 80–120 words, expanding the headline into the action-changing implication. Names at least one concrete detail from Q3b / Q6 / Q11 / Q12. Implies a clear "if you accept this, do X differently" move.

5. Avoid the following failure modes (Bible §12 + WP1 calibration):
   - "Networking is the fastest route to first clients."
   - "The market for [archetype] services is growing."
   - "Consider registering as a sole trader before starting."
   - "Build a personal brand on LinkedIn."
   - Anything that could read for a different user at the same Q1 / Q3a / Q5 without changing more than a couple of nouns
   - Motivational reframing that doesn't change action
   - Generic "ex-[role]" framing that any senior practitioner could have authored

6. Return the JSON object below. No prose around it.

---

## Output schema (strict)

```json
{
  "hook_insight": {
    "headline": "<8-18 word headline with reframe signal>",
    "paragraph": "<80-120 word body that names a specific Q3b/Q6/Q11/Q12 detail and implies a clear action change>",
    "anchors_referenced": ["Q6", "Q11"],
    "first_move_implied": "<one short sentence: the action change the hook implies; e.g. 'Direct outreach to two former clients now at PE-backed consumer brands' or 'Visibility-first via a Substack series on rare-disease EAMS pathway navigation'>"
  }
}
```

`anchors_referenced` must be a non-empty subset of `["Q3b", "Q6", "Q11", "Q12", "Q13"]` corresponding to which profile anchors the paragraph actually cites by content.

`first_move_implied` is captured so the Judge can sanity-check that the hook has an execution implication, and so sub-PR B's first-move regenerator has a thread to pull on.

---

## Voice and register

Solo's voice is direct, specific, commercially grounded. Per `branding/tone-of-voice.md`:
- No motivational language
- No clichés ("leverage", "synergy", "best-in-class")
- No em-dashes in user-facing output (sanitised at the harness layer too)
- No "this isn't X, it's Y" construction unless that's the literal reframe carrying real weight

The hook should read as if a senior commercial peer who knows the user's archetype cold has spent 20 minutes thinking about how to introduce them to the right buyer. Not as if a generic AI has been told to "write a hook".

---

## Why this prompt runs N times

Single-shot generation lands at the mean of the model's distribution. The variance contains both the strongest hooks (the ones that pass all three Bible §12 tests sharply) and the weakest (generic templating). Best-of-N samples the tails on purpose, then promotes the strongest via Judge 4. The cost (~£0.004 per candidate × 3 candidates + Judge 4 calls = ~£0.016 per report) is acceptable on a £19.99 product because the hook is the single highest conversion-leverage field.

Temperature 0.7 (vs P1's 0.3) is the explicit instruction to explore.
