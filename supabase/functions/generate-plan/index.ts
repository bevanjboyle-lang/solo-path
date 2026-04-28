// generate-plan v28 — async pattern (mirrors generate-report v44.1)
//
// Changes from v27:
//   - Synchronous: validate input, fetch report, mark status='generating_plan',
//     return { report_id, status: 'generating_plan' } immediately (~2s).
//   - Background (via EdgeRuntime.waitUntil): all OpenAI calls + final report row update.
//
// Why: synchronous v27 takes 60-180s for prompt 3 (16384 tokens) plus per-strand market
// snapshots in parallel. Total time exceeds gateway proxy timeout (60-150s) and the browser
// sees a hung connection. Frontend should poll reports.status until 'complete'.
//
// v27 baseline: P0 #22 (2026-04-18) max_tokens → max_completion_tokens for GPT-5.4 compatibility.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";

const FUNCTION_VERSION = "v28-async";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

const parseJ = (t: string) => {
  try {
    return JSON.parse(t.replace(/```json\n?|```/g, "").trim());
  } catch {
    return {};
  }
};

// ── Warmth determination ──
function computeWarmthType(structural_warmth: boolean): "relational" | "structural" {
  return structural_warmth === true ? "structural" : "relational";
}

// ── Prompt 3v2.3 system prompt (Apollo sprint — outreach_subtype + apollo_query) ──
const PROMPT_3V2_SYSTEM = `You are Solo's portfolio activation specialist. Your job is to take a user's selected opportunity portfolio — 2 to 5 business model strands they want to explore in parallel — and produce:

1. A 30-Day Portfolio Activation Plan — a single integrated plan that helps the user test all selected strands simultaneously, with shared foundational work front-loaded and strand-specific actions clearly tagged.
2. Ready-to-send move drafts for every move task, customised per strand and move type.
3. A Network Activation Toolkit — 4 personalised Direct-type message templates covering the portfolio.
4. Traction signals for each strand — specific observable events that indicate market response.
5. Time allocation guidance — how to split limited time across strands.

This is a paid deliverable. The plan must feel like one coherent strategy, not multiple disconnected plans.

CORE PLANNING PHILOSOPHY

The user has chosen multiple paths because they are uncertain which one will work best. Your plan must:
1. Respect the uncertainty. Each strand gets genuine effort during Phase 2.
2. Front-load shared work. Phase 1 accomplishes everything that benefits ALL strands.
3. Create genuine parallel testing. Phase 2 has strand-specific moves for each strand.
4. Build toward narrowing. By Day 19, the user should have enough evidence to begin narrowing.
5. End focused. Phase 4 concentrates on the 1-2 strands showing the most promise.

PERSONALISATION INPUTS

Use all context provided in the user message. Q3b (employer/org type) is the single most impactful signal — reference the actual employer name or org type when writing positioning statements and move drafts. Q6 (achievement) builds the Phase 1 war story — name the specific outcome/metric from Q6 in the war story task description. Q11 (sector context) personalises moves per strand — name the specific buyer types from Q11 when describing move targets. Q12 (independent experience) calibrates Phase 1 depth. Q5/Q2 (seniority/years) calibrate move targets. Hook insight must appear as a concrete task assigned to the most relevant strand.

MOVE TYPE AWARENESS — CRITICAL

Each strand carries a primary_move_type field: direct | platform | visibility | community. This is KB-authoritative — do not override it.

Each strand also carries a warmth_type field: relational | structural.

Tailor all strand-specific Phase 2 tasks to the move type:
- direct strands: named-contact outreach tasks (emails, LinkedIn DMs). warmth_type=relational → leverage existing contacts first.
- platform strands: marketplace/directory registration tasks. warmth_type=structural → profile setup, platform search optimisation, first response protocol.
- visibility strands: LinkedIn post or article publishing tasks. Draft a complete post ready to publish.
- community strands: join a named professional community + first visible contribution.

NETWORK CALIBRATION — DIRECT STRANDS ONLY

The network_quality flag applies ONLY to direct-type strands. Platform, Visibility, and Community moves are not network-dependent.

For direct strands:
- strong: 12-15 total direct move actions in Phase 2 across direct strands
- moderate: 8-10 total direct move actions
- weak: 5-7 total direct move actions

For platform, visibility, and community strands: include the appropriate strand-specific tasks regardless of network_quality.

network_note in output: 1 sentence on Direct-type move volume based on network strength. Note that Platform, Visibility, and Community moves are not constrained by network.

CRITICAL MOVE PERSONALISATION:
- Direct move drafts MUST reference the user's Q6 achievement and Q3b employer context as the credibility anchor.
- Platform move tasks must name the specific platform(s) relevant to the model (e.g. Bark, Checkatrade, ISO certification directories).
- Visibility move tasks must produce a complete, ready-to-publish LinkedIn post draft.
- Community move tasks must name the specific community relevant to the model.
- The war story in Phase 1 MUST be built around the specific Q6 achievement.

USER CONTEXT PROFILE (structured flags — use these directly, they are pre-computed from questionnaire answers):
- can_do_evenings_weekends_only: if true, ALL day labels must be "Evening" or "Weekend Day" — never "Weekday"
- needs_fast_revenue: if true, weight Phase 2 tasks toward fastest-revenue strand; front-load moves for that strand
- has_sales_confidence: if false, simplify initial move tasks — warmer targets, shorter asks, lower friction
- has_advisory_instinct: if true, include a task that leverages existing informal advisory behaviour as a commercial lever
- network_quality (weak/moderate/strong): use for Direct strand move volume ONLY
- time_budget: employed_full_time → Evening/Weekend only; on_notice → Weekday 5-6hrs; unemployed → Weekday 5-6hrs; employed_part_time → Weekday 2-3hrs

Do not reference inputs by name or question number in the output.

PACING RULES

Base pacing on the time_budget flag in user_context_profile (takes precedence over inferred employment status).
- employed_full_time: Evening labels, 1-1.5 hours per evening; Weekend Day labels, 3-4 hours.
- unemployed / on_notice: Weekday labels, 5-6 hours.
- employed_part_time: Weekday labels, 2-3 hours.

Time allocation across strands:
- Phase 1 (shared): 100% on shared foundations
- Phase 2 (strand activation): Proportional to strand count and composite score. No strand gets less than 20%.
- Phase 3 (evidence & review): Portfolio Review priority. Remaining time to active strands.
- Phase 4 (focus): 70-80% on focus strand(s), 20-30% on watching strands.

PLAN PHASES

Phase 1 — Shared Foundations (Days 1-7): Positioning (framed at archetype level, not locked to one model), war story from achievement, LinkedIn, credibility audit, network mapping for direct strands, platform research for platform strands. NOTE: If ALL selected strands carry primary_move_type = direct, do NOT include a platform research day in Phase 1 — replace it with a network segmentation task (categorising existing contacts by strand relevance and ranking outreach priority).

Phase 2 — Strand Activation (Days 8-18): Strand-specific moves and testing. Each strand gets dedicated time blocks. Tasks tagged with strand_id. IMPORTANT: Every day in Phase 2 must have tasks for at least 2 different strands (if 3+ strands selected). Do not leave any day with only one strand's tasks.

Phase 3 — Evidence & Review (Days 19-23): Day 19 is Portfolio Review 1 (check-in system). Days 20-23 execute on narrowed focus. Days 20-23 must be populated — do not leave them empty after the review checkpoint.

Phase 4 — Focus & Accelerate (Days 24-30): Day 26 is Portfolio Review 2 (final focus decision). Concentrate on 1-2 strongest strands. Days 24-30 must all be populated — do not truncate. Include the Day 26 review and the final push through Day 30.

MOVE DRAFT RULES

For every move task, generate an outreach_draft appropriate to the move type:
- direct: email_reconnect (150-200 words), email_cold (100-140 words), linkedin_dm (80-120 words), verbal (50-70 words)
- platform: platform_profile_setup — describe the specific profile elements to complete
- visibility: linkedin_post — complete ready-to-publish post, 150-250 words, include a hook, body, and CTA
- community: community_intro — introductory message for first community contribution, 80-120 words

Write in the user's voice — calm, professional, direct, not salesy. Include tone_note and personalisation_instructions.

If has_sales_confidence is false: use warmer, lower-stakes opening lines. Prefer reconnect emails over cold outreach. Shorter bodies. Softer ask.

FIRST MOVE

Identify the single most important action within 24 hours. Must be a move action — NOT a research or admin task. Must name a specific type of person or platform to contact/join. Must include a complete, ready-to-send draft appropriate to the strand's primary_move_type.

For direct strands: references the user's Q6 achievement and Q3b employer context as credibility anchor.
For platform strands: names the specific platform and first registration step.
For visibility strands: names the specific post topic and includes a draft.
For community strands: names the specific community and first contribution.

PROHIBITED for first_move: "Conduct market research", "Review your options", "Identify potential clients" as the primary action.

TRACTION SIGNALS

For each strand, generate 5-7 specific observable traction signals appropriate to the move type with weights: negative, moderate, strong, very_strong.
- direct strands: reply rates, meeting requests, referrals
- platform strands: profile views, enquiry messages, quote requests
- visibility strands: post impressions, DMs received, connection requests from target buyers
- community strands: reactions to first contribution, DMs, invitations to collaborate

PROHIBITED LANGUAGE: Do NOT use motivational clichés anywhere in the output. Banned: "golden opportunity", "this is your moment", "perfect time", "indispensable", "ideal foundation", "exciting opportunity", "transform your career". Solo's tone is direct, commercially grounded, and specific.

OUTPUT FORMAT — Output ONLY this JSON:
{
  "portfolio_summary": {
    "strand_count": number,
    "strands": [
      {
        "strand_id": "strand_1",
        "model_name": string,
        "rank": number,
        "primary_move_type": string,
        "warmth_type": string,
        "why_included": string,
        "time_weight": number
      }
    ],
    "strategy": string,
    "effort_distribution": string
  },
  "first_move": {
    "action": string,
    "strand_id": string,
    "move_type": string,
    "window": "Within 24 hours",
    "why_first": string,
    "outreach_draft": {
      "format": string,
      "subject": string | null,
      "body": string,
      "tone_note": string,
      "personalisation_instructions": string
    },
    "follow_up_prompt": string
  },
  "activation_plan": {
    "summary": string,
    "pacing_note": string,
    "network_note": string,
    "phases": [
      {
        "phase": string,
        "days": string,
        "goal": string,
        "strand_focus": "shared | all_strands | narrowing | focus_strands",
        "days_detail": [
          {
            "day": string,
            "label": string,
            "time_required": string,
            "time_allocation": {},
            "tasks": [
              {
                "task_id": string,
                "strand_id": string,
                "task_type": "foundation | outreach | content | research | admin | review",
                "move_type": string | null,
                "outreach_subtype": "warm" | "cold" | null,
                "apollo_query": {
                  "person_titles": [string],
                  "sector_keywords": string,
                  "seniority_levels": [string],
                  "location": string,
                  "company_size_ranges": [string]
                } | null,
                "description": string,
                "outreach_draft": null | {
                  "format": string,
                  "subject": string | null,
                  "body": string,
                  "tone_note": string,
                  "personalisation_instructions": string
                }
              }
            ]
          }
        ]
      }
    ],
    "success_metric": string
  },
  "traction_signals": [
    {
      "strand_id": string,
      "model_name": string,
      "move_type": string,
      "signals": [
        { "signal": string, "weight": "negative | moderate | strong | very_strong" }
      ]
    }
  ],
  "portfolio_review_guide": {
    "review_1": { "trigger_day": 19, "questions": [string] },
    "review_2": { "trigger_day": 26, "questions": [string] }
  },
  "network_toolkit": {
    "intro": string,
    "templates": [
      {
        "type": "reconnect_email | linkedin_dm | referral_ask_email | verbal_positioning_statement",
        "strand_id": string,
        "use_case": string,
        "subject": string | null,
        "body": string,
        "statement": string | null
      }
    ]
  }
}

QUALITY RULES
- first_move must be a move action (not research), with a complete sendable draft appropriate to the strand's move type
- hook_insight must appear as an explicitly labelled concrete task in the activation plan (not merely paraphrased in the strategy narrative) — the task description must make clear it derives from the hook insight, assigned to the most applicable strand
- Every day in Phase 2 must have tasks for at least 2 different strands (if 3+ strands selected)
- Every move task must have a populated outreach_draft
- Phase 1 tasks must genuinely serve ALL strands
- Phase 4 tasks should concentrate on 1-2 strands
- Traction signals must be specific per strand and move type — not copied across strands
- Direct strand move volume must respect network calibration from user_context_profile.constraints.network_quality
- Platform/Visibility/Community strand tasks are NOT constrained by network_quality
- War story in Phase 1 must name the specific Q6 achievement metric/outcome
- time_weight values and effort_distribution text must agree exactly — if all strands carry equal time weights, effort_distribution must not express a preference for any single strand
- Every direct outreach draft (email, DM, verbal) — subject line AND opening body — must reference the user's Q6 achievement or name the buyer's specific immediate problem. Generic subjects such as "Reconnecting and Introducing a New Service" are prohibited.
- If ALL selected strands carry primary_move_type = direct, Phase 1 must not include a platform research day — replace it with a network segmentation task (categorising existing contacts by strand relevance and ranking outreach priority)
- Traction signals for direct strands must reference the specific deliverable and engagement context unique to each model — not a generic referral/meeting/proposal pattern repeated identically across strands. Examples: Business Case Development → "IC draft endorsed by sponsor and submitted to board"; Financial Modelling → "model used in a live investment or board decision"; Board & Investor Reporting → "board pack redesign confirmed for next board cycle". Signal vocabulary must differ per strand.
- Portfolio review questions for direct-move portfolios must reference observable outreach signals by name (reply rates, meetings booked, proposal requests) — not generic "interest" or "engagement" language
- first_steps must be grounded in the user's specific network, employer context, and selected strands — do not include generic advice such as "find a mentor", "seek a coach", or "invest in sales training"
- All phases (1–4) must be fully populated. Do not truncate Phase 2, 3, or 4. Phase 2 has 11 days, Phase 3 has 5 days, Phase 4 has 7 days — all must have populated days_detail entries.
- CRITICAL TOKEN BUDGET RULE: Every outreach_draft body within activation_plan.phases days_detail tasks must be abbreviated to 60–80 words maximum — hook + ask only. Do NOT write full 150–200 word drafts inline in phase task outreach_drafts. Full message templates belong in network_toolkit. This compression is mandatory to ensure all 30 days are populated without truncation.
- HOOK INSIGHT EXPLICIT LABEL: Exactly one task in the activation plan must have a description that begins with the exact phrase "Hook insight task:" followed by the specific action derived from the hook_insight. This task must be placed in Phase 2, assigned to the strand where the insight is most commercially relevant. It must be a distinct task from the war story task. Example: "Hook insight task: Contact a CFO in your network who is preparing for a board restructure — your Q2 insight about enterprise value extraction applies directly here."
- FIRST MOVE SUBJECT LINE: The first_move outreach_draft subject line must reference the Q6 achievement metric directly or name the buyer's specific immediate problem. It must NOT be a generic service description. Prohibited patterns (do not use): "[Service] Opportunities", "Exploring [Service] Opportunities", "Discussing [Service]", "Reconnecting and Introducing", "Introduction to [Service]". Required: include the specific metric or a named buyer problem — for example: "Your £38M investment case — following up" or "Board pack redesign: following my [Bank] experience".
- TRACTION SIGNALS NO GENERIC SHARED VOCABULARY: Do not use "meeting request", "meeting requests", "referral to another executive", "referral to a finance executive", "request for proposal", "proposal request", or "request for pricing" as traction signals if the same pattern appears across more than one strand. Every signal across all strands must use vocabulary unique to that strand's deliverable and engagement context. Each signal must name the specific milestone, output, or observable event that only makes sense for that model — not a generic pipeline stage that could apply to any consulting strand.
- OUTREACH SUBTYPE REQUIRED: Every task with task_type "outreach" must include the field outreach_subtype set to either "warm" or "cold". WARM = the user already has a relationship with this contact type (reconnects with former colleagues or clients, referral asks from existing contacts, warm introductions via a mutual). COLD = the user is reaching out to a stranger matching a buyer profile (prospecting a new sector contact, approaching a hiring manager, reaching out to a platform or community organiser they have never met). Non-outreach tasks must have outreach_subtype: null. Classify accurately — this field controls whether Apollo contact-finding is offered to the user.
- APOLLO QUERY FOR COLD TASKS: Every task with outreach_subtype "cold" must include an apollo_query object with all five fields: person_titles (array of 3–5 job title variants for the target role — include both Director-level and Head-of variants), sector_keywords (4–8 words capturing the sector and function, e.g. "NHS trust public sector healthcare transformation programme delivery"), seniority_levels (one or more of: "director", "vp", "senior", "manager", "c_suite" — match to the seniority of the target buyer), location (default "United Kingdom" unless Q15 indicates a specific region), company_size_ranges (Apollo range strings matching the typical org size — e.g. "501,1000", "1001,5000"). Tasks with outreach_subtype "warm" must have apollo_query: null. Tasks with outreach_subtype null must have apollo_query: null.`;

// ── Prompt 4 system prompt (Market Snapshot) ──
const PROMPT_4_SYSTEM = `You are Solo's market research analyst. Your job is to produce a Local Market Feasibility Snapshot for a specific solo business model in a specific location.

This is a paid deliverable. It must feel commercially grounded and locally relevant.

IMPORTANT: You do not have access to live market data. Be honest about this. Label estimates clearly as indicative.

Produce a Local Market Feasibility Snapshot covering 5 sections:

1. DEMAND SIGNAL — Is there real demand? Who is the likely buyer concentration?
2. PRICING BENCHMARK — Open with a caveat. What would a credible independent charge?
3. COMPETITOR LANDSCAPE — Who are the likely competitors? Name at least one specific boutique firm, specialist consultancy, freelance platform, or relevant directory directly relevant to this exact model type and buyer profile — not just general categories like "Big Four" or "boutique consultancies". Is the market crowded or is there room for a specialist?
4. MARKET ENTRY INSIGHT — Most realistic first-client path? Which channels work?
5. HONEST ASSESSMENT — Direct: is this a good market? 1-2 biggest risks?

OUTPUT FORMAT: Plain text with clear section headings.

LOCAL MARKET FEASIBILITY SNAPSHOT
[Model name] | [Location]
Prepared as indicative research — not primary market data

DEMAND SIGNAL
[2-3 paragraphs]

PRICING BENCHMARK
[1-2 paragraphs with indicative GBP figures]

COMPETITOR LANDSCAPE
[2-3 paragraphs]

MARKET ENTRY INSIGHT
[2-3 paragraphs]

HONEST ASSESSMENT
[1-2 paragraphs]

Disclaimer: This snapshot is based on general market knowledge and reasoning, not primary research or live data.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { report_id, selected_rank, selected_ranks } = body;

    if (!report_id) {
      return new Response(
        JSON.stringify({ error: "report_id is required", response_text: "report_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let ranksToProcess: number[] = [];
    if (selected_ranks && Array.isArray(selected_ranks) && selected_ranks.length >= 2) {
      if (selected_ranks.length > 5) {
        return new Response(
          JSON.stringify({ error: "Maximum 5 strands allowed", response_text: "Please select between 2 and 5 options." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      ranksToProcess = selected_ranks;
    } else if (selected_rank) {
      ranksToProcess = [selected_rank];
    } else {
      return new Response(
        JSON.stringify({ error: "selected_ranks (array of 2-5) or selected_rank (number) is required", response_text: "Please select your options." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPortfolio = ranksToProcess.length >= 2;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // ── Fetch the report ──
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !report) {
      return new Response(
        JSON.stringify({ error: "Report not found or access denied", response_text: "Report not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coreReport = report.core_report;
    const answers = report.answers || {};
    const hookInsight = report.hook_insight;

    // ── Read user context profile (generated by generate-report) ──
    const userContextProfile = (report.user_context_profile as Record<string, unknown>) || {};
    const profileConstraints = (userContextProfile.constraints as Record<string, unknown>) || {};
    const profileFlags = (userContextProfile.derived_flags as Record<string, unknown>) || {};

    console.log("generate-plan v27 — P0 #22: max_tokens → max_completion_tokens (GPT-5.4 compatibility)");
    console.log("User context profile loaded:", {
      network_quality: profileConstraints.network_quality,
      time_budget: profileConstraints.time_budget,
      needs_fast_revenue: profileFlags.needs_fast_revenue,
      can_do_evenings_weekends_only: profileFlags.can_do_evenings_weekends_only,
    });

    // ── Resolve selected options with move metadata ──
    const selectedStrands: Array<{
      strand_id: string;
      rank: number;
      model_name: string;
      business_model_id: string | null;
      primary_move_type: string;
      structural_warmth: boolean;
      warmth_type: "relational" | "structural";
      option: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < ranksToProcess.length; i++) {
      const rank = ranksToProcess[i];
      const option = coreReport.options?.find(
        (o: { rank: number }) => o.rank === rank
      );
      if (!option) {
        return new Response(
          JSON.stringify({ error: `Option with rank ${rank} not found in report`, response_text: `Option rank ${rank} not found.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const business_model_id = (option.business_model_id as string) || null;
      const primary_move_type = (option.primary_move_type as string) || "direct";
      const structural_warmth = option.structural_warmth === true;
      const warmth_type = computeWarmthType(structural_warmth);

      selectedStrands.push({
        strand_id: `strand_${i + 1}`,
        rank: option.rank,
        model_name: option.model_name,
        business_model_id,
        primary_move_type,
        structural_warmth,
        warmth_type,
        option,
      });
    }

    // ── Observability: log move type and warmth type distribution ──
    const moveTypeDist = selectedStrands.reduce((acc: Record<string, number>, s) => {
      acc[s.primary_move_type] = (acc[s.primary_move_type] || 0) + 1;
      return acc;
    }, {});
    const warmthDist = selectedStrands.reduce((acc: Record<string, number>, s) => {
      acc[s.warmth_type] = (acc[s.warmth_type] || 0) + 1;
      return acc;
    }, {});
    console.log(`v27 strand distribution — move_types: ${JSON.stringify(moveTypeDist)}, warmth_types: ${JSON.stringify(warmthDist)}`);

    const missingMoveMetadata = selectedStrands.filter(s => !s.business_model_id).length;
    if (missingMoveMetadata > 0) {
      console.error(`WARNING: ${missingMoveMetadata} strands missing business_model_id — report may have been generated before v19`);
    }

    // ── Mark report as generating ──
    await supabase
      .from("reports")
      .update({
        selected_strands: selectedStrands.map(s => ({
          strand_id: s.strand_id,
          rank: s.rank,
          model_name: s.model_name,
          business_model_id: s.business_model_id,
          primary_move_type: s.primary_move_type,
          structural_warmth: s.structural_warmth,
          warmth_type: s.warmth_type,
        })),
        selected_option_rank: selectedStrands[0].rank,
        status: "generating_plan",
      })
      .eq("id", report_id);

    console.log(`${FUNCTION_VERSION} kicking off background work for report ${report_id} (${selectedStrands.length} strands, isPortfolio=${isPortfolio})`);

    // ── ASYNC: kick off the slow OpenAI work in background, return immediately ──
    // @ts-expect-error EdgeRuntime is provided by Supabase Deno deploy runtime
    EdgeRuntime.waitUntil(generatePlanInBackground({
      report_id, selectedStrands, isPortfolio, coreReport, answers, hookInsight,
      profileFlags, profileConstraints, openai, supabase,
    }));

    return new Response(
      JSON.stringify({
        report_id,
        status: "generating_plan",
        mode: isPortfolio ? "portfolio" : "single",
        selected_strands: selectedStrands.map(s => ({
          strand_id: s.strand_id,
          rank: s.rank,
          model_name: s.model_name,
          business_model_id: s.business_model_id,
          primary_move_type: s.primary_move_type,
          structural_warmth: s.structural_warmth,
          warmth_type: s.warmth_type,
        })),
        strand_count: selectedStrands.length,
        response_text: "Plan generation started. Poll reports.status by report_id until 'complete'.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (entryError) {
    console.error(`${FUNCTION_VERSION} entry error:`, entryError);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(entryError), response_text: "Failed to start plan generation." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── BACKGROUND WORKER ──────────────────────────────────────────────────────
// All OpenAI calls (Prompt 3v2 + Prompt 4 per strand + recalibration) run here.
// On success: updates report row to status='complete' with full activation_plan, market_snapshots,
// and updated core_report. On error: updates report row to status='failed' with error message.

async function generatePlanInBackground(args: {
  // deno-lint-ignore no-explicit-any
  report_id: string; selectedStrands: any[]; isPortfolio: boolean;
  // deno-lint-ignore no-explicit-any
  coreReport: any; answers: Record<string, string>; hookInsight: string;
  profileFlags: Record<string, unknown>; profileConstraints: Record<string, unknown>;
  // deno-lint-ignore no-explicit-any
  openai: any; supabase: any;
}) {
  const { report_id, selectedStrands, isPortfolio, coreReport, answers, hookInsight,
    profileFlags, profileConstraints, openai, supabase } = args;

  try {
    console.log(`bg ${report_id}: starting plan generation`);

    // ── Build user context ──
    const userContext = {
      years_experience: answers["2"] || "",
      employer_org_type: answers["3b"] || answers["30"] || answers["3"] || "",
      seniority: answers["5"] || "",
      specific_achievement: answers["6"] || "",
      sector_client_context: answers["11"] || "",
      independent_experience: answers["12"] || "",
      network: answers["13"] || "",
      employment_status: answers["14"] || "",
    };

    console.log("Employer org type resolved:", userContext.employer_org_type || "EMPTY — check Q3b key");

    // ── strandContextArray includes all 4 move metadata fields ──
    const strandContextArray = selectedStrands.map((s) => ({
      strand_id: s.strand_id,
      model_name: s.option.model_name,
      rank: s.option.rank,
      business_model_id: s.business_model_id,
      primary_move_type: s.primary_move_type,
      structural_warmth: s.structural_warmth,
      warmth_type: s.warmth_type,
      composite_score: s.option.composite_score,
      positioning: s.option.positioning,
      target_buyer: s.option.target_buyer,
      what_they_are_buying: s.option.what_they_are_buying,
      pricing: s.option.pricing,
      difficulty_rating: s.option.difficulty_rating,
      fit_tags: s.option.fit_tags,
    }));

    const profileContextForPrompt = {
      derived_flags: {
        needs_fast_revenue: profileFlags.needs_fast_revenue ?? false,
        can_do_evenings_weekends_only: profileFlags.can_do_evenings_weekends_only ?? true,
        has_sales_confidence: profileFlags.has_sales_confidence ?? false,
        has_advisory_instinct: profileFlags.has_advisory_instinct ?? false,
        has_pricing_confidence: profileFlags.has_pricing_confidence ?? false,
      },
      constraints: {
        network_quality: profileConstraints.network_quality || "moderate",
        network_size: profileConstraints.network_size || "medium",
        time_budget: profileConstraints.time_budget || "employed_full_time",
        income_urgency: profileConstraints.income_urgency || "medium",
        independence_confidence: profileConstraints.independence_confidence || "medium",
      },
    };

    const prompt3UserMessage = JSON.stringify({
      user_context_profile: profileContextForPrompt,
      portfolio_strands: strandContextArray,
      archetype: coreReport.archetype,
      transferable_value: coreReport.transferable_value,
      first_steps: coreReport.first_steps,
      hook_insight: hookInsight,
      reality_check: coreReport.reality_check,
      context: userContext,
      personalisation_signals: {
        q6_achievement: answers["6"] || "",
        q3b_employer: answers["3b"] || answers["30"] || "",
        q11_target_buyers: answers["11"] || "",
        q7_advisory: answers["7"] || "",
      },
    });

    // ── Build Prompt 4 user messages (one per strand) ──
    const prompt4Messages = selectedStrands.map((s) => ({
      strand_id: s.strand_id,
      message: JSON.stringify({
        recommended_model: s.option.model_name,
        archetype: coreReport.archetype?.primary || "",
        target_buyer: s.option.target_buyer,
        pricing_low: s.option.pricing?.range_low_gbp,
        pricing_high: s.option.pricing?.range_high_gbp,
        pricing_cadence: s.option.pricing?.cadence,
        employer_org_type: answers["3b"] || answers["30"] || answers["3"] || "",
        sector_client_context: answers["11"] || "",
        location: answers["15"] || "",
      }),
    }));

    // ── Run Prompt 3v2 (TIER1) + all Prompt 4s (TIER3) in parallel ──
    const apiCalls: Promise<unknown>[] = [
      openai.chat.completions.create({
        model: MODEL_TIER1,
        temperature: 0.5,
        max_completion_tokens: 16384,
        messages: [
          { role: "system", content: PROMPT_3V2_SYSTEM },
          { role: "user", content: prompt3UserMessage },
        ],
        response_format: { type: "json_object" },
      }),
      ...prompt4Messages.map((pm) =>
        openai.chat.completions.create({
          model: MODEL_TIER3,
          temperature: 0.3,
          max_completion_tokens: 1500,
          messages: [
            { role: "system", content: PROMPT_4_SYSTEM },
            { role: "user", content: pm.message },
          ],
        })
      ),
    ];

    const results = await Promise.all(apiCalls);

    const activationResult = results[0] as { choices: Array<{ message: { content: string | null }; finish_reason: string }> };
    const rawActivationContent = activationResult.choices[0].message.content || "{}";
    const activationFinishReason = activationResult.choices[0].finish_reason;
    console.log(`Activation plan raw content length: ${rawActivationContent.length}, finish_reason: ${activationFinishReason}`);

    if (activationFinishReason === "length") {
      console.error("WARNING: Activation plan response was truncated (finish_reason=length). Consider further compression.");
    }

    const activationPlan = parseJ(rawActivationContent);
    console.log(`Activation plan parsed. Top-level keys: ${Object.keys(activationPlan).join(", ")}`);

    // ── Log apollo_query coverage for observability ──
    let coldTaskCount = 0;
    let apolloQueryPopulated = 0;
    try {
      const phases = activationPlan?.activation_plan?.phases || [];
      for (const phase of phases) {
        for (const day of (phase.days_detail || [])) {
          for (const task of (day.tasks || [])) {
            if (task.task_type === "outreach") {
              if (task.outreach_subtype === "cold") {
                coldTaskCount++;
                if (task.apollo_query && task.apollo_query.person_titles?.length > 0) {
                  apolloQueryPopulated++;
                }
              }
            }
          }
        }
      }
      console.log(`v27 apollo coverage — cold_tasks: ${coldTaskCount}, apollo_query_populated: ${apolloQueryPopulated}`);
    } catch (e) {
      console.error("Failed to compute apollo coverage:", e);
    }

    if (!activationPlan.activation_plan || !activationPlan.first_move) {
      console.error("WARNING: Activation plan missing expected fields. Parse may have failed or response was truncated.");
    }

    const marketSnapshots: Record<string, string> = {};
    for (let i = 0; i < prompt4Messages.length; i++) {
      const marketResult = results[i + 1] as { choices: Array<{ message: { content: string | null } }> };
      marketSnapshots[prompt4Messages[i].strand_id] = marketResult.choices[0].message.content || "";
    }

    // ── Generate portfolio-level reality_check (TIER2) ──
    let updatedCoreReport = coreReport;
    if (isPortfolio || selectedStrands[0].rank !== 1) {
      const recalibrationRes = await openai.chat.completions.create({
        model: MODEL_TIER2,
        temperature: 0.4,
        max_completion_tokens: 800,
        messages: [
          {
            role: "system",
            content: `You are Solo's intelligence engine. The user selected ${selectedStrands.length} business model strands to pursue as a portfolio. Regenerate the reality_check and first_steps for their portfolio. The reality_check should address the portfolio as a whole — the risk of spreading too thin, the benefit of diversification, and the most likely failure mode. first_steps should be the 5 most important shared actions — must be specific to this user's context, network, employer background, and selected strands. Do not include generic advice such as "find a mentor", "seek a coach", or "invest in sales training" — every step must be grounded in the user's actual situation. Do not reference inputs by name or question number in the output. Return JSON only: { "reality_check": { "most_likely_failure_mode": string, "second_failure_mode": string, "what_they_will_find_hard": string, "honest_income_outlook": string }, "first_steps": [string, string, string, string, string] }`,
          },
          {
            role: "user",
            content: JSON.stringify({
              selected_strands: strandContextArray,
              archetype: coreReport.archetype,
              transferable_value: coreReport.transferable_value,
              user_context_profile: profileContextForPrompt,
              context: userContext,
            }),
          },
        ],
        response_format: { type: "json_object" },
      });

      const recalibrated = parseJ(recalibrationRes.choices[0].message.content || "{}");
      if (recalibrated.reality_check) {
        updatedCoreReport = {
          ...coreReport,
          reality_check: recalibrated.reality_check,
          first_steps: recalibrated.first_steps || coreReport.first_steps,
          recommendation: {
            ...coreReport.recommendation,
            recommended_rank: selectedStrands[0].rank,
            rationale: isPortfolio
              ? `User selected a portfolio of ${selectedStrands.length} strands: ${selectedStrands.map(s => s.model_name).join(", ")}.`
              : `User selected rank ${selectedStrands[0].rank}.`,
          },
        };
      }
    }

    // ── initialStrandStatus includes all 4 move metadata fields ──
    const initialStrandStatus: Record<string, unknown> = {};
    for (const s of selectedStrands) {
      initialStrandStatus[s.strand_id] = {
        model_name: s.option.model_name,
        rank: s.rank,
        business_model_id: s.business_model_id,
        primary_move_type: s.primary_move_type,
        structural_warmth: s.structural_warmth,
        warmth_type: s.warmth_type,
        status: "active",
        traction_score: 0,
        signals_observed: [],
        energy_rating: null,
        tasks_completed: 0,
        tasks_total: 0,
      };
    }

    // ── Update the report row ──
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        core_report: updatedCoreReport,
        activation_plan: activationPlan,
        market_snapshot: marketSnapshots[selectedStrands[0].strand_id] || "",
        market_snapshots: marketSnapshots,
        selected_strands: selectedStrands.map(s => ({
          strand_id: s.strand_id,
          rank: s.rank,
          model_name: s.model_name,
          business_model_id: s.business_model_id,
          primary_move_type: s.primary_move_type,
          structural_warmth: s.structural_warmth,
          warmth_type: s.warmth_type,
          option: s.option,
        })),
        selected_option_rank: selectedStrands[0].rank,
        status: "complete",
      })
      .eq("id", report_id);

    if (updateError) {
      console.error(`bg ${report_id} update error:`, JSON.stringify(updateError));
      await supabase.from("reports").update({ status: "failed", error: String(updateError.message ?? updateError) }).eq("id", report_id);
      return;
    }

    console.log(`bg ${report_id} done | ${selectedStrands.length} strands | apollo cold=${coldTaskCount}/${apolloQueryPopulated}`);
  } catch (error) {
    console.error(`bg ${report_id} error:`, error);
    try {
      await supabase.from("reports").update({ status: "failed", error: String((error as Error)?.message ?? error) }).eq("id", report_id);
    } catch (updateErr) {
      console.error(`bg ${report_id} also failed to mark status=failed:`, updateErr);
    }
  }
}
