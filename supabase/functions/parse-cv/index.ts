// parse-cv v29 — canonical P0 prompt extracted to sibling — 2026-05-15
//
// Replaces v28's slim inline P0_SYSTEM (one paragraph) and slim inline schema
// in the user message with the canonical Prompt 0 content extracted into
// p0-system-prompt.ts. Same pattern as generate-report v45.6 (p1-system-prompt.ts),
// generate-guidance v26 (p8-system-prompt.ts), and process-checkin v38
// (p5-checkin-prompt.ts).
//
// Canonical sources:
//   - prompts/prompt-0-cv-parser.md → p0-system-prompt.ts (sibling extract)
//
// Changes from v28:
//   - Inline P0_SYSTEM (one paragraph) → canonical P0_SYSTEM_PROMPT (full Rules section)
//   - Inline schema in user message → canonical P0_USER_MESSAGE_TEMPLATE (richer
//     field descriptions for sector_primary, employer_org_type, type_of_work,
//     seniority_level, career_highlights, qualifications, sectors_worked_in,
//     skills_mentioned, independent_experience, confidence_score, parse_notes)
//   - Confidence threshold for storing cv_extract: 30 → 50 per canonical. Per
//     prompts/prompt-0-cv-parser.md: "If confidence_score >= 50: store in
//     user_profiles.cv_extract, set cv_uploaded = true, return to frontend to
//     pre-populate confirmation cards. If confidence_score < 50: store partial
//     extract (for debugging), set cv_uploaded = false, proceed with full
//     questionnaire and show note: 'We had trouble reading your CV clearly,
//     please answer all questions below.'"
//   - Added FUNCTION_VERSION constant (v28 had none)
//
// Preserved unchanged from v28:
//   - verify_jwt: false (parse-cv runs pre-questionnaire, anon-tolerant per ADR-013)
//   - File size cap 10MB (matches CVUploadZone client cap, F51 fix)
//   - PDF / DOCX text extraction via pdf-parse + mammoth
//   - 8000-char text truncation
//   - MODEL_TIER2 (gpt-5.4-mini), temperature 0.1, max_completion_tokens 800
//   - Fetch pattern (not OpenAI SDK), per v13 ADR-012 baseline
//   - CORS allow-headers including x-client-session-id (F65 fix)
//   - Upsert to user_profiles with cv_uploaded + cv_extract + cv_confidence_score + cv_raw_text
//
// Behaviour change to verify:
//   The threshold raise (30 -> 50) means CVs that previously scored 30-49 will
//   now flag as cv_uploaded:false and the user will go through the full
//   questionnaire instead of seeing pre-populated confirmation cards. This is
//   the canonical-intended behaviour: pre-population should only fire when the
//   parse is reliable enough to trust. Watch the cv_confidence_score
//   distribution in user_profiles after deploy to confirm the rate of
//   pre-population is acceptable.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { P0_SYSTEM_PROMPT, buildP0UserMessage } from "./p0-system-prompt.ts";

const FUNCTION_VERSION = "v29-canonical-p0";
const MODEL_TIER2 = "gpt-5.4-mini";
const TEMPERATURE = 0.1;
const MAX_COMPLETION_TOKENS = 800;
const FILE_SIZE_CAP_BYTES = 10 * 1024 * 1024;
const TEXT_TRUNCATION_CHARS = 8000;
const MIN_RAW_TEXT_LENGTH = 100;
const CV_STORE_CONFIDENCE_THRESHOLD = 50;  // canonical, raised from v28's 30

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const { default: mammoth } = await import("npm:mammoth@1.6.0");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const { default: pdfParse } = await import("npm:pdf-parse@1.1.1");
    const uint8 = new Uint8Array(buffer);
    const data = await pdfParse(uint8);
    return data.text;
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("user_id") as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "no_file", message: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (file.size > FILE_SIZE_CAP_BYTES) {
      return new Response(
        JSON.stringify({ error: "file_too_large", message: "File exceeds 10MB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buffer = await file.arrayBuffer();
    let rawText = "";
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      rawText = await extractTextFromPdf(buffer);
    } else if (
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      rawText = await extractTextFromDocx(buffer);
    } else {
      return new Response(
        JSON.stringify({
          error: "unsupported_format",
          message: "Only PDF and DOCX files are supported",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!rawText || rawText.trim().length < MIN_RAW_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({
          error: "parse_failed",
          message:
            "Could not extract readable text from this file. It may be image-based or scanned.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const truncatedText = rawText.slice(0, TEXT_TRUNCATION_CHARS);
    const userMessage = buildP0UserMessage(truncatedText);

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_TIER2,
        temperature: TEMPERATURE,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          { role: "system", content: P0_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const openAIData = await openAIResponse.json();
    const rawOutput = openAIData.choices?.[0]?.message?.content || "";

    let cvExtract;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      cvExtract = JSON.parse(jsonMatch ? jsonMatch[0] : rawOutput);
    } catch {
      console.warn(`${FUNCTION_VERSION} JSON parse failed:`, rawOutput.slice(0, 200));
      return new Response(
        JSON.stringify({
          error: "json_malformed",
          message: "Failed to parse CV extraction output",
          raw: rawOutput.slice(0, 200),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const confidenceScore = cvExtract.confidence_score || 0;
    const meetsThreshold = confidenceScore >= CV_STORE_CONFIDENCE_THRESHOLD;

    if (userId && meetsThreshold) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("user_profiles").upsert(
        {
          user_id: userId,
          cv_uploaded: true,
          cv_extract: cvExtract,
          cv_confidence_score: confidenceScore,
          cv_raw_text: truncatedText,
        },
        { onConflict: "user_id" },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        cv_extract: cvExtract,
        cv_uploaded: meetsThreshold,
        confidence_score: confidenceScore,
        function_version: FUNCTION_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`${FUNCTION_VERSION} internal error:`, error);
    return new Response(
      JSON.stringify({ error: "internal_error", message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
