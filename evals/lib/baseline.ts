// evals/lib/baseline.ts
//
// Locates the prior baseline run for a given prompt_hash. The baseline is
// the most recent run on `main` with the same prompt_hash. If no prior run
// exists, the current run becomes the baseline.
//
// Baseline runs are recognised by their summary.json having `is_baseline: true`
// or by being the only / latest run for that hash.
//
// Run-directory layout: evals/runs/<ISO-ish-timestamp>_<prompt-hash-short>/
//   ├── summary.json
//   └── per_profile/
//       └── <profile_id>.json

import { join } from "https://deno.land/std@0.220.0/path/mod.ts";
import type { AggregateScores, RegressionFlag, RunSummary } from "./types.ts";

export async function listRunDirs(runsRoot: string): Promise<string[]> {
  try {
    const out: string[] = [];
    for await (const entry of Deno.readDir(runsRoot)) {
      if (entry.isDirectory) out.push(entry.name);
    }
    out.sort(); // ISO timestamps sort chronologically
    return out;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return [];
    throw e;
  }
}

export async function readSummary(runsRoot: string, runDir: string): Promise<RunSummary | null> {
  try {
    const path = join(runsRoot, runDir, "summary.json");
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as RunSummary;
  } catch {
    return null;
  }
}

/**
 * Finds the most recent prior run with the same prompt_hash (excluding the
 * current run_id). Returns null if no prior run exists.
 */
export async function findBaseline(
  runsRoot: string,
  prompt_hash: string,
  current_run_id: string,
): Promise<RunSummary | null> {
  const dirs = await listRunDirs(runsRoot);
  // Iterate newest first.
  for (let i = dirs.length - 1; i >= 0; i--) {
    if (dirs[i] === current_run_id) continue;
    const summary = await readSummary(runsRoot, dirs[i]);
    if (summary && summary.prompt_hash === prompt_hash) return summary;
  }
  return null;
}

/**
 * Computes per-profile regression flags vs a baseline.
 *
 * Regression rule (per WP1 design v1.1 §Sub-PR C "Baseline + diff logic"):
 *   - delta < -0.5 on weighted aggregate, OR
 *   - any individual judge score drops by 2 or more
 */
export function computeRegressions(
  currentPerProfile: Record<string, number>,
  currentPerJudge: Record<string, AggregateScores>, // keyed by profile_id
  baseline: RunSummary,
): RegressionFlag[] {
  const flags: RegressionFlag[] = [];
  const baseProfileAgg = baseline.per_profile_aggregates ?? {};

  for (const [profile_id, currentScore] of Object.entries(currentPerProfile)) {
    const priorScore = baseProfileAgg[profile_id];
    if (priorScore === undefined) continue; // new profile vs baseline
    const delta = currentScore - priorScore;

    const perJudgeDeltas: Partial<Record<keyof AggregateScores, number>> = {};
    const currentJudges = currentPerJudge[profile_id];
    const baseJudges = (baseline as RunSummary & { per_profile_judges?: Record<string, AggregateScores> })
      .per_profile_judges?.[profile_id];

    let bigPerJudgeDrop = false;
    if (currentJudges && baseJudges) {
      (Object.keys(currentJudges) as Array<keyof AggregateScores>).forEach((k) => {
        const d = currentJudges[k] - baseJudges[k];
        perJudgeDeltas[k] = d;
        if (d <= -2) bigPerJudgeDrop = true;
      });
    }

    const aggregateRegressed = delta < -0.5;
    if (aggregateRegressed || bigPerJudgeDrop) {
      const reasons: string[] = [];
      if (aggregateRegressed) reasons.push(`aggregate delta ${delta.toFixed(2)} < -0.5`);
      if (bigPerJudgeDrop) reasons.push("per-judge drop ≥ 2");
      flags.push({
        profile_id,
        reason: reasons.join("; "),
        prior_score: priorScore,
        current_score: currentScore,
        delta: Math.round(delta * 1000) / 1000,
        per_judge_deltas: perJudgeDeltas,
      });
    }
  }

  return flags;
}
