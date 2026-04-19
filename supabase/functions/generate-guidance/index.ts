// generate-guidance v20 — P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v19 baseline: 2026-04-17 Audit P2 #16 — source-header reconciled with deploy counter.
// Earlier history:
//   - v10 (pre-reconciliation): ADR-012 (2026-04-17) — upgraded to MODEL_TIER1 (gpt-5.4)
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

// Canonical 25-module library — tracks A-E, tiers tranche_1/subscription
// Matches knowledge-bank/guidance_modules.json exactly
const MODULES: Record<number, { name: string; track: string; access_tier: string; descr: string }> = {
  1:  { name: "Business Structure",                    track: "A", access_tier: "tranche_1",  descr: "Sole trader, limited company, or umbrella — the foundational decision everything else sits on." },
  2:  { name: "Registration & Setup",                  track: "A", access_tier: "tranche_1",  descr: "Exactly what to register, in what order, with timeframes — tailored to your chosen structure." },
  3:  { name: "Professional Presence",                 track: "A", access_tier: "tranche_1",  descr: "Domain, email, LinkedIn positioning, and the website question — with a direct opinion on each." },
  4:  { name: "Tax Basics & Self Assessment",          track: "B", access_tier: "subscription", descr: "Your tax obligations, key dates, and the Year 1 traps that catch most new independents." },
  5:  { name: "VAT",                                   track: "B", access_tier: "subscription", descr: "Whether to register for VAT, and if so which scheme — the decision most consultants get wrong." },
  6:  { name: "IR35 Risk & Protection",                track: "B", access_tier: "subscription", descr: "Your IR35 risk profile and practical steps to protect your position before your first contract." },
  7:  { name: "Contracts & Statements of Work",        track: "B", access_tier: "subscription", descr: "The contractual protection you need before your first engagement — clause by clause." },
  8:  { name: "Data Protection & GDPR",                track: "B", access_tier: "subscription", descr: "Whether you need to register with the ICO, what a data processing agreement actually requires." },
  9:  { name: "Insurance",                             track: "B", access_tier: "subscription", descr: "What insurance you actually need — business and personal — before your first engagement." },
  10: { name: "Record Keeping & Bookkeeping",          track: "C", access_tier: "subscription", descr: "The habits, tools, and setup to have in place before your first invoice goes out." },
  11: { name: "Invoicing & Cash Flow",                 track: "C", access_tier: "subscription", descr: "How to invoice correctly, protect your cash position, and stop getting paid late." },
  12: { name: "Pricing Strategy & Rate Setting",       track: "C", access_tier: "subscription", descr: "What to charge, how to structure it, and why most independents start too low and how to fix it." },
  13: { name: "Expenses & Allowable Deductions",       track: "C", access_tier: "subscription", descr: "What you can legitimately claim, what you cannot, and how to handle the grey areas." },
  14: { name: "Pension & Long-term Financial Planning",track: "C", access_tier: "subscription", descr: "The pension gap most independents ignore for too long, and the tax-efficient structures available." },
  15: { name: "Pipeline & Opportunity Management",     track: "D", access_tier: "subscription", descr: "How to track your pipeline, prioritise your time, and avoid the feast-and-famine cycle." },
  16: { name: "Proposal & Scoping Framework",          track: "D", access_tier: "subscription", descr: "How to write proposals that win without over-committing — and how to scope engagements correctly." },
  17: { name: "Client Onboarding & Delivery Framework",track: "D", access_tier: "subscription", descr: "How to start an engagement well, set the right expectations, and build delivery confidence." },
  18: { name: "Managing Client Relationships",         track: "D", access_tier: "subscription", descr: "How to maintain client relationships that generate repeat work and referrals." },
  19: { name: "Growing & Scaling Your Practice",       track: "D", access_tier: "subscription", descr: "The transition from landing clients to building a practice — how to systematise and grow." },
  20: { name: "Financial Services Independence",       track: "E", access_tier: "subscription", descr: "The specific regulatory, commercial, and reputational considerations for operating independently in FS." },
  21: { name: "Public Sector & Government Consulting", track: "E", access_tier: "subscription", descr: "How public sector procurement actually works and why the standard independent commercial approach fails." },
  22: { name: "Technology & Digital Consulting",       track: "E", access_tier: "subscription", descr: "The specific commercial dynamics, IP considerations, and rate structures for tech consulting." },
  23: { name: "Healthcare & Life Sciences",            track: "E", access_tier: "subscription", descr: "The regulatory, commercial, and ethical framework for operating independently in health and life sciences." },
  24: { name: "Professional Services & Legal",         track: "E", access_tier: "subscription", descr: "The specific commercial and professional considerations for operating independently in professional services." },
  25: { name: "Creative & Marketing Independence",     track: "E", access_tier: "subscription", descr: "The commercial realities of independent work in creative and marketing — including IP and pricing." },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    const userId = getUserIdFromJwt(authHeader);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Invalid JWT" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json() as {
      module_id: number;
      module_answers?: Record<string, unknown>;
      user_answers?: Record<string, unknown>;
      user_profile?: Record<string, unknown>;
    };
    const module_id = body.module_id;
    const answers = body.module_answers || body.user_answers || {};
    const user_profile = body.user_profile || {};

    if (module_id === undefined || module_id === null || typeof module_id !== 'number') {
      return new Response(
        JSON.stringify({ error: "Invalid module_id", response_text: "module_id (integer 1-25) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const moduleDef = MODULES[module_id];
    if (!moduleDef) {
      return new Response(
        JSON.stringify({ error: "Module not found", response_text: `Module ${module_id} does not exist. Valid modules: 1-25.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    // --- Access control ---
    // tranche_1 (modules 1-3): accessible with completed payment OR subscription
    // subscription (modules 4-25): must be in subscription_sessions.modules_unlocked

    let hasAccess = false;

    // First: check subscription_sessions for explicit unlock (covers all tiers)
    const { data: sessionData } = await supabase
      .from("subscription_sessions")
      .select("modules_unlocked")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const modulesUnlocked: number[] = (sessionData as { modules_unlocked?: number[] } | null)?.modules_unlocked || [];
    if (modulesUnlocked.includes(module_id)) hasAccess = true;

    // Fallback for tranche_1: check payments table (covers users who paid but haven't gone through subscription)
    if (!hasAccess && moduleDef.access_tier === "tranche_1") {
      const { data: paymentData } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .limit(1)
        .single();
      hasAccess = !!paymentData;
    }

    // Fallback for subscription: check user_profiles.subscription_active
    if (!hasAccess && moduleDef.access_tier === "subscription") {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("subscription_active")
        .eq("user_id", userId)
        .single();
      hasAccess = !!(profileData as { subscription_active?: boolean } | null)?.subscription_active;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Access denied",
          response_text: moduleDef.access_tier === "tranche_1"
            ? "Complete your Solo report to access this module."
            : "This module requires an active Solo plan.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- OpenAI call ---
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const systemPrompt = `You are an expert career and business coach helping a senior professional go independent.

The user is completing the Solo guidance module: "${moduleDef.name}" (Track ${moduleDef.track}).
Module purpose: ${moduleDef.descr}

User profile context: ${JSON.stringify(user_profile)}

Return JSON with exactly these keys:
- "key_insights": array of 3-5 specific, personalised strings
- "next_steps": array of 3-5 concrete, actionable strings with specific detail
- "resources_or_prompts": array of 2-4 strings (tools, templates, questions to answer, or specific sources)

Be direct, specific, and commercially grounded. No waffle or motivational filler. Ground every recommendation in the user's actual context.`;

    const userMessage = `Module answers: ${JSON.stringify(answers, null, 2)}`;

    // ── Call MODEL_TIER1 (gpt-5.4) — P8 guidance synthesis ──
    const completion = await openai.chat.completions.create({
      model: MODEL_TIER1,
      temperature: 0.3,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const rawOutput = completion.choices[0].message.content || "{}";
    let parsedOutput: Record<string, unknown> = {};
    try { parsedOutput = JSON.parse(rawOutput); } catch { parsedOutput = { raw_output: rawOutput }; }

    // Upsert to guidance_module_completions
    const { error: upsertError } = await supabase
      .from("guidance_module_completions")
      .upsert({
        user_id: userId,
        module_id: module_id,
        module_name: moduleDef.name,
        track: moduleDef.track,
        access_tier: moduleDef.access_tier,
        module_answers: answers,
        output: parsedOutput,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,module_id" });

    if (upsertError) console.error("upsert error:", JSON.stringify(upsertError));

    return new Response(
      JSON.stringify({
        module_id,
        module_name: moduleDef.name,
        track: moduleDef.track,
        access_tier: moduleDef.access_tier,
        output: parsedOutput,
        response_text: `${moduleDef.name} complete.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-guidance error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
        response_text: "Failed to generate guidance module.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
