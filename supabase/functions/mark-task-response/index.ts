/*
 * mark-task-response v1 — 2026-05-18
 *
 * Coaching layer Phase 3 slice 1 (admin/coaching-layer-design.md v1.4 §4.2).
 *
 * Captures the explicit response signal for a sent task. Mirrors the
 * mark-task-sent pattern: same JWT decode, same JSONB-mutation in
 * tracker_sessions.working_plan, same ownership check, same idempotency.
 *
 * Body: { tracker_session_id, task_id, response_received: boolean, response_logged_at? }
 * Response: { success, task_id, response_received, response_logged_at,
 *             previous_response_received, previous_response_logged_at, response_text }
 *
 * What changes on the task object:
 *   - response_received   ← body.response_received  (true | false)
 *   - response_logged_at  ← body.response_logged_at || now()
 *
 * What stays the same:
 *   - status — a sent task that gets a reply is still status='sent'. We do
 *     not collapse "sent + replied" into a new status. The Catcher suppression
 *     rule (admin/coaching-layer-design.md §4.2) only needs response_received
 *     to be true; status is independent.
 *
 * Why two values for response_received (true and false) rather than just
 * "got_a_reply" boolean:
 *   - true  = user has affirmatively logged a reply  → suppresses Catcher
 *   - false = user has affirmatively logged no-reply-yet → does NOT suppress
 *             Catcher (the silence is real; Catcher fires when 5-day window hits)
 *   - null  = no signal yet → Catcher fires once the 5-day window hits
 *     (same behaviour as false; the affordance is for clarity, not for
 *      forcing the Catcher to fire)
 *
 * Used by the /plan "Got a reply" / "No reply yet" affordance on Direct
 * tasks that have already been marked sent. Without this signal the Catcher
 * (Phase 3 slice 2-3) cannot distinguish moves that resolved from moves
 * that went silent.
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

interface MarkTaskResponseRequest {
  tracker_session_id: string;
  task_id: string;
  response_received: boolean;
  response_logged_at?: string; // ISO 8601, defaults to now()
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

    let body: MarkTaskResponseRequest;
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

    const {
      tracker_session_id,
      task_id,
      response_received,
      response_logged_at: providedLoggedAt,
    } = body;

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

    if (typeof response_received !== "boolean") {
      return new Response(
        JSON.stringify({
          error: "Invalid response_received",
          response_text: "response_received must be true or false.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const loggedAt = providedLoggedAt || new Date().toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    // Fetch session + verify ownership.
    const { data: session, error: fetchError } = await supabase
      .from("tracker_sessions")
      .select("id, user_id, working_plan")
      .eq("id", tracker_session_id)
      .single();

    if (fetchError || !session) {
      console.error("mark-task-response fetch error:", fetchError);
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
        `mark-task-response: user ${userId} attempted to mutate session ${tracker_session_id} owned by ${session.user_id}`,
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
    let previousResponseReceived: boolean | null = null;
    let previousResponseLoggedAt: string | null = null;

    outer: for (const phase of workingPlan.activation_plan.phases) {
      if (!Array.isArray(phase?.days_detail)) continue;
      for (const day of phase.days_detail) {
        if (!Array.isArray(day?.tasks)) continue;
        for (const task of day.tasks) {
          if (task?.task_id === task_id) {
            previousResponseReceived =
              typeof task.response_received === "boolean"
                ? (task.response_received as boolean)
                : null;
            previousResponseLoggedAt =
              (task.response_logged_at as string) ?? null;
            task.response_received = response_received;
            task.response_logged_at = loggedAt;
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

    // Persist mutated working_plan. Last-writer-wins on rare race with a
    // concurrent check-in; sub-second window, single-user feature — same
    // tradeoff mark-task-sent accepts.
    const { error: updateError } = await supabase
      .from("tracker_sessions")
      .update({
        working_plan: workingPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tracker_session_id);

    if (updateError) {
      console.error("mark-task-response update error:", updateError);
      return new Response(
        JSON.stringify({
          error: updateError.message,
          response_text: "Failed to save response status.",
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
        response_received,
        response_logged_at: loggedAt,
        previous_response_received: previousResponseReceived,
        previous_response_logged_at: previousResponseLoggedAt,
        response_text: response_received
          ? "Marked as replied."
          : "Marked as no reply yet.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("mark-task-response error:", error);
    return new Response(
      JSON.stringify({
        error: String(error),
        response_text: "Failed to mark task response.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
