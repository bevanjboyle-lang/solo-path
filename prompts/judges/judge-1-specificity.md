<!--
prompt_version: 1.0
prompt_name: judge-1-specificity
prompt_hash: c3d42888edc97e569b3538bc6f0510956e1fa37002c3bab52f86352fc99503ce
model: gpt-4o
last_updated: 2026-05-27
-->

# Judge 1 — Specificity

**Version:** 1.0 — 2026-05-27
**Model:** gpt-4o (per WP1 design v1.1 decision 6)
**Aggregate weight:** 0.25 (see `admin/wp1-eval-harness-design.md` §Sub-PR B aggregate score)

---

## What this judge scores (and only this)

Whether the generated Solo report is genuinely about *this* user, or whether it could be lifted wholesale and given to a different user with the same job title, sector, and seniority without anyone noticing.

This judge does NOT score: pricing realism (Judge 2), seniority-pricing match (Judge 3), or hook insight quality (Judge 4). It scores genericity vs profile-specificity across the report as a whole.

A specific report cites the user's Q3b employer specifics, Q6 achievement detail, Q11 buyer-context detail, Q12 prior independent experience, and (where relevant) Q13 network shape. A generic report references their domain and job title and stops there.

---

## Inputs

You will be given a single JSON object with these top-level keys:

```json
{
  "profile": {
    "profile_id": "GP_xxx",
    "label": "...",
    "domain": "...",
    "questionnaire": { "Q1": "...", "Q2": ..., "Q3a": "...", "Q3b": "...", "Q4": "...", "Q5": "...", "Q6": "...", "Q7": "...", "Q8": "...", "Q9": "...", "Q10": "...", "Q11": "...", "Q12": ... , "Q13": "...", "Q14": "...", "Q15": "..." },
    "cv_extract": { ... } | null
  },
  "generated_report": {
    "hook_insight": "...",
    "profile_interpretation": "...",
    "business_options": [
      { "business_model_id": "...", "title": "...", "what_is_being_sold": "...", "who_buys_it": "...", "why_credible_for_user": "...", "first_clients_path": "...", "pricing": "...", "what_makes_this_hard": "...", "what_could_go_wrong": "...", ... },
      ... up to 10 options ...
    ],
    "recommended_option_id": "...",
    "reframe_headline": "...",
    "key_skills_inventory": [ ... ],
    ... other fields per the canonical report schema ...
  }
}
```

The full canonical report schema is in `prompts/schemas/report-schema.ts`. Treat any field you find as in-scope; treat absent fields as not-evaluated rather than as failure.

---

## What to do

1. Read the full profile carefully. Note the most distinctive details: the Q3b employer specifics (sector, size, listed/PE/owner-managed, the specific role context), the Q6 achievement (the concrete proof point with numbers), the Q11 buyer-context (the specific sub-segment of buyers and how they buy), the Q12 prior independent experience (paid prior work or its absence), and the Q13 network shape.

2. Read the full generated report carefully. Pay particular attention to: `profile_interpretation`, `reframe_headline`, the `why_credible_for_user` and `first_clients_path` fields on the recommended option, and any passage that describes who the user is or why they specifically should pursue this work.

3. Apply the substitution test. Imagine a different real person at the same `Q1` job title, same `Q3a` sector, same `Q5` seniority, same `Q14` employment status, but with a different Q3b employer, a different Q6 achievement, a different Q11 buyer context, and a different Q13 network. Could the report still apply to them with no edits? Could it apply with only cosmetic edits (a name swap)? Or does it reference details that genuinely could not transfer?

4. Score on the 1-5 scale below.

5. Return a single JSON object with the score and a one-sentence justification that cites specific phrases or absences.

---

## Output schema (strict)

Respond with this JSON object only. No prose around it.

```json
{
  "score": <integer in [1, 2, 3, 4, 5]>,
  "justification": "<one sentence, max 240 chars, citing at least one specific phrase from the generated report and one specific Q3b/Q6/Q11/Q12/Q13 detail from the profile that the report did or did not reference>"
}
```

---

## Scoring guide

**5 — Unmistakably this user.**
The report references at least three of: a specific phrase or fact from Q3b (the employer detail), the Q6 achievement (with its proof point), the Q11 buyer sub-segment (named buyer type, not just sector), the Q12 prior independent experience (or its explicit absence shaping pacing), the Q13 network shape (warm-network density or its explicit absence). The `why_credible_for_user` and `first_clients_path` fields name concrete things from the profile, not categories. The report could not be given to a different person at the same job title without contradicting the source text.

**4 — Clearly this user, with one or two generic passages.**
Two or three of the Q3b/Q6/Q11/Q12/Q13 anchors are present and load-bearing. One or two report passages drift into category-level framing (e.g. "as a senior procurement professional…") but the recommended option and hook anchor on profile specifics.

**3 — Half-and-half.**
One Q3b/Q6/Q11 anchor is present, but the rest of the report reads as a generic template for this archetype. The `why_credible_for_user` field probably reads like a sector-generic credibility statement. A reader who knew nothing about the user would guess the right job title and sector but no specific facts about them.

**2 — Mostly generic.**
The report names the user's sector and seniority and stops there. No reference to the Q6 achievement, no reference to the Q3b employer specifics, no naming of the Q11 buyer sub-segment. The recommended-option write-up could be lifted into a different user's report at the same job title with at most a name change.

**1 — Could be written about a different user with the same job title without any edits.**
No profile-specific facts surface anywhere in the report. The output reads as if generated from `Q1` and `Q3a` alone. Possibly contradicts a profile detail (e.g. recommends building network when Q13 says network is the explicit constraint, or recommends Visibility-first when Q10 confidence and Q12 independent experience already justify Direct).

---

## Calibration notes

- A report that pads the `why_credible_for_user` field with profile-specifics but leaves the `first_clients_path` generic is a 3, not a 4. Specificity must reach the action layer, not just the narrative layer.
- A report that gets the Q3b employer specifics right but mis-frames the Q6 achievement (e.g. cites the user's £2.1m saving but attributes it to direct-procurement when Q6 says indirect) is still 3 or 4 — the right anchor is present even if used imprecisely. Note the mis-framing in the justification.
- The presence of `primary_archetype_id` in the report is not specificity. Two users with the same job title will land on the same archetype; specificity is about everything that distinguishes them within the archetype.
- If `cv_extract` is non-null and the profile is a `cv_questionnaire_contradiction` edge case (GP_008, GP_032), specificity should be judged against the questionnaire signal (the one the harness expects the pipeline to resolve toward), not the CV-flavoured framing. A report that mirrors the CV's framing rather than the questionnaire's is a specificity failure — score 2.
