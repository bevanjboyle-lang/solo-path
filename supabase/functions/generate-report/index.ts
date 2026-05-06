// generate-report v45.2 — F68 cleanup (kill salary fields + first_steps + Q5→Q13 fix)
// 2026-05-05  (v45 initial; v45.1 tuning pass: caution_note + buffer rule + retries 1→2;
// v45.2 F68 cleanup: removed current_salary_gbp + salary_replacement_analysis +
// first_steps from schema/prompt/validator; fixed Q5(network)→Q13(network) in P1:385;
// extended USER PROFILE SCHEMA + EXAMPLE TEST INPUT to Q1–Q15)
//
// Replaces v44.1's inline simplified prompt with the canonical
// prompts/prompt-1-core-report.md content (embedded as P1_SYSTEM_PROMPT_TEMPLATE
// in the local p1-system-prompt.ts file) + strict JSON schema enforcement
// (REPORT_SCHEMA from report-schema.ts) + runtime narrative validator with
// single retry on hard failures (validateReport / buildRetryMessage from
// report-validator.ts).
//
// Per ADR-019 + project memory `project_canonical_ironclad_locked.md`:
// the canonical files in prompts/ are the locked source of truth. The local
// copies in this directory mirror them and must stay in sync (ADR-015).
//
// Preserved from v44.1:
//   - Anon-first ADR-013 (csid extraction; auth optional)
//   - Async-with-waitUntil pattern (entry returns immediately)
//   - KB-from-DB pattern (kb_archetypes / kb_models / kb_mapping tables)
//   - Skeleton-row-then-update pattern
//   - Rate limit (3 reports / 24h per user_id OR per client_session_id)
//   - Status flow (generating → teaser_ready)
//   - CORS allow-headers including x-client-session-id (F65 fix)
//
// Changed from v44.1:
//   - Inline simplified prompt → canonical P1_SYSTEM_PROMPT_TEMPLATE (~440 lines)
//   - response_format: json_object → response_format: json_schema (strict mode)
//   - 8–10 options → exactly 10 (canonical 10/5 product rule)
//   - archetype.name → archetype.primary (matches sample-report component shape)
//   - per-option day_rate_band string → pricing object
//   - per-option new fields: fit_tags, source, what_they_are_buying,
//                            difficulty_rating, caution_note
//   - transferable_skills[].demand_level → market_demand
//   - recommended_selection: flat array → object { selected_ranks, rationale }
//   - hook_insight gains first_move sub-object (drives provisional_first_move)
//   - validateReport runtime check + 1 retry with diff-style correction hints
//   - parsed_top_keys + validation result logged to user_context_profile.ironclad

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";
import { REPORT_SCHEMA, type SoloCoreReport } from "./report-schema.ts";
import {
  validateReport,
  buildRetryMessage,
  type ValidationContext,
  type ValidationResult,
} from "./report-validator.ts";
import {
  P1_SYSTEM_PROMPT_TEMPLATE,
} from "./p1-system-prompt.ts";

const FUNCTION_VERSION = "v45.1-ironclad-tuning";
const MODEL_TIER1 = "gpt-5.4";
const MODEL_TIER3 = "gpt-5.4-nano";
// ADR-019 (amended 2026-05-05 after first live smoke): retry budget bumped
// from 1 → 2 (giving 3 total attempts) after gpt-5.4 was observed landing
// 1-3 words under floor on 2/10 narrative cards. Combined with the buffer
// rule in buildRetryMessage and the canonical prompt's "exceed by 5+" rule,
// this gives the loop a realistic chance of converging on borderline misses.
const MAX_P1_VALIDATOR_RETRIES = 2;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Domain → kb_archetypes.category mapping (preserved from v44.1).
// Keep both keys "Finance" and "Finance & Accounting" so P0b can return either.
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

// =====================================================================
// Auth helpers — preserved from v44.1, ADR-014 ES256 compatible
// =====================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getUserIdFromJwt(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const { data, error } = await authClient.auth.getClaims(token);
    if (error) return null;
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractClientSessionId(
  req: Request,
  body: Record<string, unknown>,
): string | null {
  const raw =
    (typeof body.clientSessionId === "string" && body.clientSessionId) ||
    (typeof body.client_session_id === "string" && body.client_session_id) ||
    req.headers.get("x-client-session-id") ||
    req.headers.get("X-Client-Session-Id") ||
    "";
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !UUID_RE.test(trimmed)) return null;
  return trimmed;
}

// =====================================================================
// Input shaping — preserved from v44.1
// =====================================================================

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

type Qd = ReturnType<typeof mapAnswersToQuestionnaireData>;

function deriveFlags(qd: Qd) {
  const urgency = (qd.q9_income_urgency || "").toLowerCase();
  const confidence = (qd.q10_independence_confidence || "").toLowerCase();
  const status = (qd.q14_employment_status || "").toLowerCase();
  const q12 = (qd.q12_independent_experience || "").toLowerCase();
  return {
    needs_fast_revenue:
      urgency.includes("urgent") ||
      urgency.includes("soon") ||
      urgency.includes("immediate") ||
      status.includes("unemployed") ||
      status.includes("redundan"),
    has_independent_exp:
      q12.length > 30 &&
      (q12.includes("consult") ||
        q12.includes("freelan") ||
        q12.includes("contract") ||
        q12.includes("advis") ||
        q12.includes("client")),
    high_confidence:
      confidence.includes("high") ||
      confidence.includes("very") ||
      confidence.includes("confident"),
    low_confidence:
      confidence.includes("low") ||
      confidence.includes("not sure") ||
      confidence.includes("nervous"),
  };
}

function parseJ(s: string): Record<string, unknown> {
  try {
    const cleaned = s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

// =====================================================================
// Prompt building — substitutes the canonical P1 template variables
// =====================================================================

function buildP1SystemPrompt(args: {
  archetypesText: string;
  modelsText: string;
  mappingText: string;
}): string {
  // The canonical P1_SYSTEM_PROMPT_TEMPLATE uses {{ARCHETYPES}},
  // {{BUSINESS_MODELS}}, {{MAPPING_TABLE}}. {{USER_PROFILE}} is substituted
  // in the user-message builder, not the system prompt.
  return P1_SYSTEM_PROMPT_TEMPLATE
    .replace("{{ARCHETYPES}}", args.archetypesText)
    .replace("{{BUSINESS_MODELS}}", args.modelsText)
    .replace("{{MAPPING_TABLE}}", args.mappingText);
}

function buildP1UserMessage(qd: Qd, cvExtract: Record<string, unknown> | undefined): string {
  // Canonical user message wraps the structured profile JSON. We construct
  // it directly rather than running handlebars over the template — same shape,
  // simpler runtime.
  const userProfile = {
    q1_job_title: qd.q1_job_title,
    q2_years_experience: qd.q2_years_experience,
    q3a_sector: qd.q3a_sector,
    q3b_employer_org_type: qd.q3b_employer_org_type,
    q4_work_type: qd.q4_work_type,
    q5_seniority: qd.q5_seniority,
    q6_specific_achievement: qd.q6_specific_achievement,
    q7_informal_advisory: qd.q7_informal_advisory,
    q8_peer_perception: qd.q8_peer_perception,
    q9_income_urgency: qd.q9_income_urgency,
    q10_independence_confidence: qd.q10_independence_confidence,
    q11_sector_client_context: qd.q11_sector_client_context,
    q12_independent_experience: qd.q12_independent_experience,
    q13_network: qd.q13_network,
    q14_employment_status: qd.q14_employment_status,
    q15_location: qd.q15_location,
  };

  let msg =
    "Here is the user's profile based on their questionnaire responses:\n\n" +
    JSON.stringify(userProfile, null, 2);

  if (cvExtract && Object.keys(cvExtract).length > 0) {
    const cv = cvExtract as Record<string, unknown>;
    const fmt = (v: unknown): string =>
      v === null || v === undefined
        ? "(not provided)"
        : typeof v === "string"
        ? v.slice(0, 800)
        : JSON.stringify(v).slice(0, 800);
    msg +=
      "\n\nCV CONTEXT (extracted from uploaded CV — use as supplementary " +
      "evidence to add specificity. If any cv_extract field conflicts with " +
      "the questionnaire answers above, the questionnaire answers take " +
      "precedence):\n" +
      `Career highlights: ${fmt(cv.career_highlights)}\n` +
      `Qualifications: ${fmt(cv.qualifications)}\n` +
      `All sectors worked in across career: ${fmt(cv.sectors_worked_in)}\n` +
      `Skills and tools mentioned: ${fmt(cv.skills_mentioned)}\n` +
      `Independent experience history: ${fmt(cv.independent_experience)}\n` +
      `CV parse confidence: ${fmt(cv.confidence_score)}/100`;
  }

  msg +=
    "\n\nPlease analyse this profile and produce the Solo Plan B report " +
    "following the instructions in your system prompt.";

  return msg;
}

// =====================================================================
// Entry handler — preserved pattern from v44.1
// =====================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          response_text: "Unauthorized — pass either an authed JWT or x-client-session-id.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit: 3 reports per 24h per identity (user_id preferred, csid otherwise).
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rateQuery = supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gt("created_at", windowStart);
    const { count: recentCount, error: rateCheckError } = userId
      ? await rateQuery.eq("user_id", userId)
      : await rateQuery.eq("client_session_id", clientSessionId!);

    if (!rateCheckError && (recentCount ?? 0) >= 3) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          response_text: "3 reports in 24h limit. Try tomorrow.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const questionnaireData = mapAnswersToQuestionnaireData(rawAnswers);

    // Skeleton row inserted up front so polling has something to look at.
    const { data: skeletonReport, error: skeletonError } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        client_session_id: clientSessionId,
        answers: rawAnswers || null,
        status: "generating",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (skeletonError || !skeletonReport) {
      return new Response(
        JSON.stringify({
          error: "DB write failed",
          response_text: "Could not start report generation.",
          details: skeletonError?.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reportId = skeletonReport.id as string;
    console.log(`${FUNCTION_VERSION} skeleton inserted: ${reportId} | user=${userId} csid=${clientSessionId}`);

    // Background: heavy lifting runs after we return 200.
    // @ts-expect-error EdgeRuntime is provided by Supabase Deno deploy runtime
    EdgeRuntime.waitUntil(
      generateReportInBackground({
        reportId,
        userId,
        clientSessionId,
        cvExtract,
        questionnaireData,
        t0,
      }),
    );

    return new Response(
      JSON.stringify({
        reportId,
        report_id: reportId,
        status: "generating",
        response_text: "Report generation started. Poll reports.status by report_id.",
        version: FUNCTION_VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(`${FUNCTION_VERSION} entry error:`, err);
    return new Response(
      JSON.stringify({
        error: String((err as Error)?.message ?? err),
        response_text: "Failed to start report generation.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// =====================================================================
// Background generation — the heavy lifting
// =====================================================================

interface BgArgs {
  reportId: string;
  userId: string | null;
  clientSessionId: string | null;
  cvExtract: Record<string, unknown> | undefined;
  questionnaireData: Qd;
  t0: number;
}

async function generateReportInBackground(args: BgArgs) {
  const { reportId, userId, clientSessionId, cvExtract, questionnaireData, t0 } = args;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

  try {
    const flags = deriveFlags(questionnaireData);
    console.log(`bg ${reportId}: domain classifier (P0b) starting`);

    // ---- Step 1: P0b domain classifier ------------------------------
    const dcr = await openai.chat.completions.create({
      model: MODEL_TIER3,
      temperature: 0.1,
      max_completion_tokens: 250,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Classify primary domain from this list:\n\n' +
            'Finance | Finance & Accounting | Risk & Governance | Strategy & Advisory | ' +
            'Change & Delivery | Operations & Efficiency | Tech & Digital | HR & People | ' +
            'Sales & Commercial | Legal | Marketing & Communications | Public Sector & Policy | ' +
            'Procurement & Supply Chain | Property & Real Estate | ESG & Sustainability | ' +
            'Healthcare & Life Sciences | Customer Experience & Service Design\n\n' +
            'Return JSON only: { "primary_domain": string, "secondary_domain": string|null, ' +
            '"archetype_summary": string, "key_signals": string[] }',
        },
        {
          role: "user",
          content: JSON.stringify({
            job_title: questionnaireData.q1_job_title,
            years: questionnaireData.q2_years_experience,
            sector: questionnaireData.q3a_sector,
            employer_context: questionnaireData.q3b_employer_org_type,
            seniority: questionnaireData.q5_seniority,
            achievement: questionnaireData.q6_specific_achievement?.slice(0, 300),
            peer_perception: questionnaireData.q8_peer_perception?.slice(0, 200),
          }),
        },
      ],
    });

    const domainClassifier = parseJ(dcr.choices[0].message.content || "{}");
    const primaryDomain = (domainClassifier.primary_domain as string) || "Strategy & Advisory";
    const secondaryDomain = (domainClassifier.secondary_domain as string) || null;
    console.log(`bg ${reportId}: domain=${primaryDomain}/${secondaryDomain}`);

    // ---- Step 2: KB filter ------------------------------------------
    const primaryCategories = DOMAIN_TO_CATEGORIES[primaryDomain] || [primaryDomain];
    const secondaryCategories = secondaryDomain
      ? DOMAIN_TO_CATEGORIES[secondaryDomain] || [secondaryDomain]
      : [];
    const allCategories = Array.from(new Set([...primaryCategories, ...secondaryCategories]));

    const { data: archetypeRows } = await supabase
      .from("kb_archetypes")
      .select("id, name, category, core_identity, day_rate, retainer_monthly, time_to_revenue_bias")
      .in("category", allCategories);
    const archetypeIds = (archetypeRows || []).map((a) => a.id as string);

    const { data: mappingRows } = await supabase
      .from("kb_mapping")
      .select("archetype, model, cap_fit, cred_gap, speed, sales_complexity, income, recurrence")
      .in("archetype", archetypeIds)
      .eq("avoid", false);
    const modelIds = Array.from(new Set((mappingRows || []).map((r) => r.model as string)));

    const { data: modelRows } = await supabase
      .from("kb_models")
      .select(
        "id, name, commercial_model, pricing_range, time_to_revenue, difficulty, target_buyer, recurrence, primary_move_type, structural_warmth",
      )
      .in("id", modelIds);

    // ---- Step 3: format KB injection text ---------------------------
    const archetypesText = (archetypeRows || [])
      .map(
        (a) =>
          `[${a.id}] ${a.name} (${a.category})\n` +
          `${String(a.core_identity || "").slice(0, 300)}\n` +
          `Rates: ${a.day_rate} | ${a.retainer_monthly} | Speed: ${a.time_to_revenue_bias}`,
      )
      .join("\n\n");

    const modelsText = (modelRows || [])
      .map((m) => {
        let pricing = "";
        try {
          const p = typeof m.pricing_range === "string"
            ? JSON.parse(m.pricing_range)
            : m.pricing_range;
          pricing = `£${(p.low || 0).toLocaleString()}–£${(p.high || 0).toLocaleString()}/${p.per || "project"}`;
        } catch {
          pricing = String(m.pricing_range || "");
        }
        return (
          `[${m.id}] ${m.name}\n` +
          `Commercial: ${m.commercial_model} | ${pricing}\n` +
          `TTR: ${m.time_to_revenue} | Diff: ${m.difficulty} | Rec: ${m.recurrence}\n` +
          `Buyer: ${m.target_buyer}\n` +
          `primary_move_type: ${m.primary_move_type || "direct"} | structural_warmth: ${
            m.structural_warmth ? "true" : "false"
          }`
        );
      })
      .join("\n\n");

    const mappingText = (mappingRows || [])
      .map(
        (r) =>
          `${r.archetype}|${r.model}|cap_fit:${r.cap_fit}|cred_gap:${r.cred_gap}|` +
          `speed:${r.speed}|sales:${r.sales_complexity}|income:${r.income}|rec:${r.recurrence}`,
      )
      .join("\n");

    // ---- Step 4: build P1 prompts -----------------------------------
    const systemPrompt = buildP1SystemPrompt({ archetypesText, modelsText, mappingText });
    const userMessage = buildP1UserMessage(questionnaireData, cvExtract);

    // Validator context — KB ids the prompt was allowed to use.
    const allowedBmIds = new Set<string>(
      (modelRows || []).map((m) => m.id as string),
    );
    const kbModelIndex = new Map<string, { primary_move_type: string; structural_warmth: boolean }>();
    for (const m of modelRows || []) {
      kbModelIndex.set(m.id as string, {
        primary_move_type: (m.primary_move_type as string) || "direct",
        structural_warmth: !!m.structural_warmth,
      });
    }
    const validationContext: ValidationContext = {
      allowed_business_model_ids: allowedBmIds,
      kb_model_index: kbModelIndex,
    };

    // ---- Step 5: call P1 with strict schema + validator + retry -----
    console.log(`bg ${reportId}: P1 (${MODEL_TIER1}) starting | kb_archetypes=${archetypeIds.length} kb_models=${modelRows?.length || 0}`);
    const p1Result = await callP1WithRetry({
      openai,
      systemPrompt,
      userMessage,
      validationContext,
      reportId,
    });

    const finalReport = p1Result.report;
    const validation = p1Result.validation;
    const optionCount = Array.isArray(finalReport?.options) ? finalReport!.options!.length : 0;
    console.log(
      `bg ${reportId}: P1 done | attempts=${p1Result.attempts} | options=${optionCount} | ` +
        `validation_passed=${validation.passed} | hard_failures=${validation.hard_failures.length} | ` +
        `overall_score=${validation.overall_score} | total_words=${validation.total_word_count}`,
    );
    if (!validation.passed) {
      console.warn(
        `bg ${reportId}: validation failed after ${p1Result.attempts} attempt(s): ` +
          validation.hard_failures.slice(0, 8).join(", "),
      );
    }

    // ---- Step 6: derive teaser-time companion fields ----------------
    // hook_insight contains a first_move sub-object per the canonical schema —
    // surface that as provisional_first_move (legacy column shape) for
    // PaymentSuccess + check-in flows.
    const hookInsight = (finalReport?.hook_insight ?? null) as
      | SoloCoreReport["hook_insight"]
      | null;
    const aiImpactSection = (finalReport?.ai_impact ?? null) as
      | SoloCoreReport["ai_impact"]
      | null;
    const recommendedSelection = (finalReport?.recommended_selection ?? null) as
      | SoloCoreReport["recommended_selection"]
      | null;

    const provisionalFirstMove = hookInsight?.first_move
      ? {
          action_text: hookInsight.first_move.action,
          why_first: hookInsight.first_move.target,
          draft_subject: hookInsight.first_move.draft_subject,
          draft_message: hookInsight.first_move.draft_body,
          follow_up_prompt: hookInsight.first_move.follow_up_prompt,
        }
      : null;

    // hook_insight column is text (legacy); store the paragraph there for
    // backwards compatibility. Full object is on core_report.hook_insight.
    const hookInsightText = hookInsight?.paragraph || JSON.stringify(hookInsight ?? {});

    const userContextProfile = {
      professional_position: {
        job_title: questionnaireData.q1_job_title,
        years_experience: questionnaireData.q2_years_experience,
        seniority: questionnaireData.q5_seniority,
        sector_primary: questionnaireData.q3a_sector,
        employer_context: questionnaireData.q3b_employer_org_type,
        work_type: questionnaireData.q4_work_type,
      },
      kb_injection: {
        primary_domain: primaryDomain,
        secondary_domain: secondaryDomain,
        archetype_ids: archetypeIds,
        archetype_count: archetypeIds.length,
        model_count: modelRows?.length || 0,
        mapping_rows: mappingRows?.length || 0,
      },
      derived_flags: flags,
      ironclad: {
        function_version: FUNCTION_VERSION,
        attempts: p1Result.attempts,
        validation_passed: validation.passed,
        overall_score: validation.overall_score,
        hard_failures: validation.hard_failures,
        soft_warnings: validation.soft_warnings,
        card_scores: validation.card_scores,
        total_word_count: validation.total_word_count,
        never_list_hits: validation.never_list_hits,
        raw_content_lengths: p1Result.rawContentLengths,
        parsed_top_keys: finalReport ? Object.keys(finalReport) : [],
      },
    };

    // ---- Step 7: write reports row ----------------------------------
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        core_report: finalReport,
        activation_plan: null,
        market_snapshot: null,
        market_snapshots: null,
        hook_insight: hookInsightText,
        ai_impact_section: aiImpactSection,
        user_context_profile: userContextProfile,
        recommended_selection: recommendedSelection,
        provisional_first_move: provisionalFirstMove,
        status: "teaser_ready",
      })
      .eq("id", reportId);

    if (updateError) {
      console.error(`bg ${reportId} update error:`, updateError);
      await supabase
        .from("reports")
        .update({ status: "failed", error: String(updateError.message ?? updateError) })
        .eq("id", reportId);
      return;
    }

    // ---- Step 8: log generation event -------------------------------
    const logUpdate = supabase
      .from("report_generation_log")
      .update({ report_id: reportId })
      .is("report_id", null);
    if (userId) await logUpdate.eq("user_id", userId);
    else if (clientSessionId) await logUpdate.eq("client_session_id", clientSessionId);

    console.log(`bg ${reportId} done | total=${Date.now() - t0}ms | validation_passed=${validation.passed}`);
  } catch (err) {
    console.error(`bg ${reportId} error:`, err);
    await supabase
      .from("reports")
      .update({
        status: "failed",
        error: String((err as Error)?.message ?? err),
      })
      .eq("id", reportId);
  }
}

// =====================================================================
// P1 call with strict schema + validator + retry
// =====================================================================

async function callP1WithRetry(args: {
  // deno-lint-ignore no-explicit-any
  openai: any;
  systemPrompt: string;
  userMessage: string;
  validationContext: ValidationContext;
  reportId: string;
}): Promise<{
  report: Partial<SoloCoreReport> | null;
  validation: ValidationResult;
  attempts: number;
  rawContentLengths: number[];
}> {
  const { openai, systemPrompt, userMessage, validationContext, reportId } = args;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
  const rawContentLengths: number[] = [];
  let lastReport: Partial<SoloCoreReport> | null = null;
  let lastValidation: ValidationResult = {
    passed: false,
    hard_failures: ["NO_ATTEMPT"],
    soft_warnings: [],
    card_scores: {},
    overall_score: 0,
    total_word_count: 0,
    never_list_hits: [],
    retry_prompt_hints: [],
  };

  const totalAttempts = 1 + MAX_P1_VALIDATOR_RETRIES;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const t = Date.now();
    const completion = await openai.chat.completions.create({
      model: MODEL_TIER1,
      max_completion_tokens: 24000,
      response_format: {
        type: "json_schema",
        json_schema: REPORT_SCHEMA,
      },
      messages,
    });

    const usage = completion.usage;
    const latency = Date.now() - t;
    const rawContent = completion.choices[0].message.content || "";
    rawContentLengths.push(rawContent.length);
    console.log(
      `bg ${reportId}: P1 attempt ${attempt}/${totalAttempts} | latency=${latency}ms | ` +
        `prompt=${usage?.prompt_tokens} completion=${usage?.completion_tokens} | content_len=${rawContent.length}`,
    );

    const parsed = parseJ(rawContent) as Partial<SoloCoreReport>;
    lastReport = parsed;

    // Run the narrative validator against the parsed JSON.
    const validation = validateReport(parsed, validationContext);
    lastValidation = validation;

    if (validation.passed) {
      console.log(`bg ${reportId}: P1 attempt ${attempt} passed validation (score=${validation.overall_score})`);
      return { report: parsed, validation, attempts: attempt, rawContentLengths };
    }

    if (attempt === totalAttempts) {
      console.warn(
        `bg ${reportId}: P1 attempt ${attempt} (final) failed validation; ` +
          `${validation.hard_failures.length} hard failures, writing best-effort.`,
      );
      break;
    }

    // Hard failures + retries available — feed corrections back.
    const retryMsg = buildRetryMessage(validation);
    console.log(
      `bg ${reportId}: P1 attempt ${attempt} failed validation (${validation.hard_failures.length} hard); ` +
        `retrying with ${validation.retry_prompt_hints.length} correction hints.`,
    );
    messages.push({ role: "assistant", content: rawContent });
    messages.push({ role: "user", content: retryMsg });
  }

  return {
    report: lastReport,
    validation: lastValidation,
    attempts: totalAttempts,
    rawContentLengths,
  };
}
