// ask-solo v25 — 2026-04-18: bundle of 3 E2E audit fixes
//   • F5 (P0): align tracker_sessions SELECT with real schema — use focus_strands + strand_status + last_checkin_date;
//              drop 3 non-existent cols (current_phase, progress_pct, checkin_trajectory); derive replacements from
//              plan_state / current_day / last_checkin_date so downstream P9 context shape stays stable.
//   • F6 (P2): SYSTEM_PROMPT — add explicit scope boundary for off-topic / creative-writing / unrelated-coding asks.
//   • F7 (P2): SYSTEM_PROMPT — emotional-distress two-turn pattern (acknowledge first, tactical advice second).
// v24 baseline: max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v23 baseline: Audit P0 #5 fix: selected_strands + per-strand move metadata now reach P9
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
const MODEL_TIER2 = "gpt-5.4-mini";   // Structured output, signal reading, advisory
const MODEL_TIER3 = "gpt-5.4-nano";   // Classification, extraction, low-temp structured tasks

// Archetype code → human-readable display name
const ARCHETYPE_NAMES: Record<string, string> = {
  "ARCH_RISK": "Risk / Audit / Compliance",
  "ARCH_FIN": "Finance & Commercial",
  "ARCH_CONS": "Generalist Consultant",
  "ARCH_PMO": "Delivery / PMO / Transformation",
  "ARCH_OPS": "Operations / Process",
  "ARCH_CONTROLLER": "Financial Controller / Head of Finance",
  "ARCH_TAX_DIRECT": "Corporate Tax Advisor",
  "ARCH_TAX_INDIRECT": "Indirect Tax / VAT Specialist",
  "ARCH_TREASURY": "Treasury & Cash Management Specialist",
  "ARCH_EXT_AUDIT": "External Audit / Assurance Advisor",
  "ARCH_CORP_FIN": "Corporate Finance / M&A / Transaction Services",
  "ARCH_ACTUARIAL": "Actuarial / Risk Modelling Specialist",
  "ARCH_INVESTMENT": "Investment & Wealth Management Advisor",
  "ARCH_CREDIT_RISK": "Credit & Financial Risk Specialist",
  "ARCH_ERM": "Enterprise Risk Management",
  "ARCH_OPS_RISK": "Operational Risk",
  "ARCH_AML": "Financial Crime / AML",
  "ARCH_EHS": "Health, Safety & Environment",
  "ARCH_QUALITY": "Quality Management / ISO",
  "ARCH_DATA_PRIVACY": "Data Protection / Privacy",
  "ARCH_CORP_STRAT": "Corporate Strategy",
  "ARCH_CHANGE": "Change Management",
  "ARCH_ORG_DESIGN": "Organisational Design & Effectiveness",
  "ARCH_TRANSFORMATION": "Business Transformation",
  "ARCH_RESTRUCTURING": "Restructuring & Turnaround",
  "ARCH_HRBP": "HR Business Partner / Strategic HR Leader",
  "ARCH_TALENT": "Talent Acquisition / Recruitment Specialist",
  "ARCH_L_D": "Learning & Development / Talent Development Leader",
  "ARCH_REWARD": "Reward & Compensation Specialist",
  "ARCH_EMPLOYMENT_LAW": "Employment Law & Employee Relations Specialist",
  "ARCH_FRACTIONAL_CHRO": "Fractional / Interim CHRO / HR Director",
  "ARCH_WELLBEING": "Wellbeing & People Experience Leader",
  "ARCH_DEI": "Diversity, Equity & Inclusion Specialist",
  "ARCH_CTO_FRAC": "Fractional / Interim CTO",
  "ARCH_ENTERPRISE_ARCH": "Enterprise Architect",
  "ARCH_DATA_ENG": "Data Engineer / Analytics Engineer",
  "ARCH_DATA_SCIENTIST": "Data Scientist / ML Engineer",
  "ARCH_AI_STRATEGIST": "AI Strategy & Implementation Advisor",
  "ARCH_PRODUCT": "Product Manager / Product Leader",
  "ARCH_UX": "UX / Product Design Lead",
  "ARCH_DIGITAL_TRANS": "Digital Transformation Lead",
  "ARCH_CLOUD": "Cloud Architect / DevOps / Platform Engineer",
  "ARCH_CYBER": "Cybersecurity Consultant",
  "ARCH_IT_PMO": "IT Programme / Delivery Lead",
  "ARCH_ECOM": "Ecommerce / Digital Commerce Specialist",
  "ARCH_MARTECH": "Martech / Digital Marketing Technology",
  "ARCH_GC": "Fractional / Interim General Counsel",
  "ARCH_EMPLOYMENT_SOL": "Employment Law Solicitor (Independent)",
  "ARCH_CORP_LAWYER": "Corporate & Commercial Lawyer",
  "ARCH_IP_TECH_LAW": "IP, Technology & Data Law Specialist",
  "ARCH_LEGAL_OPS": "Legal Operations Specialist",
  "ARCH_COMMERCIAL_CONTRACTS": "Commercial Contracts Manager / Contract Specialist",
  "ARCH_CMO_FRAC": "Fractional / Interim CMO",
  "ARCH_BRAND": "Brand Strategist",
  "ARCH_CONTENT_STRAT": "Content Strategy & Thought Leadership",
  "ARCH_PR_COMMS": "PR & Corporate Communications",
  "ARCH_DEMAND_GEN": "Demand Generation / Growth Marketing",
  "ARCH_INTERNAL_COMMS": "Internal Communications Specialist",
  "ARCH_EMPLOYER_BRAND": "Employer Brand & EVP Specialist",
  "ARCH_CORPORATE_AFFAIRS": "Corporate Affairs / Public Affairs",
  "ARCH_CRO_FRAC": "Fractional / Interim CRO",
  "ARCH_SALES_OPS": "Sales Operations & Revenue Operations Specialist",
  "ARCH_BD": "Business Development & Partnerships Manager",
  "ARCH_SALES_ENABLEMENT": "Sales Enablement & Effectiveness Specialist",
  "ARCH_PRICING_COMMERCIAL": "Pricing & Commercial Strategy Manager",
  "ARCH_KEY_ACCOUNT": "Key Account Manager / Client Success Lead",
  "ARCH_PROCUREMENT": "Strategic Procurement Director / Chief Procurement Officer",
  "ARCH_CATEGORY_MGR": "Category Management Specialist",
  "ARCH_SUPPLY_CHAIN": "Supply Chain Consultant / Logistics Strategy Advisor",
  "ARCH_CONTRACT_MGR": "Contract Management & Supplier Performance Specialist",
  "ARCH_PROC_TRANSFORMATION": "Procurement Transformation & Digital Enablement Lead",
  "ARCH_NHS_TRANS": "NHS / Healthcare Transformation Consultant",
  "ARCH_PHARMA_CONSULT": "Pharma & MedTech Consultant",
  "ARCH_HEALTH_ECON": "Health Economist / Health Outcomes Research Specialist",
  "ARCH_CLINICAL_OPS": "Clinical Operations & Research Consultant",
  "ARCH_PATIENT_SAFETY": "Patient Safety & Quality Improvement Specialist",
  "ARCH_ESG_STRAT": "ESG Strategy & Reporting Advisor",
  "ARCH_SUSTAINABILITY": "Sustainability Manager / Operational Sustainability Consultant",
  "ARCH_CARBON_NET_ZERO": "Carbon & Net Zero Specialist",
  "ARCH_RESPONSIBLE_INVEST": "Responsible Investment / Sustainable Finance Advisor",
  "ARCH_SOCIAL_IMPACT": "Social Impact & Impact Measurement Advisor",
  "ARCH_REAL_ESTATE": "Real Estate Strategy & Asset Management Consultant",
  "ARCH_PLANNING": "Planning & Development Consultant",
  "ARCH_PROP_TECH": "PropTech & Real Estate Innovation Consultant",
  "ARCH_FACILITIES": "Facilities Management & Workplace Consultant",
  "ARCH_POLICY": "Policy Advisor / Policy Consultant",
  "ARCH_GOV_TRANS": "Government / Public Sector Transformation Consultant",
  "ARCH_LOCAL_GOV": "Local Government Consultant",
  "ARCH_GRANT_FUNDING": "Grant Funding & Public Finance Specialist",
  "ARCH_REG_AFFAIRS": "Regulatory Affairs / Government Relations Consultant",
  "ARCH_CX_STRAT": "Customer Experience Strategy Consultant",
  "ARCH_SERVICE_DESIGN": "Service Design Consultant",
  "ARCH_VOC": "Voice of Customer / Customer Insight Specialist",
  "ARCH_CONTACT_CENTRE": "Contact Centre & Operations Transformation Consultant",
  "ARCH_LOYALTY": "Loyalty & Retention Strategy Consultant",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch { return null; }
}

// ─── Derive checkin_trajectory from last_checkin_date ──────────────────────────────────
// Replaces F5 non-existent `checkin_trajectory` column with a computed value.
// Thresholds mirror what the legacy column was expected to express.
function deriveCheckinTrajectory(activatedAt: string | null, lastCheckinDate: string | null): string {
  if (!activatedAt) return "not_started";
  if (!lastCheckinDate) return "not_started";
  const last = new Date(lastCheckinDate as string).getTime();
  if (isNaN(last)) return "not_started";
  const daysSince = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
  if (daysSince <= 3) return "on_track";
  if (daysSince <= 7) return "drifting";
  return "stalled";
}

// ─── Assemble full context block from Supabase ──────────────────────────────────────────────
async function assembleContextBlock(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Record<string, unknown>> {

  // Run all primary queries in parallel
  const [
    profileResult,
    authUserResult,
    questionnaireResult,
    reportResult,
    trackerResult,
    modulesResult,
    summariesResult,
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", userId).single(),
    supabase.auth.admin.getUserById(userId),
    supabase.from("questionnaire_responses").select("answers").eq("user_id", userId).single(),
    supabase.from("reports").select("core_report, hook_insight, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
    // F5 fix (2026-04-18): SELECT now uses real tracker_sessions columns. focus_strands replaces selected_strands,
    // strand_status replaces initial_strand_status. current_phase / progress_pct / checkin_trajectory are derived
    // downstream from plan_state / current_day / last_checkin_date.
    supabase.from("tracker_sessions").select("current_day, running_narrative, working_plan, activated_at, status, plan_state, focus_strands, strand_status, last_checkin_date").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("guidance_module_completions").select("module_id, ai_output").eq("user_id", userId).order("module_id", { ascending: true }),
    supabase.from("advisory_conversation_summaries").select("summary, key_topics, significant_decisions, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const profile = profileResult.data || {};
  const authUser = authUserResult.data;
  const firstName = authUser?.user?.user_metadata?.first_name
    || authUser?.user?.email?.split('@')[0]
    || null;

  // ── Questionnaire answers ──────────────────────────────────────────────────────────────────────────
  const answers = (questionnaireResult.data?.answers as Record<string, unknown>) || {};

  // ── Report data ──────────────────────────────────────────────────────────────────────
  const report = reportResult.data || null;
  const coreReport = (report?.core_report as Record<string, unknown>) || {};

  const archetypeData = (coreReport.archetype as Record<string, unknown>) || {};
  const options = (coreReport.options as Array<Record<string, unknown>>) || [];
  const recommendationData = (coreReport.recommendation as Record<string, unknown>) || {};
  const recommendedRank = (recommendationData.recommended_rank as number) || 1;
  const recommendedOption = options.find((o) => o.rank === recommendedRank) || options[0] || {};
  const optionPricing = (recommendedOption.pricing as Record<string, unknown>) || {};
  const transferableValue = (coreReport.transferable_value as Record<string, unknown>) || {};
  const realityCheck = (coreReport.reality_check as Record<string, unknown>) || {};
  const activationPlanData = (coreReport.activation_plan as Record<string, unknown>) || {};

  // ── Tracker ─────────────────────────────────────────────────────────────────────────
  const tracker = trackerResult.data || null;
  let tasksCompleted = 0;
  let tasksTotal = 0;
  if (tracker?.working_plan) {
    const wp = tracker.working_plan as Record<string, unknown>;
    const phases = (wp.phases as Array<Record<string, unknown>>) || [];
    for (const phase of phases) {
      const tasks = (phase.tasks as Array<Record<string, unknown>>) || [];
      tasksTotal += tasks.length;
      tasksCompleted += tasks.filter((t) => t.status === "completed").length;
    }
  }

  // ── Audit P0 #5 + F5: Strand-level Making Moves context ────────────────────────────────
  // focus_strands (jsonb) is the real column; strand_status (jsonb) keyed by business_model_id.
  // Each strand carries primary_move_type + warmth_type so P9 can interpret traction relative
  // to move type (direct vs platform vs visibility vs community).
  const selectedStrandsRaw = (tracker?.focus_strands as Array<Record<string, unknown>>) || [];
  const initialStrandStatusRaw = (tracker?.strand_status as Record<string, unknown>) || {};
  const strands = selectedStrandsRaw.map((s) => {
    const bmId = (s.business_model_id as string) || null;
    const status = bmId ? (initialStrandStatusRaw[bmId] as Record<string, unknown> | undefined) : undefined;
    return {
      business_model_id: bmId,
      model_name: (s.model_name as string) || null,
      rank: (s.rank as number) ?? null,
      primary_move_type: (s.primary_move_type as string) || "direct",
      structural_warmth: (s.structural_warmth as boolean) ?? false,
      warmth_type: (s.warmth_type as string) || ((s.structural_warmth as boolean) ? "structural" : "relational"),
      strand_status: (status?.strand_status as string) || (status?.status as string) || null,
      first_move_opened_at: status?.first_move_opened_at || null,
      last_move_at: status?.last_move_at || null,
    };
  });

  // ── Completed modules ──────────────────────────────────────────────────────────────────
  const completedModules: Record<string, unknown> = {};
  if (modulesResult.data) {
    for (const m of modulesResult.data) {
      completedModules[`module_${m.module_id}_output`] = m.ai_output;
    }
  }

  // ── Prior conversation summaries ────────────────────────────────────────────────────────────
  const priorSummaries = (summariesResult.data || []).reverse().map((s) => ({
    date: s.created_at,
    summary: s.summary,
    key_topics: s.key_topics || [],
    significant_decisions: s.significant_decisions || null,
  }));

  // ── Computed fields ──────────────────────────────────────────────────────────────────────
  let daysActive: number | null = null;
  if (tracker?.activated_at) {
    daysActive = Math.floor((Date.now() - new Date(tracker.activated_at as string).getTime()) / (1000 * 60 * 60 * 24));
  }

  // F5 fix: derive fields that the legacy SELECT pretended existed as columns.
  const currentDayVal = (tracker?.current_day as number | null) ?? null;
  const currentPhaseDerived = (tracker?.plan_state as string | null) ?? null;
  const progressPctDerived = typeof currentDayVal === "number"
    ? Math.max(0, Math.min(100, Math.round((currentDayVal / 30) * 100)))
    : null;
  const checkinTrajectoryDerived = tracker
    ? deriveCheckinTrajectory(
        (tracker.activated_at as string | null) ?? null,
        (tracker.last_checkin_date as string | null) ?? null
      )
    : "not_started";

  let pricingRange: string | null = null;
  if (optionPricing.range_low_gbp && optionPricing.range_high_gbp) {
    pricingRange = `£${optionPricing.range_low_gbp}–£${optionPricing.range_high_gbp} (${optionPricing.cadence || optionPricing.model || ''})`.trim();
  }

  return {
    user: { first_name: firstName },

    questionnaire: {
      q1_job_title: (answers.q1_job_title as string) || (answers.job_title as string) || null,
      q2_years_experience: (answers.q2_years_experience as string) || (answers.years_experience as string) || null,
      q3a_sector: (answers.q3a_sector as string) || (answers.sector as string) || null,
      q3b_employer_org_type: (answers.q3b_employer_org_type as string) || (answers.employer_org_type as string) || null,
      q4_work_type: (answers.q4_work_type as string) || (answers.work_type as string) || null,
      q5_seniority: (answers.q5_seniority as string) || (answers.seniority as string) || null,
      q6_specific_achievement: (answers.q6_specific_achievement as string) || (answers.specific_achievement as string) || null,
      q7_informal_advisory: (answers.q7_informal_advisory as string) || (answers.informal_advisory as string) || null,
      q8_peer_perception: (answers.q8_peer_perception as string) || (answers.peer_perception as string) || null,
      q9_income_urgency: (answers.q9_income_urgency as string) || (answers.income_urgency as string) || null,
      q10_independence_confidence: (answers.q10_independence_confidence as string) || (answers.independence_confidence as string) || null,
      q11_sector_client_context: (answers.q11_sector_client_context as string) || (answers.sector_client_context as string) || null,
      q12_independent_experience: (answers.q12_independent_experience as string) || (answers.independent_experience as string) || null,
      q13_network: (answers.q13_network as string) || (answers.network as string) || null,
      q14_employment_status: (answers.q14_employment_status as string) || (answers.employment_status as string) || null,
      q15_location: (answers.q15_location as string) || (answers.location as string) || null,
    },

    cv_extract: (profile as Record<string, unknown>).cv_extract || null,

    plan: {
      primary_archetype: (archetypeData.primary as string) || null,
      secondary_archetype: (archetypeData.secondary as string) || null,
      archetype_summary: (archetypeData.summary as string) || null,
      recommended_model: (recommendedOption.model_name as string) || null,
      recommended_model_commercial_type: (optionPricing.model as string) || null,
      recommended_model_positioning: (recommendedOption.positioning as string) || null,
      what_they_can_sell: (transferableValue.what_they_can_sell as string) || null,
      target_buyer: (recommendedOption.target_buyer as string) || null,
      pricing_range: pricingRange,
      time_to_first_revenue: (recommendedOption.time_to_first_revenue as string) || null,
      hook_insight: (report?.hook_insight as string) || null,
      reality_check_failure_mode: (realityCheck.most_likely_failure_mode as string) || null,
      honest_income_outlook: (realityCheck.honest_income_outlook as string) || null,
      // Audit P0 #5: preserve move metadata per option (was stripped in v22)
      all_options: options.map((o) => ({
        rank: o.rank,
        model_name: o.model_name,
        source: o.source,
        composite_score: o.composite_score,
        business_model_id: (o.business_model_id as string) || null,
        primary_move_type: (o.primary_move_type as string) || null,
        structural_warmth: (o.structural_warmth as boolean) ?? null,
      })),
    },

    // Audit P0 #5: strands carry move_type and warmth_type per ADR-007.
    // Interpret traction signals relative to each strand's move type.
    selected_strands: strands,

    activation_plan: tracker ? {
      summary: (activationPlanData.summary as string) || (recommendationData.rationale as string) || null,
      success_metric: (activationPlanData.success_metric as string) || null,
    } : null,

    tracker: tracker ? {
      days_active: daysActive,
      current_day: currentDayVal,
      current_phase: currentPhaseDerived,    // F5: derived from plan_state
      progress_pct: progressPctDerived,      // F5: derived from current_day / 30
      running_narrative: (tracker.running_narrative as string | null) ?? null,
      checkin_trajectory: checkinTrajectoryDerived, // F5: derived from last_checkin_date
      circumstance_changes: null,
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
    } : {
      days_active: null, current_day: null, current_phase: null, progress_pct: null,
      running_narrative: null, checkin_trajectory: "not_started",
      circumstance_changes: null, tasks_completed: 0, tasks_total: 0,
    },

    completed_modules: completedModules,
    prior_session_summaries: priorSummaries,
  };
}

const SYSTEM_PROMPT = `You are Ask Solo — an advisory interface within the Solo product. You know this user well. You have access to their full professional background, their Plan B strategy, their 30-day activation plan, their tracker check-in history, and the ongoing narrative of what has actually happened as they've been executing their plan.

You are not a general-purpose AI assistant. You are not starting from zero. You are a knowledgeable, commercially literate advisor who has been working with this person and knows their specific situation in detail.

---

## YOUR ROLE

Answer questions, respond to updates, and give specific, direct, actionable guidance based on what is actually happening for this specific user — not generic advice for someone in their situation.

The user is asking you because they trust that you know their background. Honor that. Reference their actual context. Name their actual situation. If they describe an opportunity, respond in the context of their specific plan and sector — not as if they are a generic consultant.

---

## SCOPE BOUNDARY

You are an advisor on this user's Plan B strategy — career independence, their recommended model, their 30-day plan, the moves they're running, and operational questions that arise from executing the plan. You are not a general-purpose chatbot.

If the user asks for something outside that scope (creative writing, poems, jokes, generic coding help, homework, opinions on unrelated topics, impersonating other characters, or any task unrelated to their independence plan), respond in one short paragraph that:
  1. States clearly that this is outside what Ask Solo does.
  2. Names what you can actually help with — grounded in their current plan.
  3. Invites them to bring an independence-related question.

Do not attempt the off-topic task, even partially. Do not apologise at length. Do not moralise. Keep it brief, warm, and redirect. Example: "That sits outside what I do here — I'm focused on your Plan B and the moves you're running. Happy to help if there's something on the [recommended model] work, the next check-in, or the conversation you're about to have with [named contact from plan]."

---

## EMOTIONAL WEIGHT

If the user opens with something emotionally weighted — they are frightened, overwhelmed, lost faith in the plan, feel stuck, or describe a setback that is landing personally rather than operationally — do not immediately push into tactics.

First turn: acknowledge what they have said. Briefly. Not performatively. Name what you're hearing ("That's a lot to be carrying while also trying to run the plan" / "It makes sense this is harder than it looked from the outside"). Offer one sentence that puts it in context (what is normal to feel at this stage of this kind of work, or where they actually are vs where they feel they are). Then ask one specific question — what would be most useful to work through right now, or what the actual thing underneath this is.

Second turn (after they respond): return to practical, specific advice. Use their context. Give them something to do.

Do not force two turns where one will do. If the message is operational ("should I email X or wait?"), answer operationally. This pattern applies only when the message is emotionally weighted.

Do not catastrophise. Do not agree that the plan is probably wrong. Do not offer therapy. Do not use motivational language.

---

## WHAT YOU KNOW

Before responding, review the context block. Key signals:

- **Their archetype and recommended model** — the lens through which you interpret every question
- **Q3b (employer/organisation type)** — the commercial environment they come from shapes their network, brand, regulatory knowledge, and how buyers will perceive them
- **Q11 (sector and client context)** — their specific target market. Know it. Don't give generic market advice when you know exactly who they are targeting.
- **Running narrative** — the richest input. What has actually happened: what they've tried, what has worked, what has been harder than expected. An advisory response without this context is generic.
- **Prior Ask Solo conversation summaries** — read before responding. They capture significant decisions, pivots, and insights from previous sessions.
- **Completed guidance module outputs** — reference these rather than giving duplicative or potentially contradictory guidance.
- **Selected strands (Making Moves context)** — each active strand in the user's plan carries a \`primary_move_type\` (direct / platform / visibility / community / mixed) and a \`warmth_type\` (relational / structural). This governs how you interpret traction:
   - **direct**: the strand is run through named-contact outreach. "No traction" = unanswered reconnect messages, no meetings booked, no proposal requests.
   - **platform**: the strand is run through a marketplace or directory registration. "No traction" = no inbound enquiries from the platform, no profile views converting, no scoping requests.
   - **visibility**: the strand is run through LinkedIn posts or articles. "No traction" = low reactions, no DMs, no inbound from content.
   - **community**: the strand is run through joining a named community + first contribution. "No traction" = no acknowledgement or follow-up from the named contact/group, contribution not picked up.
  When the user asks "why isn't anything happening", interpret relative to their strand's move type. Do not assume everything is outreach. Do not give Direct-strand advice to a Platform-strand user.

---

## HOW TO RESPOND

- **Be direct.** Give your actual view. Not "it depends" as a dodge, but "it depends on X — here's how to think about it, and given your situation, I'd lean towards Y".
- **Be specific.** Use what you know. "Given that you're targeting [their Q11 client type]..." / "Based on where you are in your plan right now (Day X, Phase Y)..." / "Given that you're operating as [their structure from Module 1]..."
- **Be honest.** If the user is off track, say so — carefully but clearly. If a pricing idea is too low, say so.
- **Know when to refer.** For complex tax or legal questions: answer what you can operationally, but flag clearly when they need a professional. "This is worth confirming with an accountant/solicitor — a one-off consultation typically costs £150–200."
- **Proactively connect.** If the user mentions something that connects to their check-in history, a prior advisory conversation, or a guidance module, draw the connection explicitly.

---

## WHAT YOU DO NOT DO

- Do not give regulated financial advice, investment recommendations, or legal opinions. Answer operationally, caveat appropriately.
- Do not replace the structured guidance modules — if a question is primarily a Module 5 (IR35) or Module 6 (Contracts) question, answer the immediate question and surface the module.
- Do not make up information about the user's sector that isn't in the context block.
- Avoid motivational language. This is operational guidance, not coaching.
- 2–4 paragraphs maximum unless the question genuinely requires more depth. Plain English.`;

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
      return new Response(JSON.stringify({ error: "Unauthorized", response_text: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const callType: string = body.call_type || "conversation";
    const sessionId: string | null = body.session_id || body.sessionId || null;

    // ─────────────────────────────────
    // START SESSION
    // ─────────────────────────────────
    if (callType === "start_session") {
      const contextBlock = await assembleContextBlock(supabase, userId);

      const { data: convRow, error: convError } = await supabase
        .from("advisory_conversations")
        .insert({
          user_id: userId,
          started_at: new Date().toISOString(),
          messages: [],
          context_snapshot_at: new Date().toISOString(),
          message_count: 0,
        })
        .select("id, session_id")
        .single();

      if (convError || !convRow) {
        console.error("advisory_conversations insert error:", convError);
        return new Response(JSON.stringify({ error: "Failed to start session", response_text: "Failed to start session" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const plan = (contextBlock.plan as Record<string, unknown>);
      const trackerCtx = (contextBlock.tracker as Record<string, unknown>);
      // Resolve archetype code to human-readable display name
      const archetypeCode = plan?.primary_archetype as string | null;
      const archetypeDisplayName = archetypeCode
        ? (ARCHETYPE_NAMES[archetypeCode] || archetypeCode)
        : null;
      const currentDay = trackerCtx?.current_day as number | null;
      const priorSummaries = (contextBlock.prior_session_summaries as Array<unknown>) || [];

      let contextCue: string;
      if (archetypeDisplayName) {
        contextCue = `I know your background as a ${archetypeDisplayName} professional and your Plan B options.`;
      } else {
        contextCue = "I have your full profile and plan in front of me.";
      }
      if (currentDay) contextCue += ` You're on Day ${currentDay} of your plan.`;
      if (priorSummaries.length > 0) {
        contextCue += ` I can see our previous ${priorSummaries.length === 1 ? 'conversation' : priorSummaries.length + ' conversations'} too.`;
      }
      contextCue += " What would you like to work through?";

      return new Response(JSON.stringify({
        session_id: convRow.session_id,
        conversation_id: convRow.id,
        context_cue: contextCue,
        response_text: contextCue,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────
    // CONVERSATION
    // ─────────────────────────────────
    if (callType === "conversation" || callType === "message") {
      const userMessage: string = body.message || body.question || body.text || "";
      if (!userMessage) {
        return new Response(JSON.stringify({ error: "No message provided", response_text: "No message provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conversationId: string | null = body.conversation_id || body.conversationId || null;
      let convQuery = supabase.from("advisory_conversations").select("id, session_id, messages, message_count");

      if (conversationId) {
        convQuery = convQuery.eq("id", conversationId);
      } else if (sessionId) {
        convQuery = convQuery.eq("session_id", sessionId);
      } else {
        convQuery = convQuery.eq("user_id", userId).is("ended_at", null).order("started_at", { ascending: false });
      }

      const { data: conv } = await convQuery.eq("user_id", userId).single();
      const existingMessages: Array<{ role: string; content: string }> = (conv?.messages as Array<{ role: string; content: string }>) || [];
      const convRowId: string | null = conv?.id || null;

      const contextBlock = await assembleContextBlock(supabase, userId);
      const historyForGpt = existingMessages.slice(-20);

      const userMsgTemplate = `call_type: conversation

User message: ${userMessage}

Conversation history (this session):
${historyForGpt.length > 0
  ? historyForGpt.map((m) => `${m.role === 'user' ? 'User' : 'Ask Solo'}: ${m.content}`).join('\n\n')
  : '(This is the first message of the session.)'}

Context block:
${JSON.stringify(contextBlock, null, 2)}

Respond to the user's message. Be direct, specific, and grounded in their context. 2–4 paragraphs maximum unless the question genuinely requires more depth. Plain English.`;

      const completion = await openai.chat.completions.create({
        model: MODEL_TIER2,
        temperature: 0.5,
        max_completion_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsgTemplate },
        ],
      });

      const assistantResponse = completion.choices[0].message.content || "";
      const updatedMessages = [
        ...existingMessages,
        { role: "user", content: userMessage, timestamp: new Date().toISOString() },
        { role: "assistant", content: assistantResponse, timestamp: new Date().toISOString() },
      ];

      if (convRowId) {
        await supabase.from("advisory_conversations").update({
          messages: updatedMessages,
          message_count: updatedMessages.length,
          context_snapshot_at: new Date().toISOString(),
        }).eq("id", convRowId);
      } else {
        await supabase.from("advisory_conversations").insert({
          user_id: userId, started_at: new Date().toISOString(),
          messages: updatedMessages, message_count: updatedMessages.length,
          context_snapshot_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({
        response: assistantResponse, answer: assistantResponse,
        message: assistantResponse, response_text: assistantResponse,
        conversation_id: convRowId,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────
    // END SESSION
    // ─────────────────────────────────
    if (callType === "end_session" || callType === "session_summary") {
      const conversationId: string | null = body.conversation_id || body.conversationId || null;
      let convQuery = supabase.from("advisory_conversations").select("id, messages, message_count").eq("user_id", userId);
      if (conversationId) convQuery = convQuery.eq("id", conversationId);
      else if (sessionId) convQuery = convQuery.eq("session_id", sessionId);
      else convQuery = convQuery.is("ended_at", null).order("started_at", { ascending: false });

      const { data: conv } = await convQuery.single();
      if (!conv || !conv.id) {
        return new Response(JSON.stringify({ error: "Session not found", response_text: "Session not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages = (conv.messages as Array<{ role: string; content: string }>) || [];
      if (messages.length < 2) {
        await supabase.from("advisory_conversations").update({ ended_at: new Date().toISOString() }).eq("id", conv.id);
        return new Response(JSON.stringify({ summary: null, response_text: "Session closed." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contextBlock = await assembleContextBlock(supabase, userId);
      const summaryPrompt = `call_type: session_summary

Full conversation history:
${messages.map((m) => `${m.role === 'user' ? 'User' : 'Ask Solo'}: ${m.content}`).join('\n\n')}

Context block (for reference):
${JSON.stringify(contextBlock, null, 2)}

Generate the session summary as specified. Return JSON only: { "summary": "100-200 word summary in third person", "key_topics": ["topic1", "topic2"], "significant_decisions": "string or null" }`;

      const summaryCompletion = await openai.chat.completions.create({
        model: MODEL_TIER2, temperature: 0.3, max_completion_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: summaryPrompt },
        ],
      });

      let summaryData: Record<string, unknown> = {};
      try { summaryData = JSON.parse(summaryCompletion.choices[0].message.content || "{}"); }
      catch { summaryData = { summary: summaryCompletion.choices[0].message.content, key_topics: [], significant_decisions: null }; }

      await supabase.from("advisory_conversation_summaries").insert({
        conversation_id: conv.id, user_id: userId,
        summary: summaryData.summary || "",
        key_topics: summaryData.key_topics || [],
        significant_decisions: (summaryData.significant_decisions as string) || null,
      });
      await supabase.from("advisory_conversations").update({ ended_at: new Date().toISOString() }).eq("id", conv.id);

      return new Response(JSON.stringify({ summary: summaryData, response_text: "Session summary saved." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: `Unknown call_type: ${callType}. Use start_session, conversation, or end_session.`,
      response_text: "Unknown call_type",
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("ask-solo error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error", details: String(error),
      response_text: "Failed to process request",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
