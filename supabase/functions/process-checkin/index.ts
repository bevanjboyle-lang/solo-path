// process-checkin v29 — F45 (2026-04-19): accept `response` key in userMessage OR chain so /plan CheckInPanel callers work (Plan.tsx sends {session_id, response}). Backward-compatible with /checkin long-schema callers.
// v28: P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v27 baseline: 2026-04-17 Audit P1 #9 fix — traction signals parameterised by move type.
// Earlier history:
//   - v27: buildTractionSignalsReference accepts per-strand move_type, selected_strands pulled
//     from reports.selected_strands, PORTFOLIO_ADDENDUM updated for move-type-aware signal reading.
//   - v26: user-confirmed replan (v17 narrative).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function flattenTasks(workingPlan: Record<string, unknown>): unknown[] {
  const tasks: unknown[] = [];
  const phases = (workingPlan?.phases as unknown[]) || [];
  for (const phase of phases) {
    const p = phase as Record<string, unknown>;
    const phaseTasks = (p.tasks as unknown[]) || [];
    for (const t of phaseTasks) {
      tasks.push(t);
    }
  }
  return tasks;
}

function applyPlanUpdates(
  workingPlan: Record<string, unknown>,
  planUpdates: Record<string, unknown>[]
): Record<string, unknown> {
  if (!planUpdates || planUpdates.length === 0) return workingPlan;
  const updated = JSON.parse(JSON.stringify(workingPlan));
  const phases = (updated.phases as Record<string, unknown>[]) || [];
  for (const update of planUpdates) {
    const taskId = update.task_id as string;
    const newStatus = update.new_status as string;
    const newTargetDate = update.new_target_date as string | null;
    const notes = update.notes as string | undefined;
    for (const phase of phases) {
      const tasks = (phase.tasks as Record<string, unknown>[]) || [];
      for (const task of tasks) {
        if (task.id === taskId) {
          task.status = newStatus;
          if (newTargetDate) task.target_date = newTargetDate;
          if (notes) task.update_notes = notes;
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

on_track: 0-1 days since last check-in. All or most tasks completed. Minor slippage only.
drifting: 2-3 days since last check-in, OR 2-3 tasks missed across the last 3 days.
significantly_behind: 4+ days since last check-in, OR user signals a material change.

When in doubt between drifting and significantly_behind, choose drifting.

### Task update rules

- Only mark a task as completed if the user explicitly confirms it was done.
- If a task was not done and no replan is triggered, move it to the next available day.
- Do not drop tasks silently. Every unfinished task is either moved or explicitly noted.
- Maximum tasks moved forward in a single check-in without triggering replan: 5.

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
  "plan_updates": [],
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

    console.log(`process-checkin v29: userId=${userId}, isPortfolio=${isPortfolio}, isCatchUp=${isCatchUp}, portfolioReviewsCompleted=${portfolioReviewsCompleted}`);

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
        response_format: { type: "json_object" },
      });

      const rawOutput = completion.choices[0].message.content || "{}";
      let p5Output: Record<string, unknown>;
      try {
        p5Output = JSON.parse(rawOutput);
      } catch {
        console.error("Failed to parse Prompt 5 opening output:", rawOutput);
        const defaultMsg = isCatchUp
          ? "You've been away for a few days. Before we look at the plan, where are you with all of this right now?"
          : isPortfolioReviewDay
            ? `Day ${currentDay} — time for your portfolio review. Which strand has felt the most natural to pursue so far?`
            : `Day ${currentDay} check-in — what did you get done today?`;
        p5Output = {
          state: isCatchUp ? "drifting" : daysSinceLastCheckin >= 4 ? "significantly_behind" : daysSinceLastCheckin >= 2 ? "drifting" : "on_track",
          response_text: defaultMsg,
          plan_updates: [],
          narrative_addition: `Day ${currentDay} check-in opened${isCatchUp ? " (catch-up mode)" : ""}.`,
          replan_required: false,
          replan_context: null,
          check_in_complete: false,
          exchange_count: 1,
          strand_signals: [],
          strand_status_updates: [],
          portfolio_review_record: null,
        };
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
    let p5Output: Record<string, unknown>;
    try {
      p5Output = JSON.parse(rawOutput);
    } catch {
      console.error("Failed to parse Prompt 5 follow-up output:", rawOutput);
      p5Output = {
        state: checkinRecord.state || "on_track",
        response_text: "Got it. I'll update the plan accordingly.",
        plan_updates: [],
        narrative_addition: "",
        replan_required: false,
        replan_context: null,
        check_in_complete: true,
        exchange_count: currentExchangeCount,
        strand_signals: [],
        strand_status_updates: [],
        portfolio_review_record: null,
      };
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
    const allStrandSignals = [...existingStrandSignals, ...strandSignals];

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
