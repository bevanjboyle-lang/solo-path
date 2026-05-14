// generate-plan v35 — vibe code review fixes — 2026-05-14
//
// V-012: header / FUNCTION_VERSION drift fixed (was v33-ironclad-canonical).
// V-013: truncated OpenAI activation-plan response (finish_reason === "length")
//        now fails fast — marks reports.status='failed' instead of silently writing
//        an empty plan and marking complete.
// V-014: missing activation_plan or first_move in the parsed output also fails fast.
// V-015: dropped the recalibration overwrite of recommendation.rationale.
//        Previously replaced the 80-word P1-generated rationale with a one-line
//        "User selected a portfolio of N strands" string, eroding report quality.
//        recalibration now updates reality_check only (its actual intent).
// V-020: apollo coverage compute now emits -1 sentinel on error so logs distinguish
//        "no cold tasks generated" from "compute threw silently".
//
// generate-plan v34 — F68 cleanup (drop FIRST_STEPS substitution + first_steps recalibration) — 2026-05-05
//
// v34 (F68 cleanup): coreReport no longer carries first_steps (deleted in P1 v45.2).
// Removed the firstSteps build from buildP3UserMessage, dropped FIRST_STEPS from the
// substitution map, removed first_steps from the portfolio recalibration prompt + JSON
// schema + updatedCoreReport assignment. Reality-check recalibration retained.
//
// generate-plan v33 — canonical ironclad rewrite (ADR-019) — 2026-05-05
//
// Mirrors generate-report v45.1's pattern: canonical prompts live in repo (.md → .ts),
// strict json_schema mode is the structural contract, and runtime adapters bridge any
// schema-shape vs. legacy-shape gaps.
//
// Change-log (v32-async → v33-ironclad-canonical):
//   - Replaced inline PROMPT_3V2_SYSTEM with canonical P3_SYSTEM_PROMPT_TEMPLATE import
//     (from p3-system-prompt.ts). User message now built via P3_USER_MESSAGE_TEMPLATE
//     substitution per strand.
//   - Replaced inline PROMPT_4_SYSTEM with canonical P4_SYSTEM_PROMPT_TEMPLATE import
//     (from p4-system-prompt.ts). User message built via P4_USER_MESSAGE_TEMPLATE per
//     strand.
//   - Switched P3 response_format from { type: "json_object" } to { type: "json_schema",
//     json_schema: ACTIVATION_PLAN_SCHEMA } for structural enforcement.
//   - Switched P4 response_format to { type: "json_schema", json_schema:
//     MARKET_SNAPSHOT_SCHEMA }.
//   - Added time_allocation array→object adapter (canonical schema models the field as
//     Array<{strand_key, minutes}>; downstream consumers expect the legacy
//     { strand_key: minutes } object form).
//   - Wraps each P4 strand response with { strand_id, model_name, location, sections }
//     envelope before persisting to reports.market_snapshots[strand_id]. Legacy plain-
//     text reports.market_snapshot column preserved for export-pdf and other readers via
//     synthesised flat-text view of strand_1's sections.
//   - Bumped P3 max_completion_tokens 16384 → 24000 (ironclad output is denser).
//   - Bumped P4 max_completion_tokens 1500 → 2000 (sections required to be substantive).
//   - FUNCTION_VERSION = "v33-ironclad-canonical".
//
// Preserved unchanged: user-JWT auth (no anon, no csid — generate-plan is post-payment
// authed-only), async pattern via EdgeRuntime.waitUntil, recalibration block (TIER2),
// apollo-coverage observability counts, status flow pending_selection → generating_plan
// → complete (or failed), selected_strands writeback shape, x-client-session-id CORS
// allow-header, no rate limit, no validator-with-retry.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";

import {
  ACTIVATION_PLAN_SCHEMA,
  type ActivationPlanOutput,
} from "./activation-plan-schema.ts";
import {
  MARKET_SNAPSHOT_SCHEMA,
  type MarketSnapshotOutput,
} from "./market-snapshot-schema.ts";
import { P3_SYSTEM_PROMPT_TEMPLATE, P3_USER_MESSAGE_TEMPLATE } from "./p3-system-prompt.ts";
import { P4_SYSTEM_PROMPT_TEMPLATE, P4_USER_MESSAGE_TEMPLATE } from "./p4-system-prompt.ts";

const FUNCTION_VERSION = "v35-vibe-review-fixes";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
const MODEL_TIER2 = "gpt-5.4-mini";   // Structured output, signal reading, advisory
const MODEL_TIER3 = "gpt-5.4-nano";   // Classification, extraction, low-temp structured tasks

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

const parseJ = (t: string) => {
  try {
    return JSON.parse(t.replace(/```json\n?|```/g, "").trim());
  } catch {
    return {};
  }
};

// ── Warmth determination ──
function computeWarmthType(structural_warmth: boolean): "relational" | "structural" {
  return structural_warmth === true ? "structural" : "relational";
}

// ── Adapters ───────────────────────────────────────────────────────────────

/**
 * Convert canonical strict-schema time_allocation (Array<{strand_key, minutes}>)
 * to the legacy object form ({ shared: "90 mins" } or { strand_1: "50 mins", ... })
 * that downstream consumers (frontend, P5 checkin, P6 replan) have always read.
 */
function timeAllocationArrayToObject(
  arr: Array<{ strand_key: string; minutes: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of arr || []) {
    if (e && typeof e.strand_key === "string") {
      out[e.strand_key] = e.minutes;
    }
  }
  return out;
}

/**
 * Walk through parsed activation-plan and convert every phase.days_detail[].time_allocation
 * from array form (strict schema) to object form (legacy).
 *
 * Uses a JSON round-trip clone (Deno edge runtime structuredClone availability is
 * not relied upon).
 */
// deno-lint-ignore no-explicit-any
function adaptParsedPlan(parsed: ActivationPlanOutput): any {
  // deno-lint-ignore no-explicit-any
  const adapted: any = JSON.parse(JSON.stringify(parsed));
  const phases = adapted?.activation_plan?.phases;
  if (Array.isArray(phases)) {
    for (const phase of phases) {
      const days = phase?.days_detail;
      if (!Array.isArray(days)) continue;
      for (const day of days) {
        if (Array.isArray(day?.time_allocation)) {
          day.time_allocation = timeAllocationArrayToObject(day.time_allocation);
        }
      }
    }
  }
  return adapted;
}

/**
 * Wrap a P4 response with the per-strand envelope before persisting to
 * reports.market_snapshots[strand_id].
 */
function buildMarketSnapshotEnvelope(
  parsed: MarketSnapshotOutput,
  strand: { strand_id: string; option: { model_name: string } },
  location: string,
): {
  strand_id: string;
  model_name: string;
  location: string;
  sections: MarketSnapshotOutput["sections"];
} {
  return {
    strand_id: strand.strand_id,
    model_name: strand.option.model_name,
    location: location || "United Kingdom",
    sections: parsed.sections,
  };
}

/**
 * Synthesise legacy plain-text market snapshot from a parsed envelope, for backwards
 * compatibility with export-pdf and any other readers of the legacy
 * reports.market_snapshot text column.
 */
function synthesiseLegacyMarketSnapshotText(envelope: {
  model_name: string;
  location: string;
  sections: MarketSnapshotOutput["sections"];
}): string {
  const s = envelope.sections;
  const parts = [
    "LOCAL MARKET FEASIBILITY SNAPSHOT",
    `${envelope.model_name} | ${envelope.location}`,
    "Prepared as indicative research — not primary market data",
    "",
    "DEMAND SIGNAL",
    s.demand_signal,
    "",
    "PRICING BENCHMARK",
    s.pricing_benchmark,
    "",
    "COMPETITOR LANDSCAPE",
    s.competitor_landscape,
    "",
    "MARKET ENTRY INSIGHT",
    s.market_entry_insight,
    "",
    "HONEST ASSESSMENT",
    s.honest_assessment,
    "",
    "Disclaimer: This snapshot is based on general market knowledge and reasoning, not primary research or live data.",
  ];
  return parts.join("\n");
}

// ── Prompt template substitution ───────────────────────────────────────────

/**
 * Build the per-strand context block that fills the canonical P3
 * `{{#each STRANDS}}…{{/each}}` loop.
 *
 * The canonical inner template (per p3-system-prompt.ts) is:
 *
 *   Strand {{strand_id}}:
 *     Model: {{model_name}} (rank {{rank}}, composite score {{composite_score}})
 *     Business model ID: {{business_model_id}}
 *     Primary move type: {{primary_move_type}}
 *     Structural warmth: {{structural_warmth}}
 *     Warmth type: {{warmth_type}}
 *     Positioning: {{positioning}}
 *     Target buyer: {{target_buyer}}
 *     What they're buying: {{what_they_are_buying}}
 *     Pricing: {{pricing.model}} — £{{pricing.range_low_gbp}}–£{{pricing.range_high_gbp}} {{pricing.cadence}}
 *     Difficulty: {{difficulty_rating}}
 *     Fit tags: {{fit_tags}}
 */
// deno-lint-ignore no-explicit-any
function buildStrandsBlock(strands: any[]): string {
  return strands
    .map((s) => {
      const opt = s.option || {};
      const pricing = opt.pricing || {};
      const fitTags = Array.isArray(opt.fit_tags) ? opt.fit_tags.join(", ") : (opt.fit_tags ?? "");
      return [
        `Strand ${s.strand_id}:`,
        `  Model: ${opt.model_name ?? s.model_name} (rank ${opt.rank ?? s.rank}, composite score ${opt.composite_score ?? ""})`,
        `  Business model ID: ${s.business_model_id ?? ""}`,
        `  Primary move type: ${s.primary_move_type ?? ""}`,
        `  Structural warmth: ${s.structural_warmth === true ? "true" : "false"}`,
        `  Warmth type: ${s.warmth_type ?? ""}`,
        `  Positioning: ${opt.positioning ?? ""}`,
        `  Target buyer: ${opt.target_buyer ?? ""}`,
        `  What they're buying: ${opt.what_they_are_buying ?? ""}`,
        `  Pricing: ${pricing.model ?? ""} — £${pricing.range_low_gbp ?? ""}–£${pricing.range_high_gbp ?? ""} ${pricing.cadence ?? ""}`,
        `  Difficulty: ${opt.difficulty_rating ?? ""}`,
        `  Fit tags: ${fitTags}`,
      ].join("\n");
    })
    .join("\n");
}

/**
 * Substitute the P3 user-message template placeholders. The canonical template uses
 * Handlebars-style `{{#each STRANDS}}…{{/each}}` and `{{#if CV_UPLOADED}}…{{/if}}` blocks
 * — we strip those markers and substitute manually.
 */
function buildP3UserMessage(args: {
  // deno-lint-ignore no-explicit-any
  selectedStrands: any[];
  // deno-lint-ignore no-explicit-any
  coreReport: any;
  hookInsight: { headline?: string; insight?: string } | string | null | undefined;
  answers: Record<string, string>;
  // deno-lint-ignore no-explicit-any
  cvExtract: any;
}): string {
  const { selectedStrands, coreReport, hookInsight, answers, cvExtract } = args;

  let tpl = P3_USER_MESSAGE_TEMPLATE;

  // 1) Strip the {{#each STRANDS}} … {{/each}} block and replace with rendered list.
  const strandsBlock = buildStrandsBlock(selectedStrands);
  tpl = tpl.replace(
    /\{\{#each STRANDS\}\}[\s\S]*?\{\{\/each\}\}/,
    strandsBlock,
  );

  // 2) Strip the {{#if CV_UPLOADED}} … {{/if}} block. Replace with content if CV is
  //    present, else remove entirely.
  const cvUploaded = !!cvExtract && (
    cvExtract.career_highlights || cvExtract.qualifications ||
    cvExtract.sectors_worked_in || cvExtract.skills_mentioned ||
    cvExtract.independent_experience
  );
  tpl = tpl.replace(
    /\{\{#if CV_UPLOADED\}\}([\s\S]*?)\{\{\/if\}\}/,
    (_match, inner) => {
      if (!cvUploaded) return "";
      let block = inner as string;
      block = block
        .replace(/\{\{CV_CAREER_HIGHLIGHTS\}\}/g, String(cvExtract.career_highlights ?? ""))
        .replace(/\{\{CV_QUALIFICATIONS\}\}/g, String(cvExtract.qualifications ?? ""))
        .replace(/\{\{CV_SECTORS_WORKED_IN\}\}/g, String(cvExtract.sectors_worked_in ?? ""))
        .replace(/\{\{CV_SKILLS_MENTIONED\}\}/g, String(cvExtract.skills_mentioned ?? ""))
        .replace(/\{\{CV_INDEPENDENT_EXPERIENCE\}\}/g, String(cvExtract.independent_experience ?? ""));
      return block;
    },
  );

  // 3) Archetype + hook insight.
  const archetype = coreReport?.archetype || {};
  const primaryArchetype = typeof archetype === "string"
    ? archetype
    : (archetype.primary || archetype.name || "");
  const archetypeSummary = typeof archetype === "object"
    ? (archetype.summary || archetype.description || "")
    : "";
  const whatTheyCanSell = typeof archetype === "object"
    ? (archetype.what_they_can_sell || archetype.transferable_value || "")
    : "";

  const hookHeadline = typeof hookInsight === "object" && hookInsight
    ? (hookInsight.headline ?? "")
    : "";
  const hookFull = typeof hookInsight === "object" && hookInsight
    ? (hookInsight.insight ?? "")
    : (typeof hookInsight === "string" ? hookInsight : "");

  // 4) Plain {{KEY}} substitutions.
  // Note: `first_steps` was removed from P1 in the F68 cleanup (2026-05-05)
  // so there is no longer a FIRST_STEPS context block to substitute into the
  // P3 user message. Day-by-day actionable tasks are now produced solely by
  // P3 (activation_plan.phases) instead of being seeded by P1.
  const subs: Record<string, string> = {
    PRIMARY_ARCHETYPE: String(primaryArchetype ?? ""),
    ARCHETYPE_SUMMARY: String(archetypeSummary ?? ""),
    WHAT_THEY_CAN_SELL: String(whatTheyCanSell ?? ""),
    HOOK_INSIGHT_HEADLINE: String(hookHeadline ?? ""),
    HOOK_INSIGHT_INSIGHT: String(hookFull ?? ""),
    Q2: String(answers["2"] ?? ""),
    Q3B: String(answers["3b"] ?? answers["30"] ?? answers["3"] ?? ""),
    Q5: String(answers["5"] ?? ""),
    Q6: String(answers["6"] ?? ""),
    Q11: String(answers["11"] ?? ""),
    Q12: String(answers["12"] ?? ""),
    Q13: String(answers["13"] ?? ""),
    Q14: String(answers["14"] ?? ""),
  };

  for (const [k, v] of Object.entries(subs)) {
    tpl = tpl.replaceAll(`{{${k}}}`, v);
  }

  return tpl;
}

/**
 * Substitute the P4 user-message template placeholders for a single strand.
 */
function buildP4UserMessage(args: {
  // deno-lint-ignore no-explicit-any
  strand: any;
  // deno-lint-ignore no-explicit-any
  coreReport: any;
  answers: Record<string, string>;
  // deno-lint-ignore no-explicit-any
  cvExtract: any;
}): string {
  const { strand, coreReport, answers, cvExtract } = args;
  const opt = strand.option || {};
  const pricing = opt.pricing || {};

  let tpl = P4_USER_MESSAGE_TEMPLATE;

  const cvUploaded = !!cvExtract && (
    cvExtract.career_highlights || cvExtract.sectors_worked_in
  );
  tpl = tpl.replace(
    /\{\{#if CV_UPLOADED\}\}([\s\S]*?)\{\{\/if\}\}/,
    (_match, inner) => {
      if (!cvUploaded) return "";
      let block = inner as string;
      block = block
        .replace(/\{\{CV_SECTORS_WORKED_IN\}\}/g, String(cvExtract.sectors_worked_in ?? ""))
        .replace(/\{\{CV_CAREER_HIGHLIGHTS\}\}/g, String(cvExtract.career_highlights ?? ""));
      return block;
    },
  );

  const archetype = coreReport?.archetype || {};
  const archetypeName = typeof archetype === "string"
    ? archetype
    : (archetype.primary || archetype.name || "");

  const subs: Record<string, string> = {
    RECOMMENDED_MODEL: String(opt.model_name ?? ""),
    ARCHETYPE: String(archetypeName ?? ""),
    TARGET_BUYER: String(opt.target_buyer ?? ""),
    PRICING_LOW: String(pricing.range_low_gbp ?? ""),
    PRICING_HIGH: String(pricing.range_high_gbp ?? ""),
    CADENCE: String(pricing.cadence ?? ""),
    Q3B_EMPLOYER_ORG_TYPE: String(answers["3b"] ?? answers["30"] ?? answers["3"] ?? ""),
    Q11_SECTOR_CONTEXT: String(answers["11"] ?? ""),
    Q15_LOCATION: String(answers["15"] ?? ""),
  };

  for (const [k, v] of Object.entries(subs)) {
    tpl = tpl.replaceAll(`{{${k}}}`, v);
  }

  return tpl;
}

// ── Entry point ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { report_id, selected_rank, selected_ranks } = body;

    if (!report_id) {
      return new Response(
        JSON.stringify({ error: "report_id is required", response_text: "report_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let ranksToProcess: number[] = [];
    if (selected_ranks && Array.isArray(selected_ranks) && selected_ranks.length >= 2) {
      if (selected_ranks.length > 5) {
        return new Response(
          JSON.stringify({ error: "Maximum 5 strands allowed", response_text: "Please select between 2 and 5 options." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      ranksToProcess = selected_ranks;
    } else if (selected_rank) {
      ranksToProcess = [selected_rank];
    } else {
      return new Response(
        JSON.stringify({ error: "selected_ranks (array of 2-5) or selected_rank (number) is required", response_text: "Please select your options." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPortfolio = ranksToProcess.length >= 2;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // ── Fetch the report ──
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !report) {
      return new Response(
        JSON.stringify({ error: "Report not found or access denied", response_text: "Report not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const coreReport = report.core_report;
    const answers = report.answers || {};
    const hookInsight = report.hook_insight;
    const cvExtract = report.cv_extract || null;

    // ── Read user context profile (generated by generate-report) ──
    const userContextProfile = (report.user_context_profile as Record<string, unknown>) || {};
    const profileConstraints = (userContextProfile.constraints as Record<string, unknown>) || {};
    const profileFlags = (userContextProfile.derived_flags as Record<string, unknown>) || {};

    console.log(`${FUNCTION_VERSION} — canonical ironclad rewrite (ADR-019)`);
    console.log("User context profile loaded:", {
      network_quality: profileConstraints.network_quality,
      time_budget: profileConstraints.time_budget,
      needs_fast_revenue: profileFlags.needs_fast_revenue,
      can_do_evenings_weekends_only: profileFlags.can_do_evenings_weekends_only,
    });

    // ── Resolve selected options with move metadata ──
    const selectedStrands: Array<{
      strand_id: string;
      rank: number;
      model_name: string;
      business_model_id: string | null;
      primary_move_type: string;
      structural_warmth: boolean;
      warmth_type: "relational" | "structural";
      option: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < ranksToProcess.length; i++) {
      const rank = ranksToProcess[i];
      const option = coreReport.options?.find(
        (o: { rank: number }) => o.rank === rank
      );
      if (!option) {
        return new Response(
          JSON.stringify({ error: `Option with rank ${rank} not found in report`, response_text: `Option rank ${rank} not found.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const business_model_id = (option.business_model_id as string) || null;
      const primary_move_type = (option.primary_move_type as string) || "direct";
      const structural_warmth = option.structural_warmth === true;
      const warmth_type = computeWarmthType(structural_warmth);

      selectedStrands.push({
        strand_id: `strand_${i + 1}`,
        rank: option.rank,
        model_name: option.model_name,
        business_model_id,
        primary_move_type,
        structural_warmth,
        warmth_type,
        option,
      });
    }

    // ── Observability: log move type and warmth type distribution ──
    const moveTypeDist = selectedStrands.reduce((acc: Record<string, number>, s) => {
      acc[s.primary_move_type] = (acc[s.primary_move_type] || 0) + 1;
      return acc;
    }, {});
    const warmthDist = selectedStrands.reduce((acc: Record<string, number>, s) => {
      acc[s.warmth_type] = (acc[s.warmth_type] || 0) + 1;
      return acc;
    }, {});
    console.log(`${FUNCTION_VERSION} strand distribution — move_types: ${JSON.stringify(moveTypeDist)}, warmth_types: ${JSON.stringify(warmthDist)}`);

    const missingMoveMetadata = selectedStrands.filter(s => !s.business_model_id).length;
    if (missingMoveMetadata > 0) {
      console.error(`WARNING: ${missingMoveMetadata} strands missing business_model_id — report may have been generated before v19`);
    }

    // ── Mark report as generating ──
    await supabase
      .from("reports")
      .update({
        selected_strands: selectedStrands.map(s => ({
          strand_id: s.strand_id,
          rank: s.rank,
          model_name: s.model_name,
          business_model_id: s.business_model_id,
          primary_move_type: s.primary_move_type,
          structural_warmth: s.structural_warmth,
          warmth_type: s.warmth_type,
        })),
        selected_option_rank: selectedStrands[0].rank,
        status: "generating_plan",
      })
      .eq("id", report_id);

    console.log(`${FUNCTION_VERSION} kicking off background work for report ${report_id} (${selectedStrands.length} strands, isPortfolio=${isPortfolio})`);

    // ── ASYNC: kick off the slow OpenAI work in background, return immediately ──
    // @ts-expect-error EdgeRuntime is provided by Supabase Deno deploy runtime
    EdgeRuntime.waitUntil(generatePlanInBackground({
      report_id, selectedStrands, isPortfolio, coreReport, answers, hookInsight, cvExtract,
      profileFlags, profileConstraints, openai, supabase,
    }));

    return new Response(
      JSON.stringify({
        report_id,
        status: "generating_plan",
        mode: isPortfolio ? "portfolio" : "single",
        selected_strands: selectedStrands.map(s => ({
          strand_id: s.strand_id,
          rank: s.rank,
          model_name: s.model_name,
          business_model_id: s.business_model_id,
          primary_move_type: s.primary_move_type,
          structural_warmth: s.structural_warmth,
          warmth_type: s.warmth_type,
        })),
        strand_count: selectedStrands.length,
        response_text: "Plan generation started. Poll reports.status by report_id until 'complete'.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (entryError) {
    console.error(`${FUNCTION_VERSION} entry error:`, entryError);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(entryError), response_text: "Failed to start plan generation." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── BACKGROUND WORKER ──────────────────────────────────────────────────────
// All OpenAI calls (Prompt 3 canonical + Prompt 4 per strand + recalibration) run here.
// On success: updates report row to status='complete' with full activation_plan,
// market_snapshots, and updated core_report. On error: updates report row to
// status='failed' with error message.

async function generatePlanInBackground(args: {
  // deno-lint-ignore no-explicit-any
  report_id: string; selectedStrands: any[]; isPortfolio: boolean;
  // deno-lint-ignore no-explicit-any
  coreReport: any; answers: Record<string, string>; hookInsight: any; cvExtract: any;
  profileFlags: Record<string, unknown>; profileConstraints: Record<string, unknown>;
  // deno-lint-ignore no-explicit-any
  openai: any; supabase: any;
}) {
  const { report_id, selectedStrands, isPortfolio, coreReport, answers, hookInsight, cvExtract,
    profileFlags, profileConstraints, openai, supabase } = args;

  try {
    console.log(`bg ${report_id}: starting plan generation`);

    // ── Build user context (used in recalibration block, mirrored from v28) ──
    const userContext = {
      years_experience: answers["2"] || "",
      employer_org_type: answers["3b"] || answers["30"] || answers["3"] || "",
      seniority: answers["5"] || "",
      specific_achievement: answers["6"] || "",
      sector_client_context: answers["11"] || "",
      independent_experience: answers["12"] || "",
      network: answers["13"] || "",
      employment_status: answers["14"] || "",
    };

    console.log("Employer org type resolved:", userContext.employer_org_type || "EMPTY — check Q3b key");

    // ── strandContextArray includes all 4 move metadata fields (used for recalibration) ──
    const strandContextArray = selectedStrands.map((s) => ({
      strand_id: s.strand_id,
      model_name: s.option.model_name,
      rank: s.option.rank,
      business_model_id: s.business_model_id,
      primary_move_type: s.primary_move_type,
      structural_warmth: s.structural_warmth,
      warmth_type: s.warmth_type,
      composite_score: s.option.composite_score,
      positioning: s.option.positioning,
      target_buyer: s.option.target_buyer,
      what_they_are_buying: s.option.what_they_are_buying,
      pricing: s.option.pricing,
      difficulty_rating: s.option.difficulty_rating,
      fit_tags: s.option.fit_tags,
    }));

    const profileContextForPrompt = {
      derived_flags: {
        needs_fast_revenue: profileFlags.needs_fast_revenue ?? false,
        can_do_evenings_weekends_only: profileFlags.can_do_evenings_weekends_only ?? true,
        has_sales_confidence: profileFlags.has_sales_confidence ?? false,
        has_advisory_instinct: profileFlags.has_advisory_instinct ?? false,
        has_pricing_confidence: profileFlags.has_pricing_confidence ?? false,
      },
      constraints: {
        network_quality: profileConstraints.network_quality || "moderate",
        network_size: profileConstraints.network_size || "medium",
        time_budget: profileConstraints.time_budget || "employed_full_time",
        income_urgency: profileConstraints.income_urgency || "medium",
        independence_confidence: profileConstraints.independence_confidence || "medium",
      },
    };

    // ── P3 user message — built from canonical user-message template ──
    const prompt3UserMessage = buildP3UserMessage({
      selectedStrands,
      coreReport,
      hookInsight,
      answers,
      cvExtract,
    });

    // ── Build P4 user messages (one per strand) — from canonical user-message template ──
    const prompt4Messages = selectedStrands.map((s) => ({
      strand_id: s.strand_id,
      message: buildP4UserMessage({
        strand: s,
        coreReport,
        answers,
        cvExtract,
      }),
    }));

    // ── Run P3 (TIER1, strict schema) + all P4s (TIER3, strict schema) in parallel ──
    const apiCalls: Promise<unknown>[] = [
      openai.chat.completions.create({
        model: MODEL_TIER1,
        temperature: 0.5,
        max_completion_tokens: 24000,
        messages: [
          { role: "system", content: P3_SYSTEM_PROMPT_TEMPLATE },
          { role: "user", content: prompt3UserMessage },
        ],
        response_format: { type: "json_schema", json_schema: ACTIVATION_PLAN_SCHEMA },
      }),
      ...prompt4Messages.map((pm) =>
        openai.chat.completions.create({
          model: MODEL_TIER3,
          temperature: 0.3,
          max_completion_tokens: 2000,
          messages: [
            { role: "system", content: P4_SYSTEM_PROMPT_TEMPLATE },
            { role: "user", content: pm.message },
          ],
          response_format: { type: "json_schema", json_schema: MARKET_SNAPSHOT_SCHEMA },
        })
      ),
    ];

    const results = await Promise.all(apiCalls);

    const activationResult = results[0] as { choices: Array<{ message: { content: string | null }; finish_reason: string }> };
    const rawActivationContent = activationResult.choices[0].message.content || "{}";
    const activationFinishReason = activationResult.choices[0].finish_reason;
    console.log(`Activation plan raw content length: ${rawActivationContent.length}, finish_reason: ${activationFinishReason}`);

    // V-013 (vibe code review 2026-05-14): truncation fail-fast.
    // Previously this branch only logged a warning and proceeded — parseJ of
    // truncated JSON returned {} and the function silently wrote an empty
    // activation_plan with status='complete'. Users paid £19.99 and got an
    // empty plan. Now we mark the row failed and abort.
    if (activationFinishReason === "length") {
      console.error(`${FUNCTION_VERSION} V-013 abort: P3 truncated by 24k token cap on report ${report_id}`);
      await supabase
        .from("reports")
        .update({
          status: "failed",
          error: "Plan generation truncated by model token cap (24000 tokens). Likely cause: portfolio too large for current cap.",
        })
        .eq("id", report_id);
      return;
    }

    const parsedPlan = parseJ(rawActivationContent) as ActivationPlanOutput;
    console.log(`Activation plan parsed. Top-level keys: ${Object.keys(parsedPlan || {}).join(", ")}`);

    // ── Adapt time_allocation array → legacy object form ──
    const activationPlan = adaptParsedPlan(parsedPlan);

    // ── Log apollo_query coverage for observability (mirrored from v28) ──
    let coldTaskCount = 0;
    let apolloQueryPopulated = 0;
    try {
      const phases = activationPlan?.activation_plan?.phases || [];
      for (const phase of phases) {
        for (const day of (phase.days_detail || [])) {
          for (const task of (day.tasks || [])) {
            // Strict schema uses task_type "activation"; v28 used "outreach". Count both.
            if (task.task_type === "outreach" || task.task_type === "activation") {
              if (task.outreach_subtype === "cold") {
                coldTaskCount++;
                if (task.apollo_query && task.apollo_query.person_titles?.length > 0) {
                  apolloQueryPopulated++;
                }
              }
            }
          }
        }
      }
      console.log(`${FUNCTION_VERSION} apollo coverage — cold_tasks: ${coldTaskCount}, apollo_query_populated: ${apolloQueryPopulated}`);
    } catch (e) {
      // V-020 (vibe code review 2026-05-14): emit -1 sentinel so logs distinguish
      // "compute threw" from "no cold tasks generated" (the latter logs as 0/0).
      console.error(`${FUNCTION_VERSION} apollo coverage compute failed:`, (e as Error)?.message ?? String(e));
      console.log(`${FUNCTION_VERSION} apollo coverage — cold_tasks: -1, apollo_query_populated: -1 (V-020 sentinel — compute threw)`);
    }

    // V-014 (vibe code review 2026-05-14): missing required fields fail-fast.
    // Same shape of issue as V-013 — previously this only logged then proceeded
    // to write a broken plan. Now we mark failed and abort.
    if (!activationPlan.activation_plan || !activationPlan.first_move) {
      console.error(`${FUNCTION_VERSION} V-014 abort: P3 output missing activation_plan or first_move on report ${report_id}`);
      await supabase
        .from("reports")
        .update({
          status: "failed",
          error: "Plan generation produced output missing required fields (activation_plan or first_move). Possible parse failure or unexpected model output shape.",
        })
        .eq("id", report_id);
      return;
    }

    // ── Build per-strand market snapshot envelopes ──
    const q15Location = String(answers["15"] || "United Kingdom");
    const marketSnapshots: Record<string, unknown> = {};
    for (let i = 0; i < prompt4Messages.length; i++) {
      const marketResult = results[i + 1] as { choices: Array<{ message: { content: string | null } }> };
      const rawSnap = marketResult.choices[0].message.content || "{}";
      const parsedSnap = parseJ(rawSnap) as MarketSnapshotOutput;
      const strand = selectedStrands[i];
      const envelope = buildMarketSnapshotEnvelope(parsedSnap, strand, q15Location);
      marketSnapshots[strand.strand_id] = envelope;
    }

    // ── Synthesise legacy plain-text market_snapshot column for backwards compatibility ──
    const firstStrandEnvelope = marketSnapshots[selectedStrands[0].strand_id] as
      | ReturnType<typeof buildMarketSnapshotEnvelope>
      | undefined;
    const legacyMarketSnapshotText = firstStrandEnvelope
      ? synthesiseLegacyMarketSnapshotText(firstStrandEnvelope)
      : "";

    // ── Generate portfolio-level reality_check (TIER2) — preserved from v28 ──
    let updatedCoreReport = coreReport;
    if (isPortfolio || selectedStrands[0].rank !== 1) {
      const recalibrationRes = await openai.chat.completions.create({
        model: MODEL_TIER2,
        temperature: 0.4,
        max_completion_tokens: 800,
        messages: [
          {
            role: "system",
            content: `You are Solo's intelligence engine. The user selected ${selectedStrands.length} business model strands to pursue as a portfolio. Regenerate the reality_check for their portfolio. The reality_check should address the portfolio as a whole — the risk of spreading too thin, the benefit of diversification, and the most likely failure mode. Do not reference inputs by name or question number in the output. Return JSON only: { "reality_check": { "most_likely_failure_mode": string, "second_failure_mode": string, "what_they_will_find_hard": string, "honest_income_outlook": string } }`,
          },
          {
            role: "user",
            content: JSON.stringify({
              selected_strands: strandContextArray,
              archetype: coreReport.archetype,
              transferable_value: coreReport.transferable_value,
              user_context_profile: profileContextForPrompt,
              context: userContext,
            }),
          },
        ],
        response_format: { type: "json_object" },
      });

      const recalibrated = parseJ(recalibrationRes.choices[0].message.content || "{}");
      if (recalibrated.reality_check) {
        // V-015 (vibe code review 2026-05-14): only update reality_check (the
        // recalibration block's actual intent). Previously this also overwrote
        // recommendation.rationale with a one-line factual restatement
        // ("User selected a portfolio of N strands"), replacing the 80+ word
        // P1-generated rationale. Downstream consumers (export-pdf, plan UI,
        // ask-solo context) read recommendation.rationale and were getting the
        // thin restatement instead of the richer P1 narrative. recommended_rank
        // is still bumped to reflect the user's actual selection.
        updatedCoreReport = {
          ...coreReport,
          reality_check: recalibrated.reality_check,
          recommendation: {
            ...coreReport.recommendation,
            recommended_rank: selectedStrands[0].rank,
            // rationale preserved from P1 (was overwritten before V-015 fix)
          },
        };
      }
    }

    // ── initialStrandStatus includes all 4 move metadata fields ──
    const initialStrandStatus: Record<string, unknown> = {};
    for (const s of selectedStrands) {
      initialStrandStatus[s.strand_id] = {
        model_name: s.option.model_name,
        rank: s.rank,
        business_model_id: s.business_model_id,
        primary_move_type: s.primary_move_type,
        structural_warmth: s.structural_warmth,
        warmth_type: s.warmth_type,
        status: "active",
        traction_score: 0,
        signals_observed: [],
        energy_rating: null,
        tasks_completed: 0,
        tasks_total: 0,
      };
    }

    // ── Update the report row ──
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        core_report: updatedCoreReport,
        activation_plan: activationPlan,
        market_snapshot: legacyMarketSnapshotText,
        market_snapshots: marketSnapshots,
        selected_strands: selectedStrands.map(s => ({
          strand_id: s.strand_id,
          rank: s.rank,
          model_name: s.model_name,
          business_model_id: s.business_model_id,
          primary_move_type: s.primary_move_type,
          structural_warmth: s.structural_warmth,
          warmth_type: s.warmth_type,
          option: s.option,
        })),
        selected_option_rank: selectedStrands[0].rank,
        status: "complete",
      })
      .eq("id", report_id);

    if (updateError) {
      console.error(`bg ${report_id} update error:`, JSON.stringify(updateError));
      await supabase.from("reports").update({ status: "failed", error: String(updateError.message ?? updateError) }).eq("id", report_id);
      return;
    }

    console.log(`bg ${report_id} done | ${selectedStrands.length} strands | apollo cold=${coldTaskCount}/${apolloQueryPopulated}`);
  } catch (error) {
    console.error(`bg ${report_id} error:`, error);
    try {
      await supabase.from("reports").update({ status: "failed", error: String((error as Error)?.message ?? error) }).eq("id", report_id);
    } catch (updateErr) {
      console.error(`bg ${report_id} also failed to mark status=failed:`, updateErr);
    }
  }
}
