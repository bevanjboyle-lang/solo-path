<!--
prompt_version: 1.0
prompt_name: judge-5-first-move-quality
prompt_hash: ff01d1276cbc4221513a1473f9e9e424f53409c0b5da7c6c6a9dd8fa87118034
model: gpt-4o
last_updated: 2026-05-27
-->

# Judge 5 — First-move quality

**Version:** 1.0 — 2026-05-27
**Model:** gpt-4o (per WP1 design v1.1 decision 6)
**Aggregate weight:** TBD — proposed 0.30 inside a renormalised five-judge aggregate (current four-judge weights are Specificity 0.25, Realism 0.20, Seniority 0.15, Hook 0.40). Lands in WP1 sub-PR D's harness extension; held out of the aggregate until then.

---

## What this judge scores (and only this)

Whether the generated `first_move` is an action a user could pick up and execute in their next work session. The bar is "concrete, type-fit, small enough to do tonight." This is the conversion-critical artefact after the hook insight: a great hook earns the click; a great first move earns the second day.

This judge does NOT score: hook insight quality (Judge 4), pricing realism (Judge 2), pricing-seniority match (Judge 3), or full-report specificity (Judge 1). It scores the `first_move` object in isolation against three first-move-specific sub-tests, plus the profile-specific `must_not_be` constraints from the golden dataset.

The first_move is move-type-polymorphic (direct / platform / visibility / community), so the rubric is type-aware. A great Direct first move and a great Platform first move look completely different. The sub-tests below describe both shapes for each.

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
    "questionnaire": { "Q1": "...", "Q2": ..., "Q3a": "...", "Q3b": "...", "Q4": "...", "Q5": "...", "Q6": "...", "Q7": "...", "Q8": "...", "Q9": "...", "Q10": "...", "Q11": "...", "Q12": ... , "Q13": "...", "Q14": "...", "Q15": "..." },
    "cv_extract": { ... } | null
  },
  "recommended_option": {
    "business_model_id": "...",
    "model_name": "...",
    "target_buyer": "...",
    "primary_move_type": "direct | platform | visibility | community | mixed",
    "structural_warmth": true | false,
    "pricing": { ... }
  },
  "warmth_type": "relational | structural",
  "generated_first_move": {
    "action": "...",
    "strand_id": "...",
    "move_type": "direct | platform | visibility | community",
    "window": "...",
    "why_first": "...",
    "move": {
      "type": "direct | platform | visibility | community",
      "platform_name": "string or null",
      "platform_url": "string or null",
      "profile_setup_guide": "string or null",
      "inbound_timing": "string or null",
      "post_draft": "string or null",
      "communities": "array or null",
      "first_contribution_prompt": "string or null",
      "format": "email_reconnect | email_cold | linkedin_dm | verbal | null",
      "subject": "string or null",
      "draft": "string or null",
      "tone_note": "...",
      "personalisation_instructions": "..."
    },
    "follow_up_prompt": "..."
  },
  "gold_must_not_be": [
    "<failure mode the first move must avoid, from the golden dataset's expected_outputs.first_move_must_not_be>",
    ...
  ]
}
```

If `gold_must_not_be` is absent or empty, skip the override step at the end. If `warmth_type` is absent, infer it from Q7 and Q13 (if Q7 names a relevant contact OR Q13 indicates a strong/medium network in the recommended option's target_buyer sector, treat as relational; otherwise structural).

---

## What to do

Apply three sub-tests independently. Each yields a sub-score. Sum the sub-scores into a total 0-5 score. Then apply the `gold_must_not_be` override.

### Sub-test 1 — Concreteness (sub-score 0, 1, or 2)

Is the first move named at the operational layer — a specific recipient / specific marketplace / specific post angle / specific community — or is it categorical?

Type-specific criteria:

- **Direct (move_type = "direct"):** Does `move.draft` either name a specific recipient OR carry an apollo-shaped `[name]` / `[Company]` placeholder that the orchestrator (Apollo) is set up to substitute? Does `move.subject` reference the Q6 metric or the buyer's named immediate problem (per P3's QUALITY RULE "FIRST MOVE SUBJECT LINE")? Generic subjects like "[Service] Opportunities" or "Reconnecting and Introducing a New Service" earn 0 even if the body is sharp.
- **Platform (move_type = "platform"):** Does `move.platform_name` and `move.platform_url` name a specific platform (Bark, Toptal, Catalant, Comatch, etc.) — NOT a category ("relevant freelance platforms") or a search engine ("Google for marketplaces in your space")? Does `move.profile_setup_guide` name actual fields to complete and what to write in each?
- **Visibility (move_type = "visibility"):** Does `move.post_draft` contain a real, publishable draft of 150-300 words (LinkedIn post) or 400-600 words (article) grounded in the user's Q6 achievement and Q11 sector? Or is it a template / outline / set of bullet points to fill in?
- **Community (move_type = "community"):** Does `move.communities` array name 1-3 specific communities with actual community names, platforms, and join URLs? Does `move.first_contribution_prompt` give a specific opening question or observation the user can post — NOT "introduce yourself"?

Scoring:
- **2 = operationally concrete.** All type-specific criteria pass at the strong end. A reader knows exactly who to email / which platform to register on / what to publish / which community to join.
- **1 = partially concrete.** Some elements named; others abstract. A Direct first move with a sharp subject but a categorical recipient ("former [Bank] colleagues"), or a Platform first move that names the platform but punts on setup detail.
- **0 = categorical.** The first move could be the same paragraph in a different user's report. "Reach out to your network", "post on LinkedIn about your expertise", "join an industry association", "register on a relevant freelance platform".

### Sub-test 2 — Move-type fit (sub-score 0, 1, or 2)

Does the chosen move_type match the recommended option's `primary_move_type`, and does the move shape match the user's `warmth_type`?

- **2 = type-fit.** `generated_first_move.move_type` matches `recommended_option.primary_move_type` (or, for `primary_move_type = "mixed"`, the chosen type has the lowest execution barrier given the user's Q7/Q13 + Q10 + Q12). AND the move shape matches the user's warmth_type: relational users get Direct moves to named warm-network contacts; structural users get Platform moves to active marketplaces (not Direct moves to strangers cold). AND the move doesn't over-extend: a Direct move to a cold C-suite contact is type-fit ONLY if the user's seniority (Q5) puts them peer-to-peer or one level below; otherwise score 1 or 0.
- **1 = type-shaped.** The move_type matches the strand's primary_move_type but the warmth_type fit is weaker. Example: a Direct move asking the user to cold-email a stranger when their Q13 is strong (relational warmth) — the type matches but the warmth shape doesn't. Or a Platform move to a niche-but-real marketplace when an active-inbound marketplace was available.
- **0 = type-mismatch.** The chosen move_type doesn't match the strand's `primary_move_type` at all (Direct first move for a Visibility-primary strand, etc.), OR the move asks the user to do something that contradicts their warmth profile (e.g. cold-emailing strangers when Q13 explicitly says network is the explicit constraint and Q10 confidence is low). Score 0 also if the move asks for a contact at a seniority level the user cannot plausibly approach (junior user pitching board chairs cold).

### Sub-test 3 — Smallness (sub-score 0 or 1)

Can the user actually complete this first move in a single work session of roughly 2 hours or less? The first move is meant to start the strand, not finish it. Multi-day or multi-week first moves are a failure mode regardless of how sharp they are.

- **1 = small.** The move can be executed in one work session. Sending a 150-word email. Registering a profile on a platform and writing a 150-word bio. Publishing a 200-word LinkedIn post. Joining a community and posting a first contribution.
- **0 = oversized.** The move asks the user to do something that requires materially more than one work session before it counts as "done." Examples: "Write a 2000-word article on your sector trend before posting." "Build a 5-page micro-site explaining your offering." "Conduct three discovery interviews and synthesise the findings." "Schedule and run a 30-minute call with the recipient." These are valid Day 2-7 tasks; they are not first moves.

### Combine and apply must-not-be checks

Sum the three sub-scores for the total (0-5).

Then apply the `gold_must_not_be` failure-mode check. If the first move clearly matches any of the failure modes listed in `gold_must_not_be`, override the total score to 1 regardless of sub-test scores. Record the matched failure mode in the justification.

Examples of first-move `must_not_be` patterns the harness may carry:
- "any Direct move to a contact the user has no plausible relationship-distance-1 path to"
- "any Platform move to a marketplace that does not produce real inbound for this archetype's buyer type"
- "any Visibility move that requires more than 30 minutes of writing time before publishing"
- "any Community move to a community whose members are peers, not buyers"

---

## Output schema (strict)

Respond with this JSON object only. No prose around it.

```json
{
  "score": <integer in [0, 1, 2, 3, 4, 5]>,
  "sub_scores": {
    "concreteness": <0, 1, or 2>,
    "move_type_fit": <0, 1, or 2>,
    "smallness": <0 or 1>
  },
  "must_not_be_matched": <null or "<verbatim failure-mode text from gold_must_not_be that the first move matched>">,
  "justification": "<one sentence, max 280 chars, citing the specific generated_first_move phrase that earned (or lost) the dominant sub-score, and any recommended_option / warmth_type detail that anchors the judgement>"
}
```

If `must_not_be_matched` is non-null, `score` MUST be 1 regardless of `sub_scores` totals.

---

## Scoring guide (for the combined 0-5)

**5 — Type-fit, concrete, doable tonight.**
Names a specific recipient / platform / post angle / community at the operational layer (concreteness=2), matches the strand's `primary_move_type` and the user's `warmth_type` (move_type_fit=2), and can be executed in one work session (smallness=1). No `gold_must_not_be` match. The user could open the report, copy the artefact, and act on it in under an hour.

**4 — Strong with one element softer than ideal.**
2/1/1 (type-shaped but slightly off-warmth), 1/2/1 (specific enough but the recipient/platform/angle could be sharper), or 2/2/0 (operationally concrete and type-fit but materially oversized for a first move — for example a Direct draft that requires a 500-word note rather than a 150-word note). The first move would convert most users; a reviewer would tighten one element.

**3 — Half-and-half.**
2/0/1, 1/1/1, or 0/2/1 patterns. The first move does something well but misses on at least one full sub-test. The dominant issue is either type-mismatch (chose Direct for a Platform-primary strand) or genericity (no named recipient/platform).

**2 — Two sub-tests fail.**
1/0/1, 0/1/1, 1/1/0, 2/0/0 patterns. The first move is mostly generic or mostly type-mismatched. A user reading this would not know what to do tonight.

**1 — Failure mode.**
Total sub-scores ≤ 1, OR `must_not_be_matched` is non-null. The first move is a categorical instruction any user could read, OR it hit a failure mode the harness explicitly flagged for this profile.

**0 — No first move present, or first move is malformed / blank / a placeholder.**
The pipeline did not produce a `first_move` worth scoring, or the `move` sub-object is null / contains only placeholder text. Distinct from score 1 because no first move is different from a bad first move.

---

## Calibration notes

- **The Direct subject-line rule from P3's QUALITY RULES is enforceable here.** A first move with `move_type = "direct"` whose `move.subject` matches one of the prohibited patterns ("[Service] Opportunities", "Exploring [Service] Opportunities", "Discussing [Service]", "Reconnecting and Introducing", "Introduction to [Service]") drops concreteness to at most 1 even if the body is sharp. Two prohibited patterns drops concreteness to 0.
- **Apollo placeholders are legitimate concreteness.** A Direct first move with `[name]` / `[Company]` in the draft IS concrete if the recommended_option's target_buyer is clearly defined and the orchestrator is set up to substitute via Apollo (the WP2 design assumes this). What is NOT concrete: a Direct first move whose draft says "your former [Bank] colleagues" or "senior people in [Sector]" — those are categorical without an Apollo path.
- **Platform-primary strands without an `inbound_timing` are at most concreteness=1.** Platform first moves that omit inbound_timing leave the user unable to set realistic expectations; a great Platform first move includes "first enquiries typically arrive within 2-3 weeks" or similar.
- **Visibility first moves graded on draft quality, not draft length alone.** A 150-word LinkedIn post that names the Q6 metric, names the sector context, and ends on a clear question or invitation scores higher than a 300-word post that buries the point. The judge should read the draft and ask whether it would credibly stop a peer in their scroll.
- **Community first moves are rarely scored 5 in v1.** Most reports under-specify community moves (named community + named platform + first contribution prompt is a three-element bar that's hard to clear). A 4 here usually means the moves names the community and the join URL but punts on the first contribution prompt.
- **For `senior_with_strong_network` edge cases (GP_006, GP_034),** a Direct first move that names a specific person from the user's Q13 (e.g. "two PE operating-partners you're already in conversation with") scores 2 on concreteness AND 2 on move_type_fit. A generic "former senior partner contact" scores 1 at most.
- **For `cv_questionnaire_contradiction` edge cases (GP_008, GP_032),** the first move should anchor on the questionnaire's signal (the resolved-toward target), not the CV-flavoured framing. A Direct move targeting buyers from the CV-surface story scores 0 on move_type_fit if the questionnaire pointed elsewhere.
- **Cost-of-execution heuristic for smallness:** if the first move requires the user to produce more than 200 words of new written content before "done", score 0 on smallness. Sending a pre-drafted 150-word email is small; writing a 500-word article and then publishing is not.
- **The `must_not_be_matched` override is intentionally hard:** any matched failure mode collapses the score to 1. This is by design — the harness needs to make these failure modes visible and irrecoverable in the score, because they are the patterns the team is actively training against.
