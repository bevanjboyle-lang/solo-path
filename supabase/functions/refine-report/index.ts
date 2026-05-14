// refine-report v19 — vibe code review V-051 — 2026-05-14
// V-051: migrated from raw `fetch()` to supabase-js + OpenAI SDK. Previously the
//        four helpers (getReport / getUserContext / callGptForRefinement /
//        updateReport) hand-rolled REST calls with brittle header strings, and
//        `getUserIdFromJwt` used `replace("Bearer ", "")` with no prefix guard.
//        SDK migration brings this function in line with the rest of the fleet
//        and gives us typed errors, automatic retries, and a single source of
//        truth for auth header parsing.
//
// refine-report v18 — V-052 vibe review fix — 2026-05-14
// V-052: dropped unused MODEL_TIER2/3 declarations and the `void` suppression
//        idiom. Only MODEL_TIER1 was used.
//
// refine-report v17 — 2026-05-05: F65 CORS — x-client-session-id + apikey + x-client-info added to Access-Control-Allow-Headers
// refine-report v14 — P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v13 baseline: 2026-04-17 Audit P2 #16 — source-header reconciled with deploy counter.
// Earlier history:
//   - v4 (pre-reconciliation): ADR-012 (2026-04-17) — model tier constants, MODEL_TIER1 (gpt-5.4).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Content-Type": "application/json",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
// V-052 (vibe review 2026-05-14): MODEL_TIER2/3 removed — only TIER1 used here.

interface RefinementRequest {
  report_id: string;
  feedback_text: string;
}

interface RefinementHistoryEntry {
  refinement_number: number;
  timestamp: string;
  user_feedback: string;
  sections_updated: string[];
  gpt_response_tokens: number;
  merge_status: "success" | "failed";
}

interface RefinedReport {
  [key: string]: unknown;
}

interface ReportData {
  id: string;
  user_id: string;
  core_report: RefinedReport;
  refinement_count: number;
  refinement_history: RefinementHistoryEntry[];
  created_at: string;
}

// V-051 (vibe review 2026-05-14): standard prefix-checked JWT decode. Was
// previously `replace("Bearer ", "")` which silently accepted malformed headers.
function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch {
    return null;
  }
}

type SupabaseClient = ReturnType<typeof createClient>;

// V-051: SDK-backed report fetch. Replaces hand-rolled REST call.
async function getReport(supabase: SupabaseClient, reportId: string): Promise<ReportData> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, user_id, core_report, refinement_count, refinement_history, created_at")
    .eq("id", reportId)
    .single();
  if (error) throw new Error(`Failed to fetch report: ${error.message}`);
  if (!data) throw new Error("Report not found");
  return data as ReportData;
}

// V-051: SDK-backed user context fetch. user_profiles is keyed on user_id.
async function getUserContext(supabase: SupabaseClient, userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch user context: ${error.message}`);
  return data || {};
}

// V-051: OpenAI SDK call. Was raw fetch against api.openai.com.
async function callGptForRefinement(
  openai: OpenAI,
  questionnaireContext: unknown,
  currentReport: RefinedReport,
  feedbackText: string
): Promise<{ refinedSections: RefinedReport; tokensUsed: number }> {
  const systemPrompt = `You are a Plan B report refinement engine. Your job is to take an existing Solo report and update it based on user feedback.

## Your task:

The user has received a Solo report and has provided feedback saying what didn't feel realistic, misaligned, or unhelpful. Your job is NOT to regenerate the entire report. Instead:

1. Read the existing report carefully.
2. Read the user's feedback carefully.
3. Identify which sections of the report are directly affected by the feedback.
4. Regenerate ONLY those sections, maintaining all information from sections not affected.
5. Return a JSON patch: only the fields that have changed.

## Output format:

Return ONLY a valid JSON object representing the updated sections. Do not include explanatory text, do not apologize, do not hedge.

## Voice rules (CRITICAL):

- Direct, specific, commercially realistic.
- No motivational language. No false reassurance.
- Honest caveats. No overpromising.
- Short, clear sentences.
- NEVER use: "unlock", "unleash", "amazing", "incredible", "exciting", "transform", "game-changing", "revolutionary", "passionate", "thrilled", "fantastic".
- NEVER include exclamation marks.

## Accuracy and consistency:

- Do not invent new information. All suggestions must flow logically from the user's original questionnaire responses.
- Do not contradict unchanged sections of the report.
- If the feedback reveals a misunderstanding of the user's sector or experience, recalibrate the entire affected section.`;

  const userMessage = `User's questionnaire context:\n${JSON.stringify(questionnaireContext, null, 2)}\n\nCurrent report (full JSON):\n${JSON.stringify(currentReport, null, 2)}\n\nUser's feedback:\n${feedbackText}\n\nBased on the user's feedback, identify which sections need updating and return ONLY those updated sections as a JSON object. Return ONLY valid JSON, no other text.`;

  const completion = await openai.chat.completions.create({
    model: MODEL_TIER1,
    temperature: 0.7,
    max_completion_tokens: 4000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const tokensUsed = completion.usage?.completion_tokens || 0;

  let refinedSections: RefinedReport;
  try {
    refinedSections = JSON.parse(content);
  } catch {
    console.error("Failed to parse GPT response as JSON:", content);
    throw new Error("Invalid JSON response from GPT");
  }

  return { refinedSections, tokensUsed };
}

function mergeRefinements(
  currentReport: RefinedReport,
  refinedSections: RefinedReport
): RefinedReport {
  const merged = { ...currentReport };
  for (const key in refinedSections) {
    if (Array.isArray(refinedSections[key])) {
      merged[key] = refinedSections[key];
    } else if (typeof refinedSections[key] === "object" && refinedSections[key] !== null) {
      merged[key] = {
        ...((merged[key] as RefinedReport) || {}),
        ...(refinedSections[key] as RefinedReport),
      };
    } else {
      merged[key] = refinedSections[key];
    }
  }
  return merged;
}

// V-051: SDK-backed update. Was hand-rolled PATCH fetch.
async function updateReport(
  supabase: SupabaseClient,
  reportId: string,
  updatedCoreReport: RefinedReport,
  refinementCount: number,
  existingHistory: RefinementHistoryEntry[],
  historyEntry: RefinementHistoryEntry
): Promise<void> {
  const updatedHistory = [...(existingHistory || []), historyEntry];

  const { error } = await supabase
    .from("reports")
    .update({
      core_report: updatedCoreReport,
      refinement_count: refinementCount,
      last_refined_at: new Date().toISOString(),
      refinement_history: updatedHistory,
    })
    .eq("id", reportId);

  if (error) throw new Error(`Failed to update report: ${error.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const userId = getUserIdFromJwt(authHeader);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication failed. Please log in again." }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json() as RefinementRequest;
    const { report_id: reportId, feedback_text: feedbackText } = body;

    if (!reportId || !feedbackText) {
      return new Response(
        JSON.stringify({ error: "Invalid request", response_text: "report_id and feedback_text are required." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // V-051: single supabase + openai client per invocation. Was env-vars+fetch.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const reportData = await getReport(supabase, reportId);

    if (reportData.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden", response_text: "You do not have permission to refine this report." }),
        { status: 403, headers: corsHeaders }
      );
    }

    if ((reportData.refinement_count || 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Refinement limit exceeded", response_text: "You've used all 3 refinements for this report." }),
        { status: 403, headers: corsHeaders }
      );
    }

    const userContext = await getUserContext(supabase, userId);
    const currentCoreReport = reportData.core_report || {};
    const { refinedSections, tokensUsed } = await callGptForRefinement(
      openai,
      userContext,
      currentCoreReport,
      feedbackText
    );
    const updatedCoreReport = mergeRefinements(currentCoreReport, refinedSections);

    const newRefinementNumber = (reportData.refinement_count || 0) + 1;
    const historyEntry: RefinementHistoryEntry = {
      refinement_number: newRefinementNumber,
      timestamp: new Date().toISOString(),
      user_feedback: feedbackText,
      sections_updated: Object.keys(refinedSections),
      gpt_response_tokens: tokensUsed,
      merge_status: "success",
    };

    await updateReport(
      supabase,
      reportId,
      updatedCoreReport,
      newRefinementNumber,
      reportData.refinement_history || [],
      historyEntry
    );

    return new Response(
      JSON.stringify({
        success: true,
        core_report: updatedCoreReport,
        refinement_count: newRefinementNumber,
        refinements_remaining: 3 - newRefinementNumber,
        response_text: `Report refined. You have ${3 - newRefinementNumber} refinements remaining.`,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in refine-report function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", response_text: "Something went wrong while refining your report. Please try again." }),
      { status: 500, headers: corsHeaders }
    );
  }
});
