# evals/

WP1 of the post-guidance programme. See `admin/wp1-eval-harness-design.md` v1.1 (signed off 2026-05-26) for the full design.

This directory holds the golden dataset, the harness scripts, and the run outputs.

## Structure

```
evals/
├── golden_dataset/
│   ├── profiles.json              ← 35 hand-graded synthetic profiles (LOCKED 2026-05-27, all graded_by: bevan)
│   └── schemas/
│       └── profile.schema.json    ← JSON schema for a profile
├── runs/                          ← gitignored; eval outputs land here
├── run_eval.ts                    ← harness CLI (drafted 2026-05-27)
├── diff_runs.ts                   ← prior-run diff utility (drafted 2026-05-27)
├── lib/                           ← supporting modules
│   ├── types.ts                   ← shared TS types
│   ├── concurrency.ts             ← Semaphore + parallel runner
│   ├── prompt_hash.ts             ← SHA-256 over prompts/ + version header parser
│   ├── openai_judge.ts            ← OpenAI client (gpt-4o, json_object, temp 0)
│   ├── judge_runner.ts            ← runs all 4 judges against one profile
│   ├── pipeline_runner.ts         ← calls live generate-report edge function
│   ├── baseline.ts                ← finds prior baseline + computes regressions
│   └── run_writer.ts              ← writes per_profile/ + summary.json
└── README.md                      ← this file
```

## Status

| Sub-PR | What | Status |
|---|---|---|
| A | Golden dataset (35 profiles, hand-graded) | **Closed 2026-05-27.** All 35 profiles locked as gold (`graded_by: "bevan"`, `graded_at: "2026-05-27"`) after Bevan's full-set review and bulk sign-off. Domain coverage: 14 of 14. Edge-case coverage: 7 of 7. Schema-valid against `schemas/profile.schema.json` (Draft 7). KB id uncertainty flags in grading_notes (ARCH_KEY_ACCT, ARCH_TREASURY, ARCH_HEALTH_REG, ARCH_STRAT_PARTNER and various BM_ ids) deferred to first eval-run: harness will report unknowns, then fix forward. |
| B | 4 judge prompt files under `prompts/judges/` | **Drafted 2026-05-27 — awaiting Bevan's review.** All four judges drafted: judge-1-specificity (weight 0.25), judge-2-realism (weight 0.20), judge-3-seniority-calibration (weight 0.15), judge-4-hook-insight-quality (weight 0.40 with bible §12 three-sub-score rubric + gold_must_not_be override). Header format aligned for sub-PR D's pre-commit hook. Output schemas strict JSON, ready for response_format wiring in sub-PR C. |
| C | `run_eval.ts` + `diff_runs.ts` | **Drafted 2026-05-27 — awaiting first live run.** `run_eval.ts` reads the locked golden dataset, calls live `generate-report` per profile in parallel (Semaphore at concurrency 6 default), runs all 4 judges via gpt-4o, writes `per_profile/<profile_id>.json` + `summary.json`, finds prior baseline by `prompt_hash`, flags regressions (Δ < -0.5 on weighted aggregate OR any judge drops ≥ 2). `diff_runs.ts` is the side-by-side comparator. Supporting modules in `lib/`: types, concurrency, prompt_hash, openai_judge, judge_runner, pipeline_runner, baseline, run_writer. v1 scope: `generate-report` only — `generate-plan` plugs in later. |
| D | Prompt versioning headers + `plans.prompt_versions` migration | **Foundation drafted 2026-05-27.** All 19 prompts now carry a header block with `prompt_hash` set by `evals/recompute_prompt_hash.{sh,py}` (idempotent). Aggregate hash: `0a5c927ddc7ded376ac43fb9398a95ce403f37a9da96aa9455e65937d4854ac3`. Migration at `supabase/migrations/20260527090000_wp1_add_prompt_versions_to_plans.sql` (in solo-path). Pre-commit hook at `.githooks/pre-commit` (in solo-path). Activation requires the topology decision in `admin/wp1-sub-pr-d-deliverables.md` §3 — migrate evals/ + prompts/ from iCloud Solo into solo-path so the hook fires on commit. Edge function wiring deferred to WP10 per design. |
| CI | `.github/workflows/eval-on-prompt-change.yml` (W1 dovetail) | Not started — depends on sub-PR D activation. |

## Profile drafting workflow

Per the WP1 sign-off (2026-05-26): Claude drafts each profile (Q1-Q15 + optional cv_extract + proposed expected_outputs). Bevan reviews + corrects the expected_outputs for each profile before they're locked as gold (`graded_by` flips from `pending` to `bevan` once locked).

The model never authors its own gold standard. Bevan's per-profile sign-off is the gating step.

## Per-profile review checklist (for Bevan)

When reviewing a profile, check:

1. **Questionnaire realism.** Does this read like a real person, with internal consistency across Q1-Q15? Any flag-raising contradictions?
2. **Archetype hint accuracy.** Does the profile actually point at the `archetype_hint` archetype? If not, fix the questionnaire or the hint.
3. **Expected_outputs `primary_archetype_id`.** Right ID, right label.
4. **Expected_outputs `hook_insight_must_reference`.** Each item should be specific to this profile. If you can imagine the hook insight referencing the item for a different profile too, sharpen it.
5. **Expected_outputs `hook_insight_must_not_be`.** Each item should be a failure mode you'd actually want the harness to catch. Generic enough to be a real risk; specific enough to be testable.
6. **`recommended_option_must_be_in`.** Replace placeholder model ids with actual KB ids if the proposed set doesn't exist.
7. **`commercially_distinctive_one_liner`.** Does it capture what makes this user different from a generalist version of their archetype?

Once you've reviewed: set `graded_by: "bevan"`, `graded_at: <today>`, add any `grading_notes`. Locked.
