/*
 * generate-weekly-friction-review v1 — 2026-05-18
 *
 * Coaching layer Phase 2 (admin/coaching-layer-design.md v1.2 §4.3).
 *
 * Generates a Weekly Friction Review for one tracker_session. Called by
 * the Monday 9am UK cron (Phase 2 slice 2, not yet added) AND callable
 * manually with a tracker_session_id body for testing.
 *
 * Flow:
 *   1. Resolve target tracker_session(s):
 *      - If body.tracker_session_id provided → process that one only
 *        (manual / testing path; requires authed user who owns it).
 *      - If body.cron === true → process all active tracker_sessions
 *        past day 7 that don't already have a review for this week
 *        (cron path; requires service-role caller, no JWT user).
 *   2. For each target session, pull last 7 days of:
 *      - checkin_history rows (state, narrative_addition, plan_updates)
 *      - replans rows (replan_summary if any)
 *      - tracker_sessions.strand_status (active strand names)
 *   3. Build the prompt input, call OpenAI, validate output.
 *   4. Insert into weekly_friction_reviews (dedupe via UNIQUE constraint).
 *   5. Return generated review (manual) or count + errors (cron).
 *
 * Storage shape — one row per (user, week_start). UNIQUE constraint on
 * (user_id, week_start) prevents cron-retry duplicates.
 *
 * Email sending and /plan landing surface are Phase 2 slice 2 — this
 * function only generates and persists. The email worker reads from
 * weekly_friction_reviews and sets email_sent_at.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.52.7";
import {
  buildFrictionReviewPrompt,
  PROMPT_VERSION,
  validateReviewOutput,
  type FrictionReviewDay,
  type FrictionReviewInput,
  type FrictionReviewOutput,
} from "./p-friction-review-prompt.ts";

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

interface RequestBody {
  tracker_session_id?: string;
  cron?: boolean;
}

interface TargetSession {
  id: string;
  user_id: string;
  report_id: string;
  current_day: number;
  strand_status: Record<string, { rank: number; status: string; model_name: string }> | null;
  activated_at: string | null;
  subscription_status: string | null;
}

const OPENAI_MODEL = "gpt-5.4-mini"; // Move 6 re-pin off legacy gpt-4o (2026-08-18); json_schema strict mode

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      // body is optional; cron may POST {}
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    /* ─── Resolve target sessions ─── */
    let targets: TargetSession[] = [];
    let isCronMode = false;

    if (body.tracker_session_id) {
      // Manual / testing path. Require authed user who owns the session.
      const userId = getUserIdFromJwt(req.headers.get("authorization"));
      if (!userId) {
        return jsonResp(401, {
          error: "Unauthorized",
          response_text: "Authentication required.",
        });
      }
      const { data, error } = await supabase
        .from("tracker_sessions")
        .select(
          "id, user_id, report_id, current_day, strand_status, activated_at, subscription_status",
        )
        .eq("id", body.tracker_session_id)
        .single();
      if (error || !data) {
        return jsonResp(404, {
          error: "Session not found",
          response_text: "Tracker session not found.",
        });
      }
      if (data.user_id !== userId) {
        return jsonResp(403, {
          error: "Forbidden",
          response_text: "You do not own this tracker session.",
        });
      }
      targets = [data as TargetSession];
    } else if (body.cron === true) {
      isCronMode = true;
      // Cron path. Pull all active sessions past day 7 that don't have
      // a review for this week's window already.
      const weekStart = mondayOf(new Date()).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("tracker_sessions")
        .select(
          "id, user_id, report_id, current_day, strand_status, activated_at, subscription_status",
        )
        .eq("status", "active")
        .gte("current_day", 7);
      if (error) {
        console.error("generate-weekly-friction-review cron select error:", error);
        return jsonResp(500, {
          error: error.message,
          response_text: "Failed to enumerate sessions.",
        });
      }
      // Filter out sessions that already have a review for this week.
      const sessionIds = (data || []).map((s) => s.id);
      const { data: existing } = await supabase
        .from("weekly_friction_reviews")
        .select("tracker_session_id")
        .in("tracker_session_id", sessionIds.length > 0 ? sessionIds : [""])
        .eq("week_start", weekStart);
      const alreadyDone = new Set(
        (existing || []).map((r) => r.tracker_session_id),
      );
      targets = (data || []).filter((s) => !alreadyDone.has(s.id)) as TargetSession[];
    } else {
      return jsonResp(400, {
        error: "Missing body",
        response_text:
          "Provide either tracker_session_id (manual) or cron:true (batch).",
      });
    }

    /* ─── Process each target ─── */
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY") || "",
    });

    const results: Array<{
      tracker_session_id: string;
      status: "generated" | "skipped" | "failed";
      review_id?: string;
      error?: string;
      review?: FrictionReviewOutput;
    }> = [];

    for (const session of targets) {
      try {
        const generated = await generateOne(supabase, openai, session);
        results.push({
          tracker_session_id: session.id,
          status: "generated",
          review_id: generated.id,
          review: generated.review,
        });
      } catch (err) {
        console.error(
          `generate-weekly-friction-review failed for session ${session.id}:`,
          err,
        );
        results.push({
          tracker_session_id: session.id,
          status: "failed",
          error: String(err),
        });
      }
    }

    return jsonResp(200, {
      success: true,
      mode: isCronMode ? "cron" : "manual",
      processed: results.length,
      generated: results.filter((r) => r.status === "generated").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
      response_text: `Generated ${results.filter((r) => r.status === "generated").length} review(s) in ${Date.now() - startedAt}ms.`,
    });
  } catch (error) {
    console.error("generate-weekly-friction-review unhandled error:", error);
    return jsonResp(500, {
      error: String(error),
      response_text: "Failed to generate weekly friction review.",
    });
  }
});

/* ─────────────────────────── Per-session generation ─────────────────────────── */

async function generateOne(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  openai: OpenAI,
  session: TargetSession,
): Promise<{ id: string; review: FrictionReviewOutput }> {
  const startedAt = Date.now();
  const weekStart = mondayOf(new Date());
  const weekEnd = sundayOf(new Date());
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  // 1. Pull last 7 days of check-ins.
  const { data: checkins, error: checkinError } = await supabase
    .from("checkin_history")
    .select(
      "checkin_date, day_number, state, narrative_addition, plan_updates",
    )
    .eq("tracker_session_id", session.id)
    .gte("checkin_date", sevenDaysAgoIso)
    .order("checkin_date", { ascending: true });
  if (checkinError) {
    throw new Error(`checkin_history fetch failed: ${checkinError.message}`);
  }

  // 2. Pull any replan that fired in this window.
  const { data: replans } = await supabase
    .from("replans")
    .select("replan_summary, created_at")
    .eq("tracker_session_id", session.id)
    .gte("created_at", sevenDaysAgoIso)
    .order("created_at", { ascending: false })
    .limit(1);
  const replanSummary: string | null = replans && replans[0]?.replan_summary
    ? String(replans[0].replan_summary)
    : null;

  // 3. Pull archetype label from the report.
  const { data: report } = await supabase
    .from("reports")
    .select("core_report")
    .eq("id", session.report_id)
    .single();
  const archetype: string = (() => {
    const cr = report?.core_report as Record<string, unknown> | undefined;
    const arch = cr?.archetype_classification as Record<string, unknown> | undefined;
    const label = arch?.primary_archetype_label;
    return typeof label === "string" && label.length > 0
      ? label
      : "Mid-career professional";
  })();

  // 4. Build active strands list from strand_status.
  const activeStrands: string[] = (() => {
    if (!session.strand_status || typeof session.strand_status !== "object") return [];
    return Object.values(session.strand_status)
      .filter((s) => s && s.status === "active")
      .map((s) => s.model_name)
      .filter((n): n is string => typeof n === "string" && n.length > 0);
  })();

  // 5. Shape the last-7-days input. Fill in "no_checkin" days so the
  //    prompt sees silence as a real signal, not a gap.
  const days: FrictionReviewDay[] = (() => {
    const byDate = new Map<string, FrictionReviewDay>();
    for (const c of checkins || []) {
      // deno-lint-ignore no-explicit-any
      const row: any = c;
      const planUpdates = Array.isArray(row.plan_updates) ? row.plan_updates : [];
      byDate.set(row.checkin_date, {
        date: row.checkin_date,
        state: row.state as FrictionReviewDay["state"],
        narrative: row.narrative_addition ?? null,
        plan_updates: planUpdates.map((u: Record<string, unknown>) => ({
          task_id: String(u.task_id ?? ""),
          new_status: (u.new_status as FrictionReviewDay["plan_updates"][number]["new_status"]) ?? "moved",
          notes: u.notes ? String(u.notes) : null,
        })),
      });
    }
    // Walk 7 days oldest-first, fill gaps with no_checkin.
    const filled: FrictionReviewDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      filled.push(
        byDate.get(iso) ?? {
          date: iso,
          state: "no_checkin",
          narrative: null,
          plan_updates: [],
        },
      );
    }
    return filled;
  })();

  // 6. Build the prompt input.
  const promptInput: FrictionReviewInput = {
    archetype,
    current_day: session.current_day,
    plan_length: session.subscription_status === "active" ? "rolling" : "30",
    days,
    replan_summary: replanSummary,
    active_strands: activeStrands,
  };

  // 7. Call OpenAI with strict json_schema.
  const promptPayload = buildFrictionReviewPrompt(promptInput);
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.4, // low-medium — favour the data + voice rules over creativity
    messages: promptPayload.messages,
    response_format: promptPayload.response_format,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned empty response");
  }
  let parsed: FrictionReviewOutput;
  try {
    parsed = JSON.parse(raw) as FrictionReviewOutput;
  } catch (e) {
    throw new Error(`OpenAI returned non-JSON: ${(e as Error).message}`);
  }

  // 8. Validate against the voice contract (belt + braces on top of json_schema).
  const validation = validateReviewOutput(parsed);
  if (!validation.ok) {
    throw new Error(
      `Review validation failed: ${validation.errors.join("; ")}`,
    );
  }

  // 9. Persist. UPSERT by (user_id, week_start) to make this idempotent
  //    against cron retries.
  const latencyMs = Date.now() - startedAt;
  const { data: inserted, error: insertError } = await supabase
    .from("weekly_friction_reviews")
    .upsert(
      {
        user_id: session.user_id,
        tracker_session_id: session.id,
        week_start: weekStartIso,
        week_end: weekEndIso,
        review_content: parsed,
        prompt_version: PROMPT_VERSION,
        openai_model: OPENAI_MODEL,
        openai_usage: completion.usage,
        generation_latency_ms: latencyMs,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Persistence failed: ${insertError?.message || "unknown"}`);
  }

  return { id: (inserted as { id: string }).id, review: parsed };
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mondayOf(d: Date): Date {
  const result = new Date(d);
  const day = result.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function sundayOf(d: Date): Date {
  const m = mondayOf(d);
  const result = new Date(m);
  result.setUTCDate(m.getUTCDate() + 6);
  return result;
}
