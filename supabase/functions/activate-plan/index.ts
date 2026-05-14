// activate-plan v3 — 2026-05-14: V-055 dual-path JWT diagnostic
//
// V-055 (vibe code review): the codebase has two JWT-handling patterns:
//   1. Decode-only (base64 parse + trust): used by activate-plan v2, process-checkin,
//      process-replan, generate-plan, draft-outreach, claim-second-report, create-payment,
//      create-billing-portal-session, create-subscription, delete-account, delete-user-cv,
//      export-user-data, export-pdf, generate-guidance, get-library-content, refine-report,
//      ask-solo.
//   2. authClient.auth.getClaims(token): used by generate-report v45, link-anon-session v1,
//      get-account-readiness v16.
//
// v2's header comment abandoned getClaims because Bevan's 2026-05-07 activation hit a 401
// the comment author attributed to getClaims rejecting "every currently-issued Supabase
// token". But three other functions on the live critical path successfully use getClaims —
// if it really did reject every token, generate-report would be broken in production and
// it isn't.
//
// v3 runs BOTH paths and logs which won, so we have evidence to consolidate the auth
// helper (V-021) on the correct pattern. After 24h of logs:
//   - if getClaims succeeds whenever decode succeeds: getClaims is fine, v2's diagnosis
//     was wrong (probably gateway-level verify_jwt or a JWKS cache miss), consolidate
//     on getClaims everywhere.
//   - if getClaims fails while decode succeeds: getClaims has a real issue, document it,
//     consolidate on a decode-with-extra-validation pattern.
//
// Behaviour is identical to v2 from the caller's perspective — userId comes from
// whichever path resolves. Decode-only remains the canonical resolver to preserve v2's
// proven path; getClaims runs in parallel for telemetry only.
//
// Restore v2's behaviour by removing the getClaims block and the path_log fields.
//
// Preserved from v2: idempotency, report ownership check, plan readiness check,
// notification_time validation, strand_status initialisation from selected_strands.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v3-v055-diagnostic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";

// Shared auth client for getClaims path. Singleton to allow JWKS cache reuse.
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface JwtResolution {
  decode_sub: string | null;
  decode_error: string | null;
  claims_sub: string | null;
  claims_error: string | null;
  paths_agree: boolean;
  resolved_via: "decode" | "claims" | "both" | "neither";
}

async function resolveUserIdDual(authHeader: string | null): Promise<JwtResolution> {
  const result: JwtResolution = {
    decode_sub: null,
    decode_error: null,
    claims_sub: null,
    claims_error: null,
    paths_agree: false,
    resolved_via: "neither",
  };

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    result.decode_error = "no_bearer";
    result.claims_error = "no_bearer";
    return result;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    result.decode_error = "empty_token";
    result.claims_error = "empty_token";
    return result;
  }

  // Path 1: decode-only (the v2 proven pattern).
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      result.decode_error = "wrong_segments";
    } else {
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      const sub = payload?.sub;
      result.decode_sub = typeof sub === "string" && sub ? sub : null;
      if (!result.decode_sub) result.decode_error = "no_sub_in_payload";
    }
  } catch (e) {
    result.decode_error = `decode_threw: ${(e as Error)?.message ?? String(e)}`;
  }

  // Path 2: getClaims (the secure pattern used by generate-report / link-anon-session).
  try {
    const { data, error } = await authClient.auth.getClaims(token);
    if (error) {
      result.claims_error = `getClaims_error: ${error.message ?? "(no message)"}`;
    } else {
      const sub = data?.claims?.sub;
      result.claims_sub = typeof sub === "string" && sub ? sub : null;
      if (!result.claims_sub) result.claims_error = "no_sub_in_claims";
    }
  } catch (e) {
    result.claims_error = `getClaims_threw: ${(e as Error)?.message ?? String(e)}`;
  }

  // Resolution summary.
  result.paths_agree = result.decode_sub === result.claims_sub && !!result.decode_sub;
  if (result.decode_sub && result.claims_sub) result.resolved_via = "both";
  else if (result.decode_sub) result.resolved_via = "decode";
  else if (result.claims_sub) result.resolved_via = "claims";
  else result.resolved_via = "neither";

  return result;
}

// Per design doc §9 decision 1: 6 preset times, no free-form. Stored as
// HH:MM strings in the user's local timezone (notification_timezone).
const ALLOWED_TIMES = new Set(["07:00", "08:00", "09:00", "12:00", "18:00", "20:00"]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jwtResolution = await resolveUserIdDual(req.headers.get("authorization"));
  // Telemetry: log every invocation's resolution shape. This is the V-055 evidence trail.
  console.log(
    `${FUNCTION_VERSION} jwt_resolution`,
    JSON.stringify({
      resolved_via: jwtResolution.resolved_via,
      paths_agree: jwtResolution.paths_agree,
      decode_sub_set: !!jwtResolution.decode_sub,
      claims_sub_set: !!jwtResolution.claims_sub,
      decode_error: jwtResolution.decode_error,
      claims_error: jwtResolution.claims_error,
    }),
  );

  // Canonical resolver = decode-only to preserve v2's proven critical-path behaviour.
  // The getClaims result is for telemetry only — flipping the canonical resolver is a
  // V-021 change, not a V-055 change.
  const userId = jwtResolution.decode_sub;

  if (!userId) {
    return jsonResponse(
      { error: "Not authenticated", response_text: "Please sign in to start your plan." },
      401,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json", response_text: "Malformed request body." }, 400);
  }

  const reportId = body.report_id;
  const notificationTime = body.notification_time;
  const notificationTimezone = body.notification_timezone;

  if (typeof reportId !== "string" || !reportId) {
    return jsonResponse({ error: "report_id_required", response_text: "report_id is required." }, 400);
  }
  if (typeof notificationTime !== "string" || !ALLOWED_TIMES.has(notificationTime)) {
    return jsonResponse(
      {
        error: "invalid_notification_time",
        response_text: `notification_time must be one of: ${[...ALLOWED_TIMES].join(", ")}.`,
      },
      400,
    );
  }
  if (typeof notificationTimezone !== "string" || !notificationTimezone) {
    return jsonResponse(
      {
        error: "invalid_notification_timezone",
        response_text: "notification_timezone is required (IANA string).",
      },
      400,
    );
  }

  const supabase = createClient(SUPABASE_URL, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotency: if a tracker_session already exists for this user+report,
  // return it without creating a duplicate. UI may double-fire under flaky
  // network conditions or rapid double-tap.
  const { data: existing } = await supabase
    .from("tracker_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .maybeSingle();

  if (existing) {
    console.log(`${FUNCTION_VERSION} idempotent — existing session ${existing.id} for user ${userId}, report ${reportId}`);
    return jsonResponse(
      {
        tracker_session_id: existing.id,
        success: true,
        was_existing: true,
        response_text: "Plan already activated.",
      },
      200,
    );
  }

  // Verify report ownership + readiness.
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, status, activation_plan, selected_strands")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    return jsonResponse(
      { error: "report_not_found", response_text: "Could not find your report." },
      404,
    );
  }
  if (report.user_id !== userId) {
    return jsonResponse(
      { error: "not_authorised", response_text: "This report doesn't belong to you." },
      403,
    );
  }
  if (report.status !== "complete" || !report.activation_plan) {
    return jsonResponse(
      {
        error: "plan_not_ready",
        response_text: "Your plan isn't ready yet. Try again in a moment.",
      },
      409,
    );
  }

  // Count tasks_total from activation_plan.activation_plan.phases[].days_detail[].tasks[].
  // Schema is verified live: 4 phases × 30 days × ~63 tasks for a 3-strand plan.
  const phases = ((report.activation_plan as Record<string, unknown> | null)
    ?.activation_plan as Record<string, unknown> | undefined)
    ?.phases as Array<Record<string, unknown>> | undefined ?? [];

  let tasksTotal = 0;
  for (const phase of phases) {
    const daysDetail = (phase?.days_detail as Array<Record<string, unknown>>) ?? [];
    for (const day of daysDetail) {
      const tasks = (day?.tasks as unknown[]) ?? [];
      tasksTotal += tasks.length;
    }
  }

  // Build initial strand_status from selected_strands (set during StrandSelector
  // submit). Each strand starts active with no progress notes.
  const selectedStrands = (report.selected_strands as Array<Record<string, unknown>> | null) ?? [];
  const strandStatus: Record<string, Record<string, unknown>> = {};
  for (const strand of selectedStrands) {
    const sid = strand?.strand_id;
    if (typeof sid === "string" && sid) {
      strandStatus[sid] = {
        status: "active",
        rank: strand.rank ?? null,
        model_name: strand.model_name ?? null,
        last_progress_note: null,
      };
    }
  }

  const focusStrands = selectedStrands
    .map((s: Record<string, unknown>) => s?.strand_id)
    .filter((id): id is string => typeof id === "string" && !!id);

  const { data: inserted, error: insertError } = await supabase
    .from("tracker_sessions")
    .insert({
      user_id: userId,
      report_id: reportId,
      // Snapshot the original plan for replan diffing later.
      original_plan: report.activation_plan,
      // Working copy that process-checkin / process-replan mutate as the
      // user makes progress and the AI re-plans.
      working_plan: report.activation_plan,
      running_narrative: "",
      activated_at: new Date().toISOString(),
      // Day 1 from the moment of activation. The advance-tracker-day pg_cron
      // job (00:05 UTC daily) recomputes this each day as
      //   LEAST((CURRENT_DATE - activated_at::date) + 1, 30)
      // so it stays correct even if we initially set it wrong.
      current_day: 1,
      plan_state: "active",
      status: "active",
      notification_time: notificationTime,
      notification_timezone: notificationTimezone,
      strand_status: strandStatus,
      portfolio_reviews: [],
      focus_strands: focusStrands,
      tasks_total: tasksTotal,
      tasks_completed: 0,
      replan_pending: false,
      subscription_status: "trial",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error(`${FUNCTION_VERSION} insert failed:`, insertError);
    return jsonResponse(
      {
        error: "insert_failed",
        response_text: "Activation failed. Please try again.",
        detail: insertError?.message ?? null,
      },
      500,
    );
  }

  console.log(
    `${FUNCTION_VERSION} created tracker_session ${inserted.id} | user=${userId} report=${reportId} ` +
    `tz=${notificationTimezone} time=${notificationTime} tasks_total=${tasksTotal} strands=${focusStrands.length}`,
  );

  return jsonResponse(
    {
      tracker_session_id: inserted.id,
      success: true,
      was_existing: false,
      tasks_total: tasksTotal,
      response_text: "Plan activated.",
    },
    200,
  );
});
