// evals/lib/pipeline_runner.ts
//
// Calls the live production `generate-report` edge function for a profile,
// then polls the `reports` table until generation completes, then reshapes
// the canonical core_report into the GeneratedReport shape the judges expect.
//
// Contract validated against the deployed code at
// `admin/generate-report-v45.8-DEPLOYED/index.ts`:
//
//   POST /functions/v1/generate-report
//     headers: Authorization: Bearer <service-role-key>
//              apikey: <service-role-key>
//              x-client-session-id: <fresh UUIDv4 per profile, lowercase>
//              Content-Type: application/json
//     body:    { answers: { "1": "...", "2": "...", "3": "...", "3b": "...",
//                           "4": "...", ..., "15": "..." },
//                cvExtract: { ... } | undefined,
//                clientSessionId: "<same UUIDv4>" }
//   -> 200 { reportId, status: "generating" }
//
// Then poll:
//   GET /rest/v1/reports?id=eq.<reportId>&select=status,core_report,hook_insight,recommended_selection,provisional_first_move,error
//     headers: apikey + Authorization (service-role)
//   Wait until status in ("teaser_ready", "failed").

import type { GeneratedReport, PipelineOutput, Profile, BusinessOption } from "./types.ts";

const DEFAULT_GENERATE_REPORT_ENDPOINT = "/functions/v1/generate-report";
const DEFAULT_REPORTS_REST_ENDPOINT = "/rest/v1/reports";

const POLL_INTERVAL_MS = 3_000;
const DEFAULT_POLL_TIMEOUT_MS = 300_000; // 5 minutes
const DEFAULT_INITIATE_TIMEOUT_MS = 30_000; // 30 seconds to receive the initial 200

export interface PipelineRunnerArgs {
  profile: Profile;
  supabase_url: string;
  supabase_service_role_key: string;
  /** Session UUID used for x-client-session-id. Generated per profile if not provided. */
  client_session_id?: string;
  /** Override endpoint paths if needed. */
  generate_report_path?: string;
  reports_rest_path?: string;
  /** Override timeouts. */
  poll_timeout_ms?: number;
  initiate_timeout_ms?: number;
}

// -----------------------------------------------------------------------------
// Body construction
// -----------------------------------------------------------------------------

/**
 * Convert profile.questionnaire keys (Q1 / Q2 / Q3a / Q3b / Q4 ... Q15) into
 * the `answers` map shape that generate-report expects: numeric string keys.
 * Q3a maps to "3" (sector), Q3b maps to "3b" (employer free-text).
 */
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
  // Deno + modern browsers: crypto.randomUUID() is RFC 4122 v4.
  return crypto.randomUUID().toLowerCase();
}

// -----------------------------------------------------------------------------
// Main entry
// -----------------------------------------------------------------------------

export async function runPipelineForProfile(args: PipelineRunnerArgs): Promise<PipelineOutput> {
  const t0 = performance.now();
  const baseUrl = args.supabase_url.replace(/\/+$/, "");
  const initiateUrl = `${baseUrl}${args.generate_report_path ?? DEFAULT_GENERATE_REPORT_ENDPOINT}`;
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

  // 2. Poll the reports row until status is terminal.
  const selectCols = "status,core_report,hook_insight,ai_impact_section,recommended_selection,provisional_first_move,user_context_profile,error";
  const pollUrl = `${reportsRestBase}?id=eq.${encodeURIComponent(reportId)}&select=${encodeURIComponent(selectCols)}`;
  const pollDeadline = Date.now() + (args.poll_timeout_ms ?? DEFAULT_POLL_TIMEOUT_MS);

  let row: Record<string, unknown> | null = null;
  while (Date.now() < pollDeadline) {
    await sleep(POLL_INTERVAL_MS);
    const pollResp = await fetch(pollUrl, {
      method: "GET",
      headers: {
        apikey: args.supabase_service_role_key,
        Authorization: `Bearer ${args.supabase_service_role_key}`,
        Accept: "application/json",
      },
    });
    if (!pollResp.ok) {
      const errText = await pollResp.text().catch(() => "<unreadable>");
      throw new Error(
        `reports poll returned ${pollResp.status} for ${args.profile.profile_id} (reportId=${reportId}): ${errText.slice(0, 300)}`,
      );
    }
    const rows = (await pollResp.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`reports row not found for reportId=${reportId} (PostgREST returned empty array)`);
    }
    row = rows[0];
    const status = typeof row.status === "string" ? row.status : "";
    if (status === "teaser_ready" || status === "completed") {
      break;
    }
    if (status === "failed") {
      const errMsg = typeof row.error === "string" ? row.error : "<no error message>";
      throw new Error(`generate-report background task failed for ${args.profile.profile_id}: ${errMsg}`);
    }
    // else: status is "generating" or some other intermediate value; keep polling.
  }

  if (!row || (row.status !== "teaser_ready" && row.status !== "completed")) {
    throw new Error(
      `generate-report timed out after ${(args.poll_timeout_ms ?? DEFAULT_POLL_TIMEOUT_MS) / 1000}s waiting for status=teaser_ready (reportId=${reportId})`,
    );
  }

  // 3. Reshape the canonical core_report into the judge-friendly shape.
  const generated_report = reshapeCoreReport(row);

  return {
    generated_report,
    raw_response: { reportId, clientSessionId, row },
    duration_ms: Math.round(performance.now() - t0),
  };
}

// -----------------------------------------------------------------------------
// Reshape canonical -> judge-friendly
// -----------------------------------------------------------------------------

function reshapeCoreReport(row: Record<string, unknown>): GeneratedReport {
  const core = (row.core_report ?? {}) as Record<string, unknown>;
  const options = Array.isArray(core.options) ? (core.options as Array<Record<string, unknown>>) : [];
  const recommendation = (core.recommendation ?? {}) as Record<string, unknown>;
  const archetype = (core.archetype ?? {}) as Record<string, unknown>;

  // recommended_rank → business_model_id lookup
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

  // Map options[] → business_options[] with judge-friendly field names
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
      what_makes_this_hard:
        typeof o.caution_note === "string" ? o.caution_note : undefined,
      what_could_go_wrong: typeof o.caution_note === "string" ? o.caution_note : undefined,
      primary_move_type: typeof o.primary_move_type === "string"
        ? (o.primary_move_type as BusinessOption["primary_move_type"])
        : undefined,
      structural_warmth: typeof o.structural_warmth === "boolean" ? o.structural_warmth : undefined,
      // keep the full canonical option object available under a passthrough key
      _canonical: o,
    };
  });

  // Flatten hook_insight into a single string for Judge 4.
  // Canonical hook_insight is an object { headline, paragraph, first_move }.
  // Fall back to the top-level hook_insight column if core's is missing.
  let hookInsightStr = "";
  const coreHook = core.hook_insight as Record<string, unknown> | undefined;
  if (coreHook && typeof coreHook === "object") {
    const headline = typeof coreHook.headline === "string" ? coreHook.headline : "";
    const paragraph = typeof coreHook.paragraph === "string" ? coreHook.paragraph : "";
    hookInsightStr = [headline, paragraph].filter(Boolean).join(" — ");
  }
  if (!hookInsightStr && typeof row.hook_insight === "string") {
    hookInsightStr = row.hook_insight;
  }

  // Editorial framing
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
    // Keep canonical pieces available to anyone inspecting the per_profile JSON.
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
