// generate-guidance v24 — vibe code review V-054 — 2026-05-14
// V-054: MODULES library now imported from _shared/modules-library.ts. Previously
//        duplicated (and drifted in field shape) with get-library-content's copy.
//
// generate-guidance v23 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// generate-guidance v20 — P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";
import { MODULES_LIBRARY as MODULES } from "../_shared/modules-library.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
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
Module purpose: ${moduleDef.description}

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
