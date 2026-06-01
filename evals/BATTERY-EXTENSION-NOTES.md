# Automated review battery — extension notes (2026-06-01)

Built off the AI product pre-pass (`admin/product-review/ai-prepass-2026-06-01.md`).
Goal: harden product quality with automated proxies before spending on human reviewers.

## Battery 1 — eval-harness extension (this drop)

### New files
- `evals/golden_dataset/edge_profiles.json` — 4 edge profiles targeting the pre-pass weak spots:
  - `EDGE_001` thin/no network (D9 graceful failure — the biggest substance risk)
  - `EDGE_002` non-UK user (UK-assumption leakage)
  - `EDGE_003` below-ICP experience floor (over-promise control)
  - `EDGE_004` blended/ambiguous archetype (classifier + rationale reasoning)
- `prompts/judges/judge-6-recommendation-rationale.md` — reasons-not-restates (catches the 773a2230 own-goal)
- `prompts/judges/judge-7-pricing-credibility.md` — option bands vs honest year-1 outlook
- `prompts/judges/judge-8-graceful-failure.md` — runs only on profiles with `edge_case_flags`

### To activate (run locally — needs OPENAI_API_KEY; ~£0.50 extra per run)
1. **Load the edge cohort.** In `evals/run_eval.ts` where `golden_dataset/profiles.json` is read, also read `edge_profiles.json` and concatenate (or pass `--dataset edge` to run only the edge cohort). The edge profiles use the same schema, plus new optional `expected_outputs` keys: `first_move_must_not_be_type`, `graceful_failure_expectations`, `rationale_must_reason_not_restate`.
2. **Register the 3 judges** in `evals/lib/judge_runner.ts` (mirror Judge 4/5 wiring) and in `evals/lib/types.ts` (add their result types). Judge 8 should be **skipped** when `profile.edge_case_flags` is empty.
3. **Renormalise `JUDGE_WEIGHTS`** in `types.ts` so all active judges sum to 1.0. Suggested starting weights (tune later): hook 0.26, specificity 0.16, realism 0.12, seniority 0.08, first-move 0.16, rationale(J6) 0.10, pricing-credibility(J7) 0.08, graceful-failure(J8) 0.04 (only averaged in for edge profiles).
4. **Recompute prompt hashes:** `./evals/recompute_prompt_hash.sh` (fills the `RECOMPUTE` placeholders in the new judge headers).
5. **First, grade the edge profiles' `expected_outputs`** — they're `graded_by: "pending"`. Review them (especially EDGE_001 `first_move_must_not_be_type` and the `graceful_failure_expectations`) and set `graded_by: "bevan"` before trusting the scores.

Run: `deno run -A evals/run_eval.ts` (full) or with the edge cohort flag once wired.

## Battery 2 — ChatGPT head-to-head (next)
Script that runs each profile's Q1–Q15 through (a) Solo's live pipeline and (b) a raw general-LLM prompt with no Solo scaffolding, then a judge scores both blind on the same rubric and reports Solo's win-rate. Tests the bible's Principle-4 moat claim with evidence. A hand-run sample is in the pre-pass follow-up.

## Battery 3 — deterministic quality linter (next; no LLM, runnable now)
Extends `lib/guardrails.ts` with report-level checks: rationale-restates-selection, option-band vs income-outlook mismatch, generic-language score, banned phrases, draft word counts. Runs against any stored report with zero LLM cost.

## Battery 4 — vision UX + trust audit (next)
Screenshot each live screen; a vision model scores clarity/hierarchy/trust/"would you pay" against usability heuristics. Proxy for the human UX review.

**Honest ceiling:** all four are proxies. They catch regressions and obvious failure and test relative claims cheaply. They cannot tell you if a real anxious person trusts Solo enough to pay, or whether the advice is wise in the live market. Those remain human questions — the battery just makes the eventual human review cheaper and sharper.
