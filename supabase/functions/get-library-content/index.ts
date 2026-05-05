// get-library-content v13 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
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

const MODULES: Record<number, { name: string; track: string; access_tier: string; description: string; estimated_minutes: number; key_questions: string[]; what_you_get: string }> = {
  1:  { name: "Business Structure", track: "A", access_tier: "tranche_1", description: "Sole trader, limited company, or umbrella — the foundational decision everything else sits on.", estimated_minutes: 15, key_questions: ["Have you decided on a legal structure, or are you still weighing options?", "Are you likely to work through a single client or multiple clients at once?", "What is your target annual income in year one?"], what_you_get: "A clear structure recommendation with rationale, the key setup steps, and what to do first." },
  2:  { name: "Registration & Setup", track: "A", access_tier: "tranche_1", description: "Exactly what to register, in what order, with timeframes — tailored to your chosen structure.", estimated_minutes: 20, key_questions: ["What structure have you chosen (sole trader / limited company / umbrella)?", "Have you already registered anywhere (HMRC, Companies House, etc.)?", "What is your target start date for independent work?"], what_you_get: "A step-by-step registration checklist with exact actions, timeframes, and costs." },
  3:  { name: "Professional Presence", track: "A", access_tier: "tranche_1", description: "Domain, email, LinkedIn positioning, and the website question — with a direct opinion on each.", estimated_minutes: 20, key_questions: ["Do you have a LinkedIn profile? How recently was it updated?", "Do you have a domain name or personal website?", "How do you currently introduce yourself professionally?"], what_you_get: "Specific recommendations on domain, email, LinkedIn positioning, and whether you need a website at this stage." },
  4:  { name: "Tax Basics & Self Assessment", track: "B", access_tier: "subscription", description: "Your tax obligations, key dates, and the Year 1 traps that catch most new independents.", estimated_minutes: 25, key_questions: ["Are you already registered for Self Assessment?", "Do you have an accountant, or are you planning to handle tax yourself?", "What is your expected income in your first 12 months?"], what_you_get: "A clear picture of your Year 1 tax bill, key dates, payment on account explained, and what to set aside monthly." },
  5:  { name: "VAT", track: "B", access_tier: "subscription", description: "Whether to register for VAT, and if so which scheme — the decision most consultants get wrong.", estimated_minutes: 20, key_questions: ["What is your expected annual revenue (ex-VAT)?", "Will most of your clients be VAT-registered businesses?", "Have you considered the Flat Rate Scheme?"], what_you_get: "A VAT registration decision with rationale, the right scheme for your situation, and the cash flow implications." },
  6:  { name: "IR35 Risk & Protection", track: "B", access_tier: "subscription", description: "Your IR35 risk profile and practical steps to protect your position before your first contract.", estimated_minutes: 30, key_questions: ["Are you likely to work through a limited company?", "Will you typically work on-site at a single client, or across multiple clients?", "Do your clients tend to be large corporates, public sector, or SMEs?"], what_you_get: "Your IR35 risk assessment, the three tests explained in plain English, and specific contract and working practice protections." },
  7:  { name: "Contracts & Statements of Work", track: "B", access_tier: "subscription", description: "The contractual protection you need before your first engagement — clause by clause.", estimated_minutes: 25, key_questions: ["Will you be using a client's contract, or providing your own?", "Do you typically work on defined projects (SOW) or rolling engagements?", "Have you ever had a contract dispute or payment problem?"], what_you_get: "The key clauses to include, the ones to push back on, and a practical SOW template structure." },
  8:  { name: "Data Protection & GDPR", track: "B", access_tier: "subscription", description: "Whether you need to register with the ICO, what a data processing agreement actually requires.", estimated_minutes: 20, key_questions: ["Will you handle personal data belonging to your clients or their customers?", "Are you currently registered with the ICO?", "What types of data are you likely to process in your work?"], what_you_get: "A clear answer on ICO registration requirement, what a DPA needs to include, and how to respond if a client requests one." },
  9:  { name: "Insurance", track: "B", access_tier: "subscription", description: "What insurance you actually need — business and personal — before your first engagement.", estimated_minutes: 20, key_questions: ["What type of work will you be doing (advisory, implementation, technical)?", "Do any of your likely clients require specific insurance levels?", "Do you have existing income protection or critical illness cover?"], what_you_get: "The exact policies you need, recommended coverage levels, and what to tell your broker." },
  10: { name: "Record Keeping & Bookkeeping", track: "C", access_tier: "subscription", description: "The habits, tools, and setup to have in place before your first invoice goes out.", estimated_minutes: 20, key_questions: ["Are you using any accounting software currently?", "How comfortable are you managing your own books?", "What is your invoice volume likely to be per month?"], what_you_get: "A recommended toolset, the minimum records you must keep, and a monthly close routine you can actually stick to." },
  11: { name: "Invoicing & Cash Flow", track: "C", access_tier: "subscription", description: "How to invoice correctly, protect your cash position, and stop getting paid late.", estimated_minutes: 20, key_questions: ["What payment terms do you plan to use?", "Have you had problems with late payment before?", "Will you invoice in advance, arrears, or on milestones?"], what_you_get: "Invoice template requirements, how to set payment terms that get respected, and the chasing sequence that works." },
  12: { name: "Pricing Strategy & Rate Setting", track: "C", access_tier: "subscription", description: "What to charge, how to structure it, and why most independents start too low — and how to fix it.", estimated_minutes: 25, key_questions: ["What is your current day rate thinking (or current rate if already active)?", "Are you pricing day rates, project fees, retainers, or a mix?", "What does the market rate look like for people doing what you do?"], what_you_get: "A rate recommendation with rationale, how to present pricing to clients, and how to move rates up over time." },
  13: { name: "Expenses & Allowable Deductions", track: "C", access_tier: "subscription", description: "What you can legitimately claim, what you cannot, and how to handle the grey areas.", estimated_minutes: 20, key_questions: ["Do you work from home? Do you have a dedicated office space?", "Do you travel regularly for client work?", "Are you planning to buy equipment or software for your work?"], what_you_get: "A categorised list of allowable expenses for your situation, the home office calculation, and the grey area guidance." },
  14: { name: "Pension & Long-term Financial Planning", track: "C", access_tier: "subscription", description: "The pension gap most independents ignore for too long, and the tax-efficient structures available.", estimated_minutes: 25, key_questions: ["Do you have a pension in place (personal, SIPP, or otherwise)?", "What is your current contribution level, if any?", "Are you operating through a limited company?"], what_you_get: "Your pension gap assessment, the tax efficiency of employer contributions through a limited company, and a monthly contribution target." },
  15: { name: "Pipeline & Opportunity Management", track: "D", access_tier: "subscription", description: "How to track your pipeline, prioritise your time, and avoid the feast-and-famine cycle.", estimated_minutes: 25, key_questions: ["How are you currently tracking your pipeline and opportunities?", "What does your current pipeline look like (number of live conversations)?", "How long does your typical sales cycle take?"], what_you_get: "A simple pipeline system you'll actually use, how to qualify opportunities early, and the re-engagement cadence for warm leads." },
  16: { name: "Proposal & Scoping Framework", track: "D", access_tier: "subscription", description: "How to write proposals that win without over-committing — and how to scope engagements correctly.", estimated_minutes: 25, key_questions: ["How are you currently responding to RFPs or informal project briefs?", "Do you tend to under-scope or over-scope?", "What is the typical value of an engagement you'd propose for?"], what_you_get: "A proposal structure that wins, how to scope defensively, and when to charge for a scoping engagement." },
  17: { name: "Client Onboarding & Delivery Framework", track: "D", access_tier: "subscription", description: "How to start an engagement well, set the right expectations, and build delivery confidence.", estimated_minutes: 20, key_questions: ["What does your onboarding process currently look like?", "Have you had a project go wrong due to unclear expectations?", "Do you have a standard delivery framework or does it vary by engagement?"], what_you_get: "A kickoff meeting structure, the expectations to set on Day 1, and the delivery rhythm that keeps clients confident." },
  18: { name: "Managing Client Relationships", track: "D", access_tier: "subscription", description: "How to maintain client relationships that generate repeat work and referrals.", estimated_minutes: 20, key_questions: ["How do you currently stay in touch with past clients?", "What proportion of your work comes from repeat clients vs. new ones?", "Have you ever lost a client relationship you wished you'd maintained?"], what_you_get: "A relationship maintenance cadence, the right check-in frequency, and how to ask for referrals without it feeling awkward." },
  19: { name: "Growing & Scaling Your Practice", track: "D", access_tier: "subscription", description: "The transition from landing clients to building a practice — how to systematise and grow.", estimated_minutes: 25, key_questions: ["Are you working at full capacity, or still building pipeline?", "Are you open to working with associates or subcontractors?", "What would 'scaled' look like for you — more clients, higher rates, or leverage?"], what_you_get: "The growth levers available at your current stage, how to move from time-for-money to leverage, and what to systematise first." },
  20: { name: "Financial Services Independence", track: "E", access_tier: "subscription", description: "The specific regulatory, commercial, and reputational considerations for operating independently in FS.", estimated_minutes: 30, key_questions: ["Are you FCA regulated or does your work require FCA registration?", "What type of FS work are you targeting (risk, compliance, operations, advisory)?", "How much of your network is FS-specific?"], what_you_get: "FCA registration guidance for your work type, the commercial norms in FS consulting, and how to position your independence credibly in a relationship-driven sector." },
  21: { name: "Public Sector & Government Consulting", track: "E", access_tier: "subscription", description: "How public sector procurement actually works and why the standard independent commercial approach fails.", estimated_minutes: 30, key_questions: ["Are you targeting central government, local authority, or NHS?", "Are you on any frameworks (G-Cloud, DOS, Crown Commercial)?", "Do you have security clearance (SC, DV, or BPSS)?"], what_you_get: "How to navigate procurement frameworks, which ones are accessible to independents, and the route to your first public sector engagement." },
  22: { name: "Technology & Digital Consulting", track: "E", access_tier: "subscription", description: "The specific commercial dynamics, IP considerations, and rate structures for tech consulting.", estimated_minutes: 25, key_questions: ["Are you targeting technical delivery, architecture, product, or digital transformation?", "Will you be working on client IP or bringing your own IP?", "Are you primarily targeting day rate contracts or project-based engagements?"], what_you_get: "Rate benchmarks for your specialism, IP assignment clause guidance, and how to position against both agencies and boutique consultancies." },
  23: { name: "Healthcare & Life Sciences", track: "E", access_tier: "subscription", description: "The regulatory, commercial, and ethical framework for operating independently in health and life sciences.", estimated_minutes: 25, key_questions: ["Are you targeting NHS, private healthcare, pharma, or life sciences?", "Are you clinically qualified? Does your work require professional registration?", "What is your primary area of expertise (clinical, commercial, regulatory, operational)?"], what_you_get: "The regulatory requirements for your area, how to structure independent work in a risk-sensitive sector, and the commercial norms for healthcare consulting." },
  24: { name: "Professional Services & Legal", track: "E", access_tier: "subscription", description: "The specific commercial and professional considerations for operating independently in professional services.", estimated_minutes: 25, key_questions: ["Are you currently a member of a professional body (law society, CIPD, ICAEW, etc.)?", "Does your independent work fall within your regulated professional area?", "Are you targeting large firms, SMEs, or a mix?"], what_you_get: "Regulatory considerations for your professional body, how firms buy independent professional services, and how to position without a firm name behind you." },
  25: { name: "Creative & Marketing Independence", track: "E", access_tier: "subscription", description: "The commercial realities of independent work in creative and marketing — including IP and pricing.", estimated_minutes: 25, key_questions: ["Are you targeting strategic/advisory work, execution/delivery, or both?", "How do you handle IP ownership in your current work?", "Are you planning to work through agencies, direct with brands, or both?"], what_you_get: "How to price creative and marketing work, IP ownership norms, and how to position strategic vs. executional work." },
};

const TRACK_METADATA: Record<string, { name: string; description: string }> = {
  A: { name: "Setup & Structure", description: "The foundational decisions: legal structure, registration, and professional presence." },
  B: { name: "Compliance & Protection", description: "Tax, IR35, contracts, insurance — the essentials before your first engagement." },
  C: { name: "Financial Operations", description: "Invoicing, cash flow, pricing, expenses, and long-term financial planning." },
  D: { name: "Commercial Practice", description: "Pipeline, proposals, client management, and scaling your practice." },
  E: { name: "Sector Specialisms", description: "Sector-specific guidance tailored to your market." },
};

function getTrackEModulesForUser(q3a: string, q11: string): number[] {
  const s = (q3a + ' ' + q11).toLowerCase();
  const ids: number[] = [];
  if (/financial services|banking|insurance|fintech|compliance|risk/.test(s)) ids.push(20);
  if (/public sector|government|nhs|local authority|central government/.test(s)) ids.push(21);
  if (/technology|digital|software|\bdata\b|\btech\b|product manager|product director/.test(s)) ids.push(22);
  if (/healthcare|life sciences|pharma|medical|clinical|\bhealth\b/.test(s)) ids.push(23);
  if (/legal|management consult|strategy consult|\bhr\b|professional services|executive coach/.test(s)) ids.push(24);
  if (/marketing|creative|advertising|\bbrand\b|content|\bdesign\b|communications/.test(s)) ids.push(25);
  return ids;
}

function getRecommendedModuleIds(
  trackerDay: number | null,
  completedIds: number[],
  unlockedIds: number[],
  trackEIds: number[]
): Array<{ module_id: number; tag: string }> {
  const day = trackerDay || 0;

  let priorityList: number[];
  if (day === 0)       priorityList = [1, 2, 3];
  else if (day <= 7)   priorityList = [1, 2, 3, 4, 6];
  else if (day <= 14)  priorityList = [4, 5, 6, 7, 10];
  else if (day <= 21)  priorityList = [8, 9, 11, 12, 15];
  else                 priorityList = [12, 13, 15, 16, 19];

  // Add relevant Track E module
  const uncompletedTrackE = trackEIds.filter(id => unlockedIds.includes(id) && !completedIds.includes(id));
  if (uncompletedTrackE.length > 0) priorityList.push(uncompletedTrackE[0]);

  let available = priorityList.filter(id => unlockedIds.includes(id) && !completedIds.includes(id));

  // Fallback: next uncompleted in sequence
  if (available.length === 0) {
    for (let i = 1; i <= 25; i++) {
      if (unlockedIds.includes(i) && !completedIds.includes(i)) {
        available.push(i);
        if (available.length >= 3) break;
      }
    }
  }

  return available.slice(0, 4).map((id, index) => ({
    module_id: id,
    tag: index === 0 ? "up_next" : "recommended",
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const body = await req.json();
    const callType: string = body.call_type || "browse";
    const moduleId: number | null = body.module_id || null;

    // Gather user context in parallel
    const [profileResult, sessionResult, completionsResult, trackerResult, qResult] = await Promise.all([
      supabase.from("user_profiles").select("subscription_active").eq("user_id", userId).single(),
      supabase.from("subscription_sessions").select("modules_unlocked").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("guidance_module_completions").select("module_id, completed_at").eq("user_id", userId),
      supabase.from("tracker_sessions").select("current_day").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("questionnaire_responses").select("answers").eq("user_id", userId).single(),
    ]);

    const subscriptionActive = !!(profileResult.data?.subscription_active);
    const sessionModulesUnlocked: number[] = (sessionResult.data as { modules_unlocked?: number[] } | null)?.modules_unlocked || [];
    const completedModuleIds: number[] = (completionsResult.data || []).map((c: { module_id: number }) => c.module_id);
    const trackerDay: number | null = (trackerResult.data as { current_day?: number } | null)?.current_day || null;
    const answers = ((qResult.data as { answers?: Record<string, unknown> } | null)?.answers) || {};
    const q3a = (answers.q3a_sector as string) || (answers.sector as string) || '';
    const q11 = (answers.q11_sector_client_context as string) || '';

    // Determine unlocked modules
    let unlockedIds: number[];
    if (subscriptionActive && sessionModulesUnlocked.length > 0) {
      unlockedIds = sessionModulesUnlocked;
    } else if (subscriptionActive) {
      // Subscriber but session row not yet created — unlock all A-D + relevant E
      const trackEIds = getTrackEModulesForUser(q3a, q11);
      unlockedIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19, ...trackEIds];
    } else {
      // Buyer: check if paid, unlock tranche_1
      const { data: paymentData } = await supabase.from("payments").select("id").eq("user_id", userId).in("status", ["paid", "completed"]).limit(1).single();
      unlockedIds = paymentData ? [1, 2, 3] : [];
    }

    const trackEModuleIds = getTrackEModulesForUser(q3a, q11);

    // ── ARTICLE ───────────────────────────────────────────────────────────────
    if (callType === "article" && moduleId) {
      const mod = MODULES[moduleId];
      if (!mod) {
        return new Response(
          JSON.stringify({ error: "Module not found", response_text: `Module ${moduleId} not found.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const isCompleted = completedModuleIds.includes(moduleId);
      let completionOutput = null;
      if (isCompleted) {
        const { data: comp } = await supabase
          .from("guidance_module_completions")
          .select("output, completed_at, module_answers")
          .eq("user_id", userId)
          .eq("module_id", moduleId)
          .single();
        completionOutput = comp || null;
      }
      return new Response(
        JSON.stringify({
          module_id: moduleId,
          title: mod.name,
          track: mod.track,
          track_name: TRACK_METADATA[mod.track]?.name || mod.track,
          description: mod.description,
          estimated_minutes: mod.estimated_minutes,
          access_tier: mod.access_tier,
          key_questions: mod.key_questions,
          what_you_get: mod.what_you_get,
          is_unlocked: unlockedIds.includes(moduleId),
          is_completed: isCompleted,
          completion: completionOutput,
          response_text: `Module ${moduleId} loaded.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── TODAY ─────────────────────────────────────────────────────────────────
    if (callType === "today") {
      const recommendations = getRecommendedModuleIds(trackerDay, completedModuleIds, unlockedIds, trackEModuleIds);
      const featured = recommendations.map(rec => {
        const mod = MODULES[rec.module_id];
        return {
          module_id: rec.module_id,
          title: mod.name,
          track: mod.track,
          track_name: TRACK_METADATA[mod.track]?.name || mod.track,
          description: mod.description,
          estimated_minutes: mod.estimated_minutes,
          access_tier: mod.access_tier,
          tag: rec.tag,
          is_completed: completedModuleIds.includes(rec.module_id),
          is_unlocked: unlockedIds.includes(rec.module_id),
        };
      });

      const totalUnlocked = unlockedIds.length;
      const totalCompleted = completedModuleIds.filter(id => unlockedIds.includes(id)).length;
      let progressMessage: string;
      if (totalCompleted === 0) {
        progressMessage = `${totalUnlocked} module${totalUnlocked === 1 ? '' : 's'} available. Start with Track A.`;
      } else if (totalCompleted < totalUnlocked) {
        progressMessage = `${totalCompleted} of ${totalUnlocked} available modules complete.`;
      } else {
        progressMessage = `All ${totalUnlocked} available modules complete.`;
      }

      return new Response(
        JSON.stringify({
          featured,
          progress: { completed: totalCompleted, unlocked: totalUnlocked, message: progressMessage, tracker_day: trackerDay },
          response_text: "Today content loaded.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── BROWSE (default) ─────────────────────────────────────────────────────
    const trackOrder = ["A", "B", "C", "D", "E"] as const;
    const tracks: Record<string, unknown> = {};

    for (const track of trackOrder) {
      const trackModules = Object.entries(MODULES)
        .filter(([, mod]) => mod.track === track)
        .map(([idStr, mod]) => {
          const id = parseInt(idStr);
          return {
            module_id: id,
            title: mod.name,
            description: mod.description,
            estimated_minutes: mod.estimated_minutes,
            access_tier: mod.access_tier,
            is_completed: completedModuleIds.includes(id),
            is_unlocked: unlockedIds.includes(id),
            is_sector_relevant: track === "E" ? trackEModuleIds.includes(id) : true,
          };
        })
        .sort((a, b) => a.module_id - b.module_id);

      // For Track E, put the user's sector module(s) first
      const relevant = track === "E" ? trackModules.filter(m => m.is_sector_relevant) : trackModules;
      const others = track === "E" ? trackModules.filter(m => !m.is_sector_relevant) : [];
      const ordered = [...relevant, ...others];

      tracks[track] = {
        track_id: track,
        ...TRACK_METADATA[track],
        modules: ordered,
        completed_count: ordered.filter(m => m.is_completed).length,
        total_count: ordered.length,
      };
    }

    return new Response(
      JSON.stringify({
        tracks,
        completed_module_ids: completedModuleIds,
        unlocked_module_ids: unlockedIds,
        track_e_relevant_ids: trackEModuleIds,
        response_text: "Library browse content loaded.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("get-library-content error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error), response_text: "Failed to load library content." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
