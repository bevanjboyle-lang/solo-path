import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI error:", res.status, err);
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function chatCompletionText(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI error:", res.status, err);
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function fetchKnowledgeBank(supabase: any) {
  const bucket = "knowledge-bank";
  const files = ["archetypes.json", "business_models.json", "mapping_table.json"];
  const results: Record<string, any> = {};

  for (const file of files) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(file);
    const res = await fetch(data.publicUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${file}`);
    results[file.replace(".json", "")] = await res.json();
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  try {
    const { answers } = await req.json();
    if (!answers) throw new Error("Missing answers");

    // Create report record
    const { data: report, error: insertErr } = await adminClient
      .from("reports")
      .insert({ user_id: userId, answers, status: "processing" })
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    const reportId = report.id;

    // Fetch knowledge bank
    const kb = await fetchKnowledgeBank(adminClient);

    // Format answers
    const formattedAnswers = JSON.stringify({
      q1_background: answers["1"],
      q2_seniority: answers["2"],
      q3_years: answers["3"],
      q4_org_type: answers["4"],
      q5_work_done: answers["5"],
      q6_industries: answers["6"],
      q7_reputation: answers["7"],
      q8_motivation: answers["8"],
      q9_biz_dev_comfort: answers["9"],
      q10_model_preference: answers["10"],
      q11_network: answers["11"],
      q12_employment: answers["12"],
      q13_location: answers["13"],
    });

    // ─── PROMPT 1: Core Report ───
    const p1System = `You are the intelligence engine for Solo, a product helping mid-career professionals find a realistic Plan B. Analyse the user's background and produce structured solo business recommendations. You operate from a curated library of archetypes and business models — use the injected knowledge bank data.

Steps:
1. Classify primary archetype and optional secondary with confidence score 0–1.
2. Filter models where capability_fit is 2 or below, credibility_gap is 4 or above, or avoid is true.
3. Score remaining models using: (2×capability_fit) + (2×speed_to_revenue) + (2×(6-credibility_gap)) + income_potential + recurrence - sales_complexity. Adjust +2 to fast-revenue models if user signals urgency, -1 to high-complexity models if user signals low selling confidence, +1 to high-income models if 10+ years experience.
4. Select top 3 with different categories and sales motions — label Option A (safest/fastest), B (moderate), C (most ambitious).
5. Return JSON with this exact structure:
{
  "archetype": { "primary": string, "secondary": string|null, "confidence": number, "summary": string },
  "transferable_value": { "what_they_can_sell": string, "why_buyers_would_pay": string, "credibility_assets": [string, string, string] },
  "options": [
    { "label": "A"|"B"|"C", "model_name": string, "positioning": string, "target_buyer": string, "what_they_are_buying": string, "pricing": { "model": string, "range_low_gbp": number, "range_high_gbp": number, "cadence": string }, "time_to_first_revenue": string, "difficulty_rating": "easy"|"moderate"|"hard", "why_this_works_for_them": string }
  ],
  "recommendation": { "recommended_option": "A"|"B"|"C", "rationale": string, "key_condition": string },
  "reality_check": { "most_likely_failure_mode": string, "second_failure_mode": string, "what_they_will_find_hard": string, "honest_income_outlook": string },
  "first_steps": [string, string, string, string, string]
}`;

    const p1User = `KNOWLEDGE BANK:
Archetypes: ${JSON.stringify(kb.archetypes)}
Business Models: ${JSON.stringify(kb.business_models)}
Mapping Table: ${JSON.stringify(kb.mapping_table)}

USER ANSWERS:
${formattedAnswers}`;

    console.log("Running Prompt 1...");
    const p1Result = await chatCompletion(p1System, p1User, 0.4, 3000);
    const p1Json = JSON.parse(p1Result);

    // ─── PROMPT 2: Evaluation ───
    const p2System = `You are a senior commercial critic. Evaluate the Solo report against 6 criteria:
1. Specificity — target_buyer must name type/size/situation
2. Commercial realism — pricing and timelines plausible for UK market
3. Option diversity — 3 options must not share same category or sales motion
4. Recommendation quality — specific reason tied to this user
5. Reality check honesty — archetype-specific failure modes, GBP figures in income outlook
6. First steps quality — all 5 specific and tied to recommended model

If all pass: return JSON with {"verdict":"pass","final_report":<original report>}.
If any fail: revise only failing sections and return {"verdict":"revise","final_report":<revised report>}.
Hard constraint: NEVER change a model_name value.`;

    console.log("Running Prompt 2...");
    const p2Result = await chatCompletion(p2System, JSON.stringify(p1Json), 0.3, 3000);
    const p2Json = JSON.parse(p2Result);
    const finalReport = p2Json.final_report;

    // ─── PROMPTS 3 & 4 in parallel ───
    const p3System = `You are Solo's activation specialist. Produce a 14-Day Activation Plan and Network Activation Toolkit for the recommended model.

Pacing based on employment status:
- Employed full-time: 1–1.5h weekday evenings, 3–4h weekend days
- Unemployed or in notice: 5–6h weekdays
- Part-time: 2–3h weekdays

Network calibration:
- Strong (100+ contacts): ambitious referral-led targets
- Medium (30–100): moderate mix of warm and cold
- Weak (under 30): conservative, rebuild relationships first

Cover 4 phases: Foundations (Days 1–3), Network Activation (Days 4–7), Outreach (Days 8–11), Consolidation (Days 12–14).

Return JSON:
{
  "activation_plan": { "summary": string, "pacing_note": string, "network_note": string, "phases": [{ "phase": string, "days": string, "goal": string, "days_detail": [{ "day": string, "tasks": [string] }] }] },
  "network_toolkit": {
    "reconnect_email": { "subject": string, "body": string },
    "linkedin_dm": { "body": string },
    "referral_ask_email": { "subject": string, "body": string },
    "verbal_positioning": { "script": string }
  }
}`;

    const p3User = `RECOMMENDED MODEL & REPORT:
${JSON.stringify(finalReport)}

Q11 (Network): ${answers["11"]}
Q12 (Employment): ${answers["12"]}`;

    const p4System = `You are Solo's market research analyst. Produce a Local Market Feasibility Snapshot. You do not have live data — label all figures as indicative.

Output plain text with these 5 section headings:
DEMAND SIGNAL
PRICING BENCHMARK (open with explicit sentence that figures are indicative)
COMPETITOR LANDSCAPE
MARKET ENTRY INSIGHT
HONEST ASSESSMENT

Header format:
LOCAL MARKET FEASIBILITY SNAPSHOT
[Model name] | [Location]
Prepared as indicative research — not primary market data`;

    const recommendedOption = finalReport.options?.find(
      (o: any) => o.label === finalReport.recommendation?.recommended_option
    );
    const p4User = `Recommended model: ${recommendedOption?.model_name || "Unknown"}
Archetype: ${finalReport.archetype?.primary || "Unknown"}
Pricing: £${recommendedOption?.pricing?.range_low_gbp || "?"} – £${recommendedOption?.pricing?.range_high_gbp || "?"} ${recommendedOption?.pricing?.cadence || ""}
Location: ${answers["13"] || "UK"}`;

    console.log("Running Prompts 3 & 4 in parallel...");
    const [p3Result, p4Result] = await Promise.all([
      chatCompletion(p3System, p3User, 0.5, 2500),
      chatCompletionText(p4System, p4User, 0.3, 1500),
    ]);

    const activationPlan = JSON.parse(p3Result);

    // Save completed report
    const { error: updateErr } = await adminClient
      .from("reports")
      .update({
        core_report: finalReport,
        activation_plan: activationPlan,
        market_snapshot: p4Result,
        status: "complete",
      })
      .eq("id", reportId);

    if (updateErr) throw updateErr;

    console.log("Report complete:", reportId);
    return new Response(
      JSON.stringify({
        report_id: reportId,
        core_report: finalReport,
        activation_plan: activationPlan,
        market_snapshot: p4Result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-report error:", err);

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
