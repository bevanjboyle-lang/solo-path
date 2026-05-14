// process-checkin v38 — vibe code review fixes — 2026-05-14
//
// V-042: PROMPT_5_SYSTEM + CATCH_UP_ADDENDUM + PORTFOLIO_ADDENDUM extracted to
//        sibling file p5-checkin-prompt.ts. Same ADR-019 pattern as P1/P3.
//        Prompt content is unchanged; only the location moved.
// V-045: switched both OpenAI calls from response_format json_object to strict
//        json_schema so the model's output is structurally guaranteed (matches
//        the schema in p5-checkin-prompt.ts header). Removes a class of parse
//        fallback paths that V-043 was guarding against. The V-043 502 guard
//        stays — strict mode does not eliminate every truncation/parse case.
//
// process-checkin v37 — vibe code review fixes — 2026-05-14
//
// V-041: added FUNCTION_VERSION constant (previously missing — the only authed function
//        in the codebase without one). Replaced the hardcoded "v29" log line with
//        ${FUNCTION_VERSION} so triage logs reflect actual deployed version.
// V-043: replaced the JSON-parse-failure default-msg fallback with a 502 return so
//        we don't fabricate fake "successful" check-ins. Previously a malformed model
//        output silently produced a default check-in_history row.
// V-046: added finish_reason === "length" check after each OpenAI call. On truncation
//        return 502 rather than persisting a partial response.
// V-047: strand_signals dedup. Previously the same (strand_id, signal) tuple could be
//        appended twice across exchanges, double-incrementing traction_score.
//
// process-checkin v36 — 2026-05-07: F79 — added worked example for the on_track +
//   tasks completed scenario. Without it, the AI was conservative about emitting
//   plan_updates with new_status="completed" even when the user explicitly confirmed
//   all today's tasks were done — leaving tracker_sessions.tasks_completed at 0. The
//   on_track example makes the expected behaviour explicit.
// process-checkin v35 — 2026-05-07: F85 follow-up — days_detail.day is a STRING ("Day 1",
//   "Day 2"), not a number. My v34 cast it directly as number, got NaN, and relevantTasks
//   was still empty. Added parseDayNumber() to extract the digit out of strings like "Day 1"
//   so the filter actually accepts tasks. Confirmed live shape via execute_sql probe.
// process-checkin v34 — 2026-05-07: F85 — flattenTasks + applyPlanUpdates now handle both
//   working_plan shapes that exist in the live system: pre-replan deep
//   (working_plan.activation_plan.phases[].days_detail[].tasks[] with task.task_id, day on
//   the parent days_detail entry) AND post-replan flat (working_plan.phases[].tasks[] with
//   task.id, day on the task). Previously flattenTasks expected only the flat shape, so
//   for any user before their first replan, relevantTasks was empty, P5 saw no tasks, and
//   couldn't emit plan_updates. Worked example in the prompt updated to use canonical
//   D{day}_T{n} task IDs and task_id field (matching the actual live data shape).
// process-checkin v33 — 2026-05-07: F84 — explicit plan_updates entry schema in prompt + tighter
//   state classifier. Two upstream gaps were producing four observed bugs (F79/F81/F82/F83):
//
//   (1) PROMPT_5_SYSTEM never specified the schema for plan_updates entries — the output
//   format just showed `"plan_updates": []`. The model invented its own schema (e.g. {tasks:
//   [...], action: "move", to_day: 3, from_day: 2}), which applyPlanUpdates couldn't match
//   against any task.id, so working_plan never mutated and tasks_completed never incremented.
//   Fix: declare the canonical entry schema in-line ({task_id, new_status, new_target_date,
//   notes}) and add a worked example for the "user reports being behind" scenario.
//
//   (2) State determination rules let "0-1 days since last check-in" override the other two
//   conditions, so a user reporting "i didn't do today's tasks, i'm overwhelmed" got
//   classified on_track. With state stuck at on_track, replan_required stayed false and the
//   replan path never fired. Fix: on_track now requires ALL THREE conditions (day count +
//   completion + no overwhelm/stuck signals); explicit drifting fallback for "tasks missed
//   today" or "user expresses being overwhelmed/stuck/behind"; explicit
//   significantly_behind escalation for "user explicitly asks for replan".
//
//   F79 + F83 are downstream of the above and resolve when the contract is correct.
//   F80 (TodayCard not flipping to done_today after first check-in) is a separate Plan.tsx
//   issue, intermittent — not addressed here.
// process-checkin v32 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// process-checkin v29 — F45 (2026-04-19): accept `response` key in userMessage OR chain so /plan CheckInPanel callers work (Plan.tsx sends {session_id, response}). Backward-compatible with /checkin long-schema callers.
// v28: P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v27 baseline: 2026-04-17 Audit P1 #9 fix — traction signals parameterised by move type.
// Earlier history:
//   - v27: buildTractionSignalsReference accepts per-strand move_type, selected_strands pulled
//     from reports.selected_strands, PORTFOLIO_ADDENDUM updated for move-type-aware signal reading.
//   - v26: user-confirmed replan (v17 narrative).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";
// V-042 (vibe code review 2026-05-14): prompt content lives in sibling file.
import { PROMPT_5_SYSTEM, CATCH_UP_ADDENDUM, PORTFOLIO_ADDENDUM } from "./p5-checkin-prompt.ts";

// V-041 (vibe code review 2026-05-14): added FUNCTION_VERSION constant.
const FUNCTION_VERSION = "v38-vibe-review-fixes";

// V-045 (vibe code review 2026-05-14): strict json_schema for the P5 response.
// Replaces response_format: { type: "json_object" } which only ensured *some*
// JSON, not a structurally valid one. With strict:true the model is forced to
// emit exactly these fields, types, and (where enumerated) values.
//
// All top-level fields are required (strict-mode requirement). Optional fields
// are typed as nullable in the schema. Array-typed fields are always required
// and may be empty.
const P5_RESPONSE_SCHEMA = {
  name: "p5_checkin_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "state",
      "response_text",
      "plan_updates",
      "outreach_outcomes",
      "narrative_addition",
      "replan_required",
      "replan_context",
      "check_in_complete",
      "exchange_count",
      "strand_signals",
      "strand_status_updates",
      "portfolio_review_record",
    ],
    properties: {
      state: {
        type: "string",
        enum: ["on_track", "drifting", "significantly_behind"],
      },
      response_text: { type: "string" },
      plan_updates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["task_id", "new_status", "new_target_date", "notes"],
          properties: {
            task_id: { type: "string" },
            new_status: { type: "string", enum: ["completed", "missed", "moved"] },
            new_target_date: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
          },
        },
      },
      outreach_outcomes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["strand_id", "outcome", "notes"],
          properties: {
            strand_id: { type: ["string", "null"] },
            outcome: { type: "string" },
            notes: { type: ["string", "null"] },
          },
        },
      },
      narrative_addition: { type: ["string", "null"] },
      replan_required: { type: "boolean" },
      replan_context: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["circumstance_type", "circumstance_detail", "triggered_at"],
        properties: {
          circumstance_type: { type: "string" },
          circumstance_detail: { type: "string" },
          triggered_at: { type: "string" },
        },
      },
      check_in_complete: { type: "boolean" },
      exchange_count: { type: "integer" },
      strand_signals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["strand_id", "signal_type", "signal", "source"],
          properties: {
            strand_id: { type: "string" },
            signal_type: {
              type: "string",
              enum: ["moderate", "strong", "very_strong", "negative"],
            },
            signal: { type: "string" },
            source: { type: ["string", "null"] },
          },
        },
      },
      strand_status_updates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["strand_id", "new_status", "reason"],
          properties: {
            strand_id: { type: "string" },
            new_status: {
              type: "string",
              enum: ["active", "watching", "paused", "graduated"],
            },
            reason: { type: ["string", "null"] },
          },
        },
      },
      portfolio_review_record: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["review_number", "day", "strand_assessments", "focus_strands_after", "summary"],
        properties: {
          review_number: { type: "integer" },
          day: { type: "integer" },
          strand_assessments: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
          focus_strands_after: {
            type: "array",
            items: { type: "string" },
          },
          summary: { type: "string" },
        },
      },
    },
  },
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";
const MODEL_TIER2 = "gpt-5.4-mini";
const MODEL_TIER3 = "gpt-5.4-nano";

// ── Audit P1 #9: Move-type-specific traction signal library ─────────────────────
// Each move type has its own success/failure signals. Prompt 5 uses these to
// read traction relative to how the strand is actually being worked.
const TRACTION_SIGNALS_BY_MOVE_TYPE: Record<string, Array<{ signal: string; weight: string }>> = {
  direct: [
    { signal: "Contact replies to reconnect email", weight: "moderate" },
    { signal: "Meeting or call booked with potential client", weight: "very_strong" },
    { signal: "Proposal or scoping request received", weight: "very_strong" },
    { signal: "Referral received from network contact", weight: "strong" },
    { signal: "Positive response but no next step yet", weight: "moderate" },
    { signal: "No response after 3+ outreach attempts", weight: "negative" },
  ],
  platform: [
    { signal: "Profile or listing published and live on marketplace", weight: "moderate" },
    { signal: "First inbound enquiry received via platform", weight: "strong" },
    { signal: "Call, booking, or scoping request arrived via platform", weight: "very_strong" },
    { signal: "Paid engagement initiated through platform", weight: "very_strong" },
    { signal: "Profile views or saved-search matches trending up week-on-week", weight: "moderate" },
    { signal: "Peer or adjacent profile endorsing / referring on platform", weight: "strong" },
    { signal: "No inbound activity after 2+ weeks live on platform", weight: "negative" },
  ],
  visibility: [
    { signal: "Post or article published and reaching target audience", weight: "moderate" },
    { signal: "Comments or reactions from ICP / target buyer type", weight: "strong" },
    { signal: "Direct message from target contact triggered by content", weight: "very_strong" },
    { signal: "Inbound conversation or enquiry attributable to the post", weight: "very_strong" },
    { signal: "Post shared or reposted by a relevant figure", weight: "strong" },
    { signal: "New followers from target sector", weight: "moderate" },
    { signal: "Low engagement across 3+ posts and no inbound", weight: "negative" },
  ],
  community: [
    { signal: "Accepted into community or onboarded to group", weight: "moderate" },
    { signal: "First meaningful contribution posted or shared", weight: "moderate" },
    { signal: "Direct response or engagement from a community member", weight: "strong" },
    { signal: "Introduction or warm referral via community", weight: "very_strong" },
    { signal: "Invitation to speak, collaborate, or partner", weight: "very_strong" },
    { signal: "Contribution visibly picked up by target contact", weight: "strong" },
    { signal: "No engagement after 3+ contributions", weight: "negative" },
  ],
  mixed: [
    { signal: "Inbound reply, enquiry, or booking from any channel", weight: "strong" },
    { signal: "Meeting, scoping call, or proposal request", weight: "very_strong" },
    { signal: "Paid engagement or signed contract", weight: "very_strong" },
    { signal: "Referral or introduction from network or community", weight: "strong" },
    { signal: "Target contact engaged with content or profile", weight: "moderate" },
    { signal: "Positive signal but no concrete next step yet", weight: "moderate" },
    { signal: "No inbound across all move types for 2+ weeks", weight: "negative" },
  ],
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// F85 (2026-05-07): handle both shapes of working_plan that exist in the live system.
//
// PRE-REPLAN (from generate-plan / P3): nested 3 levels deep
//   working_plan.activation_plan.phases[].days_detail[].tasks[]
//   - task identifier key: task_id
//   - day number lives on the parent days_detail entry (.day), not the task
//   - task.status may be missing entirely on first read
//
// POST-REPLAN (from process-replan's buildReplanWorkingPlan): flat 1 level
//   working_plan.phases[].tasks[]
//   - task identifier key: id
//   - task carries .day directly
//   - task.status is set ("pending"/"completed"/etc.)
//
// flattenTasks must return tasks normalised so downstream code can read
// task.task_id (the canonical id) and task.day (the day number) regardless
// of which shape the row was in. We do NOT mutate the source — we shallow-
// clone each task and add normalised fields if missing.
// F85 v35 (2026-05-07): the live deep shape stores the day number as a STRING
// ("Day 1", "Day 2") on the days_detail entry, NOT as a number. We parse the
// digit out of whatever we find. Accepts: number directly, string like "Day 1",
// strings with leading whitespace, etc.
function parseDayNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    if (match) {
      const n = parseInt(match[0], 10);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function flattenTasks(workingPlan: Record<string, unknown>): unknown[] {
  const tasks: unknown[] = [];
  if (!workingPlan) return tasks;

  // Resolve where phases live: prefer activation_plan.phases (deep shape),
  // fall back to phases (flat shape from process-replan).
  const innerActivationPlan = workingPlan.activation_plan as Record<string, unknown> | undefined;
  const phases =
    (innerActivationPlan?.phases as unknown[]) ||
    (workingPlan.phases as unknown[]) ||
    [];

  for (const phase of phases) {
    const p = phase as Record<string, unknown>;

    // Flat shape: phase.tasks[] (post-replan). Tasks already carry .id and .day.
    const directTasks = (p.tasks as Record<string, unknown>[]) || [];
    if (directTasks.length > 0) {
      for (const t of directTasks) {
        // Normalise: ensure task_id is present (mirror id) so downstream code
        // can match either key without caring about shape.
        const normalised = {
          ...t,
          task_id: (t.task_id as string) || (t.id as string) || null,
        };
        tasks.push(normalised);
      }
      continue;
    }

    // Deep shape: phase.days_detail[].tasks[] (pre-replan from P3).
    // Day number lives on the days_detail entry — annotate each task with it.
    // The live shape stores .day as a string ("Day 1") not a number — parse it.
    const daysDetail = (p.days_detail as Record<string, unknown>[]) || [];
    for (const dayEntry of daysDetail) {
      const dayNum =
        parseDayNumber(dayEntry.day) ??
        parseDayNumber(dayEntry.day_number) ??
        null;
      const dayTasks = (dayEntry.tasks as Record<string, unknown>[]) || [];
      for (const t of dayTasks) {
        const taskOwnDay = parseDayNumber(t.day);
        const normalised = {
          ...t,
          day: taskOwnDay ?? dayNum,
          task_id: (t.task_id as string) || (t.id as string) || null,
        };
        tasks.push(normalised);
      }
    }
  }
  return tasks;
}

// F85 (2026-05-07): descend through both shapes (pre-replan deep, post-replan flat)
// and match either task.task_id (canonical, P3 output) OR task.id (process-replan output).
function applyPlanUpdates(
  workingPlan: Record<string, unknown>,
  planUpdates: Record<string, unknown>[]
): Record<string, unknown> {
  if (!planUpdates || planUpdates.length === 0) return workingPlan;
  const updated = JSON.parse(JSON.stringify(workingPlan));

  // Resolve phases container: deep shape uses updated.activation_plan.phases,
  // flat shape uses updated.phases.
  const innerActivationPlan = updated.activation_plan as Record<string, unknown> | undefined;
  const phases =
    ((innerActivationPlan?.phases as Record<string, unknown>[]) ||
      (updated.phases as Record<string, unknown>[]) ||
      []);

  function tryUpdate(task: Record<string, unknown>, taskId: string, newStatus: string, newTargetDate: string | null, notes: string | undefined): boolean {
    if (task.task_id === taskId || task.id === taskId) {
      task.status = newStatus;
      if (newTargetDate) task.target_date = newTargetDate;
      if (notes) task.update_notes = notes;
      return true;
    }
    return false;
  }

  for (const update of planUpdates) {
    const taskId = update.task_id as string;
    const newStatus = update.new_status as string;
    const newTargetDate = update.new_target_date as string | null;
    const notes = update.notes as string | undefined;
    if (!taskId || !newStatus) continue;

    for (const phase of phases) {
      // Flat shape: phase.tasks[]
      const directTasks = (phase.tasks as Record<string, unknown>[]) || [];
      for (const task of directTasks) {
        tryUpdate(task, taskId, newStatus, newTargetDate, notes);
      }
      // Deep shape: phase.days_detail[].tasks[]
      const daysDetail = (phase.days_detail as Record<string, unknown>[]) || [];
      for (const dayEntry of daysDetail) {
        const dayTasks = (dayEntry.tasks as Record<string, unknown>[]) || [];
        for (const task of dayTasks) {
          tryUpdate(task, taskId, newStatus, newTargetDate, notes);
        }
      }
    }
  }
  return updated;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function applyStrandSignals(
  strandStatus: Record<string, unknown>,
  strandSignals: Record<string, unknown>[]
): Record<string, unknown> {
  if (!strandSignals || strandSignals.length === 0) return strandStatus;
  const updated = JSON.parse(JSON.stringify(strandStatus));
  const signalWeights: Record<string, number> = {
    very_strong: 3, strong: 2, moderate: 1, negative: -1,
  };
  for (const signal of strandSignals) {
    const strandId = signal.strand_id as string;
    if (!updated[strandId]) continue;
    const strand = updated[strandId] as Record<string, unknown>;
    const weight = signalWeights[signal.signal_type as string] ?? 0;
    const currentScore = (strand.traction_score as number) || 0;
    strand.traction_score = Math.max(0, currentScore + weight);
    const signalsObserved = (strand.signals_observed as string[]) || [];
    signalsObserved.push(signal.signal as string);
    strand.signals_observed = signalsObserved;
  }
  return updated;
}

function applyStrandStatusUpdates(
  strandStatus: Record<string, unknown>,
  updates: Record<string, unknown>[],
  currentFocusStrands: string[] | null
): { updatedStatus: Record<string, unknown>; updatedFocusStrands: string[] } {
  if (!updates || updates.length === 0) {
    return {
      updatedStatus: strandStatus,
      updatedFocusStrands: currentFocusStrands || Object.keys(strandStatus),
    };
  }
  const updated = JSON.parse(JSON.stringify(strandStatus));
  const newFocusStrands: string[] = [];
  for (const update of updates) {
    const strandId = update.strand_id as string;
    if (!updated[strandId]) continue;
    const strand = updated[strandId] as Record<string, unknown>;
    strand.status = update.new_status;
    if (update.reason) strand.last_review_note = update.reason;
  }
  for (const [strandId, strandData] of Object.entries(updated)) {
    const strand = strandData as Record<string, unknown>;
    if (strand.status === "active" || strand.status === "graduated") {
      newFocusStrands.push(strandId);
    }
  }
  return {
    updatedStatus: updated,
    updatedFocusStrands: newFocusStrands.length > 0
      ? newFocusStrands
      : (currentFocusStrands || Object.keys(strandStatus)),
  };
}

function getPortfolioReviewsCompleted(portfolioReviews: unknown): number {
  if (!portfolioReviews || !Array.isArray(portfolioReviews)) return 0;
  return portfolioReviews.length;
}

// ── Audit P1 #9: Build a move-type lookup keyed by strand_id ─────────────────
// selected_strands lives on the reports table per portfolio-planning-design.md.
// Each strand object carries: business_model_id, primary_move_type, warmth_type,
// structural_warmth. We index these by the key used in strand_status (strand_id)
// AND by business_model_id so lookups work regardless of which key P3 chose.
function buildMoveTypeLookup(
  selectedStrands: Array<Record<string, unknown>> | null
): Record<string, { move_type: string; warmth_type: string; structural_warmth: boolean }> {
  const lookup: Record<string, { move_type: string; warmth_type: string; structural_warmth: boolean }> = {};
  if (!selectedStrands || !Array.isArray(selectedStrands)) return lookup;
  for (const s of selectedStrands) {
    const moveType = (s.primary_move_type as string) || "direct";
    const structuralWarmth = (s.structural_warmth as boolean) ?? false;
    const warmthType = (s.warmth_type as string)
      || (structuralWarmth ? "structural" : "relational");
    const entry = { move_type: moveType, warmth_type: warmthType, structural_warmth: structuralWarmth };
    const bmId = s.business_model_id as string | undefined;
    const strandId = s.strand_id as string | undefined;
    const modelName = s.model_name as string | undefined;
    if (bmId) lookup[bmId] = entry;
    if (strandId) lookup[strandId] = entry;
    if (modelName) lookup[modelName] = entry;
  }
  return lookup;
}

// ── Audit P1 #9: Parameterised by per-strand move_type ──────────────────────
// For each strand in strand_status, emit the signal set matching that strand's
// primary_move_type. Strands may also carry move_type on the strand_status
// entry itself (populated by P3) — that takes priority over selectedStrands.
// If neither source has move_type, fall back to "mixed" (union of signals)
// rather than defaulting to Direct — this avoids the v26 bug where Platform /
// Visibility / Community strands were scored against Direct-only signals.
function buildTractionSignalsReference(
  strandStatus: Record<string, unknown>,
  moveTypeLookup: Record<string, { move_type: string; warmth_type: string; structural_warmth: boolean }>
): unknown[] {
  return Object.entries(strandStatus).map(([strandId, strandData]) => {
    const strand = strandData as Record<string, unknown>;
    const strandMoveType = (strand.primary_move_type as string) || null;
    const strandWarmthType = (strand.warmth_type as string) || null;
    const strandStructuralWarmth = (strand.structural_warmth as boolean) ?? null;
    const bmId = (strand.business_model_id as string) || null;
    const modelName = (strand.model_name as string) || null;

    // Resolution order: strand_status → lookup[strand_id] → lookup[bmId] → lookup[model_name] → "mixed"
    const lookupHit =
      moveTypeLookup[strandId] ||
      (bmId ? moveTypeLookup[bmId] : undefined) ||
      (modelName ? moveTypeLookup[modelName] : undefined);

    const moveType = strandMoveType
      || lookupHit?.move_type
      || "mixed";

    const warmthType = strandWarmthType
      || lookupHit?.warmth_type
      || (strandStructuralWarmth ? "structural" : "relational");

    const structuralWarmth = strandStructuralWarmth ?? lookupHit?.structural_warmth ?? false;

    const signals = TRACTION_SIGNALS_BY_MOVE_TYPE[moveType] || TRACTION_SIGNALS_BY_MOVE_TYPE.mixed;

    return {
      strand_id: strandId,
      model_name: modelName || strandId,
      primary_move_type: moveType,
      warmth_type: warmthType,
      structural_warmth: structuralWarmth,
      signals,
    };
  });
}

// V-042 (vibe code review 2026-05-14): the three prompt blocks below previously
// lived inline (~300 lines of template string). They now live in
// p5-checkin-prompt.ts and are imported at the top of this file. The block
// below intentionally stays commented out as a marker; remove on next session.
/* MOVED TO ./p5-checkin-prompt.ts
const PROMPT_5_SYSTEM = `You are the check-in processor for Solo's Adaptive Tracker. Your job is to conduct a brief, intelligent daily check-in conversation with a user who is executing their 30-day Plan B activation plan.

You know exactly what was planned for each day. You know what has been completed so far. You know what the user has told you in previous check-ins. You are not a general-purpose assistant. You are focused entirely on this plan, this user, and this check-in.

### Your role in this conversation

Each check-in is a short conversation of 2-3 exchanges maximum. Your job across those exchanges is to:

1. Find out what actually happened with today's (and any recently missed) planned tasks
2. Determine the user's current plan state
3. Update the plan accordingly
4. Give the user a clear, brief view of what comes next
5. Close the check-in

You must close the check-in within 3 exchanges. If the user's first response is complete and clear, close after Exchange 1. Never drag the conversation out unnecessarily.

### Tone rules

- Direct, warm, matter-of-fact. Not chirpy. Not cold.
- Never use: "Amazing!", "Fantastic!", "Great job!", "Well done!", "That's wonderful!"
- Acceptable acknowledgments: "Got it." / "Noted." / "Good." / "That makes sense." / "Understood."
- Acknowledge slippage without judgment. Missed days are normal. The plan adapts.
- Always close on a forward-looking note — what comes next, not what went wrong.
- Keep responses short. 2-4 sentences maximum per exchange. This is not a coaching session.

### State determination rules

For state = "on_track", ALL THREE conditions must hold:
1. 0-1 days since last check-in
2. The user confirms most/all of today's planned tasks were completed
3. The user does NOT express being overwhelmed, behind, stuck, unable to keep up, or unsure about the plan

state = "drifting" when ANY of:
- 2-3 days since last check-in
- 0-1 days since last check-in BUT the user reports they did not complete today's tasks (for any reason)
- 2-3 tasks missed across the last 3 days
- The user expresses mild frustration, busy stretch, partial slippage, or feeling overwhelmed

state = "significantly_behind" when ANY of:
- 4+ days since last check-in
- The user signals a material change (job change, life event, loss of confidence in the plan)
- The user reports they cannot complete tasks AND no meaningful progress has been made for 2+ check-ins
- The user explicitly asks for the plan to be redone

When in doubt between on_track and drifting, choose drifting.
When in doubt between drifting and significantly_behind, choose drifting.

CRITICAL: do NOT classify a check-in as on_track simply because the user has just checked in. The user can check in 1 day after the last check-in and still be drifting if today's tasks were missed or they signal being overwhelmed.

### Task update rules

- Only mark a task as completed if the user explicitly confirms it was done.
- If a task was not done and no replan is triggered, move it forward by emitting a plan_updates entry with new_status: "moved".
- Do not drop tasks silently. Every unfinished task is either moved (new_status: "moved") or explicitly noted as missed (new_status: "missed").
- Maximum tasks moved forward in a single check-in without triggering replan: 5.

### plan_updates entry schema (CRITICAL — do not deviate)

Each entry in plan_updates MUST follow this exact schema:

{
  "task_id": "<exact task.id from the working_plan tasks given to you>",
  "new_status": "completed | missed | moved",
  "new_target_date": "YYYY-MM-DD or null",
  "notes": "<short reason or null>"
}

Hard rules:
- task_id MUST match an id present in the working_plan.tasks given to you. If you cannot find a matching id, omit the entry rather than inventing one.
- new_status: "completed" if the user explicitly confirmed done; "missed" if not done and not being rescheduled; "moved" if not done and being rescheduled forward.
- new_target_date: populate with a YYYY-MM-DD date string only when new_status is "moved" (typically tomorrow). Otherwise null.
- notes: a 1-line reason; null if no reason needed.

DO NOT use any other field names. DO NOT emit aggregate entries like {"tasks": [...], "action": "move"}. Each affected task gets its own entry.

### Opening message rules (call_type: "opening")

on_track: "Day [X] — you had [task summary] on the plan today. How did it go?"
drifting: "Day [X] — I haven't heard from you since [last check-in day reference]. No problem. You had [summary of tasks across missed days] planned. What's the story — did any of it happen?"
significantly_behind: "Day [X] — you're about [N] days behind where the original plan expected. That's not a failure, it just means the plan needs refreshing. Before I do that, tell me: has anything significant changed — job situation, confidence in this direction, life — or has it mainly been a busy stretch?"

### Closing rules

on_track: "[Acknowledgment]. I've marked [completed tasks] as done[, and moved [missed task] to [date]]. Tomorrow: [1-2 key tasks]."
drifting: "Understood. [Plan adjustment summary]. [One sentence on the coming days.] See you tomorrow."
significantly_behind: "Here's your updated plan from today. [2-3 sentence summary]. The goal is still [success metric]. Let's see how the next few days go."

### Replan trigger rules

Set replan_required: true when:
- State is significantly_behind AND the user has responded to the diagnosis question (exchange_count >= 2)
- OR user explicitly requests a replan
- OR more than 5 tasks need moving

When replan_required is true, your closing message must NOT promise that the plan has already been rebuilt. The system will surface a confirmation to the user ("Update my plan" / "Not yet") before any rebuild happens. Phrase your close like: "Based on this, it looks like the plan needs refreshing — I'll check with you before rebuilding anything."

### Worked example — user confirms all tasks done (state = on_track, all completed)

User says (Day 1, 0 days since last check-in): "I did all today's tasks — wrote the positioning statement, updated my LinkedIn, and listed the 20 organisations."

working_plan.tasks (relevant slice given to you):
[
  {"task_id": "D1_T1", "day": 1, "description": "Draft a 2-sentence positioning statement", "status": "pending"},
  {"task_id": "D1_T2", "day": 1, "description": "Update LinkedIn headline and About section", "status": "pending"},
  {"task_id": "D1_T3", "day": 1, "description": "List 20 target organisations to research", "status": "pending"}
]

Your output:
{
  "state": "on_track",
  "response_text": "Good. I've marked all three of today's tasks as done. Tomorrow: pick the top 5 organisations from your list and identify a named contact at each. See you tomorrow.",
  "plan_updates": [
    {"task_id": "D1_T1", "new_status": "completed", "new_target_date": null, "notes": null},
    {"task_id": "D1_T2", "new_status": "completed", "new_target_date": null, "notes": null},
    {"task_id": "D1_T3", "new_status": "completed", "new_target_date": null, "notes": null}
  ],
  "outreach_outcomes": [],
  "narrative_addition": "User confirmed all three Day 1 tasks completed: positioning statement, LinkedIn update, and 20-organisation list.",
  "replan_required": false,
  "replan_context": null,
  "check_in_complete": true,
  "exchange_count": 2,
  "strand_signals": [],
  "strand_status_updates": [],
  "portfolio_review_record": null
}

When the user explicitly confirms completion ("did them all", "all done", "ticked everything off"), emit a plan_updates entry with new_status: "completed" for EACH task in the relevant working_plan slice. Do not skip emitting these — the system tracks completion via these entries.

### Worked example — user reports being behind (state = drifting, no replan)

User says (Day 2, 1 day since last check-in): "i havent been able to do the tasks today, im a bit overwhelmed and had a crazy day"

working_plan.tasks (relevant slice given to you — note: real task IDs use the D{day}_T{n} format):
[
  {"task_id": "D2_T1", "day": 2, "description": "Update LinkedIn headline, About section, and Featured section to support the recommended positioning", "status": "pending"},
  {"task_id": "D2_T2", "day": 2, "description": "Identify 3 named contacts to reconnect with this week — write down their names and roles", "status": "pending"}
]

Your output:
{
  "state": "drifting",
  "response_text": "Got it. I've moved today's two tasks to tomorrow. Tomorrow: do the minimum viable version — just one of the two. See you tomorrow.",
  "plan_updates": [
    {"task_id": "D2_T1", "new_status": "moved", "new_target_date": "2026-05-08", "notes": "User overwhelmed; moved to next workable day"},
    {"task_id": "D2_T2", "new_status": "moved", "new_target_date": "2026-05-08", "notes": "User overwhelmed; moved to next workable day"}
  ],
  "outreach_outcomes": [],
  "narrative_addition": "User reported being overwhelmed and unable to complete today's tasks. Both tasks moved forward.",
  "replan_required": false,
  "replan_context": null,
  "check_in_complete": true,
  "exchange_count": 2,
  "strand_signals": [],
  "strand_status_updates": [],
  "portfolio_review_record": null
}

Note the state is "drifting", NOT "on_track" — the user explicitly reported tasks not done and overwhelm, which fails on_track conditions 2 and 3.

### Worked example — user reports a material change (state = significantly_behind, replan triggered)

User says (Day 2, exchange 2, in response to the diagnosis question): "Honestly, I've been made redundant since we last spoke and I'm not sure this direction is still right for me."

Your output:
{
  "state": "significantly_behind",
  "response_text": "That's a real change. Based on this, it looks like the plan needs refreshing — I'll check with you before rebuilding anything.",
  "plan_updates": [],
  "outreach_outcomes": [],
  "narrative_addition": "User reported being made redundant since the last check-in and uncertainty about the chosen direction. Replan flagged for confirmation.",
  "replan_required": true,
  "replan_context": {
    "circumstance_type": "job_change",
    "circumstance_detail": "User made redundant since last check-in; expressed doubt about the chosen direction.",
    "triggered_at": "<ISO timestamp>"
  },
  "check_in_complete": true,
  "exchange_count": 2,
  "strand_signals": [],
  "strand_status_updates": [],
  "portfolio_review_record": null
}

### Exchange count rules

- Exchange 1: Opening
- Exchange 2: First user response + AI follow-up or close
- Exchange 3: Second user response + AI close — forced close

If exchange_count reaches 3 (or 5 for portfolio reviews), set check_in_complete: true.

### Output format

Return a single JSON object only.

{
  "state": "on_track | drifting | significantly_behind",
  "response_text": "The exact message to display to the user.",
  "plan_updates": [
    {
      "task_id": "<id from working_plan.tasks>",
      "new_status": "completed | missed | moved",
      "new_target_date": "YYYY-MM-DD or null",
      "notes": "<reason or null>"
    }
  ],
  "outreach_outcomes": [],
  "narrative_addition": "Brief third-person past tense summary. Max 40 words.",
  "replan_required": false,
  "replan_context": null,
  "check_in_complete": false,
  "exchange_count": 1,
  "strand_signals": [],
  "strand_status_updates": [],
  "portfolio_review_record": null
}`;

const CATCH_UP_ADDENDUM = `

---

## CATCH-UP MODE — ACTIVE

The user has not checked in for more than 3 days. Do not ask about specific tasks from the plan.
Do not reference what should have happened on the days they missed.

Open instead with a single grounding question about where they actually are right now —
not where the plan expected them to be.

Suitable opening questions:
- "You've been away for a few days. Before we look at the plan, where are you with all of this right now?"
- "Let's take stock rather than catch up. How are you feeling about the overall direction at the moment?"
- "What's actually happened in the last week or so — even if it wasn't plan-related?"

After the opening exchange (1-2 user responses), transition back to a normal check-in:
assess current state, update plan status, flag any replanning needed.

Do not make the user feel bad about the gap. Do not use language like "you missed" or
"you were supposed to." This is a resetting conversation, not an accountability conversation.
`;

const PORTFOLIO_ADDENDUM = `

---

## PORTFOLIO-AWARE CHECK-IN RULES

This user is pursuing an opportunity portfolio — multiple business model strands in parallel.

### Strand awareness in regular check-ins

1. Group tasks by strand when summarising.
2. Track outreach outcomes per strand. Include strand_id in outcomes.
3. Note strand-level progress in narrative_addition.
4. Do not prompt narrowing during regular check-ins. Only during Portfolio Reviews (Days 19 and 26).
5. If user spontaneously expresses strong preference, acknowledge briefly: "Noted — that's useful signal for your portfolio review on Day 19."

### Exception: Unsolicited graduation signal

If user reports a very strong traction signal (client conversation booked, proposal requested, paid engagement, platform booking, community-driven intro), populate strand_signals with signal_type: "very_strong".

### Move-type-aware signal reading (Audit P1 #9 — CRITICAL)

Each strand in the \`strand_status\` object carries a \`primary_move_type\` — one of "direct", "platform", "visibility", "community", or "mixed" — and a \`warmth_type\` ("relational" or "structural"). The \`traction_signals_reference\` block in your input provides the correct signal set per strand based on its move type. You MUST interpret traction relative to each strand's move type:

- **Direct strands** (named-contact outreach): "No traction" = unanswered reconnect messages, no meetings booked, no proposal requests from the list of named contacts. Success = replies, meetings, referrals, proposal requests.
- **Platform strands** (marketplace/directory registration): "No traction" = no inbound enquiries via the platform, no profile views trending, no scoping requests. Success = inbound enquiries, calls/bookings, paid engagements through the platform. Do NOT ask "did you email the contacts" — there are no contacts yet; the strand is fed by the platform.
- **Visibility strands** (LinkedIn posts/articles): "No traction" = low engagement across 3+ posts, no DMs from ICP, no inbound attributable to content. Success = ICP comments, DMs from target contacts, shares by relevant figures, inbound conversations triggered by content.
- **Community strands** (join a community + contribute): "No traction" = no acknowledgement after 3+ contributions, contribution not picked up. Success = engagement from members, warm intros, invitations to speak/collaborate.
- **Mixed strands**: interpret any of the above signals. The first Move of a mixed strand is the most frictionless type per the activation plan.

When the user reports a slow week, ask the question that maps to the strand's move type — do NOT default to outreach language when the strand is Platform, Visibility, or Community. Example: for a Platform strand ask "Has the platform generated any enquiries yet — even views or saved-search matches?" rather than "Have you heard back from anyone?".

### Tone rules — Portfolio-specific

- Never describe a strand as "failing" or "a bad choice."
- Frame narrowing as positive: "This is the plan working — you're gathering evidence and focusing where it matters."
- When recommending a strand be paused: "Pausing [strand] for now — if circumstances change or a signal comes in, it's easy to reactivate."

---

## PORTFOLIO REVIEW CHECK-INS

When call_type is "portfolio_review", you are conducting a structured strand assessment. Exchange limit: 5.

### Portfolio Review 1 (Day 19)

Exchange 1: "Day 19 — time for your first portfolio review. You've been working across [N] strands: [names]. Which strand has felt the most natural to pursue — where progress came easiest?"
Exchange 2: "Has any strand generated a response from the market? A reply, a conversation, a referral, an inbound platform enquiry, engagement on a post, or a community introduction?"
Exchange 3: "And which strand has been the hardest to make progress on?"
Exchange 4: Synthesise everything and make a concrete recommendation. Must be specific, e.g.: "I'd suggest focusing on [Strand 1] and [Strand 3]. [Strand 2] shows interest — keep it on watching brief. [Strand 4] hasn't moved — I'd suggest pausing it."
Exchange 5: Confirm decisions, populate strand_status_updates and portfolio_review_record, close.

### Portfolio Review 2 (Day 26)

Same structure but more decisive. 4–5 days left.
Exchange 1: "Day 26 — final portfolio review. You have [N] days left. Which strand do you want to push hardest?"
Exchanges 2-4: Validate choice, surface late signals.
Exchange 5: Lock focus, populate all portfolio output fields.

---

## OUTPUT FORMAT — Portfolio additions

"strand_signals": [ { "strand_id": string, "signal_type": "moderate|strong|very_strong|negative", "signal": string, "source": string } ]
"strand_status_updates": [ { "strand_id": string, "new_status": "active|watching|paused|graduated", "reason": string } ]
Populate strand_status_updates ONLY during portfolio review closing exchanges.

"portfolio_review_record": Populate ONLY on the closing exchange of a portfolio review:
{ "review_number": 1, "day": 19, "strand_assessments": [...], "focus_strands_after": [...], "summary": string }
`;
END MOVED TO ./p5-checkin-prompt.ts */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return jsonResponse({ error: "Unauthorized", response_text: "Authentication required." }, 401);
    }

    const body = await req.json();

    const externalCallType: string | null = body.call_type || null;
    const isCatchUp = externalCallType === "catch_up";

    const resolvedSessionId =
      body.sessionId || body.session_id || body.checkinId ||
      body.checkin_id || body.trackerSessionId || body.tracker_session_id || body.id || null;

    // F45 (2026-04-19): accept `response` as a userMessage alias so /plan CheckInPanel callers
    // (which send {session_id, response}) work without losing the user's text. Old /checkin long-schema
    // callers (message | userMessage | user_message | text) still work unchanged.
    const userMessage =
      body.message || body.userMessage || body.user_message || body.text || body.response || "";

    let trackerSession: Record<string, unknown> | null = null;

    if (resolvedSessionId) {
      const { data: session } = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("id", resolvedSessionId)
        .eq("user_id", userId)
        .single();
      trackerSession = session;
    } else {
      const { data: session } = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      trackerSession = session;
    }

    if (!trackerSession) {
      return jsonResponse(
        { error: "No tracker session found", response_text: "No active plan found. Complete the questionnaire to get started." },
        404
      );
    }

    const sessionId = trackerSession.id as string;

    const rawStrandStatus = trackerSession.strand_status as Record<string, unknown> | null;
    const isPortfolio = !!rawStrandStatus && typeof rawStrandStatus === "object" && Object.keys(rawStrandStatus).length > 0;
    const focusStrands = (trackerSession.focus_strands as string[]) || null;
    const portfolioReviews = (trackerSession.portfolio_reviews as unknown[]) || [];
    const portfolioReviewsCompleted = getPortfolioReviewsCompleted(portfolioReviews);

    console.log(`${FUNCTION_VERSION}: userId=${userId}, isPortfolio=${isPortfolio}, isCatchUp=${isCatchUp}, portfolioReviewsCompleted=${portfolioReviewsCompleted}`);

    // Audit P1 #9: pull selected_strands from reports so P5 can interpret traction per move_type.
    let reportData: Record<string, unknown> | null = null;
    let selectedStrands: Array<Record<string, unknown>> | null = null;
    if (trackerSession.report_id) {
      const { data: report } = await supabase
        .from("reports")
        .select("core_report, hook_insight, user_context_profile, selected_strands")
        .eq("id", trackerSession.report_id)
        .single();
      reportData = report;
      const rawSelected = report?.selected_strands;
      if (Array.isArray(rawSelected)) {
        selectedStrands = rawSelected as Array<Record<string, unknown>>;
      }
    }

    const moveTypeLookup = buildMoveTypeLookup(selectedStrands);

    const currentDay = (trackerSession.current_day as number) || 1;
    const workingPlan = (trackerSession.working_plan as Record<string, unknown>) || { phases: [] };
    const originalPlan = (trackerSession.original_plan as Record<string, unknown>) || { phases: [] };
    const runningNarrative = (trackerSession.running_narrative as string) || "";
    const lastCheckinDate = trackerSession.last_checkin_date as string | null;

    const today = new Date().toISOString().split("T")[0];
    const daysSinceLastCheckin = lastCheckinDate
      ? daysBetween(lastCheckinDate, today)
      : currentDay;

    const isPortfolioReviewDay = isPortfolio && (currentDay === 19 || currentDay === 26);

    const coreReport = ((reportData?.core_report as Record<string, unknown>) || {});
    const archetype = (coreReport.archetype as Record<string, unknown>) || {};
    const recommendation = (coreReport.recommendation as Record<string, unknown>) || {};

    const userProfile = {
      first_name: "there",
      archetype: archetype.id || archetype.name || "unknown",
      recommended_model: recommendation.model_name || recommendation.name || "unknown",
      sector_context: recommendation.sector_context || archetype.sector || "",
    };

    const allTasks = flattenTasks(workingPlan);
    const relevantTasks = allTasks.filter((t) => {
      const task = t as Record<string, unknown>;
      const taskDay = task.day as number;
      const status = (task.status as string) || "pending";
      return (
        status !== "completed" &&
        taskDay <= currentDay &&
        taskDay >= Math.max(1, currentDay - daysSinceLastCheckin)
      );
    });

    const portfolioInput: Record<string, unknown> = {};
    if (isPortfolio && rawStrandStatus) {
      portfolioInput.strand_status = rawStrandStatus;
      portfolioInput.focus_strands = focusStrands;
      portfolioInput.portfolio_reviews_completed = portfolioReviewsCompleted;
      // Audit P1 #9: traction_signals_reference is now move-type-parameterised per strand.
      portfolioInput.traction_signals_reference = buildTractionSignalsReference(rawStrandStatus, moveTypeLookup);
      // Also pass selected_strands so P5 sees the full strand metadata (move_type, warmth_type).
      if (selectedStrands) {
        portfolioInput.selected_strands = selectedStrands;
      }
    }

    function buildSystemPrompt(callType: string, portfolio: boolean, catchUp: boolean): string {
      let prompt = PROMPT_5_SYSTEM;
      if (catchUp) {
        prompt += CATCH_UP_ADDENDUM;
      } else if (portfolio) {
        prompt += PORTFOLIO_ADDENDUM;
      }
      return prompt;
    }

    let checkinRecord: Record<string, unknown> | null = null;
    const { data: existingCheckin } = await supabase
      .from("checkin_history")
      .select("*")
      .eq("tracker_session_id", sessionId)
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    checkinRecord = existingCheckin;

    const maxExchanges = isPortfolioReviewDay ? 5 : 3;

    if (!userMessage) {
      const existingExchanges = (checkinRecord?.exchanges as unknown[]) || [];

      if (existingExchanges.length > 0) {
        const lastExchange = existingExchanges[existingExchanges.length - 1] as Record<string, unknown>;
        const lastAiMsg = lastExchange.role === "assistant"
          ? (lastExchange.message as string)
          : "Welcome back. Where were we?";
        return jsonResponse({
          response_text: lastAiMsg,
          state: checkinRecord?.state || "on_track",
          check_in_complete: false,
          exchange_count: Math.ceil(existingExchanges.length / 2),
          exchanges: existingExchanges,
          is_portfolio: isPortfolio,
          is_portfolio_review: isPortfolioReviewDay,
        });
      }

      let openingCallType: string;
      if (isCatchUp) {
        openingCallType = "catch_up";
      } else if (isPortfolioReviewDay) {
        openingCallType = "portfolio_review";
      } else {
        openingCallType = "opening";
      }

      const systemPrompt = buildSystemPrompt(openingCallType, isPortfolio, isCatchUp);

      const prompt5Input = {
        call_type: openingCallType,
        exchange_count: 1,
        current_day: currentDay,
        days_since_last_checkin: daysSinceLastCheckin,
        user_profile: userProfile,
        original_plan: {
          success_metric: (originalPlan as Record<string, unknown>).success_metric || "",
          phases: ((originalPlan as Record<string, unknown>).phases as unknown[])?.map((p: unknown) => {
            const phase = p as Record<string, unknown>;
            return { phase: phase.phase, label: phase.label, days: phase.days };
          }) || [],
        },
        working_plan: { tasks: relevantTasks },
        running_narrative: runningNarrative,
        checkin_history_today: [],
        user_message: null,
        ...portfolioInput,
      };

      const completion = await openai.chat.completions.create({
        model: MODEL_TIER2,
        temperature: 0.5,
        max_completion_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(prompt5Input) },
        ],
        // V-045 (vibe code review 2026-05-14): strict json_schema mode. The model is
        // forced to emit the exact P5 response shape declared at file top.
        response_format: { type: "json_schema", json_schema: P5_RESPONSE_SCHEMA },
      });

      const rawOutput = completion.choices[0].message.content || "{}";
      const finishReason = completion.choices[0].finish_reason;

      // V-046 (vibe code review 2026-05-14): truncation fail-fast.
      // If max_completion_tokens (800) is hit, the JSON is partial and parsing produces
      // bogus state. Return 502 so the frontend can retry, instead of persisting a
      // ghost check-in row.
      if (finishReason === "length") {
        console.error(`${FUNCTION_VERSION} V-046 abort: P5 opening truncated by token cap for session ${sessionId}`);
        return jsonResponse({
          error: "model_truncated",
          response_text: "Couldn't process the check-in right now. Try again in a moment.",
        }, 502);
      }

      let p5Output: Record<string, unknown>;
      try {
        p5Output = JSON.parse(rawOutput);
      } catch {
        // V-043 (vibe code review 2026-05-14): parse failure fail-fast.
        // Previously this branch fabricated a default-msg "successful" check-in
        // with state derived from days-since-last-checkin, creating ghost
        // checkin_history rows the next check-in then inherited from. Now we
        // return 502 and don't persist anything — frontend offers a retry.
        console.error(`${FUNCTION_VERSION} V-043 abort: P5 opening JSON parse failed; head=${rawOutput.slice(0, 200)}`);
        return jsonResponse({
          error: "model_parse_failed",
          response_text: "Couldn't process the check-in right now. Try again in a moment.",
        }, 502);
      }

      const responseText = (p5Output.response_text as string) || `Day ${currentDay} — how's it going?`;
      const state = (p5Output.state as string) || "on_track";

      const initialExchanges = [
        { role: "assistant", message: responseText, timestamp: new Date().toISOString() },
      ];

      const { data: newCheckin, error: insertError } = await supabase
        .from("checkin_history")
        .insert({
          tracker_session_id: sessionId,
          user_id: userId,
          checkin_date: today,
          day_number: currentDay,
          state: state,
          exchanges: initialExchanges,
          plan_updates: [],
          narrative_addition: (p5Output.narrative_addition as string) || null,
          replan_triggered: false,
          strand_signals: (p5Output.strand_signals as unknown[]) || [],
          strand_status_updates: [],
          is_portfolio_review: isPortfolioReviewDay,
          portfolio_review_record: null,
          is_catch_up: isCatchUp,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create checkin_history:", insertError);
      }

      return jsonResponse({
        response_text: responseText,
        state: state,
        check_in_complete: false,
        exchange_count: 1,
        checkin_id: newCheckin?.id || null,
        is_portfolio: isPortfolio,
        is_portfolio_review: isPortfolioReviewDay,
        is_catch_up: isCatchUp,
      });
    }

    if (!checkinRecord) {
      const { data: newCheckin } = await supabase
        .from("checkin_history")
        .insert({
          tracker_session_id: sessionId,
          user_id: userId,
          checkin_date: today,
          day_number: currentDay,
          state: "on_track",
          exchanges: [],
          plan_updates: [],
          replan_triggered: false,
          strand_signals: [],
          strand_status_updates: [],
          is_portfolio_review: isPortfolioReviewDay,
          portfolio_review_record: null,
          is_catch_up: isCatchUp,
        })
        .select()
        .single();
      checkinRecord = newCheckin;
    }

    if (!checkinRecord) {
      return jsonResponse(
        { error: "Failed to create check-in record", response_text: "Something went wrong. Please try again." },
        500
      );
    }

    const existingExchanges = (checkinRecord.exchanges as unknown[]) || [];
    const currentExchangeCount = Math.ceil(existingExchanges.length / 2) + 1;

    const effectiveCatchUp = isCatchUp || (checkinRecord.is_catch_up as boolean) || false;

    let callType: string;
    if (effectiveCatchUp && currentExchangeCount === 1) {
      callType = "catch_up";
    } else if (isPortfolioReviewDay) {
      callType = currentExchangeCount >= maxExchanges ? "closing" : "portfolio_review";
    } else {
      callType = currentExchangeCount >= maxExchanges ? "closing" : "follow_up";
    }

    const systemPrompt = buildSystemPrompt(callType, isPortfolio, effectiveCatchUp && currentExchangeCount <= 2);

    const updatedExchanges = [
      ...existingExchanges,
      { role: "user", message: userMessage, timestamp: new Date().toISOString() },
    ];

    const prompt5Input = {
      call_type: callType,
      exchange_count: currentExchangeCount,
      current_day: currentDay,
      days_since_last_checkin: daysSinceLastCheckin,
      user_profile: userProfile,
      original_plan: {
        success_metric: (originalPlan as Record<string, unknown>).success_metric || "",
        phases: ((originalPlan as Record<string, unknown>).phases as unknown[])?.map((p: unknown) => {
          const phase = p as Record<string, unknown>;
          return { phase: phase.phase, label: phase.label, days: phase.days };
        }) || [],
      },
      working_plan: { tasks: relevantTasks },
      running_narrative: runningNarrative,
      checkin_history_today: updatedExchanges,
      user_message: userMessage,
      ...portfolioInput,
    };

    const completion = await openai.chat.completions.create({
      model: MODEL_TIER2,
      temperature: 0.5,
      max_completion_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(prompt5Input) },
      ],
      response_format: { type: "json_object" },
    });

    const rawOutput = completion.choices[0].message.content || "{}";
    const followUpFinishReason = completion.choices[0].finish_reason;

    // V-046 (vibe code review 2026-05-14): truncation fail-fast.
    if (followUpFinishReason === "length") {
      console.error(`${FUNCTION_VERSION} V-046 abort: P5 follow-up truncated by token cap for session ${sessionId}`);
      return jsonResponse({
        error: "model_truncated",
        response_text: "Couldn't process the check-in right now. Try again in a moment.",
      }, 502);
    }

    let p5Output: Record<string, unknown>;
    try {
      p5Output = JSON.parse(rawOutput);
    } catch {
      // V-043 (vibe code review 2026-05-14): parse failure fail-fast.
      console.error(`${FUNCTION_VERSION} V-043 abort: P5 follow-up JSON parse failed; head=${rawOutput.slice(0, 200)}`);
      return jsonResponse({
        error: "model_parse_failed",
        response_text: "Couldn't process the check-in right now. Try again in a moment.",
      }, 502);
    }

    const responseText = (p5Output.response_text as string) || "Noted. We'll pick this up tomorrow.";
    const state = (p5Output.state as string) || (checkinRecord.state as string) || "on_track";
    const planUpdates = (p5Output.plan_updates as Record<string, unknown>[]) || [];
    const narrativeAddition = (p5Output.narrative_addition as string) || "";
    const replanRequired = (p5Output.replan_required as boolean) || false;
    const replanContext = p5Output.replan_context || null;
    const exchangeCount = (p5Output.exchange_count as number) || currentExchangeCount;
    const strandSignals = (p5Output.strand_signals as Record<string, unknown>[]) || [];
    const strandStatusUpdates = (p5Output.strand_status_updates as Record<string, unknown>[]) || [];
    const portfolioReviewRecord = (p5Output.portfolio_review_record as Record<string, unknown>) || null;

    let checkInComplete = (p5Output.check_in_complete as boolean) || false;
    if (currentExchangeCount >= maxExchanges) checkInComplete = true;

    const finalExchanges = [
      ...updatedExchanges,
      { role: "assistant", message: responseText, timestamp: new Date().toISOString() },
    ];

    const existingStrandSignals = (checkinRecord.strand_signals as Record<string, unknown>[]) || [];
    // V-047 (vibe code review 2026-05-14): dedup by (strand_id, signal) tuple so the
    // same observation across two exchanges in one check-in doesn't double-increment
    // traction_score. Existing-row signals take precedence; new ones only added if not
    // already present.
    const signalKey = (s: Record<string, unknown>) => `${String(s.strand_id ?? "")}::${String(s.signal ?? "")}`;
    const existingKeys = new Set(existingStrandSignals.map(signalKey));
    const newSignals = strandSignals.filter((s) => !existingKeys.has(signalKey(s)));
    const allStrandSignals = [...existingStrandSignals, ...newSignals];

    const checkinUpdate: Record<string, unknown> = {
      exchanges: finalExchanges,
      state: state,
      narrative_addition: narrativeAddition || (checkinRecord.narrative_addition as string) || null,
      strand_signals: allStrandSignals,
    };

    if (checkInComplete) {
      checkinUpdate.plan_updates = planUpdates;
      // NB: replan_triggered stays false until the user confirms via process-replan.
      // Set replan_pending on tracker_sessions below.
      checkinUpdate.replan_triggered = false;
      checkinUpdate.strand_status_updates = strandStatusUpdates;
      if (portfolioReviewRecord) {
        checkinUpdate.portfolio_review_record = portfolioReviewRecord;
      }
    }

    await supabase
      .from("checkin_history")
      .update(checkinUpdate)
      .eq("id", checkinRecord.id);

    if (checkInComplete && !replanRequired) {
      const checkinMode = effectiveCatchUp ? "catch_up"
        : isPortfolioReviewDay ? "portfolio_review"
        : "standard";

      const sessionUpdate: Record<string, unknown> = {
        last_checkin_date: today,
        last_checkin_mode: checkinMode,
        updated_at: new Date().toISOString(),
      };

      if (planUpdates.length > 0) {
        const updatedPlan = applyPlanUpdates(workingPlan, planUpdates);
        sessionUpdate.working_plan = updatedPlan;
        const allUpdatedTasks = flattenTasks(updatedPlan);
        const completedCount = allUpdatedTasks.filter(
          (t) => (t as Record<string, unknown>).status === "completed"
        ).length;
        sessionUpdate.tasks_completed = completedCount;
      }

      if (narrativeAddition) {
        const separator = runningNarrative ? "\n" : "";
        sessionUpdate.running_narrative = runningNarrative + separator + narrativeAddition;
      }

      if (isPortfolio && rawStrandStatus && strandSignals.length > 0) {
        const updatedStrandStatus = applyStrandSignals(rawStrandStatus, strandSignals);
        sessionUpdate.strand_status = updatedStrandStatus;
      }

      if (isPortfolio && rawStrandStatus && strandStatusUpdates.length > 0) {
        const currentStatus = (sessionUpdate.strand_status as Record<string, unknown>) || rawStrandStatus;
        const { updatedStatus, updatedFocusStrands } = applyStrandStatusUpdates(
          currentStatus, strandStatusUpdates, focusStrands
        );
        sessionUpdate.strand_status = updatedStatus;
        sessionUpdate.focus_strands = updatedFocusStrands;
      }

      if (portfolioReviewRecord) {
        const updatedReviews = [...portfolioReviews, portfolioReviewRecord];
        sessionUpdate.portfolio_reviews = updatedReviews;
      }

      // Normal completion: make sure any stale replan_pending flag is cleared.
      sessionUpdate.replan_pending = false;
      sessionUpdate.replan_context = null;

      await supabase
        .from("tracker_sessions")
        .update(sessionUpdate)
        .eq("id", sessionId)
        .eq("user_id", userId);
    }

    if (checkInComplete && replanRequired) {
      // User-confirmed replan: store pending flag + context, let the frontend prompt the user.
      const sessionUpdate: Record<string, unknown> = {
        last_checkin_date: today,
        updated_at: new Date().toISOString(),
        replan_pending: true,
        replan_context: replanContext || {
          circumstance_type: "busy_stretch",
          circumstance_detail: `Replan triggered from Day ${currentDay} check-in.`,
          triggered_checkin_id: checkinRecord.id,
          triggered_at: new Date().toISOString(),
        },
      };

      // Apply any non-replan plan_updates from this check-in so we don't lose them while the user decides.
      if (planUpdates.length > 0) {
        const updatedPlan = applyPlanUpdates(workingPlan, planUpdates);
        sessionUpdate.working_plan = updatedPlan;
      }

      if (narrativeAddition) {
        const separator = runningNarrative ? "\n" : "";
        sessionUpdate.running_narrative = runningNarrative + separator + narrativeAddition;
      }

      await supabase
        .from("tracker_sessions")
        .update(sessionUpdate)
        .eq("id", sessionId)
        .eq("user_id", userId);
    }

    return jsonResponse({
      response_text: responseText,
      state: state,
      check_in_complete: checkInComplete,
      exchange_count: exchangeCount,
      plan_updates: planUpdates,
      replan_required: replanRequired,
      replan_context: replanContext,
      replan_pending: checkInComplete && replanRequired,
      checkin_id: checkinRecord.id,
      is_portfolio: isPortfolio,
      is_portfolio_review: isPortfolioReviewDay,
      is_catch_up: effectiveCatchUp,
      strand_signals: strandSignals,
      strand_status_updates: strandStatusUpdates,
      portfolio_review_record: portfolioReviewRecord,
      response: responseText,
      message: responseText,
      reply: responseText,
    });
  } catch (error) {
    console.error("process-checkin error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
        response_text: "Something went wrong on our end. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
