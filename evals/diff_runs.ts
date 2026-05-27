#!/usr/bin/env -S deno run --allow-all
//
// evals/diff_runs.ts
//
// Compares two eval runs side-by-side. Produces a markdown report listing
// per-profile aggregate deltas, per-judge deltas, and any regressions.
//
// Usage:
//   deno run --allow-all evals/diff_runs.ts <run_id_a> <run_id_b> [--out evals/runs]
//
// Example:
//   deno run --allow-all evals/diff_runs.ts \
//     2026-05-27T120000Z_a1b2c3d4 \
//     2026-05-27T160000Z_e5f6g7h8

import { parseArgs } from "https://deno.land/std@0.220.0/cli/parse_args.ts";
import { join } from "https://deno.land/std@0.220.0/path/mod.ts";
import type { AggregateScores, RunSummary } from "./lib/types.ts";

interface DiffArgs {
  run_a_id: string;
  run_b_id: string;
  runs_root: string;
}

function parseCliArgs(): DiffArgs {
  const parsed = parseArgs(Deno.args, {
    string: ["out"],
    default: { out: "evals/runs" },
  });
  const positional = parsed._.map(String);
  if (positional.length < 2) {
    console.error("Usage: deno run --allow-all evals/diff_runs.ts <run_id_a> <run_id_b> [--out evals/runs]");
    Deno.exit(2);
  }
  return {
    run_a_id: positional[0],
    run_b_id: positional[1],
    runs_root: String(parsed.out),
  };
}

async function readSummary(runsRoot: string, runId: string): Promise<RunSummary> {
  const path = join(runsRoot, runId, "summary.json");
  const text = await Deno.readTextFile(path);
  return JSON.parse(text) as RunSummary;
}

function fmtScore(x: number): string {
  return x.toFixed(3);
}

function fmtDelta(d: number): string {
  if (d === 0) return "0.000";
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(3)}`;
}

function arrowFor(d: number): string {
  if (d <= -0.5) return "🔻"; // regression threshold
  if (d < 0) return "↓";
  if (d === 0) return "·";
  if (d >= 0.5) return "🔺";
  return "↑";
}

async function main() {
  const args = parseCliArgs();
  const a = await readSummary(args.runs_root, args.run_a_id);
  const b = await readSummary(args.runs_root, args.run_b_id);

  console.log(`# Run diff: ${args.run_a_id} → ${args.run_b_id}\n`);
  console.log(`- prompt_hash A: ${a.prompt_hash}`);
  console.log(`- prompt_hash B: ${b.prompt_hash}`);
  console.log(`- profiles A: ${a.profile_count} (ok=${a.successful_profiles}, fail=${a.failed_profiles})`);
  console.log(`- profiles B: ${b.profile_count} (ok=${b.successful_profiles}, fail=${b.failed_profiles})`);
  console.log(`- cost A: £${a.cost_estimate_gbp.toFixed(2)}`);
  console.log(`- cost B: £${b.cost_estimate_gbp.toFixed(2)}\n`);

  // -------------------------------
  // Per-judge averages
  // -------------------------------
  console.log(`## Per-judge averages\n`);
  console.log(`| Judge | A | B | Δ |`);
  console.log(`|---|---:|---:|---:|`);
  (Object.keys(a.per_judge_averages) as Array<keyof AggregateScores>).forEach((k) => {
    const av = a.per_judge_averages[k];
    const bv = b.per_judge_averages[k];
    const d = bv - av;
    console.log(`| ${k} | ${fmtScore(av)} | ${fmtScore(bv)} | ${fmtDelta(d)} ${arrowFor(d)} |`);
  });
  console.log();

  // -------------------------------
  // Per-domain rollup
  // -------------------------------
  console.log(`## Per-domain weighted-aggregate\n`);
  console.log(`| Domain | A | B | Δ |`);
  console.log(`|---|---:|---:|---:|`);
  const allDomains = Array.from(
    new Set([...Object.keys(a.per_domain_averages), ...Object.keys(b.per_domain_averages)]),
  ).sort();
  allDomains.forEach((d) => {
    const av = a.per_domain_averages[d]?.weighted_aggregate ?? NaN;
    const bv = b.per_domain_averages[d]?.weighted_aggregate ?? NaN;
    if (Number.isNaN(av) || Number.isNaN(bv)) {
      console.log(`| ${d} | ${Number.isNaN(av) ? "—" : fmtScore(av)} | ${Number.isNaN(bv) ? "—" : fmtScore(bv)} | n/a |`);
      return;
    }
    const delta = bv - av;
    console.log(`| ${d} | ${fmtScore(av)} | ${fmtScore(bv)} | ${fmtDelta(delta)} ${arrowFor(delta)} |`);
  });
  console.log();

  // -------------------------------
  // Per-edge-case rollup
  // -------------------------------
  console.log(`## Per-edge-case weighted-aggregate\n`);
  console.log(`| Edge case | A | B | Δ |`);
  console.log(`|---|---:|---:|---:|`);
  const allEdgeCases = Array.from(
    new Set([...Object.keys(a.per_edge_case_averages), ...Object.keys(b.per_edge_case_averages)]),
  ).sort();
  allEdgeCases.forEach((ec) => {
    const av = a.per_edge_case_averages[ec]?.weighted_aggregate ?? NaN;
    const bv = b.per_edge_case_averages[ec]?.weighted_aggregate ?? NaN;
    if (Number.isNaN(av) || Number.isNaN(bv)) {
      console.log(`| ${ec} | ${Number.isNaN(av) ? "—" : fmtScore(av)} | ${Number.isNaN(bv) ? "—" : fmtScore(bv)} | n/a |`);
      return;
    }
    const delta = bv - av;
    console.log(`| ${ec} | ${fmtScore(av)} | ${fmtScore(bv)} | ${fmtDelta(delta)} ${arrowFor(delta)} |`);
  });
  console.log();

  // -------------------------------
  // Per-profile aggregate deltas (sorted by largest regression first)
  // -------------------------------
  console.log(`## Per-profile aggregate deltas (sorted by largest regression first)\n`);
  console.log(`| Profile | A | B | Δ |`);
  console.log(`|---|---:|---:|---:|`);
  const allProfiles = Array.from(
    new Set([...Object.keys(a.per_profile_aggregates), ...Object.keys(b.per_profile_aggregates)]),
  );
  const rows = allProfiles.map((pid) => {
    const av = a.per_profile_aggregates[pid] ?? NaN;
    const bv = b.per_profile_aggregates[pid] ?? NaN;
    const d = !Number.isNaN(av) && !Number.isNaN(bv) ? bv - av : NaN;
    return { pid, av, bv, d };
  });
  rows.sort((x, y) => {
    if (Number.isNaN(x.d)) return 1;
    if (Number.isNaN(y.d)) return -1;
    return x.d - y.d;
  });
  rows.forEach((r) => {
    if (Number.isNaN(r.d)) {
      console.log(`| ${r.pid} | ${Number.isNaN(r.av) ? "—" : fmtScore(r.av)} | ${Number.isNaN(r.bv) ? "—" : fmtScore(r.bv)} | n/a |`);
    } else {
      console.log(`| ${r.pid} | ${fmtScore(r.av)} | ${fmtScore(r.bv)} | ${fmtDelta(r.d)} ${arrowFor(r.d)} |`);
    }
  });
  console.log();

  // -------------------------------
  // Run B regressions section (carried from B's summary)
  // -------------------------------
  if (b.flagged_regressions && b.flagged_regressions.length > 0) {
    console.log(`## Run B flagged regressions vs its own baseline\n`);
    b.flagged_regressions.forEach((r) => {
      console.log(`- **${r.profile_id}** — ${r.reason}; prior ${fmtScore(r.prior_score)} → current ${fmtScore(r.current_score)} (Δ ${fmtDelta(r.delta)})`);
    });
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("[diff_runs] FATAL:", e instanceof Error ? e.stack : e);
    Deno.exit(3);
  });
}
