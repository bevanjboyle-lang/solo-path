// generate-guidance v26 — canonical reconciliation per Phase 1 spec — 2026-05-15
//
// Replaces v25's thin 5-line inline system prompt + generic key_insights/next_steps/
// resources_or_prompts output shape with the canonical Prompt 8 contract from
// admin/generate-guidance-canonical-reconciliation-design.md.
//
// Canonical sources (locked per the spec):
//   - prompts/prompt-8-guidance-module.md      → p8-system-prompt.ts (sibling extract)
//   - knowledge-bank/guidance_modules.json v2  → _shared/modules-library-rich.ts
//   - ADR-009 / ADR-019 ironclad pattern       → guidance-output-schemas.ts + validator
//
// Architecture changes from v25:
//   - Request payload slimmed to { module_id, module_answers }. Legacy user_profile
//     field still accepted for one release cycle but ignored (warning logged).
//   - User context assembled server-side from 6 Supabase tables (questionnaire_responses,
//     reports, user_profiles, tracker_sessions, business_profiles, guidance_module_completions).
//   - Portfolio-aware: plan section carries selected_strands array + primary_strand_id.
//   - business_profiles read added (operational state of user's independent practice).
//   - System prompt loaded from canonical p8-system-prompt.ts (extracted verbatim from
//     prompts/prompt-8-guidance-module.md, plus v26 Phase 2 ARTEFACT-PRODUCING section).
//   - Module library loaded from _shared/modules-library-rich.ts (rich shape with
//     questions, decision_logic, output_structure per module).
//   - response_format: json_object → json_schema strict, with per-module schema built
//     from each module's output_structure field.
//   - Module-specific output shapes (Module 12 returns rate_recommendation /
//     rate_rationale / rate_structure_guide / negotiation_framework / rate_review_timeline /
//     caveat) instead of generic key_insights/next_steps/resources_or_prompts.
//   - v26 Phase 2: artefact_summary nullable field added to every module schema, and
//     system prompt instructs production of usable artefacts not descriptions.
//   - Validator with single retry (configurable to 2) on substance failure (missing,
//     empty, or sub-floor field). buildGuidanceRetryMessage provides diff-style hints.
//   - New observability table guidance_generation_log (modelled on report_generation_log).
//   - New columns on guidance_module_completions: validation_passed, function_version.
//
// Access control preserved from v25 (already canonical):
//   - subscription_sessions.modules_unlocked check
//   - Tranche 1 fallback via payments table for paying users without session row
//   - Track E sector applicability check via _shared/track-e-mapping.ts
//
// Prerequisite handling: v26 explicitly enforces module.prerequisite_module — if the
// prerequisite module hasn't been completed, returns 422 with a clear message.
//
// CORS allow-headers includes x-client-session-id per F65 fix.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";

import { MODULES_RICH, type RichModule } from "../_shared/modules-library-rich.ts";
import { getApplicableTrackEModules } from "../_shared/track-e-mapping.ts";
import { TRANCHE_1_MODULES } from "../_shared/constants.ts";

import { P8_SYSTEM_PROMPT, buildP8UserMessage } from "./p8-system-prompt.ts";
import { assembleUserContext, type UserContext } from "./user-context-assembler.ts";
import { buildModuleOutputSchema } from "./guidance-output-schemas.ts";
import {
  validateGuidanceOutput,
  buildGuidanceRetryMessage,
  type ValidationResult,
} from "./guidance-output-validator.ts";

const FUNCTION_VERSION = "v26-canonical-reconciliation";
const MODEL_TIER1 = "gpt-5.4";
const MAX_VALIDATOR_RETRIES = 2;  // 3 total attempts, matching ADR-019 amended budget
const TEMPERATURE = 0.3;
const MAX_COMPLETION_TOKENS = 2500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// ─── Auth: JWT via getClaims (per memory `feedback_supabase_session_validation`) ─

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

// ─── Access control helpers ────────────────────────────────────────────────────

async function getUnlockedModuleIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number[]> {
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("subscription_active")
    .eq("user_id", userId)
    .maybeSingle();
  const subscriptionActive = !!(profileData?.subscription_active as boolean | undefined);

  const { data: sessionData } = await supabase
    .from("subscription_sessions")
    .select("modules_unlocked")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sessionModulesUnlocked = (sessionData?.modules_unlocked as number[] | undefined) || [];

  if (subscriptionActive && sessionModulesUnlocked.length > 0) {
    return sessionModulesUnlocked;
  }

  if (subscriptionActive) {
    // Subscriber but session row not yet created — unlock all A-D + relevant E
    const { data: qData } = await supabase
      .from("questionnaire_responses")
      .select("answers")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const answers = ((qData?.answers as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const q3a = (answers.q3a_sector as string) || (answers["3"] as string) || "";
    const q11 = (answers.q11_sector_client_context as string) || (answers["11"] as string) || "";
    const trackEIds = getApplicableTrackEModules(q3a, q11, "");
    return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19, ...trackEIds];
  }

  // Buyer: check payments for tranche_1 unlock
  const { data: paymentData } = await supabase
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["paid", "completed"])
    .limit(1)
    .maybeSingle();
  return paymentData ? [...TRANCHE_1_MODULES] : [];
}

// ─── OpenAI call with strict schema + validator + retry ────────────────────────

interface CallP8Args {
  openai: OpenAI;
  module: RichModule;
  systemPrompt: string;
  userMessage: string;
}

interface CallP8Result {
  output: Record<string, unknown>;
  validation: ValidationResult;
  attempts: number;
  openaiModel: string;
  openaiUsage: Record<string, unknown> | null;
}

async function callP8WithRetry(args: CallP8Args): Promise<CallP8Result> {
  const { openai, module, systemPrompt, userMessage: initialUserMessage } = args;
  const schema = buildModuleOutputSchema(module);
  const totalAttempts = 1 + MAX_VALIDATOR_RETRIES;

  let userMessage = initialUserMessage;
  let lastOutput: Record<string, unknown> = {};
  let lastValidation: ValidationResult = { passed: false, missing: [], empty: [], too_short: [] };
  let lastUsage: Record<string, unknown> | null = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const completion = await openai.chat.completions.create({
      model: MODEL_TIER1,
      temperature: TEMPERATURE,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    lastUsage = (completion.usage as unknown as Record<string, unknown>) ?? null;
    const raw = completion.choices[0]?.message?.content || "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn(`${FUNCTION_VERSION} attempt ${attempt}: JSON parse failed:`, raw.slice(0, 200), parseErr);
      lastValidation = { passed: false, missing: ["<parse error>"], empty: [], too_short: [] };
      userMessage = initialUserMessage + "\n\nYour previous response was not valid JSON. Return a single JSON object matching the output_structure exactly.";
      continue;
    }

    lastOutput = parsed;
    lastValidation = validateGuidanceOutput(parsed, module);

    if (lastValidation.passed) {
      return {
        output: parsed,
        validation: lastValidation,
        attempts: attempt,
        openaiModel: MODEL_TIER1,
        openaiUsage: lastUsage,
      };
    }

    // Build retry message with diff-style hints
    if (attempt < totalAttempts) {
      console.warn(`${FUNCTION_VERSION} attempt ${attempt} failed validation:`, JSON.stringify(lastValidation));
      userMessage = initialUserMessage + "\n\n---\n\n" + buildGuidanceRetryMessage(lastValidation, module);
    }
  }

  // All attempts failed validation — return best-effort with validation_passed=false
  console.error(`${FUNCTION_VERSION} all ${totalAttempts} attempts failed validation:`, JSON.stringify(lastValidation));
  return {
    output: lastOutput,
    validation: lastValidation,
    attempts: totalAttempts,
    openaiModel: MODEL_TIER1,
    openaiUsage: lastUsage,
  };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const t0 = Date.now();

  // JWT auth
  const userId = await getUserIdFromJwt(req.headers.get("Authorization") || req.headers.get("authorization"));
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    SUPABASE_URL,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body", response_text: "Request body must be JSON." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const moduleId = Number(body.module_id);
  const moduleAnswers = ((body.module_answers as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const clientSessionId = (body.client_session_id as string) || null;

  // v26: log deprecation warning if frontend sent legacy user_profile field
  if ("user_profile" in body) {
    console.warn(`${FUNCTION_VERSION} legacy user_profile field received — ignored. Frontend should send only { module_id, module_answers }.`);
  }

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 25) {
    return new Response(
      JSON.stringify({ error: "Invalid module_id", response_text: "module_id must be an integer 1-25." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const module = MODULES_RICH[moduleId];
  if (!module) {
    return new Response(
      JSON.stringify({ error: "Module not found", response_text: `Module ${moduleId} not found in library.` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Access control: confirm this module is unlocked for the user
  const unlockedIds = await getUnlockedModuleIds(supabase, userId);
  if (!unlockedIds.includes(moduleId)) {
    return new Response(
      JSON.stringify({
        error: "Module not unlocked",
        response_text: `Module ${moduleId} (${module.name}) is not currently unlocked for your account. ${module.access_tier === "tranche_1" ? "Complete payment to unlock." : "Activate your subscription to unlock."}`,
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Track E sector applicability check
  if (module.track === "E") {
    const { data: qData } = await supabase
      .from("questionnaire_responses")
      .select("answers")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const answers = ((qData?.answers as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const q3a = (answers.q3a_sector as string) || (answers["3"] as string) || "";
    const q11 = (answers.q11_sector_client_context as string) || (answers["11"] as string) || "";
    const applicableTrackE = getApplicableTrackEModules(q3a, q11, "");
    if (!applicableTrackE.includes(moduleId)) {
      return new Response(
        JSON.stringify({
          error: "Module not applicable to your sector",
          response_text: `Module ${moduleId} (${module.name}) is a sector-specific module that doesn't match your profile.`,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Assemble user context
  let userContext: UserContext;
  try {
    userContext = await assembleUserContext(supabase, userId);
  } catch (assemblyErr) {
    console.error(`${FUNCTION_VERSION} context assembly failed:`, assemblyErr);
    return new Response(
      JSON.stringify({
        error: "Context assembly failed",
        response_text: "Could not assemble your profile context. Please try again.",
        details: String((assemblyErr as Error)?.message ?? assemblyErr),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Prerequisite check
  if (module.prerequisite_module) {
    const prereqKey = String(module.prerequisite_module);
    const prereqCompletion = userContext.completed_modules[prereqKey];
    if (!prereqCompletion) {
      const prereqModule = MODULES_RICH[module.prerequisite_module];
      return new Response(
        JSON.stringify({
          error: "Prerequisite not complete",
          response_text: `Module ${moduleId} (${module.name}) depends on Module ${module.prerequisite_module} (${prereqModule?.name ?? "prerequisite"}). Complete that module first.`,
          prerequisite_module_id: module.prerequisite_module,
          prerequisite_module_name: prereqModule?.name ?? null,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Build system prompt + user message
  const userMessage = buildP8UserMessage({
    moduleId,
    moduleDefinition: module as unknown as Record<string, unknown>,
    userContext: userContext as unknown as Record<string, unknown>,
    moduleAnswers,
  });

  // Call OpenAI with strict schema + validator + retry
  let callResult: CallP8Result;
  try {
    callResult = await callP8WithRetry({
      openai,
      module,
      systemPrompt: P8_SYSTEM_PROMPT,
      userMessage,
    });
  } catch (openaiErr) {
    console.error(`${FUNCTION_VERSION} OpenAI call threw:`, openaiErr);
    return new Response(
      JSON.stringify({
        error: "Generation failed",
        response_text: "The guidance engine returned an error. Please try again in a moment.",
        details: String((openaiErr as Error)?.message ?? openaiErr),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const latencyMs = Date.now() - t0;

  // Log to guidance_generation_log (observability — non-fatal)
  try {
    await supabase.from("guidance_generation_log").insert({
      user_id: userId,
      module_id: moduleId,
      function_version: FUNCTION_VERSION,
      attempt: callResult.attempts,
      passed: callResult.validation.passed,
      missing_fields: callResult.validation.missing.length > 0 ? callResult.validation.missing : null,
      too_short_fields: callResult.validation.too_short.length > 0 ? callResult.validation.too_short : null,
      retry_triggered: callResult.attempts > 1,
      openai_model: callResult.openaiModel,
      openai_usage: callResult.openaiUsage,
      latency_ms: latencyMs,
      client_session_id: clientSessionId,
    });
  } catch (logErr) {
    console.warn(`${FUNCTION_VERSION} generation log insert failed (non-fatal):`, logErr);
  }

  // Upsert to guidance_module_completions
  try {
    const { error: upsertErr } = await supabase
      .from("guidance_module_completions")
      .upsert(
        {
          user_id: userId,
          module_id: moduleId,
          module_name: module.name,
          module_answers: moduleAnswers,
          output: callResult.output,
          track: module.track,
          access_tier: module.access_tier,
          validation_passed: callResult.validation.passed,
          function_version: FUNCTION_VERSION,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id" },
      );
    if (upsertErr) {
      console.error(`${FUNCTION_VERSION} completion upsert failed:`, upsertErr);
    }
  } catch (upsertErr) {
    console.error(`${FUNCTION_VERSION} completion upsert threw:`, upsertErr);
  }

  // Also update subscription_sessions.modules_completed for UI tracking
  try {
    const { data: sessionData } = await supabase
      .from("subscription_sessions")
      .select("modules_completed")
      .eq("user_id", userId)
      .maybeSingle();
    if (sessionData) {
      const completed = (sessionData.modules_completed as number[]) || [];
      if (!completed.includes(moduleId)) {
        const updated = [...completed, moduleId].sort((a, b) => a - b);
        await supabase
          .from("subscription_sessions")
          .update({ modules_completed: updated, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }
  } catch (sessionUpdateErr) {
    console.warn(`${FUNCTION_VERSION} subscription_sessions completion update failed (non-fatal):`, sessionUpdateErr);
  }

  return new Response(
    JSON.stringify({
      module_id: moduleId,
      module_name: module.name,
      track: module.track,
      access_tier: module.access_tier,
      output: callResult.output,
      validation_passed: callResult.validation.passed,
      attempts: callResult.attempts,
      function_version: FUNCTION_VERSION,
      response_text: `${module.name} complete.`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
