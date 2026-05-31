// parse-cv v33 — WP7 two-pass extraction (Pass 1 extract + Pass 2 confidence/evidence)
//
// v33 (wp7-cv-confidence-v1): adds Pass 2 — a second LLM call (strict json_schema,
// temperature 0) that re-reads the raw CV text alongside Pass 1's extraction and
// returns per_field_confidence (0-100) + parse_evidence (verbatim substring) for
// the 7 cv_extract fields that pre-fill a Q1-Q15 questionnaire answer. Merged into
// cv_extract before storage/return. Non-fatal: if Pass 2 errors, Pass 1's extract
// is still returned (graceful degradation — frontend treats absent confidence
// conservatively). The hard <70 pre-fill gate lives at the frontend pre-fill
// boundary (WP10), NOT here — this function only emits the data.
// Design: admin/wp7-cv-parsing-confidence-design-2026-05-31.md.
//
// v30 (wp5): Pass 1 routed through llm_client.complete() (model routing by
// prompt_id -> gpt-5.4-mini, json_object). v29: canonical P0 prompt extracted to
// sibling p0-system-prompt.ts.
//
// Preserved unchanged: verify_jwt:false (pre-questionnaire, anon-tolerant per
// ADR-013); 10MB file cap; PDF/DOCX text extraction; 8000-char truncation;
// upsert to user_profiles with cv_uploaded + cv_extract + cv_confidence_score +
// cv_raw_text; CORS incl x-client-session-id.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { P0_SYSTEM_PROMPT, buildP0UserMessage } from "./p0-system-prompt.ts";
import { P0B_SCORER_SYSTEM_PROMPT, buildP0bUserMessage, P0B_CONFIDENCE_SCHEMA } from "./p0b-confidence-scorer.ts";
import { complete } from "./llm_client.ts";

const FUNCTION_VERSION = "wp7-cv-confidence-v1";
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

    // PASS 1 (WP5): extract via the central LLM client (model routing -> gpt-5.4-mini
    // by prompt_id, json_object for guaranteed-parseable output).
    const llmResult = await complete({
      prompt_id: "P0-cv-parser",
      system_prompt: P0_SYSTEM_PROMPT,
      user_payload: userMessage,
      api_key: openAIApiKey!,
      temperature: TEMPERATURE,
      max_tokens: MAX_COMPLETION_TOKENS,
    });
    const rawOutput = llmResult.raw;
    const cvExtract = llmResult.parsed as Record<string, any> | null;
    if (!cvExtract) {
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

    // PASS 2 (WP7): per-field confidence + verbatim evidence. Separate call so the
    // scorer must justify each field against the literal CV text, not echo Pass 1.
    // Non-fatal: a Pass 2 failure leaves cv_extract without per-field confidence and
    // the request still succeeds (frontend treats absent confidence conservatively).
    try {
      const scoreResult = await complete({
        prompt_id: "P0b-cv-confidence-scorer",
        system_prompt: P0B_SCORER_SYSTEM_PROMPT,
        user_payload: buildP0bUserMessage(truncatedText, cvExtract),
        api_key: openAIApiKey!,
        response_schema: { name: "cv_confidence", strict: true, schema: P0B_CONFIDENCE_SCHEMA },
        temperature: 0,
        max_tokens: 700,
      });
      const scored = scoreResult.parsed as {
        per_field_confidence?: Record<string, number>;
        parse_evidence?: Record<string, string>;
      } | null;
      if (scored?.per_field_confidence) cvExtract.per_field_confidence = scored.per_field_confidence;
      if (scored?.parse_evidence) cvExtract.parse_evidence = scored.parse_evidence;
    } catch (e) {
      console.warn(`${FUNCTION_VERSION} Pass 2 confidence scoring failed (non-fatal):`, (e as Error)?.message ?? e);
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
