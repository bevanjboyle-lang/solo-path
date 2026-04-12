import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const P10_SYSTEM = `You are an expert ghostwriter for mid-career professionals who are moving into independent advisory work. Your job is to write outreach messages that feel authentic to the sender - professional, direct, warm, and not salesy.

You have full context about this user: their career background, their recommended business model, their specific achievement, their sector context, and where they are in their 30-day activation journey. Use all of this context to write a message that feels like it could only have been written by this specific person.

Rules:
- Never start a message with "I hope this finds you well", "I wanted to reach out", or any other cliché opener.
- Write in plain, direct British English. No Americanisms, no startup language.
- The message should make the recipient feel noticed and respected, not targeted.
- Keep it short. Longer is not better. A crisp 120-word email gets more replies than a thorough 300-word one.
- Always end with a single, low-friction CTA - a 20-minute call, a coffee, a quick question. Not "let me know if you want to connect" (too vague) and not "I'd love to discuss how I might help your business" (too salesy).
- Never use the word "leverage" as a verb.
- Format guidelines by type: reconnect email (150-200 words), cold email (100-140 words), referral_ask (120-160 words), linkedin_dm (80-120 words), verbal (60 words max).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_context, contact, request: draftRequest } = body;

    if (!user_context || !contact || !draftRequest) {
      return new Response(
        JSON.stringify({ error: "missing_fields", message: "user_context, contact, and request are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = `Draft an outreach message using the following context.

USER CONTEXT:
- Name: ${user_context.first_name || "the user"}
- Archetype: ${user_context.archetype || "independent advisor"}
- Recommended model: ${user_context.recommended_model || "advisory/consulting"}
- Key achievement: ${user_context.q6_achievement || "not provided"}
- Sector context: ${user_context.q11_sector_context || "not provided"}
- Employer/org type: ${user_context.q3b_employer_org_type || "not provided"}
- Tracker day: ${user_context.tracker_day || "not yet started"}
${user_context.recent_progress ? "- Recent progress: " + user_context.recent_progress : ""}

CONTACT:
- Name: ${contact.name || "[Name]"}
- Role: ${contact.role || "not specified"}
- Company: ${contact.company || "not specified"}
- Relationship: ${contact.relationship || "not specified"}
${contact.any_shared_context ? "- Shared context: " + contact.any_shared_context : ""}

REQUEST:
- Format: ${draftRequest.format || "email"}
- Purpose: ${draftRequest.purpose || "reconnect"}
${draftRequest.any_specific_notes ? "- Notes: " + draftRequest.any_specific_notes : ""}

Return ONLY this JSON:
{
  "draft": {
    "format": "email | linkedin_dm | verbal",
    "subject": "string (email only) or null",
    "body": "string - the full message with \\n for line breaks",
    "word_count": integer
  },
  "tone_note": "One sentence on the strategic tone intent",
  "personalisation_instructions": "What the user needs to fill in before sending",
  "alternative_approach": "One sentence on a different approach that might work better, or null"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.5,
        max_tokens: 600,
        messages: [
          { role: "system", content: P10_SYSTEM },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await response.json();
    const rawOutput = data.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : rawOutput);
    } catch {
      return new Response(
        JSON.stringify({ error: "parse_error", raw: rawOutput.slice(0, 200) }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "internal_error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
