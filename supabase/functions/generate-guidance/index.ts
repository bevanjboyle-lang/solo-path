import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULE_META: Record<number, { name: string; area: string }> = {
  1: { name: "Business Structure", area: "Legal & Tax" },
  2: { name: "Registration & Setup", area: "Legal & Tax" },
  3: { name: "Tax Basics & Pensions", area: "Tax & Finance" },
  4: { name: "VAT", area: "Tax & Finance" },
  5: { name: "IR35", area: "Compliance" },
  6: { name: "Contracts & Data Protection", area: "Compliance" },
  7: { name: "Insurance", area: "Risk & Protection" },
  8: { name: "Record Keeping & Finance", area: "Operations" },
  9: { name: "Professional Presence", area: "Profile & Positioning" },
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;

    const { module_id, module_answers } = await req.json();
    if (!module_id || !module_answers) throw new Error("Missing module_id or module_answers");

    const meta = MODULE_META[module_id];
    if (!meta) throw new Error("Invalid module_id");

    const answersText = Object.entries(module_answers)
      .map(([q, a]) => `- ${q}: ${a}`)
      .join("\n");

    const systemPrompt = `You are Solo, a practical guidance advisor for mid-career professionals going independent in the UK. You provide clear, specific, actionable advice. Always be direct  - no corporate fluff. Reference UK-specific rules, thresholds, and bodies where relevant. Return your response as a JSON object.`;

    const userPrompt = `Module: "${meta.name}" (${meta.area})

The user answered the following questions:
${answersText}

Based on these answers, generate personalised guidance as a JSON object with these fields:
- "recommendation": A single clear sentence stating your top recommendation (e.g. "Set up as a sole trader for now  - you can incorporate later when turnover justifies it.")
- "why_this_matters": 2-3 sentences explaining why this recommendation matters for them specifically
- "what_to_do_now": An array of 3-5 specific action steps they should take, ordered by priority
- "watch_out_for": 2-3 sentences on common mistakes or risks specific to their situation
- "useful_links": An array of 2-3 objects with "title" and "url" pointing to relevant UK government or professional body resources
- "caveat": A single sentence disclaimer (e.g. "This is general guidance  - consult a qualified accountant for advice specific to your circumstances.")

Return ONLY valid JSON, no markdown wrapping.`;

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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI call failed: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No content from AI");

    let output: Record<string, unknown>;
    try {
      output = JSON.parse(rawContent);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    // Save completion to DB
    const { error: insertError } = await supabase
      .from("guidance_module_completions")
      .upsert(
        {
          user_id: user.id,
          module_id,
          answers: module_answers,
          output,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id" }
      );

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate-guidance] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
