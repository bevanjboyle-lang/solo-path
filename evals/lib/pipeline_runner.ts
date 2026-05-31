// evals/lib/pipeline_runner.ts
//
// WP2 sub-PR D extension: pipeline_runner now drives the full report+plan path
// end-to-end so the harness captures both WP2 best-of-N outputs per profile.
//
// Sequence per profile:
//   1. POST /functions/v1/generate-report  → status: generating → teaser_ready
//   2. After teaser_ready, deterministically wait for the hook regen winner by
//      polling reports.hook_insight_winner_index until it is a number (or the
//      deadline passes). See waitForRegenWinner.
//   3. Write synthetic selected_strands (top 3 by composite_score) into the row.
//   4. POST /functions/v1/generate-plan with the report ID.
//   5. Poll the reports row until activation_plan is populated.
//   6. Deterministically wait for the first-move regen winner by polling
//      reports.first_move_winner_index until it is a number (or the deadline).
//   7. Return PipelineOutput including candidate_hook_insights,
//      candidate_first_moves, winner indices, and activation_plan.first_move.
//
// 2026-05-29: the timing-race follow-up from sub-PR A is now properly fixed.
// Both regenerators write their winner-index column in the same UPDATE as their
// candidate array, so the harness polls that column and proceeds the instant the
// winner appears (typically 30-60s) instead of sleeping a fixed window. This is
// race-free, faster in the common case, and — unlike the status-transition
// sketch in the Monday-task doc — does NOT touch the status enum the frontend's
// teaser poll depends on.
//
// Contract verified against deployed:
//   - generate-report: produces reports row with status transitioning
//     generating → teaser_ready, then (with WP2_HOOK_REGENERATION_ENABLED=true)
//     populates candidate_hook_insights asynchronously.
//   - generate-plan: accepts { reportId } body, reads selected_strands from
//     reports row, populates activation_plan + provisional_first_move. With
//     WP2_FIRST_MOVE_REGENERATION_ENABLED=true, populates candidate_first_moves
//     asynchronously after activation_plan persists.

import type { GeneratedReport, PipelineOutput, Profile, BusinessOption } from "./types.ts";

const DEFAULT_GENERATE_REPORT_ENDPOINT = "/functions/v1/generate-report";
const DEFAULT_GENERATE_PLAN_ENDPOINT = "/functions/v1/generate-plan";
const DEFAULT_REPORTS_REST_ENDPOINT = "/rest/v1/reports";

const POLL_INTERVAL_MS = 3_000;
const DEFAULT_REPORT_POLL_TIMEOUT_MS = 300_000; // 5 minutes for generate-report
const DEFAULT_PLAN_POLL_TIMEOUT_MS = 480_000; // 8 minutes for generate-plan (richer output)
const DEFAULT_INITIATE_TIMEOUT_MS = 30_000;

// WP2 regen completion deadlines (the proper fix for sub-PR A's timing-race
// follow-up — replaces the old fixed settle-sleep, 2026-05-29).
//
// The regenerators run as fire-and-forget post-steps. Each finishes by writing
// its winner-index column in the SAME UPDATE that writes the candidate array:
//   - regenerate-hook-insight  → hook_insight_winner_index + candidate_hook_insights
//   - regenerate-first-move    → first_move_winner_index  + candidate_first_moves
// So the harness polls the winner-index column and proceeds the instant it flips
// from null to a number — typically 30-60s. This is deterministic (no race) AND
// faster than the old fixed wait in the common case, and it avoids touching the
// status enum the frontend's teaser poll depends on (why this beats the
// status-transition approach in the Monday-task-2 Option B sketch).
//
// The deadline is the fallback ceiling: if the regen flag is off or the regen
// never runs, the poll falls through here and the harness proceeds with the
// monolith's draft (degrades to pre-WP2 behaviour rather than hanging).
const HOOK_REGEN_DEADLINE_MS = 180_000;
const FIRST_MOVE_REGEN_DEADLINE_MS = 180_000;

export interface PipelineRunnerArgs {
  profile: Profile;
  supabase_url: string;
  supabase_service_role_key: string;
  client_session_id?: string;
  generate_report_path?: string;
  generate_plan_path?: string;
  reports_rest_path?: string;
  report_poll_timeout_ms?: number;
  plan_poll_timeout_ms?: number;
  initiate_timeout_ms?: number;
  /** Skip generate-plan + WP2 first-move capture. Useful for hook-only smokes. */
  skip_plan?: boolean;
}

// -----------------------------------------------------------------------------
// Body construction
// -----------------------------------------------------------------------------

function questionnaireToAnswers(q: Profile["questionnaire"]): Record<string, string> {
  return {
    "1": String(q.Q1 ?? ""),
    "2": String(q.Q2 ?? ""),
    "3": String(q.Q3a ?? ""),
    "3b": String(q.Q3b ?? ""),
    "4": String(q.Q4 ?? ""),
    "5": String(q.Q5 ?? ""),
    "6": String(q.Q6 ?? ""),
    "7": String(q.Q7 ?? ""),
    "8": String(q.Q8 ?? ""),
    "9": String(q.Q9 ?? ""),
    "10": String(q.Q10 ?? ""),
    "11": String(q.Q11 ?? ""),
    "12": String(q.Q12 ?? ""),
    "13": String(q.Q13 ?? ""),
    "14": String(q.Q14 ?? ""),
    "15": String(q.Q15 ?? ""),
  };
}

function generateUuidV4(): string {
  return crypto.randomUUID().toLowerCase();
}

// -----------------------------------------------------------------------------
// Main entry
// -----------------------------------------------------------------------------

export async function runPipelineForProfile(args: PipelineRunnerArgs): Promise<PipelineOutput> {
  const t0 = performance.now();
  const baseUrl = args.supabase_url.replace(/\/+$/, "");
  const initiateUrl = `${baseUrl}${args.generate_report_path ?? DEFAULT_GENERATE_REPORT_ENDPOINT}`;
  const planUrl = `${baseUrl}${args.generate_plan_path ?? DEFAULT_GENERATE_PLAN_ENDPOINT}`;
  const reportsRestBase = `${baseUrl}${args.reports_rest_path ?? DEFAULT_REPORTS_REST_ENDPOINT}`;
  const clientSessionId = args.client_session_id ?? generateUuidV4();

  // 1. Initiate generation.
  const initiateBody = {
    answers: questionnaireToAnswers(args.profile.questionnaire),
    cvExtract: args.profile.cv_extract ?? undefined,
    clientSessionId,
  };

  const initiateController = new AbortController();
  const initiateTimeout = setTimeout(
    () => initiateController.abort(),
    args.initiate_timeout_ms ?? DEFAULT_INITIATE_TIMEOUT_MS,
  );

  let initiateResp: Response;
  try {
    initiateResp = await fetch(initiateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.supabase_service_role_key}`,
        apikey: args.supabase_service_role_key,
        "x-client-session-id": clientSessionId,
      },
      body: JSON.stringify(initiateBody),
      signal: initiateController.signal,
    });
  } catch (e) {
    clearTimeout(initiateTimeout);
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`generate-report initiate failed for ${args.profile.profile_id}: ${reason}`);
  }
  clearTimeout(initiateTimeout);

  if (!initiateResp.ok) {
    const errText = await initiateResp.text().catch(() => "<unreadable>");
    throw new Error(
      `generate-report returned ${initiateResp.status} for ${args.profile.profile_id}: ${errText.slice(0, 500)}`,
    );
  }

  const initiatePayload = (await initiateResp.json()) as Record<string, unknown>;
  const reportId =
    (typeof initiatePayload.reportId === "string" && initiatePayload.reportId) ||
    (typeof initiatePayload.report_id === "string" && initiatePayload.report_id) ||
    null;
  if (!reportId) {
    throw new Error(
      `generate-report initiate did not return a reportId for ${args.profile.profile_id}: ${JSON.stringify(initiatePayload).slice(0, 400)}`,
    );
  }

  // 2. Poll until teaser_ready (or terminal failed).
  const reportSelectCols = [
    "status",
    "core_report",
    "hook_insight",
    "ai_impact_section",
    "recommended_selection",
    "provisional_first_move",
    "user_context_profile",
    "activation_plan",
    "candidate_hook_insights",
    "hook_insight_winner_index",
    "candidate_first_moves",
    "first_move_winner_index",
    "selected_strands",
    "error",
  ].join(",");

  const pollUrl = `${reportsRestBase}?id=eq.${encodeURIComponent(reportId)}&select=${encodeURIComponent(reportSelectCols)}`;
  const reportDeadline = Date.now() + (args.report_poll_timeout_ms ?? DEFAULT_REPORT_POLL_TIMEOUT_MS);

  let row = await waitForReportStatus(pollUrl, args.supabase_service_role_key, args.profile.profile_id, reportDeadline, ["teaser_ready", "completed"]);

  // 3. WP2 sub-PR A — deterministically wait for the hook regen winner.
  row = await waitForRegenWinner(
    pollUrl,
    args.supabase_service_role_key,
    args.profile.profile_id,
    "hook_insight_winner_index",
    Date.now() + HOOK_REGEN_DEADLINE_MS,
  );

  if (args.skip_plan) {
    return shapePipelineOutput(reportId, clientSessionId, row, t0);
  }

  // 4. Pick the top-3 strands by composite_score and write them to selected_strands.
  const selectedStrands = pickTopStrandsByCompositeScore(row, 3);
  if (selectedStrands.length === 0) {
    throw new Error(`could not pick selected_strands from core_report for ${args.profile.profile_id} (no options or no composite_score)`);
  }

  // generate-plan reads selected_ranks (2-5) / selected_rank from the request
  // BODY — not selected_strands from the row — so derive the ranks here and pass
  // them. Without this the function returns 400 "Please select your options."
  const selectedRanks = selectedStrands
    .map((s) => (typeof s.rank === "number" ? (s.rank as number) : null))
    .filter((r): r is number => r !== null);
  if (selectedRanks.length === 0) {
    throw new Error(`selected strands carry no numeric rank for ${args.profile.profile_id}; cannot call generate-plan`);
  }

  const writeStrandsResp = await fetch(`${reportsRestBase}?id=eq.${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: args.supabase_service_role_key,
      Authorization: `Bearer ${args.supabase_service_role_key}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ selected_strands: selectedStrands }),
  });
  if (!writeStrandsResp.ok) {
    const errText = await writeStrandsResp.text().catch(() => "<unreadable>");
    throw new Error(
      `failed to write selected_strands for ${args.profile.profile_id} (reportId=${reportId}): ${writeStrandsResp.status} ${errText.slice(0, 300)}`,
    );
  }

  // 5. Call generate-plan.
  const planController = new AbortController();
  const planTimeout = setTimeout(
    () => planController.abort(),
    args.initiate_timeout_ms ?? DEFAULT_INITIATE_TIMEOUT_MS,
  );
  let planInitiateResp: Response;
  try {
    planInitiateResp = await fetch(planUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.supabase_service_role_key}`,
        apikey: args.supabase_service_role_key,
      },
      body: JSON.stringify({
        reportId,
        report_id: reportId,
        selected_ranks: selectedRanks,
        selected_rank: selectedRanks[0],
      }),
      signal: planController.signal,
    });
  } catch (e) {
    clearTimeout(planTimeout);
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`generate-plan initiate failed for ${args.profile.profile_id} (reportId=${reportId}): ${reason}`);
  }
  clearTimeout(planTimeout);

  if (!planInitiateResp.ok) {
    const errText = await planInitiateResp.text().catch(() => "<unreadable>");
    throw new Error(
      `generate-plan returned ${planInitiateResp.status} for ${args.profile.profile_id} (reportId=${reportId}): ${errText.slice(0, 500)}`,
    );
  }
  // Drain body but ignore — generate-plan is fire-and-forget bg task.
  await planInitiateResp.text().catch(() => "");

  // 6. Poll for activation_plan to populate.
  const planDeadline = Date.now() + (args.plan_poll_timeout_ms ?? DEFAULT_PLAN_POLL_TIMEOUT_MS);
  row = await waitForActivationPlan(pollUrl, args.supabase_service_role_key, args.profile.profile_id, planDeadline);

  // 7. WP2 sub-PR B — deterministically wait for the first-move regen winner.
  row = await waitForRegenWinner(
    pollUrl,
    args.supabase_service_role_key,
    args.profile.profile_id,
    "first_move_winner_index",
    Date.now() + FIRST_MOVE_REGEN_DEADLINE_MS,
  );

  return shapePipelineOutput(reportId, clientSessionId, row, t0);
}

// -----------------------------------------------------------------------------
// Polling helpers
// -----------------------------------------------------------------------------

async function waitForReportStatus(
  pollUrl: string,
  serviceRoleKey: string,
  profileId: string,
  deadlineMs: number,
  acceptStatuses: string[],
): Promise<Record<string, unknown>> {
  while (Date.now() < deadlineMs) {
    await sleep(POLL_INTERVAL_MS);
    const row = await fetchReportRow(pollUrl, serviceRoleKey, profileId);
    const status = typeof row.status === "string" ? row.status : "";
    if (acceptStatuses.includes(status)) return row;
    if (status === "failed") {
      const errMsg = typeof row.error === "string" ? row.error : "<no error message>";
      throw new Error(`generate-report background task failed for ${profileId}: ${errMsg}`);
    }
  }
  throw new Error(`generate-report timed out waiting for status in [${acceptStatuses.join(", ")}] for ${profileId}`);
}

async function waitForActivationPlan(
  pollUrl: string,
  serviceRoleKey: string,
  profileId: string,
  deadlineMs: number,
): Promise<Record<string, unknown>> {
  while (Date.now() < deadlineMs) {
    await sleep(POLL_INTERVAL_MS);
    const row = await fetchReportRow(pollUrl, serviceRoleKey, profileId);
    const ap = row.activation_plan;
    if (ap && typeof ap === "object" && Object.keys(ap as object).length > 0) return row;
    if (typeof row.status === "string" && row.status === "failed") {
      const errMsg = typeof row.error === "string" ? row.error : "<no error message>";
      throw new Error(`generate-plan background task failed for ${profileId}: ${errMsg}`);
    }
  }
  throw new Error(`generate-plan timed out waiting for activation_plan to populate for ${profileId}`);
}

// WP2: poll until the named regen winner-index column is populated (a number),
// signalling the regenerator's final UPDATE has landed. Returns the row with the
// winner present as soon as it appears; if the deadline passes (regen flag off
// or regen never ran), returns the latest row so the caller proceeds with the
// monolith's draft rather than hanging. Never throws on timeout — a missing
// regen is a valid state, not an error.
async function waitForRegenWinner(
  pollUrl: string,
  serviceRoleKey: string,
  profileId: string,
  winnerKey: "hook_insight_winner_index" | "first_move_winner_index",
  deadlineMs: number,
): Promise<Record<string, unknown>> {
  let lastRow = await fetchReportRow(pollUrl, serviceRoleKey, profileId);
  if (typeof lastRow[winnerKey] === "number") return lastRow;
  while (Date.now() < deadlineMs) {
    await sleep(POLL_INTERVAL_MS);
    lastRow = await fetchReportRow(pollUrl, serviceRoleKey, profileId);
    if (typeof lastRow[winnerKey] === "number") return lastRow;
    // A terminal failure on the row means no winner is coming — stop early.
    if (typeof lastRow.status === "string" && lastRow.status === "failed") return lastRow;
  }
  return lastRow;
}

async function fetchReportRow(
  pollUrl: string,
  serviceRoleKey: string,
  profileId: string,
): Promise<Record<string, unknown>> {
  const resp = await fetch(pollUrl, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "<unreadable>");
    throw new Error(`reports poll returned ${resp.status} for ${profileId}: ${errText.slice(0, 300)}`);
  }
  const rows = (await resp.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`reports row not found for ${profileId} (PostgREST returned empty array)`);
  }
  return rows[0];
}

// -----------------------------------------------------------------------------
// Strand selection (top 3 by composite_score)
// -----------------------------------------------------------------------------

function pickTopStrandsByCompositeScore(row: Record<string, unknown>, n: number): Array<Record<string, unknown>> {
  const core = (row.core_report ?? {}) as Record<string, unknown>;
  const options = Array.isArray(core.options) ? (core.options as Array<Record<string, unknown>>) : [];
  if (options.length === 0) return [];

  // Sort by composite_score desc; fall back to rank asc if composite_score absent.
  const sorted = [...options].sort((a, b) => {
    const aScore = typeof a.composite_score === "number" ? a.composite_score : null;
    const bScore = typeof b.composite_score === "number" ? b.composite_score : null;
    if (aScore !== null && bScore !== null) return bScore - aScore;
    const aRank = typeof a.rank === "number" ? a.rank : Number.MAX_SAFE_INTEGER;
    const bRank = typeof b.rank === "number" ? b.rank : Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });

  return sorted.slice(0, n).map((o) => ({
    strand_id: `strand_${o.rank ?? sorted.indexOf(o) + 1}`,
    rank: o.rank ?? null,
    business_model_id: o.business_model_id ?? null,
    model_name: o.model_name ?? null,
    positioning: o.positioning ?? null,
    target_buyer: o.target_buyer ?? null,
    what_they_are_buying: o.what_they_are_buying ?? null,
    pricing: o.pricing ?? null,
    difficulty_rating: o.difficulty_rating ?? null,
    composite_score: o.composite_score ?? null,
    fit_tags: o.fit_tags ?? null,
    primary_move_type: o.primary_move_type ?? null,
    structural_warmth: o.structural_warmth ?? null,
    warmth_type: null, // set by frontend/check-in path; harness leaves null and lets prompt infer.
  }));
}

// -----------------------------------------------------------------------------
// Shape PipelineOutput (extended for WP2)
// -----------------------------------------------------------------------------

function shapePipelineOutput(
  reportId: string,
  clientSessionId: string,
  row: Record<string, unknown>,
  t0: number,
): PipelineOutput {
  const generated_report = reshapeCoreReport(row);

  // Lift WP2 fields onto PipelineOutput for the judges + summary computations.
  const candidate_hook_insights = Array.isArray(row.candidate_hook_insights)
    ? (row.candidate_hook_insights as Array<Record<string, unknown>>)
    : null;
  const hook_insight_winner_index =
    typeof row.hook_insight_winner_index === "number" ? row.hook_insight_winner_index : null;
  const candidate_first_moves = Array.isArray(row.candidate_first_moves)
    ? (row.candidate_first_moves as Array<Record<string, unknown>>)
    : null;
  const first_move_winner_index =
    typeof row.first_move_winner_index === "number" ? row.first_move_winner_index : null;
  const activation_plan = row.activation_plan ?? null;

  return {
    generated_report,
    raw_response: { reportId, clientSessionId, row },
    duration_ms: Math.round(performance.now() - t0),
    candidate_hook_insights,
    hook_insight_winner_index,
    candidate_first_moves,
    first_move_winner_index,
    activation_plan,
  };
}

// -----------------------------------------------------------------------------
// Reshape canonical -> judge-friendly (unchanged from WP1 sub-PR C; hook now
// reads the winner from candidate_hook_insights if present, falling back to
// the monolith's hook_insight if not).
// -----------------------------------------------------------------------------

function reshapeCoreReport(row: Record<string, unknown>): GeneratedReport {
  const core = (row.core_report ?? {}) as Record<string, unknown>;
  const options = Array.isArray(core.options) ? (core.options as Array<Record<string, unknown>>) : [];
  const recommendation = (core.recommendation ?? {}) as Record<string, unknown>;
  const archetype = (core.archetype ?? {}) as Record<string, unknown>;

  const recommendedRank =
    typeof recommendation.recommended_rank === "number" ? recommendation.recommended_rank : null;
  const recommendedOption =
    recommendedRank !== null
      ? options.find((o) => Number(o.rank) === recommendedRank)
      : undefined;
  const recommended_option_id =
    (recommendedOption && typeof recommendedOption.business_model_id === "string"
      ? recommendedOption.business_model_id
      : undefined) ?? undefined;

  const business_options: BusinessOption[] = options.map((o) => {
    const pricing = o.pricing as Record<string, unknown> | undefined;
    const pricingStr = formatPricing(pricing);
    return {
      business_model_id: typeof o.business_model_id === "string" ? o.business_model_id : undefined,
      title: typeof o.model_name === "string" ? o.model_name : undefined,
      what_is_being_sold: typeof o.what_they_are_buying === "string" ? o.what_they_are_buying : undefined,
      who_buys_it: typeof o.target_buyer === "string" ? o.target_buyer : undefined,
      why_credible_for_user: typeof o.why_this_works_for_them === "string" ? o.why_this_works_for_them : undefined,
      first_clients_path: typeof o.positioning === "string" ? o.positioning : undefined,
      pricing: pricingStr,
      time_to_revenue: typeof o.time_to_first_revenue === "string" ? o.time_to_first_revenue : undefined,
      what_makes_this_hard: typeof o.caution_note === "string" ? o.caution_note : undefined,
      what_could_go_wrong: typeof o.caution_note === "string" ? o.caution_note : undefined,
      primary_move_type: typeof o.primary_move_type === "string"
        ? (o.primary_move_type as BusinessOption["primary_move_type"])
        : undefined,
      structural_warmth: typeof o.structural_warmth === "boolean" ? o.structural_warmth : undefined,
      _canonical: o,
    };
  });

  // WP2 sub-PR D: prefer the WP2 hook winner if present; else fall back to the
  // monolith's hook. The post-WP2 reports row already promotes the winner into
  // reports.hook_insight + core_report.hook_insight, but explicitly pulling
  // from candidate_hook_insights[winner_index] keeps the harness aligned with
  // what Judge 4 should score even if the promotion step ever drifts.
  let hookInsightStr = "";
  const candidateHooks = Array.isArray(row.candidate_hook_insights)
    ? (row.candidate_hook_insights as Array<Record<string, unknown>>)
    : null;
  const winnerIdx =
    typeof row.hook_insight_winner_index === "number" ? row.hook_insight_winner_index : null;
  if (candidateHooks && winnerIdx !== null && candidateHooks[winnerIdx]) {
    const wh = candidateHooks[winnerIdx].hook_insight as Record<string, unknown> | undefined;
    if (wh && typeof wh === "object") {
      const headline = typeof wh.headline === "string" ? wh.headline : "";
      const paragraph = typeof wh.paragraph === "string" ? wh.paragraph : "";
      hookInsightStr = [headline, paragraph].filter(Boolean).join(" — ");
    }
  }
  if (!hookInsightStr) {
    const coreHook = core.hook_insight as Record<string, unknown> | undefined;
    if (coreHook && typeof coreHook === "object") {
      const headline = typeof coreHook.headline === "string" ? coreHook.headline : "";
      const paragraph = typeof coreHook.paragraph === "string" ? coreHook.paragraph : "";
      hookInsightStr = [headline, paragraph].filter(Boolean).join(" — ");
    }
  }
  if (!hookInsightStr && typeof row.hook_insight === "string") {
    hookInsightStr = row.hook_insight;
  }

  const profile_interpretation =
    (typeof archetype.summary === "string" ? archetype.summary : undefined) ?? undefined;
  const reframe_headline =
    (typeof archetype.editorial_description === "string" ? archetype.editorial_description : undefined) ?? undefined;

  return {
    hook_insight: hookInsightStr,
    profile_interpretation,
    reframe_headline,
    business_options,
    recommended_option_id,
    _canonical_core_report: core,
    _canonical_recommendation: recommendation,
    _canonical_archetype: archetype,
    _canonical_recommended_selection: row.recommended_selection,
    _canonical_provisional_first_move: row.provisional_first_move,
  };
}

function formatPricing(pricing: Record<string, unknown> | undefined): string {
  if (!pricing) return "";
  const model = typeof pricing.model === "string" ? pricing.model : "";
  const low = typeof pricing.range_low_gbp === "number" ? pricing.range_low_gbp : null;
  const high = typeof pricing.range_high_gbp === "number" ? pricing.range_high_gbp : null;
  const cadence = typeof pricing.cadence === "string" ? pricing.cadence : "";
  const parts: string[] = [];
  if (low !== null && high !== null) parts.push(`£${low.toLocaleString()}–£${high.toLocaleString()}`);
  else if (low !== null) parts.push(`from £${low.toLocaleString()}`);
  else if (high !== null) parts.push(`up to £${high.toLocaleString()}`);
  if (cadence) parts.push(cadence);
  if (model) parts.push(`(${model})`);
  return parts.join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
