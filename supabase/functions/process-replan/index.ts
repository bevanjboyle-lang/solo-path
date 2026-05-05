// process-replan v22 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// process-replan v19 — P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v18 baseline: 2026-04-17 Audit P2 #16 — source-header reconciled with deploy counter.
// Earlier history:
//   - v9 (pre-reconciliation): 2026-04-17 Audit P1 #10 fix — P6 prompt understands four move types.
//     PROMPT_6_SYSTEM adds a "Move-type-aware task generation" section.
//     PORTFOLIO_ADDENDUM_6 extended: each strand in strand_status carries a
//     primary_move_type and warmth_type; replan tasks for that strand must use
//     the task vocabulary of its move type. selected_strands (with business_model_id,
//     primary_move_type, warmth_type, structural_warmth) pulled from reports.selected_strands
//     and passed to P6.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const MODEL_TIER1 = "gpt-5.4";
const MODEL_TIER2 = "gpt-5.4-mini";
const MODEL_TIER3 = "gpt-5.4-nano";

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

function flattenTasks(
  workingPlan: Record<string, unknown>
): Record<string, unknown>[] {
  const tasks: Record<string, unknown>[] = [];
  const phases = (workingPlan?.phases as unknown[]) || [];
  for (const phase of phases) {
    const p = phase as Record<string, unknown>;
    const phaseTasks = (p.tasks as unknown[]) || [];
    for (const t of phaseTasks) {
      tasks.push(t as Record<string, unknown>);
    }
  }
  return tasks;
}

function buildReplanWorkingPlan(
  originalWorkingPlan: Record<string, unknown>,
  p6Output: Record<string, unknown>,
  currentDay: number
): Record<string, unknown> {
  const completedTasks: Record<string, unknown>[] = [];
  const oldTasks = flattenTasks(originalWorkingPlan);
  for (const t of oldTasks) {
    if (t.status === "completed") {
      completedTasks.push(t);
    }
  }

  const p6Phases = (p6Output.phases as Record<string, unknown>[]) || [];
  const p6Days = (p6Output.days as Record<string, unknown>[]) || [];

  const phaseTasksMap: Record<number, Record<string, unknown>[]> = {};
  for (const dayEntry of p6Days) {
    const dayNum = dayEntry.day_number as number;
    const phaseNum = dayEntry.phase as number;
    const dayTasks = (dayEntry.tasks as Record<string, unknown>[]) || [];

    if (!phaseTasksMap[phaseNum]) phaseTasksMap[phaseNum] = [];

    for (const task of dayTasks) {
      phaseTasksMap[phaseNum].push({
        id: task.task_id || `RP_D${dayNum}_T${phaseTasksMap[phaseNum].length + 1}`,
        day: currentDay + (dayNum as number) - 1,
        type: "action",
        description: task.description || "",
        duration_minutes: task.duration_minutes || null,
        notes: task.notes || null,
        status: "pending",
        strand_id: task.strand_id || null,
        move_type: task.move_type || null,
      });
    }
  }

  const newPhases: Record<string, unknown>[] = [];

  if (completedTasks.length > 0) {
    newPhases.push({
      phase: 0,
      label: "Completed",
      days: "Prior",
      tasks: completedTasks,
    });
  }

  for (const p6Phase of p6Phases) {
    const phaseNum = p6Phase.phase_number as number;
    newPhases.push({
      phase: phaseNum,
      label: p6Phase.phase_name || `Phase ${phaseNum}`,
      days: p6Phase.days || "",
      focus: p6Phase.focus || "",
      tasks: phaseTasksMap[phaseNum] || [],
    });
  }

  return {
    phases: newPhases,
    replan_applied_at: new Date().toISOString(),
    replan_from_day: currentDay,
    total_days: p6Output.total_days || 30,
    success_metric:
      (originalWorkingPlan as Record<string, unknown>).success_metric || null,
  };
}

function applyStrandRebalancing(
  strandStatus: Record<string, unknown>,
  strandRebalancing: Record<string, unknown>
): { updatedStatus: Record<string, unknown>; updatedFocusStrands: string[] } {
  const updated = JSON.parse(JSON.stringify(strandStatus));
  const activeStrands = (strandRebalancing.active_strands as string[]) || [];
  const watchingStrands = (strandRebalancing.watching_strands as string[]) || [];
  const pausedStrands = (strandRebalancing.paused_strands as string[]) || [];

  for (const [strandId, strandData] of Object.entries(updated)) {
    const strand = strandData as Record<string, unknown>;
    if (activeStrands.includes(strandId)) {
      strand.status = "active";
    } else if (watchingStrands.includes(strandId)) {
      strand.status = "watching";
    } else if (pausedStrands.includes(strandId)) {
      strand.status = "paused";
    }
  }

  const updatedFocusStrands = activeStrands.length > 0
    ? activeStrands
    : Object.keys(strandStatus);

  return { updatedStatus: updated, updatedFocusStrands };
}

const PROMPT_6_SYSTEM = `You are Solo's activation plan rebuilder. You are called when a user's original 30-day Plan B activation plan has become stale — because they have fallen significantly behind, or because their circumstances have changed.

Your job is to generate a fresh forward plan from their current position. This is not starting from scratch. It picks up exactly where the user is, credits what they have already built, and charts the most direct realistic path to their first client conversation from this point.

### What you are given

- Their recommended business model, archetype, and sector context
- Their original 30-day activation plan (for structural reference only)
- The tasks they have completed so far
- Their current day number and days remaining in the 30-day window
- The running narrative of what has happened
- The circumstance context from the check-in that triggered the replan (busy stretch / job change / life event / etc.)
- Their network quality (Q13) and employment status (Q14), updated if circumstances changed
- For portfolio plans: each strand's \`primary_move_type\` and \`warmth_type\`

### Step 1 — Assess what has been done

Look at the completed tasks. What has genuinely been established? Positioning work done? Some outreach started? Framework contacts identified? Platform listings live? LinkedIn posts published? Community contributions made? Credit everything that has been achieved. The replan does not repeat completed work.

### Step 2 — Identify the shortest path to first client conversation

The goal is unchanged: first real conversation with a potential client. Map what still stands between the user and that goal. The replan covers only what is still needed. If foundations are complete, skip to moves. If moves have started, focus on follow-up and conversion. Do not pad with unnecessary early-stage tasks.

### Step 3 — Build the fresh forward plan

**Day numbering:** Start from Day 1 of the new plan. Do not continue old day numbering. This makes the replan feel like a clean forward view rather than a continuation of a failing plan.

**Length:** Use days_remaining as the total plan length. If days_remaining is fewer than 7, focus only on the 2–3 highest-leverage actions remaining. Do not artificially extend beyond the 30-day window.

**Pacing:** Use Q14 employment status to calibrate daily task load:
- Employed full-time: 1–1.5 hours per weekday evening, 3–4 hours per weekend day
- In notice period or recently made redundant: 5–6 hours per weekday
- Part-time or unclear: 2–3 hours per weekday

If the user has demonstrated through their check-ins that they can only sustain a lighter load than Q14 implies, plan to that demonstrated capacity.

**Phases:** Use 2–3 phases only. Keep phase names grounded and forward-looking. Do not reuse Phase 1 "Foundations" language if foundations are already complete.

**Task quality:** Every task must be:
- Specific to the recommended business model and sector context — not generic
- Named precisely enough that the user knows exactly what to do
- Achievable within the time allocated for that day
- Sequenced correctly
- Matched to the strand's move type (see below)

### Step 3a — Move-type-aware task generation (Audit P1 #10 — CRITICAL)

Solo runs four move types. Every task in the replan must match the move type of the strand it belongs to. Use the vocabulary of that move type — do NOT default to outreach language for Platform / Visibility / Community strands.

**Direct** (named-contact outreach, warmth_type: relational)
- Example tasks:
  - "Send reconnect email to [specific contact name / persona] using your positioning statement"
  - "Follow up with [contact] who replied positively but hasn't booked a call — propose two concrete times"
  - "Ask [contact] for a warm intro to [target buyer type in sector]"
  - "Draft proposal for [contact's problem] and send by end of day"

**Platform** (marketplace/directory registration, warmth_type: structural)
- Example tasks:
  - "Publish your profile on [specific marketplace] — headline, positioning, 3 service blocks"
  - "Respond to the first two inbound enquiries from [platform] with a scoping call proposal"
  - "Update your [platform] profile with the recent case study and two new keywords"
  - "Review your [platform] inbound dashboard and categorise enquiries by fit"

**Visibility** (LinkedIn posts / articles, any warmth_type)
- Example tasks:
  - "Draft and publish a LinkedIn post on [specific angle] — 180–220 words, one clear point of view"
  - "Re-engage the top 5 comments from last week's post — reply with a question that deepens the thread"
  - "Write and publish a LinkedIn article on [topic the ICP searches for] — 800 words"
  - "Send a soft DM to the two target contacts who engaged with last post"

**Community** (join a community + contribute, any warmth_type)
- Example tasks:
  - "Introduce yourself in [specific community / slack / forum] with the positioning statement"
  - "Post a useful answer to one active thread in [community] — show the expertise"
  - "DM the moderator of [community] and offer to contribute a short piece"
  - "Follow up on the three members who engaged with your first contribution"

**Mixed** (strand with multiple move types in sequence)
- Sequence tasks in the order defined by the strand's activation plan. If the first move is Visibility, start with visibility tasks and only introduce Direct tasks once visibility traction is observed.

**If move_type is unknown** for a task or strand, use "mixed" and favour whichever move type looks most active in the running narrative.

### Step 4 — Write the output

### Output format

Return a single JSON object only. No markdown, no preamble, no explanation outside the JSON.

{
  "prompt6_output_summary": "A 2–3 sentence plain text summary for Prompt 5 to deliver as the closing check-in message.",
  "replan_summary": "One sentence describing the replan.",
  "total_days": 15,
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "First Real Signal",
      "days": "Days 1–5",
      "focus": "Generate the first inbound response across the active strands"
    }
  ],
  "days": [
    {
      "day_number": 1,
      "day_type": "Weekday Evening",
      "phase": 1,
      "tasks": [
        {
          "task_id": "RP_D1_T1",
          "strand_id": "strand_1",
          "move_type": "direct",
          "description": "Send reconnect email to 3 former colleagues at [named orgs] using your positioning statement",
          "duration_minutes": 45,
          "notes": null
        },
        {
          "task_id": "RP_D1_T2",
          "strand_id": "strand_2",
          "move_type": "platform",
          "description": "Publish your profile on [specific marketplace] — headline, positioning, 3 service blocks",
          "duration_minutes": 30,
          "notes": null
        }
      ]
    },
    {
      "day_number": 2,
      "day_type": "Weekday Evening",
      "phase": 1,
      "tasks": [
        {
          "task_id": "RP_D2_T1",
          "strand_id": "strand_3",
          "move_type": "visibility",
          "description": "Draft and publish a LinkedIn post on [specific angle] — 180–220 words, one clear point of view",
          "duration_minutes": 45,
          "notes": null
        },
        {
          "task_id": "RP_D2_T2",
          "strand_id": "strand_4",
          "move_type": "community",
          "description": "Introduce yourself in [specific community] with your positioning statement and one concrete offer",
          "duration_minutes": 30,
          "notes": null
        }
      ]
    }
  ],
  "narrative_addition": "Day X: Replan triggered. Context. Fresh plan built.",
  "strand_rebalancing": null
}

Note: strand_rebalancing is null for single-strand plans. Populate it for portfolio plans (see portfolio addendum rules). Every task MUST carry a move_type field matching the strand's primary_move_type — or "mixed" if genuinely mixed. Shared tasks use "mixed".`;

const PORTFOLIO_ADDENDUM_6 = `

---

## PORTFOLIO-AWARE REPLANNING RULES

This user is pursuing an opportunity portfolio — multiple business model strands in parallel. When rebuilding their plan, you must respect the portfolio structure.

### Strand status awareness

The input includes strand_status for each strand:
- **active**: Plan tasks for this strand normally
- **watching**: Light maintenance only — 1 task per week maximum, monitoring for new signals
- **paused**: No new tasks. Do not include in the replan.
- **graduated**: This strand has shown strong signal. It should receive the majority of effort in the replan.

### Narrowing preservation

If portfolio reviews have already narrowed the focus (focus_strands is not null and contains fewer strands than the original portfolio), the replan must respect those decisions. Do NOT re-expand to all original strands.

### Time allocation in replans

When replanning with multiple active strands:
- Distribute time roughly proportional to traction_score. Strands with more observed signals get more time.
- If all strands have equal traction, distribute evenly.
- If one strand has graduated, give it 60–70% of available time.
- Watching strands: maximum 15% of total time.

### Move-type-aware strand tasks (Audit P1 #10 — CRITICAL)

Every strand in \`strand_status\` carries:
- \`primary_move_type\`: "direct" | "platform" | "visibility" | "community" | "mixed"
- \`warmth_type\`: "relational" | "structural"

The \`selected_strands\` block in your input contains the full strand metadata (business_model_id, model_name, primary_move_type, warmth_type, structural_warmth). Use it to ground task vocabulary:

- A Direct strand's tasks must be about named-contact outreach, reconnects, proposals, referrals.
- A Platform strand's tasks must be about publishing/optimising the listing, responding to inbound, monitoring the marketplace dashboard. Do NOT write "Send reconnect email to 3 contacts" for a Platform strand — the strand has no contact list.
- A Visibility strand's tasks must be about publishing content, engaging commenters, DMing content-engaged contacts, shipping another post/article.
- A Community strand's tasks must be about introducing yourself in the community, contributing answers, DMing moderators, following up on engaged members. Do NOT frame it as generic networking.

If the strand's move_type is "mixed", sequence tasks by what has traction: if Visibility is getting engagement, double down there; if Direct contacts replied, shift to Direct.

### Strand-level task generation

Every task in the replan must be tagged with a strand_id AND a move_type:

{
  "task_id": "RP_D1_T1",
  "strand_id": "strand_2",
  "move_type": "platform",
  "description": "Respond to the first two inbound enquiries on [platform] with a scoping call proposal",
  "duration_minutes": 45,
  "notes": null
}

Shared tasks (e.g. "Review all outreach responses", "Weekly portfolio review") use strand_id: "shared" and move_type: "mixed".

### Replan output additions

Populate strand_rebalancing in your output:

"strand_rebalancing": {
  "active_strands": ["strand_1", "strand_3"],
  "watching_strands": ["strand_2"],
  "paused_strands": ["strand_4"],
  "time_allocation": {
    "strand_1": 0.45,
    "strand_3": 0.35,
    "strand_2": 0.10,
    "shared": 0.10
  },
  "rationale": "1–2 sentences: why this allocation, based on traction evidence"
}

### Edge case: All strands stalled

If ALL strands have zero traction:
- Recommend the user concentrate on the highest-scored strand for the remaining days.
- Frame it as: "When nothing has shown signal yet, the best move is to concentrate effort rather than spread thinner."
- Set all other strands to watching in strand_rebalancing.

### Edge case: Platform strand with no inbound

If a Platform strand has been live for 2+ weeks with no inbound:
- Do NOT pivot it to Direct outreach — that's a different strand.
- Either (a) optimise the listing (fresh headline, stronger positioning, new case study) as the next move, or (b) pause the strand and reallocate time to strands with evidence of traction.
- Frame the recommendation explicitly: "The platform hasn't generated inbound yet. Either improve the listing or pause and reallocate."
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
      return jsonResponse(
        { error: "Unauthorized", response_text: "Authentication required." },
        401
      );
    }

    const body = await req.json();

    const sessionId =
      body.sessionId ||
      body.session_id ||
      body.trackerSessionId ||
      body.tracker_session_id ||
      null;

    // Default action = "run" so existing callers remain functional.
    const action: "run" | "dismiss" = body.action === "dismiss" ? "dismiss" : "run";

    const replanContextFromBody = body.replan_context || body.replanContext || null;

    // ── Fetch tracker session ──
    let trackerSession: Record<string, unknown> | null = null;

    if (sessionId) {
      const { data } = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();
      trackerSession = data;
    } else {
      const { data } = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      trackerSession = data;
    }

    if (!trackerSession) {
      return jsonResponse(
        { error: "No tracker session found", response_text: "No active plan found." },
        404
      );
    }

    const tsId = trackerSession.id as string;
    const today = new Date().toISOString().split("T")[0];

    // ── DISMISS BRANCH ────────────────────────────────────────────
    if (action === "dismiss") {
      console.log(`process-replan v19: dismiss from user ${userId} on session ${tsId}`);

      const { error: updateErr } = await supabase
        .from("tracker_sessions")
        .update({
          replan_pending: false,
          replan_context: null,
          last_checkin_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tsId)
        .eq("user_id", userId);

      if (updateErr) {
        console.error("Failed to dismiss replan:", updateErr);
        return jsonResponse(
          { error: "Failed to dismiss replan", response_text: "Could not dismiss replan prompt. Please try again." },
          500
        );
      }

      return jsonResponse({
        action: "dismiss",
        dismissed: true,
        response_text: "Sticking with the current plan for now. I'll check in with you tomorrow.",
        response: "Sticking with the current plan for now. I'll check in with you tomorrow.",
        message: "Sticking with the current plan for now. I'll check in with you tomorrow.",
      });
    }

    // ── RUN BRANCH (existing behavior) ────────────────────────────
    const currentDay = (trackerSession.current_day as number) || 1;
    const workingPlan = (trackerSession.working_plan as Record<string, unknown>) || { phases: [] };
    const originalPlan = (trackerSession.original_plan as Record<string, unknown>) || { phases: [] };
    const runningNarrative = (trackerSession.running_narrative as string) || "";

    // Prefer explicit replan_context from body; fall back to stored pending context.
    const storedReplanContext = trackerSession.replan_context as Record<string, unknown> | null;
    const replanContext = replanContextFromBody || storedReplanContext || null;

    const daysRemaining = Math.max(1, 30 - currentDay + 1);

    const rawStrandStatus = trackerSession.strand_status as Record<string, unknown> | null;
    const isPortfolio = !!rawStrandStatus && typeof rawStrandStatus === "object" && Object.keys(rawStrandStatus).length > 0;
    const focusStrands = (trackerSession.focus_strands as string[]) || null;
    const portfolioReviews = (trackerSession.portfolio_reviews as unknown[]) || [];

    console.log(`process-replan v19: run from user ${userId}, isPortfolio=${isPortfolio}, day=${currentDay}`);

    let reportData: Record<string, unknown> | null = null;
    let answers: Record<string, unknown> = {};
    let selectedStrands: Array<Record<string, unknown>> | null = null;

    if (trackerSession.report_id) {
      const { data: report } = await supabase
        .from("reports")
        .select("core_report, answers, activation_plan, user_context_profile, selected_strands")
        .eq("id", trackerSession.report_id)
        .single();
      reportData = report;
      answers = (report?.answers as Record<string, unknown>) || {};
      const rawSelected = report?.selected_strands;
      if (Array.isArray(rawSelected)) {
        selectedStrands = rawSelected as Array<Record<string, unknown>>;
      }
    }

    const coreReport = (reportData?.core_report as Record<string, unknown>) || {};
    const archetype = (coreReport.archetype as Record<string, unknown>) || {};
    const recommendation = (coreReport.recommendation as Record<string, unknown>) || {};
    const userContextProfile = (reportData?.user_context_profile as Record<string, unknown>) || null;

    const q13Raw = (answers["13"] as string) || "";
    const q14Raw = (answers["14"] as string) || "";

    const userProfile: Record<string, unknown> = {
      first_name: "there",
      archetype: archetype.id || archetype.name || "unknown",
      recommended_model: recommendation.model_name || recommendation.name || "unknown",
      sector_context: recommendation.sector_context || archetype.sector || "",
      q13_network: q13Raw || "unknown",
      q14_employment_status: q14Raw || "employed_full_time",
    };

    if (userContextProfile) {
      const constraints = (userContextProfile.constraints as Record<string, unknown>) || {};
      const flags = (userContextProfile.derived_flags as Record<string, unknown>) || {};
      userProfile.time_budget = constraints.time_budget || null;
      userProfile.needs_fast_revenue = flags.needs_fast_revenue || false;
    }

    const allTasks = flattenTasks(workingPlan);
    const completedTasks = allTasks
      .filter((t) => t.status === "completed")
      .map((t) => ({
        task_id: t.id || t.task_id,
        description: t.description || "",
        completed_day: t.day || null,
        strand_id: t.strand_id || null,
        move_type: t.move_type || null,
      }));

    const originalPlanSummary = {
      success_metric: (originalPlan as Record<string, unknown>).success_metric || "",
      phases: ((originalPlan as Record<string, unknown>).phases as unknown[])
        ?.map((p: unknown) => {
          const phase = p as Record<string, unknown>;
          return { phase: phase.phase, label: phase.label, days: phase.days, focus: phase.focus || "" };
        }) || [],
    };

    const prompt6Input: Record<string, unknown> = {
      current_day: currentDay,
      days_remaining: daysRemaining,
      user_profile: userProfile,
      original_plan: originalPlanSummary,
      completed_tasks: completedTasks,
      running_narrative: runningNarrative,
      replan_context: replanContext || {
        circumstance_type: "busy_stretch",
        circumstance_detail: `User is on Day ${currentDay} with ${daysRemaining} days remaining. Replan triggered from check-in.`,
      },
    };

    if (isPortfolio && rawStrandStatus) {
      prompt6Input.strand_status = rawStrandStatus;
      prompt6Input.focus_strands = focusStrands;
      prompt6Input.portfolio_reviews = portfolioReviews;
      // Audit P1 #10: pass selected_strands so P6 knows each strand's move_type & warmth_type.
      if (selectedStrands) {
        prompt6Input.selected_strands = selectedStrands;
      }
      const strandCompletedCounts: Record<string, number> = {};
      for (const task of completedTasks) {
        const sid = task.strand_id as string;
        if (sid && sid !== "shared") {
          strandCompletedCounts[sid] = (strandCompletedCounts[sid] || 0) + 1;
        }
      }
      prompt6Input.strand_completed_counts = strandCompletedCounts;
    }

    console.log("Calling Prompt 6 with input:", JSON.stringify(prompt6Input).slice(0, 500));

    const systemPrompt = isPortfolio
      ? PROMPT_6_SYSTEM + PORTFOLIO_ADDENDUM_6
      : PROMPT_6_SYSTEM;

    const completion = await openai.chat.completions.create({
      model: MODEL_TIER2,
      temperature: 0.5,
      max_completion_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(prompt6Input) },
      ],
      response_format: { type: "json_object" },
    });

    const rawOutput = completion.choices[0].message.content || "{}";
    let p6Output: Record<string, unknown>;
    try {
      p6Output = JSON.parse(rawOutput);
    } catch {
      console.error("Failed to parse Prompt 6 output:", rawOutput);
      return jsonResponse(
        {
          error: "Failed to generate replan",
          response_text: "I wasn't able to rebuild the plan right now. Let's try again tomorrow.",
        },
        500
      );
    }

    console.log("Prompt 6 output summary:", p6Output.prompt6_output_summary);
    if (isPortfolio) {
      console.log("Strand rebalancing:", JSON.stringify(p6Output.strand_rebalancing));
    }

    const newWorkingPlan = buildReplanWorkingPlan(workingPlan, p6Output, currentDay);

    const newTasks = flattenTasks(newWorkingPlan).filter((t) => t.status !== "completed");
    const completedCount = completedTasks.length;
    const totalCount = completedCount + newTasks.length;

    const strandRebalancing = (p6Output.strand_rebalancing as Record<string, unknown>) || null;
    let updatedStrandStatus: Record<string, unknown> | null = null;
    let updatedFocusStrands: string[] | null = focusStrands;

    if (isPortfolio && rawStrandStatus && strandRebalancing) {
      const result = applyStrandRebalancing(rawStrandStatus, strandRebalancing);
      updatedStrandStatus = result.updatedStatus;
      updatedFocusStrands = result.updatedFocusStrands;
    }

    const { error: replanInsertError } = await supabase
      .from("replans")
      .insert({
        tracker_session_id: tsId,
        user_id: userId,
        triggered_day: currentDay,
        replan_context: replanContext || { circumstance_type: "unknown" },
        replan_output: p6Output,
        replan_summary: (p6Output.replan_summary as string) || `Replan from Day ${currentDay}`,
      });

    if (replanInsertError) {
      console.error("Failed to store replan:", replanInsertError);
    }

    const narrativeAddition = (p6Output.narrative_addition as string) || "";
    const separator = runningNarrative ? "\n" : "";
    const updatedNarrative = narrativeAddition
      ? runningNarrative + separator + narrativeAddition
      : runningNarrative;

    const sessionUpdate: Record<string, unknown> = {
      working_plan: newWorkingPlan,
      running_narrative: updatedNarrative,
      tasks_completed: completedCount,
      tasks_total: totalCount,
      updated_at: new Date().toISOString(),
      // Clear the pending flag once the user has confirmed and we've rebuilt the plan.
      replan_pending: false,
      replan_context: null,
    };

    if (updatedStrandStatus) {
      sessionUpdate.strand_status = updatedStrandStatus;
    }
    if (updatedFocusStrands) {
      sessionUpdate.focus_strands = updatedFocusStrands;
    }

    const { error: sessionUpdateError } = await supabase
      .from("tracker_sessions")
      .update(sessionUpdate)
      .eq("id", tsId)
      .eq("user_id", userId);

    if (sessionUpdateError) {
      console.error("Failed to update tracker session:", sessionUpdateError);
    }

    await supabase
      .from("checkin_history")
      .update({ replan_triggered: true })
      .eq("tracker_session_id", tsId)
      .eq("user_id", userId)
      .eq("checkin_date", today);

    return jsonResponse({
      action: "run",
      response_text:
        (p6Output.prompt6_output_summary as string) || "Your plan has been updated from today forward.",
      replan_summary:
        (p6Output.replan_summary as string) || `Replan from Day ${currentDay}`,
      total_days: p6Output.total_days || daysRemaining,
      phases: p6Output.phases || [],
      new_working_plan: newWorkingPlan,
      tasks_completed: completedCount,
      tasks_total: totalCount,
      is_portfolio: isPortfolio,
      strand_rebalancing: strandRebalancing,
      updated_strand_status: updatedStrandStatus,
      updated_focus_strands: updatedFocusStrands,
      response: (p6Output.prompt6_output_summary as string) || "Your plan has been updated.",
      message: (p6Output.prompt6_output_summary as string) || "Your plan has been updated.",
    });
  } catch (error) {
    console.error("process-replan v19 error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
        response_text: "Something went wrong rebuilding the plan. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
