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

const ARCHETYPES = [{"id":"ARCH_RISK","name":"Risk / Audit / Compliance","core_identity":"Brings structured risk thinking, control frameworks, and regulatory knowledge to organisations that need to manage uncertainty, meet obligations, and satisfy auditors or regulators. Often holds the institutional memory of what can go wrong and why.","capabilities":["Risk identification, assessment, and heat-mapping","Control design, implementation, and testing","Regulatory interpretation and application (FCA, GDPR, SOX, Basel, ISO)","Internal audit methodology: planning, fieldwork, report writing","Three lines of defence framework design and implementation","Compliance monitoring and management reporting","Policy and procedure documentation","Board and audit committee reporting on risk and compliance matters","Root cause analysis of control failures","Regulatory inspection preparation"],"monetisable_translations":["Help regulated SMEs build credible compliance frameworks they couldn't afford in-house","Prepare businesses for regulatory scrutiny, auditor visits, or accreditation processes","Reduce the cost and anxiety of external audit for growing businesses","Help firms understand and respond to regulatory change without hiring a full-time specialist","Provide independent assurance on whether an organisation's controls and risks are being managed adequately"],"pricing_power":"medium-high","time_to_revenue_bias":"fast"},{"id":"ARCH_FIN","name":"Finance & Commercial","core_identity":"Understands business performance, financial decision-making, and commercial logic at depth. Can translate complex financial data into useful management insight. Speaks the language of owners, boards, and investors.","capabilities":["Financial modelling, scenario analysis, and sensitivity testing","Management reporting design and delivery","Cashflow forecasting and working capital management","Budgeting and rolling forecast process design","Business case development and investment appraisal","Pricing and margin analysis","Financial due diligence for M&A transactions","KPI framework design and dashboard development","Board and investor communication on financial performance","Banking relationship management and covenant monitoring"],"monetisable_translations":["Give SME owners the financial clarity they need to make confident decisions","Provide fractional CFO capability that growing businesses can't yet afford full-time","Help businesses understand their unit economics and improve profitability","Support fundraising, M&A, or growth planning with credible financial work","Build the forecasting and management reporting infrastructure that enables the business to scale"],"pricing_power":"high","time_to_revenue_bias":"fast"},{"id":"ARCH_CONS","name":"Generalist Consultant","core_identity":"Brings broad analytical, problem-structuring, and communication capabilities across industries. Comfortable with ambiguity. Skilled at framing problems, structuring thinking, and influencing senior stakeholders.","capabilities":["Structured problem decomposition and hypothesis-driven analysis","Stakeholder management and executive communication","Strategy and business case development","Operating model design and organisational diagnosis","Facilitation of workshops and leadership sessions","Benchmarking, market analysis, and competitive intelligence","Presentation and narrative construction for senior audiences","Project and workstream management","Client relationship management and account development"],"monetisable_translations":["Strategy and growth advisory for owner-managed or mid-market businesses","Independent sounding board and analytical rigour for senior leaders who lack trusted challenge","Specialist in a narrow problem type","Interim programme or change leadership for organisations without internal capability","Diagnostic and improvement advisory for businesses at strategic inflection points"],"pricing_power":"medium-high (conditional on clear niche)","time_to_revenue_bias":"medium"},{"id":"ARCH_PMO","name":"Delivery / PMO / Transformation","core_identity":"Brings discipline to how organisations run change, manage programmes, and deliver outcomes. Understands the gap between strategy and execution and knows how to close it.","capabilities":["Programme and project governance framework design","Portfolio management and investment prioritisation","Benefits realisation planning and tracking","Risk and issue identification, escalation, and management","Stakeholder reporting and programme communications","Dependency mapping and critical path analysis","Change readiness assessment and planning","Resource and capacity planning","Agile and waterfall delivery methodology","Vendor and third-party management in programme contexts"],"monetisable_translations":["Give mid-market businesses the programme discipline to actually deliver their strategic initiatives","Rescue troubled programmes that are at risk of failure or already failing","Provide independent assurance on major investments to boards and audit committees","Help organisations build the internal capability to run change without permanent external dependency","Fractional PMO: provide the governance infrastructure for complex change at a fraction of the cost"],"pricing_power":"medium","time_to_revenue_bias":"fast to medium"},{"id":"ARCH_OPS","name":"Operations / Process","core_identity":"Understands how work actually flows through an organisation. Can identify inefficiency, redesign processes, and help businesses operate more reliably at lower cost.","capabilities":["Process mapping and analysis","Lean and Six Sigma methodology","Root cause analysis and problem-solving","Standard operating procedure design and documentation","Performance measurement, KPI design, and operational dashboards","Operational technology selection and implementation oversight","Continuous improvement programme design and facilitation","AI and automation tool identification and workflow integration"],"monetisable_translations":["Help growing SMEs replace informal processes with scalable, documented operating models","Reduce operational waste and cost in businesses that have grown faster than their processes","Help businesses implement AI and automation tools into their real workflows","Build operational infrastructure for scale ahead of growth, investment, or acquisition"],"pricing_power":"medium","time_to_revenue_bias":"fast (project) to medium (retainer)"}];

const MAPPING = [{"archetype":"ARCH_FIN","model":"BM_FCFO","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":5,"recurrence":5,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_CWC","capability_fit":5,"credibility_gap":1,"speed_to_revenue":5,"sales_complexity":2,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_FPA","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_PRICE","capability_fit":4,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":2,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_FDD","capability_fit":5,"credibility_gap":3,"speed_to_revenue":4,"sales_complexity":4,"income_potential":5,"recurrence":3,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_ARS","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":3,"recurrence":5,"avoid":true},{"archetype":"ARCH_FIN","model":"BM_STRAT","capability_fit":3,"credibility_gap":4,"speed_to_revenue":2,"sales_complexity":5,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_FIN","model":"BM_OPEFF","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":2,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_CAAS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_ARS","capability_fit":5,"credibility_gap":1,"speed_to_revenue":4,"sales_complexity":2,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_RISK","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_IACS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_REGCH","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_PASS","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_RISK","model":"BM_FCFO","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":4,"recurrence":4,"avoid":true},{"archetype":"ARCH_RISK","model":"BM_FDD","capability_fit":2,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":5,"income_potential":4,"recurrence":2,"avoid":true},{"archetype":"ARCH_CONS","model":"BM_STRAT","capability_fit":5,"credibility_gap":3,"speed_to_revenue":2,"sales_complexity":5,"income_potential":5,"recurrence":5,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_CHANGE","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_PREC","capability_fit":4,"credibility_gap":3,"speed_to_revenue":4,"sales_complexity":3,"income_potential":5,"recurrence":2,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_DXADV","capability_fit":4,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_PASS","capability_fit":4,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":4,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_PRICE","capability_fit":3,"credibility_gap":4,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":2,"avoid":false},{"archetype":"ARCH_CONS","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":3,"recurrence":5,"avoid":true},{"archetype":"ARCH_CONS","model":"BM_CWC","capability_fit":1,"credibility_gap":5,"speed_to_revenue":2,"sales_complexity":4,"income_potential":3,"recurrence":2,"avoid":true},{"archetype":"ARCH_PMO","model":"BM_PMOAS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":4,"recurrence":5,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_PREC","capability_fit":5,"credibility_gap":2,"speed_to_revenue":5,"sales_complexity":3,"income_potential":5,"recurrence":2,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_PASS","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_DXADV","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":4,"income_potential":4,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_CHANGE","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_AIWF","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":3,"avoid":false},{"archetype":"ARCH_PMO","model":"BM_FCFO","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":4,"recurrence":4,"avoid":true},{"archetype":"ARCH_PMO","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":3,"recurrence":4,"avoid":true},{"archetype":"ARCH_OPS","model":"BM_PROCIM","capability_fit":5,"credibility_gap":2,"speed_to_revenue":4,"sales_complexity":3,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_AIWF","capability_fit":4,"credibility_gap":1,"speed_to_revenue":5,"sales_complexity":2,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_OPEFF","capability_fit":5,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":4,"recurrence":2,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_BSYS","capability_fit":4,"credibility_gap":2,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":2,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_PMOAS","capability_fit":3,"credibility_gap":3,"speed_to_revenue":3,"sales_complexity":3,"income_potential":3,"recurrence":4,"avoid":false},{"archetype":"ARCH_OPS","model":"BM_FCFO","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":4,"recurrence":4,"avoid":true},{"archetype":"ARCH_OPS","model":"BM_CAAS","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":3,"recurrence":4,"avoid":true},{"archetype":"ARCH_OPS","model":"BM_FDD","capability_fit":1,"credibility_gap":5,"speed_to_revenue":1,"sales_complexity":5,"income_potential":4,"recurrence":2,"avoid":true}];

const BUSINESS_MODELS: any[] = [];

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
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  let reportId: string | null = null;

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
    reportId = report.id;

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
    const p1System = `You are the intelligence engine for Solo, a product helping mid-career professionals find a realistic Plan B. Analyse the user's background and produce structured solo business recommendations.

You have access to the following data:

ARCHETYPES (classify the user into one of these):
${JSON.stringify(ARCHETYPES)}

BUSINESS MODELS (score and recommend from these):
${JSON.stringify(BUSINESS_MODELS)}

MAPPING TABLE (use these scores for archetype-model combinations):
${JSON.stringify(MAPPING)}

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

    const p1User = `USER ANSWERS:\n${formattedAnswers}`;

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

    const p3User = `RECOMMENDED MODEL & REPORT:\n${JSON.stringify(finalReport)}\n\nQ11 (Network): ${answers["11"]}\nQ12 (Employment): ${answers["12"]}`;

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

    // Update report status to error if we have a reportId
    if (reportId) {
      await adminClient
        .from("reports")
        .update({
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", reportId);
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
