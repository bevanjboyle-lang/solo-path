#!/usr/bin/env -S deno run --allow-all
//
// evals/run_eval.ts
//
// Main entry for the WP1 eval harness. Reads the golden dataset, calls the
// live generate-report edge function for each profile, runs the 4 judges
// against each report, writes per_profile/ + summary.json, and flags
// regressions against the prior baseline for the same prompt_hash.
//
// Usage:
//   deno run --allow-all evals/run_eval.ts \
//     [--prompt-hash <hash>] \
//     [--profiles GP_001,GP_002,...] \
//     [--concurrency 6] \
//     [--out evals/runs] \
//     [--dry-run] \
//     [--baseline-run-id <run_id>]
//
// Required env vars:
//   SUPABASE_URL                 (default: https://dnnxmjazillhktwttkux.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY
//   OPENAI_API_KEY
//
// Optional env vars:
//   OPENAI_JUDGE_MODEL           (default: gpt-4o-2024-08-06)
//   GOLDEN_DATASET_PATH          (default: evals/golden_dataset/profiles.json)
//   JUDGES_DIR                   (default: prompts/judges)
//   PROMPTS_DIR                  (default: prompts)

import { parseArgs } from "https://deno.land/std@0.220.0/cli/parse_args.ts";
import { join } from "https://deno.land/std@0.220.0/path/mod.ts";

import { runWithConcurrency } from "./lib/concurrency.ts";
import { computePromptHash, readPromptVersions } from "./lib/prompt_hash.ts";
import { runPipelineForProfile } from "./lib/pipeline_runner.ts";
import { computeAggregate, runAllJudges } from "./lib/judge_runner.ts";
import { computeRegressions, findBaseline } from "./lib/baseline.ts";
import { buildRunId, writeProfileResult, writeSummary } from "./lib/run_writer.ts";
import type {
  AggregateScores,
  EdgeCaseFlag,
  Profile,
  ProfileRunResult,
  RunEvalArgs,
  RunSummary,
} from "./lib/types.ts";

// -----------------------------------------------------------------------------
// CLI parsing + env
// -----------------------------------------------------------------------------

function parseCliArgs(): RunEvalArgs {
  const parsed = parseArgs(Deno.args, {
    string: ["prompt-hash", "profiles", "out", "baseline-run-id"],
    boolean: ["dry-run"],
    default: {
      // Concurrency 3 keeps OpenAI judge calls under the default 30k TPM cap.
      // Each profile fans out 4 parallel judge calls × ~4k tokens each.
      // 3 × 4 × 4k ≈ 48k tokens at peak (still over 30k but the burst
      // averages out; combined with 429 retry-with-backoff in openai_judge.ts
      // this lands inside the bucket reliably). Raise to 6 once your OpenAI
      // tier supports higher TPM.
      concurrency: 3,
      out: "evals/runs",
    },
  });

  const supabase_url = Deno.env.get("SUPABASE_URL") ?? "https://dnnxmjazillhktwttkux.supabase.co";
  const supabase_service_role_key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openai_api_key = Deno.env.get("OPENAI_API_KEY") ?? "";
  const openai_judge_model = Deno.env.get("OPENAI_JUDGE_MODEL") ?? "gpt-4o-2024-08-06";
  const golden_dataset_path = Deno.env.get("GOLDEN_DATASET_PATH") ?? "evals/golden_dataset/profiles.json";
  const judges_dir = Deno.env.get("JUDGES_DIR") ?? "prompts/judges";

  if (!supabase_service_role_key) {
    console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY env var is required.");
    Deno.exit(2);
  }
  if (!openai_api_key) {
    console.error("FATAL: OPENAI_API_KEY env var is required.");
    Deno.exit(2);
  }

  return {
    prompt_hash: typeof parsed["prompt-hash"] === "string" ? parsed["prompt-hash"] : undefined,
    profiles: typeof parsed.profiles === "string" ? parsed.profiles.split(",").map((s: string) => s.trim()) : undefined,
    concurrency: Number(parsed.concurrency) || 6,
    out_dir: String(parsed.out),
    golden_dataset_path,
    judges_dir,
    supabase_url,
    supabase_service_role_key,
    openai_api_key,
    openai_judge_model,
    dry_run: Boolean(parsed["dry-run"]),
    baseline_run_id: typeof parsed["baseline-run-id"] === "string" ? parsed["baseline-run-id"] : undefined,
  };
}

// -----------------------------------------------------------------------------
// Golden dataset loader
// -----------------------------------------------------------------------------

async function loadProfiles(path: string, subset?: string[]): Promise<Profile[]> {
  const text = await Deno.readTextFile(path);
  const all = JSON.parse(text) as Profile[];
  if (subset && subset.length > 0) {
    const set = new Set(subset);
    const matched = all.filter((p) => set.has(p.profile_id));
    if (matched.length !== subset.length) {
      const found = new Set(matched.map((p) => p.profile_id));
      const missing = subset.filter((id) => !found.has(id));
      console.warn(`WARNING: requested profile_ids not in dataset: ${missing.join(", ")}`);
    }
    return matched;
  }
  return all;
}

// -----------------------------------------------------------------------------
// Per-profile execution
// -----------------------------------------------------------------------------

async function runOneProfile(
  profile: Profile,
  args: RunEvalArgs,
  run_id: string,
): Promise<ProfileRunResult> {
  // 1. Call the production pipeline.
  let pipelineOutput;
  try {
    pipelineOutput = await runPipelineForProfile({
      profile,
      supabase_url: args.supabase_url,
      supabase_service_role_key: args.supabase_service_role_key,
      // client_session_id auto-generated per profile inside pipeline_runner.
      // run_id is captured at the run-level for filename / summary only.
    });
  } catch (e) {
    return {
      profile_id: profile.profile_id,
      profile_label: profile.label,
      domain: profile.domain,
      edge_case_flags: profile.edge_case_flags,
      expected_outputs: profile.expected_outputs,
      pipeline_output: {
        generated_report: {},
        raw_response: null,
        duration_ms: 0,
      },
      judge_results: emptyJudges(),
      aggregate: { specificity: 0, realism: 0, seniority_calibration: 0, hook_insight_quality: 0, weighted_aggregate: 0 },
      pipeline_error: e instanceof Error ? e.message : String(e),
    };
  }

  // 2. Run all four judges in parallel.
  const judge_errors: Record<string, string> = {};
  let judges;
  try {
    judges = await runAllJudges({
      profile,
      generated_report: pipelineOutput.generated_report,
      openai_api_key: args.openai_api_key,
      openai_judge_model: args.openai_judge_model,
      judges_dir: args.judges_dir,
    });
  } catch (e) {
    judge_errors["all_judges"] = e instanceof Error ? e.message : String(e);
    return {
      profile_id: profile.profile_id,
      profile_label: profile.label,
      domain: profile.domain,
      edge_case_flags: profile.edge_case_flags,
      expected_outputs: profile.expected_outputs,
      pipeline_output: pipelineOutput,
      judge_results: emptyJudges(),
      aggregate: { specificity: 0, realism: 0, seniority_calibration: 0, hook_insight_quality: 0, weighted_aggregate: 0 },
      judge_errors,
    };
  }

  const aggregate = computeAggregate(judges);

  return {
    profile_id: profile.profile_id,
    profile_label: profile.label,
    domain: profile.domain,
    edge_case_flags: profile.edge_case_flags,
    expected_outputs: profile.expected_outputs,
    pipeline_output: pipelineOutput,
    judge_results: {
      specificity: judges.specificity,
      realism: judges.realism,
      seniority_calibration: judges.seniority_calibration,
      hook_insight_quality: judges.hook_insight_quality,
    },
    aggregate,
  };
}

function emptyJudges(): ProfileRunResult["judge_results"] {
  const empty = { judge_name: "specificity" as const, score: 1 as const, justification: "", raw_response: "", cost_estimate_gbp: 0, duration_ms: 0 };
  return {
    specificity: { ...empty, judge_name: "specificity" },
    realism: { ...empty, judge_name: "realism" },
    seniority_calibration: { ...empty, judge_name: "seniority_calibration" },
    hook_insight_quality: {
      judge_name: "hook_insight_quality",
      score: 0,
      sub_scores: { non_obvious: 0, execution_critical: 0, profile_specific: 0 },
      must_not_be_matched: null,
      justification: "",
      raw_response: "",
      cost_estimate_gbp: 0,
      duration_ms: 0,
    },
  };
}

// -----------------------------------------------------------------------------
// Aggregation
// -----------------------------------------------------------------------------

function averageAggregates(items: AggregateScores[]): AggregateScores {
  if (items.length === 0) {
    return { specificity: 0, realism: 0, seniority_calibration: 0, hook_insight_quality: 0, weighted_aggregate: 0 };
  }
  const sum = items.reduce<AggregateScores>(
    (acc, x) => ({
      specificity: acc.specificity + x.specificity,
      realism: acc.realism + x.realism,
      seniority_calibration: acc.seniority_calibration + x.seniority_calibration,
      hook_insight_quality: acc.hook_insight_quality + x.hook_insight_quality,
      weighted_aggregate: acc.weighted_aggregate + x.weighted_aggregate,
    }),
    { specificity: 0, realism: 0, seniority_calibration: 0, hook_insight_quality: 0, weighted_aggregate: 0 },
  );
  const n = items.length;
  return {
    specificity: round(sum.specificity / n),
    realism: round(sum.realism / n),
    seniority_calibration: round(sum.seniority_calibration / n),
    hook_insight_quality: round(sum.hook_insight_quality / n),
    weighted_aggregate: round(sum.weighted_aggregate / n),
  };
}

const round = (x: number) => Math.round(x * 1000) / 1000;

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const args = parseCliArgs();
  const started_at = new Date();

  // 1. Determine prompt_hash.
  const prompt_hash = args.prompt_hash ?? (await computePromptHash(Deno.env.get("PROMPTS_DIR") ?? "prompts"));
  const prompt_versions = await readPromptVersions(Deno.env.get("PROMPTS_DIR") ?? "prompts");
  const run_id = buildRunId(started_at, prompt_hash);
  console.log(`[run_eval] run_id=${run_id} prompt_hash=${prompt_hash}`);

  // 2. Load profiles.
  const profiles = await loadProfiles(args.golden_dataset_path, args.profiles);
  console.log(`[run_eval] ${profiles.length} profile(s) to run with concurrency=${args.concurrency}`);

  if (args.dry_run) {
    console.log(`[run_eval] DRY RUN — would execute the following:`);
    profiles.forEach((p) => console.log(`  - ${p.profile_id}: ${p.label}`));
    Deno.exit(0);
  }

  // 3. Run in parallel with concurrency limit.
  const results = await runWithConcurrency(profiles, args.concurrency, async (p) => {
    console.log(`[run_eval] starting ${p.profile_id}`);
    const out = await runOneProfile(p, args, run_id);
    const status = out.pipeline_error ? `pipeline_error` : out.judge_errors ? `judge_error` : `agg=${out.aggregate.weighted_aggregate}`;
    console.log(`[run_eval] finished ${p.profile_id} → ${status}`);
    await writeProfileResult(args.out_dir, run_id, out);
    return out;
  });

  // 4. Build summary.
  const ok: ProfileRunResult[] = [];
  const fail: ProfileRunResult[] = [];
  results.forEach((r) => {
    if (r.ok) {
      if (r.value.pipeline_error || r.value.judge_errors) fail.push(r.value);
      else ok.push(r.value);
    } else {
      // Shouldn't happen — runOneProfile catches its own errors — but defensively log.
      console.error(`[run_eval] unhandled error: ${r.error.message}`);
    }
  });

  const ended_at = new Date();
  const total_duration_ms = ended_at.getTime() - started_at.getTime();

  const per_profile_aggregates: Record<string, number> = {};
  const per_profile_judges: Record<string, AggregateScores> = {};
  ok.forEach((r) => {
    per_profile_aggregates[r.profile_id] = r.aggregate.weighted_aggregate;
    per_profile_judges[r.profile_id] = r.aggregate;
  });

  const per_judge_averages = averageAggregates(ok.map((r) => r.aggregate));

  // Per-domain rollup
  const byDomain = new Map<string, AggregateScores[]>();
  ok.forEach((r) => {
    if (!byDomain.has(r.domain)) byDomain.set(r.domain, []);
    byDomain.get(r.domain)!.push(r.aggregate);
  });
  const per_domain_averages: Record<string, AggregateScores> = {};
  byDomain.forEach((aggs, domain) => {
    per_domain_averages[domain] = averageAggregates(aggs);
  });

  // Per-edge-case rollup (one flag may belong to multiple profiles)
  const byEdgeCase = new Map<EdgeCaseFlag, AggregateScores[]>();
  ok.forEach((r) => {
    r.edge_case_flags.forEach((f) => {
      if (!byEdgeCase.has(f)) byEdgeCase.set(f, []);
      byEdgeCase.get(f)!.push(r.aggregate);
    });
  });
  const per_edge_case_averages: Record<string, AggregateScores> = {};
  byEdgeCase.forEach((aggs, flag) => {
    per_edge_case_averages[flag] = averageAggregates(aggs);
  });

  // Cost estimate sums.
  const cost_estimate_gbp = ok.reduce(
    (acc, r) =>
      acc +
      (r.judge_results.specificity.cost_estimate_gbp +
        r.judge_results.realism.cost_estimate_gbp +
        r.judge_results.seniority_calibration.cost_estimate_gbp +
        r.judge_results.hook_insight_quality.cost_estimate_gbp),
    0,
  );

  // 5. Baseline + regressions.
  const baseline = args.baseline_run_id
    ? await readSummaryById(args.out_dir, args.baseline_run_id)
    : await findBaseline(args.out_dir, prompt_hash, run_id);
  const flagged_regressions = baseline
    ? computeRegressions(per_profile_aggregates, per_profile_judges, baseline)
    : [];
  const is_baseline = baseline === null;

  const summary: RunSummary = {
    run_id,
    started_at: started_at.toISOString(),
    ended_at: ended_at.toISOString(),
    total_duration_ms,
    prompt_hash,
    prompt_versions,
    profile_count: profiles.length,
    successful_profiles: ok.length,
    failed_profiles: fail.length,
    concurrency: args.concurrency,
    cost_estimate_gbp: round(cost_estimate_gbp),
    per_judge_averages,
    per_domain_averages,
    per_edge_case_averages,
    per_profile_aggregates,
    baseline_run_id: baseline?.run_id ?? null,
    flagged_regressions,
    is_baseline,
  };

  // Augment with per_profile_judges so downstream baseline diffs have what they need.
  (summary as RunSummary & { per_profile_judges: Record<string, AggregateScores> }).per_profile_judges = per_profile_judges;

  await writeSummary(args.out_dir, run_id, summary);

  // 6. Print summary line + regressions to stdout for CI consumption.
  console.log("---");
  console.log(`[run_eval] DONE in ${(total_duration_ms / 1000).toFixed(1)}s`);
  console.log(`[run_eval] ok=${ok.length} fail=${fail.length}`);
  console.log(`[run_eval] weighted aggregate average: ${per_judge_averages.weighted_aggregate}`);
  console.log(`[run_eval] cost estimate: £${cost_estimate_gbp.toFixed(2)}`);
  console.log(`[run_eval] summary: ${join(args.out_dir, run_id, "summary.json")}`);
  if (is_baseline) {
    console.log(`[run_eval] no prior baseline for prompt_hash=${prompt_hash} — this run IS the baseline.`);
  } else {
    console.log(`[run_eval] baseline: ${baseline?.run_id}`);
    if (flagged_regressions.length > 0) {
      console.log(`[run_eval] REGRESSIONS (${flagged_regressions.length}):`);
      flagged_regressions.forEach((f) => {
        console.log(`  - ${f.profile_id}: ${f.reason} (was ${f.prior_score}, now ${f.current_score}, Δ=${f.delta})`);
      });
      Deno.exit(1); // CI: non-zero exit on flagged regressions
    } else {
      console.log(`[run_eval] no regressions flagged.`);
    }
  }
}

async function readSummaryById(runsRoot: string, run_id: string): Promise<RunSummary | null> {
  try {
    const text = await Deno.readTextFile(join(runsRoot, run_id, "summary.json"));
    return JSON.parse(text) as RunSummary;
  } catch {
    return null;
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("[run_eval] FATAL:", e instanceof Error ? e.stack : e);
    Deno.exit(3);
  });
}
