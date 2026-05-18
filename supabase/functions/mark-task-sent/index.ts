/*
 * mark-task-sent v1 — 2026-05-18
 *
 * Coaching layer Phase 1 (admin/coaching-layer-design.md v1.1).
 *
 * Marks a Direct or Visibility task as sent. Writes status='sent' + sent_at
 * inside the working_plan JSONB on the matching task. Idempotent — repeat
 * calls overwrite sent_at and previous_status is returned for the client.
 *
 * Used by the /plan "Mark as sent" affordance to capture the action moment
 * that drives the Non-Response Catcher (Phase 3 of coaching layer). Without
 * this signal there is no clean way to detect a sent-but-silent move.
 *
 * Design: Option A in design doc §14.2 — sent_at lives inside the task
 * object in working_plan rather than in a new audit table. No DDL change;
 * all mutation logic lives here.
 *
 * Body: { tracker_session_id, task_id, sent_at? }
 * Response: { success, task_id, sent_at, previous_status, previous_sent_at, response_text }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

interface MarkTaskSentRequest {
  tracker_session_id: string;
  task_id: string;
  sent_at?: string; // ISO 8601, defaults to now()
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          response_text: "Authentication required.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let body: MarkTaskSentRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          response_text: "Request body must be JSON.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { tracker_session_id, task_id, sent_at: providedSentAt } = body;
    if (!tracker_session_id || !task_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          response_text: "tracker_session_id and task_id are required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sentAt = providedSentAt || new Date().toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    // Fetch session and verify ownership.
    const { data: session, error: fetchError } = await supabase
      .from("tracker_sessions")
      .select("id, user_id, working_plan")
      .eq("id", tracker_session_id)
      .single();

    if (fetchError || !session) {
      console.error("mark-task-sent fetch error:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Session not found",
          response_text: "Tracker session not found.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (session.user_id !== userId) {
      console.warn(
        `mark-task-sent: user ${userId} attempted to mutate session ${tracker_session_id} owned by ${session.user_id}`,
      );
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          response_text: "You do not own this tracker session.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Walk working_plan.activation_plan.phases[].days_detail[].tasks[] to find
    // the task by id and mutate it in-place.
    const workingPlan = session.working_plan;
    if (
      !workingPlan?.activation_plan?.phases ||
      !Array.isArray(workingPlan.activation_plan.phases)
    ) {
      return new Response(
        JSON.stringify({
          error: "Malformed working_plan",
          response_text: "Tracker session has no plan to update.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let foundTask: Record<string, unknown> | null = null;
    let previousStatus: string | null = null;
    let previousSentAt: string | null = null;

    outer: for (const phase of workingPlan.activation_plan.phases) {
      if (!Array.isArray(phase?.days_detail)) continue;
      for (const day of phase.days_detail) {
        if (!Array.isArray(day?.tasks)) continue;
        for (const task of day.tasks) {
          if (task?.task_id === task_id) {
            previousStatus = (task.status as string) ?? null;
            previousSentAt = (task.sent_at as string) ?? null;
            task.status = "sent";
            task.sent_at = sentAt;
            foundTask = task;
            break outer;
          }
        }
      }
    }

    if (!foundTask) {
      return new Response(
        JSON.stringify({
          error: "Task not found",
          response_text: "Task ID not found in this tracker session's plan.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Persist mutated working_plan.
    // Note: last-writer-wins on the rare race with a concurrent check-in.
    // Acceptable for MVP — sub-second race window, single-user feature.
    const { error: updateError } = await supabase
      .from("tracker_sessions")
      .update({
        working_plan: workingPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tracker_session_id);

    if (updateError) {
      console.error("mark-task-sent update error:", updateError);
      return new Response(
        JSON.stringify({
          error: updateError.message,
          response_text: "Failed to save sent status.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id,
        sent_at: sentAt,
        previous_status: previousStatus,
        previous_sent_at: previousSentAt,
        response_text: "Marked as sent.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("mark-task-sent error:", error);
    return new Response(
      JSON.stringify({
        error: String(error),
        response_text: "Failed to mark task as sent.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
