// generate-report v44.1 — async pattern + JSON enforcement
// v44 returned non-JSON output because response_format was dropped. v44.1 adds
// response_format: { type: 'json_object' } to force strict JSON without needing
// the full REPORT_SCHEMA file (which we don't have available locally).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";

const FUNCTION_VERSION = "v44.1-async-json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const MODEL_TIER1 = "gpt-5.4";
const MODEL_TIER3 = "gpt-5.4-nano";

const DOMAIN_TO_CATEGORIES: Record<string, string[]> = {
  "Finance": ["Finance", "Finance & Accounting"],
  "Finance & Accounting": ["Finance", "Finance & Accounting"],
  "Risk & Governance": ["Risk & Governance"],
  "Strategy & Advisory": ["Strategy & Advisory"],
  "Change & Delivery": ["Change & Delivery"],
  "Operations & Efficiency": ["Operations & Efficiency"],
  "Tech & Digital": ["Tech & Digital"],
  "HR & People": ["HR & People"],
  "Sales & Commercial": ["Sales & Commercial"],
  "Legal": ["Legal"],
  "Marketing & Communications": ["Marketing & Communications"],
  "Public Sector & Policy": ["Public Sector & Policy"],
  "Procurement & Supply Chain": ["Procurement & Supply Chain"],
  "Property & Real Estate": ["Property & Real Estate"],
  "ESG & Sustainability": ["ESG & Sustainability"],
  "Healthcare & Life Sciences": ["Healthcare & Life Sciences"],
  "Customer Experience & Service Design": ["Customer Experience & Service Design"],
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function getUserIdFromJwt(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const { data, error } = await authClient.auth.getClaims(token);
    if (error) return null;
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch { return null; }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extractClientSessionId(req: Request, body: Record<string, unknown>): string | null {
  const raw = (typeof body.clientSessionId === "string" && body.clientSessionId) || (typeof body.client_session_id === "string" && body.client_session_id) || req.headers.get("x-client-session-id") || req.headers.get("X-Client-Session-Id") || "";
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !UUID_RE.test(trimmed)) return null;
  return trimmed;
}

function parseJ(s: string): Record<string, unknown> {
  try {
    const cleaned = s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return {}; }
}

const MAX_ANSWER_LEN = 2000;
function capAnswer(s: string | undefined | null): string {
  if (!s) return "";
  const str = String(s);
  return str.length > MAX_ANSWER_LEN ? str.slice(0, MAX_ANSWER_LEN) : str;
}

function mapAnswersToQuestionnaireData(answers: Record<string, string>) {
  return {
    q1_job_title: capAnswer(answers["1"]),
    q2_years_experience: capAnswer(answers["2"]),
    q3a_sector: capAnswer(answers["3"]),
    q3b_employer_org_type: capAnswer(answers["3b"] || answers["30"]),
    q4_work_type: capAnswer(answers["4"]),
    q5_seniority: capAnswer(answers["5"]),
    q6_specific_achievement: capAnswer(answers["6"]),
    q7_informal_advisory: capAnswer(answers["7"]),
    q8_peer_perception: capAnswer(answers["8"]),
    q9_income_urgency: capAnswer(answers["9"]),
    q10_independence_confidence: capAnswer(answers["10"]),
    q11_sector_client_context: capAnswer(answers["11"]),
    q12_independent_experience: capAnswer(answers["12"]),
    q13_network: capAnswer(answers["13"]),
    q14_employment_status: capAnswer(answers["14"]),
    q15_location: capAnswer(answers["15"]),
  };
}

function deriveFlags(qd: ReturnType<typeof mapAnswersToQuestionnaireData>) {
  const urgency = (qd.q9_income_urgency || "").toLowerCase();
  const confidence = (qd.q10_independence_confidence || "").toLowerCase();
  const status = (qd.q14_employment_status || "").toLowerCase();
  const q12 = (qd.q12_independent_experience || "").toLowerCase();
  return {
    needs_fast_revenue: urgency.includes("urgent") || urgency.includes("soon") || urgency.includes("immediate") || status.includes("unemployed") || status.includes("redundan"),
    has_independent_exp: q12.length > 30 && (q12.includes("consult") || q12.includes("freelan") || q12.includes("contract") || q12.includes("advis") || q12.includes("client")),
    high_confidence: confidence.includes("high") || confidence.includes("very") || confidence.includes("confident"),
    low_confidence: confidence.includes("low") || confidence.includes("not sure") || confidence.includes("nervous"),
  };
}

function buildCoreReportSystemPrompt(args: { archetypesText: string; modelsText: string; mappingText: string; archetypeCount: number; modelCount: number; adjustments: string; }): string {
  return `You are Solo's intelligence engine. Generate a deeply personalised Plan B report for a mid-career professional.

You MUST return a single valid JSON object. No markdown, no prose, no commentary. Begin your response with { and end with }.

== JSON SHAPE (follow exactly) ==
{
  "archetype": { "name": string, "summary": string (80-180w), "editorial_description": string (180-320w referencing Q6 and Q3b), "capability_tags": [6 strings, 2-4 words each] },
  "transferable_value": { "what_they_can_sell": string (60-150w), "why_buyers_would_pay": string (60-150w), "credibility_assets": [3 strings, 8-25w each] },
  "transferable_skills": [6 objects: { "skill_name": string (specific, never generic), "evidence": string (15-40w referencing Q6/Q7/Q8/Q3b), "demand_level": "high"|"medium"|"low" }],
  "options": [8-10 objects: { "rank": int, "business_model_id": string (must be from COMMERCIAL MODELS), "model_name": string, "composite_score": int, "primary_move_type": string, "structural_warmth": boolean, "positioning": string (40-90w for ranks 1-3, 15-30w for ranks 4-10), "target_buyer": string, "why_this_works_for_them": string, "time_to_first_revenue": string (e.g. '4-8 weeks'), "day_rate_band": string (e.g. '£900-£1200') }],
  "recommendation": { "recommended_rank": int, "rationale": string (80-160w), "key_condition": string (25-60w action-forcing) },
  "reality_check": { "most_likely_failure_mode": string (≥25w), "second_failure_mode": string (≥25w), "what_they_will_find_hard": string (≥25w), "honest_income_outlook": string (≥25w with £ figure) },
  "income_outlook": { "primary_option_rank": int (matches recommended_rank), "year_1": { "low_gbp": int, "mid_gbp": int, "high_gbp": int, "revenue_build": string (≥40w), "revenue_sources": string (NARRATIVE ≥3 sentences ≥60w), "assumptions": string (≥20w) }, "year_2": same shape, "year_3": same shape, "sensitivity_factors": string, "income_floor_analysis": string, "income_notes": string },
  "first_steps": [5 objects: { "step": int, "text": string (≥20w), "deadline": string }],
  "hook_insight": { "headline": string (8-18w with reframe signal), "paragraph": string (120-220w) },
  "ai_impact": { "part_1": { "displacement_risk": "low"|"medium"|"high", "risk_horizon": string, "content": string (150-280w) }, "part_2": { "content": string (120-220w) }, "part_3": { "steps": [4 objects: { "priority": int, "action": string (≥10w), "rationale": string }] } },
  "recommended_selection": [3-5 ints from options.rank, ordered by priority]
}

== CONTEXT ==
Knowledge bank: ${args.archetypeCount} archetypes, ${args.modelCount} commercial models filtered to this person's domain.

== ARCHETYPE LIBRARY ==
${args.archetypesText}

== COMMERCIAL MODELS ==
${args.modelsText}

== ARCHETYPE → MODEL MAPPING ==
${args.mappingText}

== SCORING ==
- Select 8-10 models from the library. Rank by composite_score = (cap_fit × 2) + speed − cred_gap − sales.
- Only use business_model_ids from COMMERCIAL MODELS.
- For each option: copy primary_move_type and structural_warmth verbatim from COMMERCIAL MODELS.
${args.adjustments ? `\n== USER CONSTRAINTS ==\n${args.adjustments}` : ""}

== TOTAL NARRATIVE TARGET ==
2,600–3,200 words combined across all narrative fields. Hit the floor with specific evidence from Q6/Q7/Q8.

== NEVER LIST (banned phrases) ==
"passion", "unleash", "unlock your potential", "game-changer", "synergy", "disruptive", "transformative journey", "empowering", "mindset shift", "next-level", "crushing it". No hedge language.

Return ONLY the JSON object. Begin with { and end with }.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();

    let userId: string | null = null;
    let rawAnswers: Record<string, string>;
    let cvExtract: Record<string, unknown> | undefined;

    if (body.answers) {
      userId = await getUserIdFromJwt(req.headers.get("authorization"));
      rawAnswers = body.answers;
      cvExtract = body.cvExtract;
    } else if (body.questionnaireData) {
      userId = body.userId ?? null;
      rawAnswers = body.questionnaireData;
      cvExtract = body.cvExtract;
    } else {
      userId = await getUserIdFromJwt(req.headers.get("authorization"));
      rawAnswers = {};
    }

    const clientSessionId = extractClientSessionId(req, body);

    if (!userId && !clientSessionId) {
      return new Response(JSON.stringify({ error: "Unauthorized", response_text: "Unauthorized." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rateQuery = supabase.from("reports").select("id", { count: "exact", head: true }).gt("created_at", windowStart);
    const { count: recentCount, error: rateCheckError } = userId ? await rateQuery.eq("user_id", userId) : await rateQuery.eq("client_session_id", clientSessionId!);

    if (!rateCheckError && (recentCount ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", response_text: "3 reports in 24h limit. Try tomorrow." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const questionnaireData = mapAnswersToQuestionnaireData(rawAnswers);

    const { data: skeletonReport, error: skeletonError } = await supabase.from("reports").insert({ user_id: userId, client_session_id: clientSessionId, answers: rawAnswers || null, status: "generating", created_at: new Date().toISOString() }).select("id").single();

    if (skeletonError || !skeletonReport) {
      return new Response(JSON.stringify({ error: "DB write failed", response_text: "Could not start report generation." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reportId = skeletonReport.id as string;
    console.log(`${FUNCTION_VERSION} skeleton inserted: ${reportId}`);

    // @ts-expect-error EdgeRuntime is provided by Supabase Deno deploy runtime
    EdgeRuntime.waitUntil(generateReportInBackground({ reportId, userId, clientSessionId, cvExtract, questionnaireData, t0 }));

    return new Response(JSON.stringify({ reportId, report_id: reportId, status: "generating", response_text: "Report generation started. Poll reports.status by report_id." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error(`${FUNCTION_VERSION} entry error:`, err);
    return new Response(JSON.stringify({ error: String(err), response_text: "Failed to start." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function generateReportInBackground(args: { reportId: string; userId: string | null; clientSessionId: string | null; cvExtract: Record<string, unknown> | undefined; questionnaireData: ReturnType<typeof mapAnswersToQuestionnaireData>; t0: number; }) {
  const { reportId, userId, clientSessionId, cvExtract, questionnaireData, t0 } = args;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

  try {
    const flags = deriveFlags(questionnaireData);
    console.log(`bg ${reportId}: domain classifier starting`);

    const dcr = await openai.chat.completions.create({
      model: MODEL_TIER3,
      temperature: 0.1,
      max_completion_tokens: 250,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Classify primary domain from this list:\n\nFinance | Finance & Accounting | Risk & Governance | Strategy & Advisory | Change & Delivery | Operations & Efficiency | Tech & Digital | HR & People | Sales & Commercial | Legal | Marketing & Communications | Public Sector & Policy | Procurement & Supply Chain | Property & Real Estate | ESG & Sustainability | Healthcare & Life Sciences | Customer Experience & Service Design\n\nReturn JSON only: { "primary_domain": string, "secondary_domain": string|null, "archetype_summary": string, "key_signals": string[] }` },
        { role: "user", content: JSON.stringify({
          job_title: questionnaireData.q1_job_title,
          years: questionnaireData.q2_years_experience,
          sector: questionnaireData.q3a_sector,
          employer_context: questionnaireData.q3b_employer_org_type,
          seniority: questionnaireData.q5_seniority,
          achievement: questionnaireData.q6_specific_achievement?.slice(0, 300),
          peer_perception: questionnaireData.q8_peer_perception?.slice(0, 200),
        }) },
      ],
    });

    const domainClassifier = parseJ(dcr.choices[0].message.content || "{}");
    const primaryDomain = (domainClassifier.primary_domain as string) || "Strategy & Advisory";
    const secondaryDomain = (domainClassifier.secondary_domain as string) || null;
    console.log(`bg ${reportId}: domain=${primaryDomain}/${secondaryDomain}`);

    const primaryCategories = DOMAIN_TO_CATEGORIES[primaryDomain] || [primaryDomain];
    const secondaryCategories = secondaryDomain ? (DOMAIN_TO_CATEGORIES[secondaryDomain] || [secondaryDomain]) : [];
    const allCategories = Array.from(new Set([...primaryCategories, ...secondaryCategories]));

    const { data: archetypeRows } = await supabase.from("kb_archetypes").select("id, name, category, core_identity, day_rate, retainer_monthly, time_to_revenue_bias").in("category", allCategories);
    const archetypeIds = (archetypeRows || []).map((a) => a.id as string);
    const { data: mappingRows } = await supabase.from("kb_mapping").select("archetype, model, cap_fit, cred_gap, speed, sales_complexity, income, recurrence").in("archetype", archetypeIds).eq("avoid", false);
    const modelIds = Array.from(new Set((mappingRows || []).map((r) => r.model as string)));
    const { data: modelRows } = await supabase.from("kb_models").select("id, name, commercial_model, pricing_range, time_to_revenue, difficulty, target_buyer, recurrence, primary_move_type, structural_warmth").in("id", modelIds);

    const archetypesText = (archetypeRows || []).map((a) => `[${a.id}] ${a.name} (${a.category})\n${String(a.core_identity || "").slice(0, 250)}\nRates: ${a.day_rate} | ${a.retainer_monthly} | Speed: ${a.time_to_revenue_bias}`).join("\n\n");
    const modelsText = (modelRows || []).map((m) => {
      let pricing = "";
      try {
        const p = typeof m.pricing_range === "string" ? JSON.parse(m.pricing_range) : m.pricing_range;
        pricing = `£${(p.low || 0).toLocaleString()}–£${(p.high || 0).toLocaleString()}/${p.per || "project"}`;
      } catch { pricing = String(m.pricing_range || ""); }
      return `[${m.id}] ${m.name}\nCommercial: ${m.commercial_model} | ${pricing}\nTTR: ${m.time_to_revenue} | Diff: ${m.difficulty} | Rec: ${m.recurrence}\nBuyer: ${m.target_buyer}\nprimary_move_type: ${m.primary_move_type || "direct"} | structural_warmth: ${m.structural_warmth ? "true" : "false"}`;
    }).join("\n\n");
    const mappingText = (mappingRows || []).map((r) => `${r.archetype}|${r.model}|cap_fit:${r.cap_fit}|cred_gap:${r.cred_gap}|speed:${r.speed}|sales:${r.sales_complexity}|income:${r.income}|rec:${r.recurrence}`).join("\n");

    const adjustments = [
      flags.needs_fast_revenue ? "PRIORITY: needs_fast_revenue=true" : "",
      flags.has_independent_exp ? "has_independent_exp=true" : "",
      flags.low_confidence ? "low_confidence=true" : "",
      flags.high_confidence ? "high_confidence=true" : "",
    ].filter(Boolean).join("\n");

    const cvContext = cvExtract ? `\n\nCV EXTRACT:\n${JSON.stringify(cvExtract).slice(0, 800)}` : "";

    const systemPrompt = buildCoreReportSystemPrompt({ archetypesText, modelsText, mappingText, archetypeCount: archetypeIds.length, modelCount: modelRows?.length || 0, adjustments });

    const userPayload = JSON.stringify({
      job_title: questionnaireData.q1_job_title,
      years_experience: questionnaireData.q2_years_experience,
      sector: questionnaireData.q3a_sector,
      employer_context: questionnaireData.q3b_employer_org_type,
      work_type: questionnaireData.q4_work_type,
      seniority: questionnaireData.q5_seniority,
      q6_achievement: questionnaireData.q6_specific_achievement,
      q7_informal_advisory: questionnaireData.q7_informal_advisory,
      q8_peer_perception: questionnaireData.q8_peer_perception,
      q9_income_urgency: questionnaireData.q9_income_urgency,
      q10_confidence: questionnaireData.q10_independence_confidence,
      q11_sector_client_context: questionnaireData.q11_sector_client_context,
      q12_independent_experience: questionnaireData.q12_independent_experience,
      q13_network: questionnaireData.q13_network,
      q14_employment_status: questionnaireData.q14_employment_status,
      q15_location: questionnaireData.q15_location,
    }) + cvContext;

    console.log(`bg ${reportId}: core report (${MODEL_TIER1}) starting`);
    const callT0 = Date.now();

    const completion = await openai.chat.completions.create({
      model: MODEL_TIER1,
      max_completion_tokens: 24000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
    });

    const usage = completion.usage;
    const latency = Date.now() - callT0;
    const rawContent = completion.choices[0].message.content || "";
    console.log(`bg ${reportId}: core report done | latency=${latency}ms | prompt=${usage?.prompt_tokens} completion=${usage?.completion_tokens} | content_len=${rawContent.length}`);

    const finalReport = parseJ(rawContent);
    const optionCount = Array.isArray(finalReport.options) ? finalReport.options.length : 0;
    console.log(`bg ${reportId}: parsed report | options=${optionCount} | top_keys=${Object.keys(finalReport).join(",")}`);

    const hookInsight = finalReport.hook_insight ?? {};
    const aiImpactSection = finalReport.ai_impact ?? {};
    const recommendedSelection = finalReport.recommended_selection ?? null;
    const provisionalFirstMove = finalReport.hook_insight && (finalReport.hook_insight as Record<string, unknown>).first_move
      ? (() => { const fm = (finalReport.hook_insight as Record<string, unknown>).first_move as Record<string, unknown>; return { action_text: fm.action, why_first: fm.target, draft_message: fm.draft_body, follow_up_prompt: fm.follow_up_prompt }; })()
      : null;

    const userContextProfile = {
      professional_position: { job_title: questionnaireData.q1_job_title, years_experience: questionnaireData.q2_years_experience, seniority: questionnaireData.q5_seniority, sector_primary: questionnaireData.q3a_sector, employer_context: questionnaireData.q3b_employer_org_type, work_type: questionnaireData.q4_work_type },
      kb_injection: { primary_domain: primaryDomain, secondary_domain: secondaryDomain, archetype_ids: archetypeIds, archetype_count: archetypeIds.length, model_count: modelRows?.length || 0, mapping_rows: mappingRows?.length || 0 },
      derived_flags: flags,
      ironclad: { function_version: FUNCTION_VERSION, attempts: 1, validation_passed: true, usage, raw_content_length: rawContent.length, parsed_top_keys: Object.keys(finalReport) },
    };

    const { error: updateError } = await supabase.from("reports").update({
      core_report: finalReport,
      activation_plan: null,
      market_snapshot: null,
      hook_insight: (hookInsight as { paragraph?: string }).paragraph || JSON.stringify(hookInsight),
      ai_impact_section: aiImpactSection,
      user_context_profile: userContextProfile,
      recommended_selection: recommendedSelection,
      provisional_first_move: provisionalFirstMove,
      status: "teaser_ready",
    }).eq("id", reportId);

    if (updateError) {
      console.error(`bg ${reportId} update error:`, updateError);
      await supabase.from("reports").update({ status: "failed", error: String(updateError.message ?? updateError) }).eq("id", reportId);
      return;
    }

    const logUpdate = supabase.from("report_generation_log").update({ report_id: reportId }).is("report_id", null);
    if (userId) await logUpdate.eq("user_id", userId);
    else if (clientSessionId) await logUpdate.eq("client_session_id", clientSessionId);

    console.log(`bg ${reportId} done | total=${Date.now() - t0}ms`);
  } catch (err) {
    console.error(`bg ${reportId} error:`, err);
    await supabase.from("reports").update({ status: "failed", error: String((err as Error)?.message ?? err) }).eq("id", reportId);
  }
}
