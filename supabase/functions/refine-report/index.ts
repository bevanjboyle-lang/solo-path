// refine-report v14 — P0 #22 (2026-04-18): max_tokens → max_completion_tokens for GPT-5.4 compatibility
// v13 baseline: 2026-04-17 Audit P2 #16 — source-header reconciled with deploy counter.
// Earlier history:
//   - v4 (pre-reconciliation): ADR-012 (2026-04-17) — model tier constants, MODEL_TIER1 (gpt-5.4).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// Model tier constants — ADR-012 (2026-04-17)
const MODEL_TIER1 = "gpt-5.4";        // High-stakes synthesis and user-facing copy
const MODEL_TIER2 = "gpt-5.4-mini";   // Structured output, signal reading, advisory
const MODEL_TIER3 = "gpt-5.4-nano";   // Classification, extraction, low-temp structured tasks

// Suppress unused variable warnings
void MODEL_TIER2;
void MODEL_TIER3;

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
  core_report: RefinedReport;  // correct column name
  refinement_count: number;
  refinement_history: RefinementHistoryEntry[];
  created_at: string;
}

function getUserIdFromJwt(authHeader: string): string | null {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    return decoded.sub;
  } catch {
    return null;
  }
}

async function getReport(reportId: string): Promise<ReportData> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?id=eq.${reportId}`,
    {
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch report: ${response.statusText}`);
  const data = await response.json();
  if (data.length === 0) throw new Error("Report not found");
  return data[0];
}

async function getUserContext(userId: string): Promise<unknown> {
  // FIXED: user_profiles uses user_id column (not id)
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}`,
    {
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch user context: ${response.statusText}`);
  const data = await response.json();
  return data.length > 0 ? data[0] : {};
}

async function callGptForRefinement(
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_TIER1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const tokensUsed = data.usage.completion_tokens;

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

async function updateReport(
  reportId: string,
  updatedCoreReport: RefinedReport,
  refinementCount: number,
  existingHistory: RefinementHistoryEntry[],
  historyEntry: RefinementHistoryEntry
): Promise<void> {
  // Append history entry to the existing array
  const updatedHistory = [...(existingHistory || []), historyEntry];

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?id=eq.${reportId}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        core_report: updatedCoreReport,  // FIXED: was 'report', correct column is 'core_report'
        refinement_count: refinementCount,
        last_refined_at: new Date().toISOString(),
        refinement_history: updatedHistory,
      }),
    }
  );
  if (!response.ok) throw new Error(`Failed to update report: ${response.statusText}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
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

    const reportData = await getReport(reportId);

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

    const userContext = await getUserContext(userId);
    // FIXED: read from core_report (correct column name)
    const currentCoreReport = reportData.core_report || {};
    const { refinedSections, tokensUsed } = await callGptForRefinement(userContext, currentCoreReport, feedbackText);
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

    await updateReport(reportId, updatedCoreReport, newRefinementNumber, reportData.refinement_history || [], historyEntry);

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
