// draft-outreach v26 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// draft-outreach v23 — P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v22 baseline: 2026-04-17 Audit P2 #16 — source-header reconciled with deploy counter.
// Earlier history:
//   - v13 (pre-reconciliation): P10 Move Drafter (all four move types). ADR-012 (2026-04-17) —
//     upgraded to MODEL_TIER1 (gpt-5.4). Sprint 3 of the Making Moves rebuild.
//     Replaces the old single-type outreach drafter (v10) with the full P10 Move Drafter spec.
//     Four move types: direct | platform | visibility | community. Each returns a different
//     typed JSON artefact per the P10 output schema.
//     Input (new schema): move_type, strand_id (optional), format (Direct only), contact (Direct only),
//     specific_notes (optional). Backward compat (legacy schema) maps to Direct/linkedin_dm or email:
//     contact_name, contact_role, contact_org, relationship, message_type.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
const MODEL_TIER2 = "gpt-5.4-mini";   // Structured output, signal reading, advisory
const MODEL_TIER3 = "gpt-5.4-nano";   // Classification, extraction, low-temp structured tasks

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch {
    return null;
  }
}

const P10_SYSTEM_PROMPT = `You are the move drafter for Solo — a product that helps mid-career professionals make their first commercial moves toward independence. Your job is to generate the right kind of move artefact for each strand in the user's plan.

There are four move types. You must identify which one you are drafting for and apply the appropriate rules:

**Direct** — A message to a specific named person. Written first-person, sounds like a real human, not a template. The user sends it.
**Platform** — A guide to setting up or optimising a presence on a specific marketplace or platform. Administrative, permanent, one-time-effort. The user follows the steps.
**Visibility** — A LinkedIn post or article draft. Short-form by default. Written to establish positioning in the user's sector. The user publishes it.
**Community** — A plan for joining a relevant professional community and making a first meaningful contribution. Ambient, patient, relationship-building. The user executes the entry over days.

You have the user's complete profile: their career background, their recommended business model, their specific achievement, their sector context, and where they are in their journey. Use all of it. Every artefact should feel like it could only have been produced for this specific person — not a generic template.

---

### Rules for Direct moves

- Never open with "I hope this finds you well", "I wanted to reach out", "I'm reaching out because", or any other cliché opener. Start with something real.
- Write in plain, direct British English. No Americanisms. No startup language. No corporate filler.
- The message should make the recipient feel noticed and respected — not targeted.
- Keep it short. A crisp 120-word email gets more replies than a thorough 300-word one. Resist the urge to explain.
- End with a single, low-friction CTA. A 20-minute call, a coffee, a quick question.
- Use [square brackets] only for genuine placeholders where you don't have the information needed.

Format word counts for Direct:
- email_reconnect: 150–200 words
- email_cold: 100–140 words
- email_referral_ask: 120–160 words
- linkedin_dm: 80–120 words
- verbal: 50–70 words (what to say in the first 30 seconds of a call or conversation)

---

### Rules for Platform moves

- Write as a step-by-step setup or optimisation guide for the specific named platform.
- Focus on what will generate inbound — not what looks good for its own sake.
- Be specific: name the exact fields, categories, or profile sections that matter for this platform.
- Calibrate to the user's sector: the right keywords, the right category selections, the right credibility signals for buyers in this market.
- Output steps, not paragraphs. Each step should be a discrete action.
- Include: platform name, profile URL (if registerable), completion timeline, and what "done" looks like.
- Note when inbound typically begins.

---

### Rules for Visibility moves

- Default to LinkedIn. Unless the strand context specifies a different channel.
- Write for the user's target buyer, not for peers or the general public.
- A post that speaks directly to a problem their buyers face will outperform one that announces who the user is.
- Keep it short: 200–300 words maximum for a post. Articles can run to 600 words but must be structured.
- Tone: grounded, specific, slightly opinionated. The user should sound like someone who has seen this problem from the inside — not a thought leader performing expertise.
- Always end with a light question or observation that invites engagement without forcing it.
- Do not ask the user to mention their availability or services in the post itself.

---

### Rules for Community moves

- Identify the most relevant community for this strand: a LinkedIn group, a sector association, a Slack workspace, a forum, or a professional body subgroup.
- The entry plan has three parts: (1) where to join, (2) how to establish presence without pitching, (3) what a first meaningful contribution looks like.
- Community moves work on a patient timeline — the value accumulates over weeks. Frame this honestly.
- Contribution ideas should be sector-specific and non-promotional.
- Do not recommend generic communities. Name the specific community, explain why it's the right one, and give the user a concrete first step.

---

QUALITY STANDARD — Before returning any artefact, test it:

Direct: "Would a real person who receives this message feel respected and interested, or would they feel marketed to?" If "marketed to" — rewrite.
Platform: "Could the user follow these steps without asking a single clarifying question?" If no — add specificity.
Visibility: "Does this post say something that a target buyer would find genuinely useful or thought-provoking — or does it just announce who the user is?" If the latter — rewrite around a buyer problem.
Community: "Is this a specific named community with a concrete entry plan, or is it a generic suggestion to 'join groups'?" If the latter — name the community, explain why, give the steps.

The bar is not cleverness — it is usefulness. A move that gets executed outperforms a polished artefact that sits in the plan untouched.

---

Return a single JSON object. No preamble, no explanation — only the JSON.

For Direct moves, return:
{
  "move_type": "direct",
  "draft": {
    "format": "email_reconnect | email_cold | email_referral_ask | linkedin_dm | verbal",
    "subject": "string or null",
    "body": "string — full message ready to send",
    "word_count": integer
  },
  "tone_note": "string",
  "personalisation_instructions": "string",
  "alternative_approach": "string or null"
}

For Platform moves, return:
{
  "move_type": "platform",
  "platform_name": "string",
  "platform_url": "string or null",
  "why_this_platform": "string",
  "setup_steps": [{ "step_number": integer, "action": "string", "notes": "string or null" }],
  "completion_timeline": "string",
  "done_looks_like": "string",
  "inbound_timing": "string",
  "tone_note": "string"
}

For Visibility moves, return:
{
  "move_type": "visibility",
  "channel": "string",
  "post_draft": { "body": "string", "word_count": integer },
  "posting_note": "string",
  "tone_note": "string",
  "personalisation_instructions": "string",
  "alternative_approach": "string or null"
}

For Community moves, return:
{
  "move_type": "community",
  "community_name": "string",
  "community_type": "string",
  "why_this_community": "string",
  "join_url": "string or null",
  "entry_plan": [
    { "phase": "Join", "action": "string" },
    { "phase": "Establish presence", "action": "string" },
    { "phase": "First meaningful contribution", "action": "string" }
  ],
  "timeline": "string",
  "tone_note": "string"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("Authorization") || req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // ── Normalise input: new schema or legacy schema ──
    let moveType: string;
    let format: string | null;
    let strandId: string | null;
    let contact: Record<string, string | null>;
    let specificNotes: string | null;

    const isLegacy = !body.move_type && (body.contact_name || body.message_type);

    if (isLegacy) {
      moveType = "direct";
      const legacyMsgType = body.message_type || "linkedin_dm";
      format = legacyMsgType === "email" ? "email_cold"
        : legacyMsgType === "intro_request" ? "email_referral_ask"
        : "linkedin_dm";
      strandId = null;
      contact = {
        name: body.contact_name || null,
        role: body.contact_role || null,
        company: body.contact_org || null,
        relationship: body.relationship || null,
        shared_context: null,
      };
      specificNotes = null;
    } else {
      moveType = body.move_type || "direct";
      format = body.format || null;
      strandId = body.strand_id || null;
      contact = body.contact || {};
      specificNotes = body.specific_notes || null;
    }

    console.log(`draft-outreach v23 — move_type: ${moveType}, format: ${format || "n/a"}, strand_id: ${strandId || "none"}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

    // ── Fetch latest report ──
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, core_report, hook_insight, answers, selected_strands, user_context_profile")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: "No report found", response_text: "Complete your Solo report before drafting a move." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coreReport = report.core_report || {};
    const answers = report.answers || {};
    const archetype = coreReport.archetype?.primary || "";
    const transferableValue = coreReport.transferable_value || {};
    const options = coreReport.options || [];

    // ── Resolve strand context ──
    let strandLabel = "";
    let strandMoveType = moveType;
    let strandWarmthType: string | null = null;

    if (strandId && report.selected_strands) {
      const selectedStrands = Array.isArray(report.selected_strands)
        ? report.selected_strands
        : [];
      const strand = selectedStrands.find((s: Record<string, unknown>) => s.strand_id === strandId);
      if (strand) {
        strandLabel = (strand.model_name as string) || "";
        strandMoveType = (strand.primary_move_type as string) || moveType;
        strandWarmthType = (strand.warmth_type as string) || null;
        if (!body.move_type) moveType = strandMoveType;
      }
    } else if (!strandLabel) {
      const topOption = options[0];
      strandLabel = topOption?.model_name || "";
    }

    // ── Fetch tracker state ──
    let movesMade = 0;
    let trackerDay: number | null = null;
    let trackerActive = false;
    let recentProgress: string | null = null;

    const { data: trackerSession } = await supabase
      .from("tracker_sessions")
      .select("current_day, strand_status, running_narrative")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (trackerSession) {
      trackerActive = true;
      trackerDay = trackerSession.current_day || null;
      const strandStatus = trackerSession.strand_status as Record<string, Record<string, unknown>> | null;
      if (strandStatus && strandId && strandStatus[strandId]) {
        const ss = strandStatus[strandId];
        movesMade = (ss.tasks_completed as number) || 0;
      }
      const narrative = trackerSession.running_narrative;
      if (narrative && typeof narrative === "string") {
        recentProgress = narrative.slice(-200) || null;
      }
    }

    // ── Fetch CV extract ──
    let cvHighlights: string | null = null;
    let cvQualifications: string | null = null;

    const { data: cvData } = await supabase
      .from("cv_extracts")
      .select("career_highlights, qualifications")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cvData) {
      cvHighlights = cvData.career_highlights || null;
      cvQualifications = cvData.qualifications || null;
    }

    // ── Build P10 user message ──
    const userMessage = JSON.stringify({
      user_context: {
        first_name: null,
        archetype,
        recommended_model: strandLabel || (options[0]?.model_name || ""),
        what_they_sell: transferableValue.what_they_can_sell || "",
        target_buyer: options[0]?.target_buyer || "",
        q3b_employer_org_type: answers["3b"] || answers["30"] || "",
        q6_specific_achievement: answers["6"] || "",
        q11_sector_context: answers["11"] || "",
        tracker_active: trackerActive,
        tracker_day: trackerDay,
        recent_progress: recentProgress,
        cv_career_highlights: cvHighlights,
        cv_qualifications: cvQualifications,
      },
      strand_context: {
        strand_id: strandId || "strand_1",
        strand_label: strandLabel,
        move_type: strandMoveType,
        warmth_type: strandWarmthType,
        moves_made_so_far: movesMade,
        last_move_outcome: null,
      },
      contact: moveType === "direct" ? {
        name: contact.name || null,
        role: contact.role || null,
        company: contact.company || null,
        relationship: contact.relationship || null,
        shared_context: contact.shared_context || null,
      } : null,
      move_request: {
        move_type: moveType,
        format: moveType === "direct" ? (format || "email_cold") : null,
        specific_notes: specificNotes,
      },
    });

    // ── Call MODEL_TIER1 (gpt-5.4) with P10 prompt ──
    const completion = await openai.chat.completions.create({
      model: MODEL_TIER1,
      temperature: 0.5,
      max_completion_tokens: 1200,
      messages: [
        { role: "system", content: P10_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content || "{}";
    let artefact: Record<string, unknown>;
    try {
      artefact = JSON.parse(raw);
    } catch {
      console.error("P10 parse error — raw:", raw.slice(0, 200));
      artefact = { error: "Parse failed", raw };
    }

    console.log(`draft-outreach v23 — artefact generated, move_type: ${artefact.move_type || moveType}`);

    // ── Build response_text for frontend ──
    let responseText = "";
    if (artefact.draft && (artefact.draft as Record<string, unknown>).body) {
      responseText = (artefact.draft as Record<string, unknown>).body as string;
    } else if (artefact.post_draft && (artefact.post_draft as Record<string, unknown>).body) {
      responseText = (artefact.post_draft as Record<string, unknown>).body as string;
    } else if (artefact.platform_name) {
      responseText = `Platform setup guide for ${artefact.platform_name}`;
    } else if (artefact.community_name) {
      responseText = `Community entry plan for ${artefact.community_name}`;
    }

    return new Response(
      JSON.stringify({
        ...artefact,
        response_text: responseText,
        message: responseText,
        contact_name: contact.name || null,
        message_type: format || moveType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("draft-outreach v23 error:", err);
    return new Response(
      JSON.stringify({ error: String(err), response_text: "Failed to draft move. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
