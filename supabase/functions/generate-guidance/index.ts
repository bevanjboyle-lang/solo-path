// generate-guidance v28 — guidance enrichment workstream canonical bar — 2026-05-26
//
// Implements the canonical ModuleOutputV3 contract per the locked design at:
//   - admin/guidance-enrichment-workstream-plan.md v1.0 (Bevan-approved 2026-05-25)
//   - admin/canonical-guidance-prompt-v28-draft.md (Part A, the shared prompt body)
//   - admin/canonical-guidance-module-1-addendum-and-schema-v28-draft.md (Part B + schema)
//   - admin/canonical-guidance-v28-implementation-design.md (this file's change scope)
//
// Three-part prompt composition at request time:
//   Part A: shared canonical prefix    (p8-system-prompt.ts P8_SYSTEM_PROMPT)
//   Part B: per-module addendum        (MODULES_RICH[id].module_addendum)
//   Part C: runtime user context       (assembleUserContext + fetchApplicableReferenceItems)
//
// Output: single ModuleOutputV3 shape across all 32 modules (Q1a Path A locked).
// Validator extends v27 with banned-word, forbidden-pattern, word-count-range,
// playbook-length, target_day-range, and reference-count checks.
//
// Caveat is concatenated in code post-generation (curated base + LLM tail) rather
// than asked of the LLM, per §9 refinement. Removes verbatim-reproduction risk.
//
// Per-module rollout: any module without module_addendum returns 422. v28 unlocks
// per-module as addenda are authored. Module 1 ships with v28; Modules 2-32 land
// over the next ~7 weeks of content drafting.
//
// generate-guidance v27 — V-055 fix: replace getClaims with inline JWT decode — 2026-05-16
//
// Bug: V-055 — authClient.auth.getClaims(token) was silently failing on valid
// gateway-verified JWTs in production, causing the function's internal auth
// check to return null → 401 on every legitimate call from /library when the
// user clicked a module to get advice. Edge function logs (2026-05-16, 07:39
// and 08:35 UTC) showed two POST 401s from Bevan's session on solo-plan.com.
//
// Fix: since verify_jwt:true at the Supabase gateway has already validated
// the JWT signature before the function runs, the function only needs to
// extract the `sub` claim. v27 replaces the getClaims-dependent helper with
// the inline base64 JWT-payload decoder used by create-payment v23+. No
// signature verification needed (gateway did it); no authClient dependency.
//
// Same fix is owed to the three other functions still using getClaims
// (V-055 consolidation). Out of scope for v27; tracked separately.
//
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

import { MODULES_RICH } from "../_shared/modules-library-rich.ts";
import { getApplicableTrackEModules } from "../_shared/track-e-mapping.ts";
import { TRANCHE_1_MODULES } from "../_shared/constants.ts";

import {
  P8_SYSTEM_PROMPT,
  buildP8UserMessage,
  type ModuleAddendum,
  type ReferenceItemMenuEntry,
} from "./p8-system-prompt.ts";
import {
  assembleUserContext,
  fetchApplicableReferenceItems,
  type UserContext,
} from "./user-context-assembler.ts";
import {
  MODULE_OUTPUT_V3_SCHEMA,
  type ModuleOutputV3,
  type PersistedModuleOutput,
} from "./guidance-output-schemas.ts";
import {
  validateModuleOutputV3,
  buildV3RetryMessage,
  type ValidationResult,
} from "./guidance-output-validator.ts";

const FUNCTION_VERSION = "v28-canonical-bar";
const MODEL_TIER1 = "gpt-5.4";
const MAX_VALIDATOR_RETRIES = 2;  // 3 total attempts, matching ADR-019 amended budget
const TEMPERATURE = 0.3;
const MAX_COMPLETION_TOKENS = 2500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// ─── Auth: JWT via inline base64 payload decode (V-055 fix) ─────────────────────
//
// The Supabase gateway has verify_jwt:true on this function, so by the time
// the function runs the JWT signature has already been validated. We only
// need to extract the `sub` claim from the payload. authClient.auth.getClaims
// was unreliable in live (V-055) — the inline decoder is what create-payment
// v23+ uses and is the reliable pattern across the codebase.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const sub = payload?.sub;
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
  systemPrompt: string;
  userMessage: string;
  referenceMenuSize: number;
}

interface CallP8Result {
  output: ModuleOutputV3;
  validation: ValidationResult;
  attempts: number;
  openaiModel: string;
  openaiUsage: Record<string, unknown> | null;
}

function emptyValidation(): ValidationResult {
  return {
    passed: false,
    missing: [],
    too_short: [],
    empty: [],
    banned_words: [],
    forbidden_patterns: [],
    word_count_violations: [],
    step_count_violation: false,
    target_day_violations: [],
    reference_count_warning: false,
  };
}

async function callP8WithRetry(args: CallP8Args): Promise<CallP8Result> {
  const { openai, systemPrompt, userMessage: initialUserMessage, referenceMenuSize } = args;
  const totalAttempts = 1 + MAX_VALIDATOR_RETRIES;

  let userMessage = initialUserMessage;
  let lastOutput: ModuleOutputV3 = {
    short_version: "",
    playbook: [],
    reference_layer_ids: [],
    check_in_commitment: { summary_prose: "", commitments: [] },
    caveat_personalised_tail: "",
  };
  let lastValidation: ValidationResult = emptyValidation();
  let lastUsage: Record<string, unknown> | null = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const completion = await openai.chat.completions.create({
      model: MODEL_TIER1,
      temperature: TEMPERATURE,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      response_format: MODULE_OUTPUT_V3_SCHEMA,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    lastUsage = (completion.usage as unknown as Record<string, unknown>) ?? null;
    const raw = completion.choices[0]?.message?.content || "{}";

    let parsed: ModuleOutputV3;
    try {
      parsed = JSON.parse(raw) as ModuleOutputV3;
    } catch (parseErr) {
      console.warn(`${FUNCTION_VERSION} attempt ${attempt}: JSON parse failed:`, raw.slice(0, 200), parseErr);
      lastValidation = { ...emptyValidation(), missing: ["<parse error>"] };
      userMessage = initialUserMessage + "\n\nYour previous response was not valid JSON. Return a single JSON object matching the ModuleOutputV3 schema exactly.";
      continue;
    }

    lastOutput = parsed;
    lastValidation = validateModuleOutputV3(parsed, { referenceMenuSize });

    if (lastValidation.passed) {
      return {
        output: parsed,
        validation: lastValidation,
        attempts: attempt,
        openaiModel: MODEL_TIER1,
        openaiUsage: lastUsage,
      };
    }

    if (attempt < totalAttempts) {
      console.warn(`${FUNCTION_VERSION} attempt ${attempt} failed validation:`, JSON.stringify(lastValidation));
      userMessage = initialUserMessage + "\n\n---\n\n" + buildV3RetryMessage(lastValidation);
    }
  }

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

  if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 32) {
    return new Response(
      JSON.stringify({ error: "Invalid module_id", response_text: "module_id must be an integer 1-32." }),
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

  // v28 gate: this module must carry a module_addendum to use the canonical
  // bar pipeline. Modules without an addendum are still on v27 content quality;
  // returning 422 here prevents users seeing a half-built v28 experience while
  // the workstream lands per-module content.
  const moduleAddendum = (module as unknown as { module_addendum?: ModuleAddendum }).module_addendum;
  if (!moduleAddendum) {
    return new Response(
      JSON.stringify({
        error: "Module not yet on v28 canonical bar",
        response_text: `Module ${moduleId} (${module.name}) is being upgraded to Solo's new guidance standard. Please try again soon.`,
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

  // Fetch curated reference items applicable to this module (v28 addition).
  // Non-fatal: empty menu yields empty reference_layer_ids; the rest of the
  // output is unaffected. The module's content quality bar doesn't depend on
  // reference items being authored yet, though obviously the user experience
  // is poorer without them. The workstream §5 sequencing fills these in.
  const referenceItemMenu: ReferenceItemMenuEntry[] = await fetchApplicableReferenceItems(
    supabase,
    moduleId,
  );

  // Build user message: Part B addendum + reference menu + Part C user context
  // + this module's gap-filling answers. Part A loads as the system message.
  const userMessage = buildP8UserMessage({
    moduleId,
    moduleName: module.name,
    moduleQuestions: (module as unknown as { questions?: unknown }).questions ?? [],
    moduleAddendum,
    referenceItemMenu,
    userContext: userContext as unknown as Record<string, unknown>,
    moduleAnswers,
  });

  // Call OpenAI with the canonical ModuleOutputV3 schema + validator + retry.
  let callResult: CallP8Result;
  try {
    callResult = await callP8WithRetry({
      openai,
      systemPrompt: P8_SYSTEM_PROMPT,
      userMessage,
      referenceMenuSize: referenceItemMenu.length,
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

  // Caveat concatenation post-generation (§9 refinement).
  // The LLM produced caveat_personalised_tail only (one sentence). We
  // concatenate the curated base (with [DATE] substituted) + the LLM tail in
  // code, removing the verbatim-reproduction risk on the model. The persisted
  // record has the full caveat in the `caveat` field; the LLM-only tail does
  // not leak into the persisted shape.
  const fullCaveat = (
    moduleAddendum.curated_caveat_base.replace(
      "[DATE]",
      moduleAddendum.curated_caveat_verified_date,
    ) +
    " " +
    (callResult.output.caveat_personalised_tail || "").trim()
  ).trim();

  const persistedOutput: PersistedModuleOutput = {
    short_version: callResult.output.short_version,
    playbook: callResult.output.playbook,
    reference_layer_ids: callResult.output.reference_layer_ids,
    check_in_commitment: callResult.output.check_in_commitment,
    caveat: fullCaveat,
  };

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

  // Upsert to guidance_module_completions (with full caveat, not personalised tail)
  try {
    const { error: upsertErr } = await supabase
      .from("guidance_module_completions")
      .upsert(
        {
          user_id: userId,
          module_id: moduleId,
          module_name: module.name,
          module_answers: moduleAnswers,
          output: persistedOutput,
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
      output: persistedOutput,
      validation_passed: callResult.validation.passed,
      attempts: callResult.attempts,
      function_version: FUNCTION_VERSION,
      response_text: `${module.name} complete.`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
