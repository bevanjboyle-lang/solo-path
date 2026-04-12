import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ASK-SOLO] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { call_type } = body;

    // ── START SESSION ──
    if (call_type === "start_session") {
      logStep("Starting session");

      // Load user's report + tracker for context
      const [{ data: report }, { data: tracker }] = await Promise.all([
        supabase.from("reports").select("core_report, activation_plan, ai_impact_section, answers").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("tracker_sessions").select("current_day, working_plan, running_narrative").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const archetype = report?.core_report?.archetype_label || report?.core_report?.archetype || "professional";
      const model = report?.core_report?.business_model_label || report?.core_report?.recommended_model || "independent consultant";
      const currentDay = tracker?.current_day || 0;

      const contextCue = `I know your background as ${archetype} and your plan as ${model}. Day ${currentDay} of your plan.`;

      const sessionId = crypto.randomUUID();
      const conversationId = crypto.randomUUID();

      return new Response(JSON.stringify({
        session_id: sessionId,
        conversation_id: conversationId,
        context_cue: contextCue,
        archetype,
        model,
        current_day: currentDay,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── CONVERSATION ──
    if (call_type === "conversation") {
      const { session_id, conversation_id, message, history } = body;
      if (!message) throw new Error("No message provided");
      logStep("Conversation", { session_id, messageLen: message.length });

      // Load context
      const [{ data: report }, { data: tracker }] = await Promise.all([
        supabase.from("reports").select("core_report, activation_plan, answers").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("tracker_sessions").select("current_day, working_plan, running_narrative").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const archetype = report?.core_report?.archetype_label || report?.core_report?.archetype || "professional";
      const model = report?.core_report?.business_model_label || "independent consultant";
      const currentDay = tracker?.current_day || 0;
      const narrative = tracker?.running_narrative || "";

      const systemPrompt = `You are Solo — a sharp, practical AI advisor for mid-career professionals going independent.

USER CONTEXT:
- Archetype: ${archetype}
- Business model: ${model}
- Day ${currentDay} of their 30-day activation plan
- Running narrative: ${narrative}
${report?.core_report ? `- Core report data available` : ""}

RULES:
- Be direct and practical. No corporate fluff.
- Reference UK-specific rules, thresholds, and bodies where relevant.
- Keep responses concise — 2-4 paragraphs max unless they ask for detail.
- If they ask about something covered in their plan, reference their specific situation.
- Use markdown formatting for clarity.
- Never invent facts about their specific situation — only reference what you know from context.`;

      const conversationHistory = Array.isArray(history) ? history : [];
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

      const aiResponse = await fetch("https://ai.lovable.dev/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI error: ${aiResponse.status} ${errText}`);
      }

      const aiData = await aiResponse.json();
      const response = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

      return new Response(JSON.stringify({ response }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── END SESSION ──
    if (call_type === "end_session") {
      logStep("Session ended", { conversation_id: body.conversation_id });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unknown call_type: ${call_type}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
