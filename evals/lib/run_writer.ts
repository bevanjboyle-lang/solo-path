// evals/lib/run_writer.ts
//
// Writes the run output directory: per_profile/<profile_id>.json files plus
// summary.json at the root.

import { ensureDir } from "https://deno.land/std@0.220.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.220.0/path/mod.ts";
import type { ProfileRunResult, RunSummary } from "./types.ts";

export async function writeProfileResult(
  runsRoot: string,
  run_id: string,
  result: ProfileRunResult,
): Promise<void> {
  const dir = join(runsRoot, run_id, "per_profile");
  await ensureDir(dir);
  const path = join(dir, `${result.profile_id}.json`);
  await Deno.writeTextFile(path, JSON.stringify(result, null, 2));
}

export async function writeSummary(runsRoot: string, run_id: string, summary: RunSummary): Promise<void> {
  const dir = join(runsRoot, run_id);
  await ensureDir(dir);
  const path = join(dir, "summary.json");
  await Deno.writeTextFile(path, JSON.stringify(summary, null, 2));
}

/**
 * Build a stable run_id from started_at + short prompt_hash.
 * Format: YYYY-MM-DDTHHMMSSZ_<first-8-of-hash>
 */
export function buildRunId(started_at: Date, prompt_hash: string): string {
  const iso = started_at.toISOString();
  // 2026-05-27T12:34:56.789Z → 2026-05-27T123456Z
  const compact = iso.slice(0, 19).replace(/[:]/g, "") + "Z";
  return `${compact}_${prompt_hash.slice(0, 8)}`;
}
