// generate-report v43 — ADR-013 (2026-04-19): anonymous-first questionnaire.
//                        Accept anonymous submissions keyed by client_session_id (UUID from
//                        localStorage, round-tripped via body.clientSessionId or the
//                        X-Client-Session-Id request header). If no JWT and no userId in body
//                        but a client_session_id is present, insert the report with
//                        user_id=null and client_session_id=<uuid> — RLS allows the anon role
//                        to SELECT those rows via a matching X-Client-Session-Id request
//                        header (see migration adr_013_anonymous_first_schema).
//                        Rate limiting is now keyed on whichever identity is present
//                        (user_id OR client_session_id). report_generation_log carries both
//                        identity fields so the post-insert report_id link works for either
//                        path.
//                        Legacy authed path is byte-equivalent to v42 behaviour (a valid
//                        JWT or body.userId still works without any client_session_id).
// v42 baseline: F43 (2026-04-19) — edge function's verify_jwt gate is HS256-only and rejects
//                                  ES256 tokens (project rotated to asymmetric signing keys).
//                                  verify_jwt: false + in-app supabase.auth.getClaims(token)
//                                  for JWKS-based ES256 verification. supabase-js 2.49.1.
// v41 baseline: F12 (2026-04-18) — cap each free-text questionnaire answer at 2000 chars in
//                                  mapAnswersToQuestionnaireData.
// v40 baseline: P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4.
// v39 baseline: 2026-04-17 Audit P2 #16 — source-header reconciled with deploy counter.
// Earlier history:
//   - v22.6 (pre-reconciliation): Sprint 4 — rate limiting (max 3 report generations per user per 24h, 429).
//   - v22.5 and earlier: see decision log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4";
import { REPORT_SCHEMA, type SoloCoreReport } from "./report-schema.ts";
import {
  validateReport,
  buildRetryMessage,
  type ValidationContext,
  type ValidationResult,
} from "./report-validator.ts";

const FUNCTION_VERSION = "v43-adr013";
const MAX_RETRIES = 2;
const LOG_ONLY_MODE = (Deno.env.get("IRONCLAD_LOG_ONLY") ?? "false").toLowerCase() === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
const MODEL_TIER2 = "gpt-5.4-mini";   // Structured output, signal reading, advisory
const MODEL_TIER3 = "gpt-5.4-nano";   // Classification, extraction, low-temp structured tasks

// Suppress unused variable warning for MODEL_TIER2
void MODEL_TIER2;

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

// F43 (2026-04-19): JWT verification via supabase.auth.getClaims(token).
// getClaims() fetches the project's JWKS (/auth/v1/.well-known/jwks.json, 10 min cache) and
// verifies the signature cryptographically — works for both ES256 (asymmetric) and HS256
// (legacy) tokens. Requires verify_jwt: false at deploy time.
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
    if (error) {
      console.warn("getClaims rejected JWT:", error.message);
      return null;
    }
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch (e) {
    console.warn("getClaims threw:", (e as Error)?.message ?? String(e));
    return null;
  }
}

// ADR-013 (2026-04-19): extract anonymous client session id from body or header.
// Normalise to lowercase UUID string; return null if missing / malformed.
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

function parseJ(s: string): Record<string, unknown> {
  try {
    const cleaned = s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

// F12 fix (2026-04-18): cap each free-text answer at 2000 chars to guard against
// pathological paste inputs blowing token budget or derailing the P1 prompt.
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
    needs_fast_revenue:
      urgency.includes("urgent") || urgency.includes("soon") ||
      urgency.includes("immediate") || status.includes("unemployed") ||
      status.includes("redundan"),
    has_independent_exp:
      q12.length > 30 &&
      (q12.includes("consult") || q12.includes("freelan") ||
       q12.includes("contract") || q12.includes("advis") || q12.includes("client")),
    high_confidence:
      confidence.includes("high") || confidence.includes("very") || confidence.includes("confident"),
    low_confidence:
      confidence.includes("low") || confidence.includes("not sure") || confidence.includes("nervous"),
  };
}

function buildCoreReportSystemPrompt(args: {
  archetypesText: string;
  modelsText: string;
  mappingText: string;
  archetypeCount: number;
  modelCount: number;
  adjustments: string;
}): string {
  return `You are Solo's intelligence engine. Generate a deeply personalised Plan B report for a mid-career professional who wants to build independent income alongside or instead of employment.

Your output MUST conform to the solo_core_report JSON schema — the platform enforces this structurally. Every card is required. Do not omit any.

== TOTAL NARRATIVE TARGET (NON-NEGOTIABLE) ==
Combined word count across all narrative fields must be **2,600–3,200 words**. Reports below 2,400 words are REJECTED by the validator and regenerated. Hit the floor with specific evidence from the user's Q6/Q7/Q8 answers, named buyer archetypes, and concrete GBP numbers. The Okafor gold-standard sample is ~3,000 words.

You have access to a curated knowledge bank of ${args.archetypeCount} professional archetypes and ${args.modelCount} commercial models, filtered to this person's domain.

== ARCHETYPE LIBRARY ==
${args.archetypesText}

== COMMERCIAL MODELS ==
${args.modelsText}

== ARCHETYPE → MODEL MAPPING ==
(Scores 1-5: cap_fit=capability fit | cred_gap=credibility gap | speed=speed to first revenue | sales=sales complexity | income=income potential | rec=recurrence)
${args.mappingText}

== SCORING ==
- Select 8-10 models from the library above.
- Rank by composite_score = (cap_fit × 2) + speed − cred_gap − sales; output the score on each option.
- Only use business_model_ids that appear in COMMERCIAL MODELS.
${args.adjustments ? `\n== USER CONSTRAINTS ==\n${args.adjustments}` : ""}

== MOVE METADATA — PASS THROUGH EXACTLY ==
Each model in COMMERCIAL MODELS has primary_move_type and structural_warmth. Copy them verbatim into each option.

== MANDATORY WORD-COUNT FLOORS (every card is graded; under-length = automatic rejection) ==
- archetype.summary: 80–180 words, ≥3 sentences
- archetype.editorial_description: 180–320 words, ≥2 paragraphs, references the user's Q6 achievement and Q3b employer context
- archetype.capability_tags: exactly 6 tags, each 2–4 words, never generic
- transferable_value.what_they_can_sell: 60–150 words naming a specific service
- transferable_value.why_buyers_would_pay: 60–150 words naming a specific buyer archetype or trigger moment
- transferable_value.credibility_assets: exactly 3, each 8–25 words referencing user evidence
- transferable_skills: EXACTLY 6 items, ranked strength descending, NEVER generic skill names
  - each skill evidence 15–40 words referencing Q6/Q7/Q8/Q3b or CV
- options (8–10): Rank 1–3 get 40–90-word positioning + 25–60-word target_buyer + 40–90-word why_this_works_for_them
- options.time_to_first_revenue: real week/month ranges like "4–8 weeks"
- recommendation.rationale: 80–160 words, ≥3 sentences, references archetype + seniority + (Q9 or Q10)
- recommendation.key_condition: 25–60 words, specific action-forcing condition
- reality_check: each of the four fields ≥25 words; honest_income_outlook MUST contain an actual GBP figure
- income_outlook: year_1/2/3 each with low/mid/high GBP numbers (non-decreasing mids), ≥40-word revenue_build, ≥20-word assumptions; salary_replacement_analysis ≥50 words; sensitivity_factors ≥40 words; income_floor_analysis ≥30 words; income_notes ≥40 words
- income_outlook.year_N.revenue_sources: this is a NARRATIVE field, not an enumeration. For EACH year, write a 3+ sentence paragraph (minimum 60 words) that names every revenue stream, gives the cadence of each (e.g. "monthly retainer", "fortnightly half-day workshop", "one-off project fee landing roughly twice a quarter"), and the approximate contribution of each stream to that year's mid-case GBP figure. Do NOT use bullet lists. Do NOT just list stream names. The reader must be able to picture the actual flow of money across the year.
- first_steps: EXACTLY 5 items, each ≥20 words; first_steps[0] MUST include an explicit time deadline AND reference Q6 or Q7
- hook_insight.headline: 8–18 words with a reframe signal
- hook_insight.paragraph: 120–220 words
- ai_impact.part_1: MUST include displacement_risk AND risk_horizon AND 150–280-word content
- ai_impact.part_2: 120–220-word content
- ai_impact.part_3.steps: EXACTLY 4 steps, each with priority/action/rationale; actions ≥10 words

== CROSS-CARD RULES ==
- income_outlook.primary_option_rank MUST equal recommendation.recommended_rank
- income_outlook.year_1.mid_gbp should agree with reality_check.honest_income_outlook (±20%)

== NEVER LIST — BANNED LANGUAGE ==
Do not use: "passion", "passionate", "unleash", "unlock your potential", "game-changer", "synergy", "disruptive", "transformative journey", "empowering", "mindset shift", "next-level", "crushing it". No hedge language in recommendation.

Return a JSON object matching the solo_core_report schema exactly. No markdown, no commentary.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const t0 = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

  try {
    const body = await req.json();

    // ── Identity resolution (ADR-013) ────────────────────────────────────────────
    // Three valid cases: (a) authed — JWT or body.userId present, (b) anon —
    // clientSessionId present, (c) both — authed wins for DB writes, client session
    // still recorded. At least one MUST be present.
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
          response_text: "Unauthorized: no user or client_session_id supplied.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Rate limiting: max 3 report generations per identity per 24 hours ─────────
    // Keyed on userId if present (authed path, unchanged semantics from v42), else
    // on clientSessionId (anon path).
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const rateQuery = supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gt("created_at", windowStart);
    const { count: recentCount, error: rateCheckError } = userId
      ? await rateQuery.eq("user_id", userId)
      : await rateQuery.eq("client_session_id", clientSessionId!);

    if (!rateCheckError && (recentCount ?? 0) >= 3) {
      const who = userId ? `user ${userId}` : `client_session ${clientSessionId}`;
      console.warn(`Rate limit: ${who} has ${recentCount} reports in last 24h`);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          response_text: "You've generated 3 reports in the last 24 hours. Please try again tomorrow.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ────────────────────────────────────────────────────────────────────────────

    const questionnaireData = mapAnswersToQuestionnaireData(rawAnswers);
    const flags = deriveFlags(questionnaireData);

    // Log metadata only — no questionnaire content
    console.log(`generate-report ${FUNCTION_VERSION} — ADR-013 anon-accept | log_only=${LOG_ONLY_MODE}`);
    console.log(
      `identity: userId=${userId ?? "null"} clientSessionId=${clientSessionId ?? "null"} | ` +
      `sector: ${questionnaireData.q3a_sector} | seniority: ${questionnaireData.q5_seniority}`
    );

    // P0b — domain classifier (MODEL_TIER3)
    const domainClassifierResponse = await openai.chat.completions.create({
      model: MODEL_TIER3,
      temperature: 0.1,
      max_completion_tokens: 250,
      messages: [
        {
          role: "system",
          content: `You are a domain classifier for a professional advisory platform.\nClassify the professional's primary domain from the exact list below:\n\nFinance | Finance & Accounting | Risk & Governance | Strategy & Advisory | Change & Delivery | Operations & Efficiency | Tech & Digital | HR & People | Sales & Commercial | Legal | Marketing & Communications | Public Sector & Policy | Procurement & Supply Chain | Property & Real Estate | ESG & Sustainability | Healthcare & Life Sciences | Customer Experience & Service Design\n\nReturn JSON only, no markdown:\n{ "primary_domain": string, "secondary_domain": string|null, "archetype_summary": string, "key_signals": string[] }`,
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

    const domainClassifier = parseJ(
      domainClassifierResponse.choices[0].message.content || "{}"
    );
    console.log("Domain classifier result:", JSON.stringify(domainClassifier));

    const primaryDomain = (domainClassifier.primary_domain as string) || "Strategy & Advisory";
    const secondaryDomain = (domainClassifier.secondary_domain as string) || null;

    const primaryCategories = DOMAIN_TO_CATEGORIES[primaryDomain] || [primaryDomain];
    const secondaryCategories = secondaryDomain
      ? (DOMAIN_TO_CATEGORIES[secondaryDomain] || [secondaryDomain])
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
      .select("id, name, commercial_model, pricing_range, time_to_revenue, difficulty, target_buyer, recurrence, primary_move_type, structural_warmth")
      .in("id", modelIds);

    const allowedBusinessModelIds = new Set<string>((modelRows || []).map((m) => m.id as string));
    const kbModelIndex = new Map<string, { primary_move_type: string; structural_warmth: boolean }>();
    (modelRows || []).forEach((m) => {
      kbModelIndex.set(m.id as string, {
        primary_move_type: (m.primary_move_type as string) || "direct",
        structural_warmth: Boolean(m.structural_warmth),
      });
    });

    const archetypesText = (archetypeRows || []).map((a) =>
      `[${a.id}] ${a.name} (${a.category})\n${String(a.core_identity || "").slice(0, 250)}\nRates: ${a.day_rate} | ${a.retainer_monthly} | Speed bias: ${a.time_to_revenue_bias}`
    ).join("\n\n");

    const modelsText = (modelRows || []).map((m) => {
      let pricing = "";
      try {
        const p = typeof m.pricing_range === "string" ? JSON.parse(m.pricing_range) : m.pricing_range;
        pricing = `£${(p.low || 0).toLocaleString()}–£${(p.high || 0).toLocaleString()}/${p.per || "project"}`;
      } catch { pricing = String(m.pricing_range || ""); }
      return `[${m.id}] ${m.name}\nCommercial: ${m.commercial_model} | ${pricing}\nTime to revenue: ${m.time_to_revenue} | Difficulty: ${m.difficulty} | Recurrence: ${m.recurrence}\nTarget buyer: ${m.target_buyer}\nprimary_move_type: ${m.primary_move_type || "direct"} | structural_warmth: ${m.structural_warmth ? "true" : "false"}`;
    }).join("\n\n");

    const mappingText = (mappingRows || []).map((r) =>
      `${r.archetype}|${r.model}|cap_fit:${r.cap_fit}|cred_gap:${r.cred_gap}|speed:${r.speed}|sales:${r.sales_complexity}|income:${r.income}|rec:${r.recurrence}`
    ).join("\n");

    const adjustments = [
      flags.needs_fast_revenue ? "PRIORITY: needs_fast_revenue=true — weight speed heavily" : "",
      flags.has_independent_exp ? "has_independent_exp=true — credibility gap is lower" : "",
      flags.low_confidence ? "low_confidence=true — favour easier entry points" : "",
      flags.high_confidence ? "high_confidence=true — can recommend ambitious options" : "",
    ].filter(Boolean).join("\n");

    const cvContext = cvExtract
      ? `\n\nCV EXTRACT (supplement questionnaire answers):\n${JSON.stringify(cvExtract).slice(0, 800)}`
      : "";

    const systemPrompt = buildCoreReportSystemPrompt({
      archetypesText,
      modelsText,
      mappingText,
      archetypeCount: archetypeIds.length,
      modelCount: modelRows?.length || 0,
      adjustments,
    });

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

    const validationContext: ValidationContext = {
      allowed_business_model_ids: allowedBusinessModelIds,
      kb_model_index: kbModelIndex,
    };

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ];

    let finalReport: Partial<SoloCoreReport> = {};
    let lastValidation: ValidationResult | null = null;
    let attempt = 0;
    const totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // P1 — core report generation (MODEL_TIER1)
    while (attempt <= MAX_RETRIES) {
      attempt += 1;
      const callT0 = Date.now();
      const completion = await openai.chat.completions.create({
        model: MODEL_TIER1,
        max_completion_tokens: 24000,
        response_format: {
          type: "json_schema",
          json_schema: REPORT_SCHEMA as unknown as Record<string, unknown>,
        },
        messages,
      } as unknown as Parameters<typeof openai.chat.completions.create>[0]);

      const usage = completion.usage;
      if (usage) {
        totalUsage.prompt_tokens += usage.prompt_tokens ?? 0;
        totalUsage.completion_tokens += usage.completion_tokens ?? 0;
        totalUsage.total_tokens += usage.total_tokens ?? 0;
      }

      const parsed = parseJ(completion.choices[0].message.content || "{}") as Partial<SoloCoreReport>;
      finalReport = parsed;

      const validation = validateReport(parsed, validationContext);
      lastValidation = validation;
      const callLatencyMs = Date.now() - callT0;

      console.log(
        `Attempt ${attempt}: passed=${validation.passed} ` +
        `overall=${validation.overall_score} ` +
        `hard=${validation.hard_failures.length} ` +
        `soft=${validation.soft_warnings.length} ` +
        `words=${validation.total_word_count} ` +
        `latency=${callLatencyMs}ms`
      );
      if (validation.hard_failures.length > 0) {
        console.log(`Hard failures: ${validation.hard_failures.slice(0, 10).join(", ")}`);
      }

      await supabase.from("report_generation_log").insert({
        user_id: userId,
        client_session_id: clientSessionId,
        report_id: null,
        function_version: FUNCTION_VERSION,
        attempt,
        passed: validation.passed,
        overall_score: validation.overall_score,
        card_scores: validation.card_scores,
        hard_failures: validation.hard_failures,
        soft_warnings: validation.soft_warnings,
        never_list_hits: validation.never_list_hits,
        total_word_count: validation.total_word_count,
        retry_count: attempt - 1,
        log_only_mode: LOG_ONLY_MODE,
        openai_model: MODEL_TIER1,
        openai_usage: usage ?? null,
        latency_ms: callLatencyMs,
      });

      if (validation.passed) break;
      if (LOG_ONLY_MODE) break;
      if (attempt > MAX_RETRIES) break;

      const retryMsg = buildRetryMessage(validation);
      messages.push({
        role: "assistant",
        content: completion.choices[0].message.content || "{}",
      });
      messages.push({ role: "user", content: retryMsg });
    }

    console.log(
      `Final: passed=${lastValidation?.passed} ` +
      `attempts=${attempt} ` +
      `prompt_tokens=${totalUsage.prompt_tokens} ` +
      `completion_tokens=${totalUsage.completion_tokens}`
    );

    const hookInsight = finalReport.hook_insight ?? {};
    const aiImpactSection = finalReport.ai_impact ?? {};
    const recommendedSelection = finalReport.recommended_selection ?? null;
    const provisionalFirstMove = finalReport.hook_insight?.first_move
      ? {
          action_text: finalReport.hook_insight.first_move.action,
          why_first: finalReport.hook_insight.first_move.target,
          draft_message: finalReport.hook_insight.first_move.draft_body,
          follow_up_prompt: finalReport.hook_insight.first_move.follow_up_prompt,
        }
      : null;

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
        log_only_mode: LOG_ONLY_MODE,
        attempts: attempt,
        validation_passed: lastValidation?.passed ?? false,
        overall_score: lastValidation?.overall_score ?? null,
        hard_failures: lastValidation?.hard_failures ?? [],
        card_scores: lastValidation?.card_scores ?? {},
        total_word_count: lastValidation?.total_word_count ?? 0,
        usage: totalUsage,
      },
    };

    // ADR-013: insert with whichever identity is present (CHECK enforces ≥1 non-null).
    const { data: insertedReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        client_session_id: clientSessionId,
        answers: rawAnswers || null,
        core_report: finalReport,
        activation_plan: null,
        market_snapshot: null,
        hook_insight: (hookInsight as { paragraph?: string }).paragraph || JSON.stringify(hookInsight),
        ai_impact_section: aiImpactSection,
        user_context_profile: userContextProfile,
        status: "pending_selection",
        selected_option_rank: null,
        recommended_selection: recommendedSelection,
        provisional_first_move: provisionalFirstMove,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) console.error("Report insert error:", insertError);
    const reportId = insertedReport?.id;

    if (reportId) {
      // ADR-013: link log rows back to the newly created report by whichever identity
      // was used. For authed submissions this keeps v42 semantics (key by user_id).
      // For anon submissions we key by client_session_id (the log table now carries it).
      const logUpdate = supabase
        .from("report_generation_log")
        .update({ report_id: reportId })
        .is("report_id", null);
      if (userId) {
        await logUpdate.eq("user_id", userId);
      } else if (clientSessionId) {
        await logUpdate.eq("client_session_id", clientSessionId);
      }
    }

    console.log(`Report stored: ${reportId} | total latency: ${Date.now() - t0}ms`);

    return new Response(
      JSON.stringify({
        reportId,
        ...finalReport,
        recommended_selection: recommendedSelection,
        provisional_first_move: provisionalFirstMove,
        user_context_profile: userContextProfile,
        response_text: "Report generated successfully.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`generate-report ${FUNCTION_VERSION} error:`, err);
    return new Response(
      JSON.stringify({ error: String(err), response_text: "Report generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
