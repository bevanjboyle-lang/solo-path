/*
 * generate-non-response-catcher v1 — 2026-05-18
 *
 * Coaching layer Phase 3 slice 2 (admin/coaching-layer-design.md v1.5 §4.2).
 *
 * Generates Non-Response Catcher interventions for sent Direct tasks that
 * have crossed the 5-day silence threshold. Dual-mode:
 *
 *   - Manual:  body = { tracker_session_id, task_id, force?: boolean }
 *              Processes one specific task (testing path; requires authed
 *              user who owns the session). `force: true` bypasses the
 *              5-day-old check so a freshly-sent task can be smoke-tested.
 *
 *   - Cron:    body = { cron: true }
 *              Scans every active tracker_session, walks its working_plan
 *              for sent Direct tasks past 5 days where response_received !=
 *              true and no existing non_response_catchers row covers the
 *              (session, task) pair. Generates a catcher row for each.
 *
 * Idempotency: the non_response_catchers table has UNIQUE
 * (tracker_session_id, task_id). We use upsert-with-DO-NOTHING semantics
 * (insert + ON CONFLICT IGNORE) so cron retries can't double-fire.
 *
 * Email + UI render in slice 3. This function only produces the data.
 *
 * verify_jwt:false because cron mode has no user JWT. Manual mode does its
 * own inline JWT decode + ownership check (mirrors generate-weekly-friction-review).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.52.7";
import {
  buildCatcherSystemPrompt,
  buildCatcherUserPrompt,
  CATCHER_RESPONSE_SCHEMA,
  PROMPT_VERSION,
  sanitiseCatcherOutput,
  validateCatcherOutput,
  type CatcherInput,
} from "./p-catcher-prompt.ts";

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
  task_id?: string;
  cron?: boolean;
  force?: boolean;
}

interface CandidateTask {
  user_id: string;
  tracker_session_id: string;
  task_id: string;
  task_description: string;
  sent_at: string;
  days_since_sent: number;
  outreach_draft: string | null;
  strand_id: string | null;
  strand_name: string | null;
  archetype_name: string | null;
}

const OPENAI_MODEL = "gpt-5.4-mini"; // Move 6 re-pin off legacy gpt-4o (2026-08-18)
const SILENCE_THRESHOLD_DAYS = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResp(500, {
      error: "Missing Supabase env",
      response_text: "Server configuration error.",
    });
  }
  if (!openaiKey) {
    return jsonResp(500, {
      error: "Missing OPENAI_API_KEY",
      response_text: "AI service not configured.",
    });
  }

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    return jsonResp(400, {
      error: "Invalid JSON",
      response_text: "Request body must be JSON.",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  /* ─────────── Manual mode ─────────── */
  if (body.tracker_session_id && body.task_id) {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return jsonResp(401, {
        error: "Unauthorized",
        response_text: "Authentication required for manual mode.",
      });
    }

    const candidate = await loadCandidateForManual(
      supabase,
      body.tracker_session_id,
      body.task_id,
      userId,
      body.force === true,
    );
    if ("error" in candidate) {
      return jsonResp(candidate.status, {
        error: candidate.error,
        response_text: candidate.error,
      });
    }

    const result = await processCandidate(supabase, openai, candidate.task);
    return jsonResp(200, {
      mode: "manual",
      processed: 1,
      result,
      response_text:
        result.status === "created"
          ? "Catcher generated."
          : result.status === "skipped_existing"
          ? "Catcher already exists for this task — skipped."
          : "Catcher generation failed (see violations).",
    });
  }

  /* ─────────── Cron mode ─────────── */
  if (body.cron !== true) {
    return jsonResp(400, {
      error: "Invalid request",
      response_text:
        "Body must be either { cron: true } or { tracker_session_id, task_id }.",
    });
  }

  const candidates = await loadCandidatesForCron(supabase);
  console.log(
    `generate-non-response-catcher: ${candidates.length} candidate task(s)`,
  );

  let created = 0;
  let skipped = 0;
  let errored = 0;
  const errors: string[] = [];

  for (const task of candidates) {
    const result = await processCandidate(supabase, openai, task);
    if (result.status === "created") created++;
    else if (result.status === "skipped_existing") skipped++;
    else {
      errored++;
      errors.push(
        `task=${task.task_id} session=${task.tracker_session_id}: ${result.error ?? "unknown"}`,
      );
    }
  }

  console.log(
    `generate-non-response-catcher: created=${created} skipped=${skipped} errored=${errored}`,
  );

  return jsonResp(200, {
    mode: "cron",
    processed: candidates.length,
    created,
    skipped,
    errored,
    errors: errors.slice(0, 10), // truncate; full list in logs
    response_text: `Generated ${created} catcher(s), skipped ${skipped}, errored ${errored}.`,
  });
});

/* ────────────────────────── Candidate loaders ────────────────────────── */

/**
 * Manual mode: load the single specified task and verify ownership.
 * Skips the 5-day age check if force=true (smoke-test ergonomics).
 */
async function loadCandidateForManual(
  supabase: ReturnType<typeof createClient>,
  trackerSessionId: string,
  taskId: string,
  callerUserId: string,
  force: boolean,
): Promise<{ task: CandidateTask } | { error: string; status: number }> {
  const { data: session, error: sessionErr } = await supabase
    .from("tracker_sessions")
    .select("id, user_id, report_id, working_plan, strand_status")
    .eq("id", trackerSessionId)
    .single();

  if (sessionErr || !session) {
    return { error: "Tracker session not found.", status: 404 };
  }
  if ((session as { user_id: string }).user_id !== callerUserId) {
    return { error: "You do not own this tracker session.", status: 403 };
  }

  const task = findTaskInWorkingPlan(
    (session as { working_plan: unknown }).working_plan,
    taskId,
  );
  if (!task) {
    return { error: "Task not found in plan.", status: 404 };
  }

  // Eligibility (relaxed by force).
  if (task.move_type !== "direct") {
    return {
      error: `Task is move_type=${task.move_type}, not 'direct'. v1 Catcher is Direct-only.`,
      status: 400,
    };
  }
  if (task.status !== "sent") {
    return {
      error: `Task status is ${task.status ?? "null"}, not 'sent'.`,
      status: 400,
    };
  }
  if (task.response_received === true) {
    return {
      error: "Task already has response_received=true — Catcher suppressed.",
      status: 400,
    };
  }
  if (!task.sent_at) {
    return { error: "Task has no sent_at timestamp.", status: 400 };
  }

  const daysSince = daysBetween(new Date(task.sent_at), new Date());
  if (!force && daysSince < SILENCE_THRESHOLD_DAYS) {
    return {
      error: `Task sent ${daysSince.toFixed(1)} days ago — under ${SILENCE_THRESHOLD_DAYS}-day threshold. Pass force:true to override for smoke testing.`,
      status: 400,
    };
  }

  // Resolve strand metadata.
  const strandInfo = resolveStrandFromSession(
    (session as {
      strand_status: Record<string, { model_name?: string; archetype_name?: string }> | null;
    }).strand_status,
    task.strand_id,
  );

  return {
    task: {
      user_id: callerUserId,
      tracker_session_id: trackerSessionId,
      task_id: taskId,
      task_description: task.description,
      sent_at: task.sent_at,
      days_since_sent: daysSince,
      outreach_draft: task.outreach_draft ?? null,
      strand_id: task.strand_id,
      strand_name: strandInfo.model_name,
      archetype_name: strandInfo.archetype_name,
    },
  };
}

/**
 * Cron mode: walk every active tracker_session, scan its working_plan for
 * candidate sent Direct tasks past the 5-day window with no existing
 * catcher row. Returns the candidates flat for sequential processing.
 *
 * Two-step: pull all eligible sessions, then in-process filter the task
 * list against non_response_catchers via a single bulk SELECT.
 */
async function loadCandidatesForCron(
  supabase: ReturnType<typeof createClient>,
): Promise<CandidateTask[]> {
  const { data: sessions, error: sessionsErr } = await supabase
    .from("tracker_sessions")
    .select("id, user_id, report_id, working_plan, strand_status")
    .eq("status", "active");

  if (sessionsErr || !sessions) {
    console.error("Catcher candidate fetch error:", sessionsErr);
    return [];
  }

  const now = new Date();
  const candidates: CandidateTask[] = [];

  for (const session of sessions as Array<{
    id: string;
    user_id: string;
    working_plan: unknown;
    strand_status: Record<string, { model_name?: string; archetype_name?: string }> | null;
  }>) {
    const tasks = walkWorkingPlanForDirectSent(session.working_plan);
    for (const t of tasks) {
      if (t.response_received === true) continue;
      if (!t.sent_at) continue;
      const daysSince = daysBetween(new Date(t.sent_at), now);
      if (daysSince < SILENCE_THRESHOLD_DAYS) continue;
      const strandInfo = resolveStrandFromSession(
        session.strand_status,
        t.strand_id,
      );
      candidates.push({
        user_id: session.user_id,
        tracker_session_id: session.id,
        task_id: t.task_id,
        task_description: t.description,
        sent_at: t.sent_at,
        days_since_sent: daysSince,
        outreach_draft: t.outreach_draft ?? null,
        strand_id: t.strand_id,
        strand_name: strandInfo.model_name,
        archetype_name: strandInfo.archetype_name,
      });
    }
  }

  if (candidates.length === 0) return [];

  // Filter out any task that already has a catcher row. Single bulk
  // SELECT against the unique constraint columns.
  const sessionTaskPairs = candidates.map(
    (c) => `${c.tracker_session_id}:${c.task_id}`,
  );
  const { data: existing, error: existingErr } = await supabase
    .from("non_response_catchers")
    .select("tracker_session_id, task_id")
    .in(
      "tracker_session_id",
      Array.from(new Set(candidates.map((c) => c.tracker_session_id))),
    );

  if (existingErr) {
    console.warn(
      "Catcher dedup query failed — continuing with all candidates:",
      existingErr,
    );
    return candidates;
  }

  const existingKeys = new Set(
    (existing as Array<{ tracker_session_id: string; task_id: string }>).map(
      (r) => `${r.tracker_session_id}:${r.task_id}`,
    ),
  );

  return candidates.filter(
    (_, idx) => !existingKeys.has(sessionTaskPairs[idx]),
  );
}

/* ────────────────────────── Per-task processor ────────────────────────── */

interface ProcessResult {
  status: "created" | "skipped_existing" | "errored";
  task_id: string;
  tracker_session_id: string;
  catcher_row_id?: string;
  violations?: string[];
  error?: string;
}

async function processCandidate(
  supabase: ReturnType<typeof createClient>,
  openai: OpenAI,
  task: CandidateTask,
): Promise<ProcessResult> {
  try {
    // Resolve user.first_name + archetype_summary for the prompt.
    const userContext = await loadUserContextForPrompt(
      supabase,
      task.user_id,
      task.tracker_session_id,
    );

    // Light check-in signals (last 7 days).
    const checkInSignals = await loadRecentCheckInSignals(
      supabase,
      task.tracker_session_id,
    );

    const promptInput: CatcherInput = {
      task: {
        task_id: task.task_id,
        description: task.task_description,
        sent_at: task.sent_at,
        days_since_sent: Math.round(task.days_since_sent),
        outreach_draft: task.outreach_draft,
        recipient_role_hint: null,
      },
      strand: {
        strand_id: task.strand_id ?? "unknown",
        model_name: task.strand_name ?? "your active strand",
        archetype_name: task.archetype_name,
      },
      user: {
        first_name: userContext.first_name,
        archetype_summary: userContext.archetype_summary,
      },
      recent_check_in_signals: checkInSignals,
    };

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildCatcherSystemPrompt() },
        { role: "user", content: buildCatcherUserPrompt(promptInput) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: CATCHER_RESPONSE_SCHEMA,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return {
        status: "errored",
        task_id: task.task_id,
        tracker_session_id: task.tracker_session_id,
        error: "OpenAI returned empty content",
      };
    }

    const parsed = JSON.parse(raw) as Parameters<typeof validateCatcherOutput>[0];
    // Sanitise first — currently strips em-dashes that the LLM occasionally
    // produces despite the system prompt forbidding them. Smoke 2026-05-18
    // showed one slipped into a follow-up body; warn-only treatment isn't
    // enough for the highest-priority voice violation, so we rewrite in
    // place before validation + persist.
    sanitiseCatcherOutput(parsed);
    const violations = validateCatcherOutput(parsed);
    if (violations) {
      console.warn(
        `Catcher voice violations for task=${task.task_id}: ${violations.join("; ")}`,
      );
      // Voice violations are warnings, not failures. We still persist the
      // row but tag it for review via the prompt_version field. If we
      // later want hard-rejection, the validator returns the list here.
    }

    // Insert with ON CONFLICT DO NOTHING (the UNIQUE constraint enforces
    // dedup; a concurrent cron tick that beat us to it just no-ops).
    const { data: inserted, error: insertErr } = await supabase
      .from("non_response_catchers")
      .upsert(
        {
          user_id: task.user_id,
          tracker_session_id: task.tracker_session_id,
          task_id: task.task_id,
          catcher_content: parsed,
          prompt_version: PROMPT_VERSION,
          dispatched_at: new Date().toISOString(),
        },
        {
          onConflict: "tracker_session_id,task_id",
          ignoreDuplicates: true,
        },
      )
      .select("id")
      .maybeSingle();

    if (insertErr) {
      return {
        status: "errored",
        task_id: task.task_id,
        tracker_session_id: task.tracker_session_id,
        error: `DB insert failed: ${insertErr.message}`,
      };
    }

    if (!inserted) {
      // Conflict path — row already existed (race with another cron tick).
      return {
        status: "skipped_existing",
        task_id: task.task_id,
        tracker_session_id: task.tracker_session_id,
      };
    }

    return {
      status: "created",
      task_id: task.task_id,
      tracker_session_id: task.tracker_session_id,
      catcher_row_id: (inserted as { id: string }).id,
      violations: violations ?? undefined,
    };
  } catch (err) {
    console.error(`Catcher generate threw for task=${task.task_id}:`, err);
    return {
      status: "errored",
      task_id: task.task_id,
      tracker_session_id: task.tracker_session_id,
      error: (err as Error)?.message ?? String(err),
    };
  }
}

/* ────────────────────────── Context loaders ────────────────────────── */

async function loadUserContextForPrompt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  trackerSessionId: string,
): Promise<{ first_name: string | null; archetype_summary: string | null }> {
  // Try user_profiles first.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("first_name")
    .eq("user_id", userId)
    .maybeSingle();

  // Archetype summary from the core_report (via the tracker_session.report_id).
  const { data: session } = await supabase
    .from("tracker_sessions")
    .select("report_id")
    .eq("id", trackerSessionId)
    .single();
  const reportId = (session as { report_id?: string } | null)?.report_id;

  let archetypeSummary: string | null = null;
  if (reportId) {
    const { data: report } = await supabase
      .from("reports")
      .select("core_report")
      .eq("id", reportId)
      .single();
    const cr = (report as { core_report?: Record<string, unknown> } | null)
      ?.core_report;
    if (cr) {
      // Prefer the archetype name + 1-line summary if present in core_report.
      const arch = (cr as Record<string, unknown>).archetype as
        | { name?: string; summary?: string; one_liner?: string }
        | undefined;
      if (arch) {
        archetypeSummary = arch.one_liner ?? arch.summary ?? arch.name ?? null;
      }
    }
  }

  return {
    first_name: (profile as { first_name?: string } | null)?.first_name ?? null,
    archetype_summary: archetypeSummary,
  };
}

async function loadRecentCheckInSignals(
  supabase: ReturnType<typeof createClient>,
  trackerSessionId: string,
): Promise<CatcherInput["recent_check_in_signals"]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: rows } = await supabase
    .from("checkin_history")
    .select("state, narrative_addition, created_at")
    .eq("tracker_session_id", trackerSessionId)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(7);

  if (!rows || rows.length === 0) return undefined;

  const typed = rows as Array<{
    state: string | null;
    narrative_addition: string | null;
  }>;
  const states = typed
    .map((r) => r.state)
    .filter((s): s is string => !!s);
  const mostRecentAddition =
    typed.find((r) => r.narrative_addition && r.narrative_addition.trim().length > 0)
      ?.narrative_addition ?? null;

  return {
    states,
    most_recent_addition: mostRecentAddition,
  };
}

/* ─────────────────────── working_plan walkers ─────────────────────── */

interface RawTask {
  task_id: string;
  description: string;
  move_type?: string | null;
  status?: string | null;
  sent_at?: string | null;
  response_received?: boolean | null;
  outreach_draft?: string | null;
  strand_id?: string | null;
}

function findTaskInWorkingPlan(
  workingPlan: unknown,
  taskId: string,
): RawTask | null {
  const phases = (workingPlan as {
    activation_plan?: { phases?: Array<{ days_detail?: Array<{ tasks?: RawTask[] }> }> };
  })?.activation_plan?.phases;
  if (!Array.isArray(phases)) return null;
  for (const phase of phases) {
    if (!Array.isArray(phase?.days_detail)) continue;
    for (const day of phase.days_detail) {
      if (!Array.isArray(day?.tasks)) continue;
      for (const task of day.tasks) {
        if (task?.task_id === taskId) return task;
      }
    }
  }
  return null;
}

function walkWorkingPlanForDirectSent(workingPlan: unknown): RawTask[] {
  const out: RawTask[] = [];
  const phases = (workingPlan as {
    activation_plan?: { phases?: Array<{ days_detail?: Array<{ tasks?: RawTask[] }> }> };
  })?.activation_plan?.phases;
  if (!Array.isArray(phases)) return out;
  for (const phase of phases) {
    if (!Array.isArray(phase?.days_detail)) continue;
    for (const day of phase.days_detail) {
      if (!Array.isArray(day?.tasks)) continue;
      for (const task of day.tasks) {
        if (task?.move_type === "direct" && task?.status === "sent") {
          out.push(task);
        }
      }
    }
  }
  return out;
}

function resolveStrandFromSession(
  strandStatus: Record<string, { model_name?: string; archetype_name?: string }> | null,
  strandId: string | null,
): { model_name: string | null; archetype_name: string | null } {
  if (!strandStatus || !strandId)
    return { model_name: null, archetype_name: null };
  const info = strandStatus[strandId];
  return {
    model_name: info?.model_name ?? null,
    archetype_name: info?.archetype_name ?? null,
  };
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
