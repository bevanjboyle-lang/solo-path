// activate-plan v1 — 2026-05-07: F78 — initial implementation
//
// Creates the tracker_sessions row that gates every downstream user action
// (daily check-ins, replan, day 1-30 progression, library access, subscription
// upsell). Up to this point the row was never created — the design doc
// (admin/adaptive-tracker-checkin-design.md §8 + §9) specified an "I'm
// starting today" button + notification-time picker but no edge function or
// frontend handler had been wired up. Paying users could see /plan but could
// not progress past day 0.
//
// Auth pattern: F43 ES256/HS256-tolerant getClaims via authClient. verify_jwt
// is false at the function level; we do our own JWT validation in-app.
//
// Idempotency: if a tracker_session already exists for this (user_id, report_id),
// returns it without creating a duplicate. The "I'm starting today" button is
// click-once but a flaky network or double-tap would otherwise create dupes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getUserIdFromJwt(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const { data, error } = await authClient.auth.getClaims(token);
    if (error) {
      console.warn("activate-plan: getClaims rejected JWT:", error.message);
      return null;
    }
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch (e) {
    console.warn("activate-plan: getClaims threw:", (e as Error)?.message ?? String(e));
    return null;
  }
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

  const userId = await getUserIdFromJwt(req.headers.get("authorization"));
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

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
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
    console.log(`activate-plan: idempotent — existing session ${existing.id} for user ${userId}, report ${reportId}`);
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
    console.error("activate-plan insert failed:", insertError);
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
    `activate-plan: created tracker_session ${inserted.id} | user=${userId} report=${reportId} ` +
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
