import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const P0_SYSTEM = `You are a structured data extraction engine. Your only job is to read a CV and extract specific fields into a JSON object. You do not evaluate the CV. You do not give career advice. You do not comment on the person's experience. You extract what is there and flag what is not.

Extract ONLY from what is explicitly written in the CV. Do not infer or embellish. If a field cannot be reliably extracted, set it to null and add a note in parse_notes.

Your output must be a single valid JSON object matching this schema exactly. No preamble, no explanation, no markdown - only the JSON object.`;

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  // Use mammoth via npm for DOCX parsing
  const { default: mammoth } = await import("npm:mammoth@1.6.0");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  // Use pdf-parse via npm for PDF parsing
  try {
    const { default: pdfParse } = await import("npm:pdf-parse@1.1.1");
    const uint8 = new Uint8Array(buffer);
    const data = await pdfParse(uint8);
    return data.text;
  } catch {
    // Fallback: return empty to trigger error path
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("user_id") as string;

    if (!file) {
      return new Response(JSON.stringify({ error: "no_file", message: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Size check: 5MB max
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "file_too_large", message: "File exceeds 5MB limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = await file.arrayBuffer();
    let rawText = "";
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      rawText = await extractTextFromPdf(buffer);
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc") || 
               file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      rawText = await extractTextFromDocx(buffer);
    } else {
      return new Response(JSON.stringify({ error: "unsupported_format", message: "Only PDF and DOCX files are supported" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawText || rawText.trim().length < 100) {
      return new Response(JSON.stringify({ error: "parse_failed", message: "Could not extract readable text from this file. It may be image-based or scanned." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate to 8000 chars to stay within token limits
    const truncatedText = rawText.slice(0, 8000);

    const userMessage = `Extract structured data from the following CV text. Return a JSON object matching the schema below.

CV TEXT:
---
${truncatedText}
---

SCHEMA:
{
  "extracted_name": "First name only (string). Extract from the name at the top of the CV.",
  "current_job_title": "Most recent or current job title (string).",
  "years_experience": "Total professional experience as an integer (years). Infer from the career timeline if not stated explicitly. Round to nearest whole year.",
  "sector_primary": "Primary sector. Map to one of these values where possible: Financial Services / Consulting & Professional Services / Technology / Public Sector & NHS / Industry & Manufacturing / Retail & Consumer / Other. Use 'Other' if none fit.",
  "employer_org_type": "Specific description of the current or most recent employer type. Be specific - not just 'Financial Services' but 'Big 4 risk advisory practice' or 'FTSE100 retail bank' or 'NHS acute trust' or 'boutique M&A advisory firm'.",
  "type_of_work": "Primary type of work. Examples: analysis and reporting / project delivery / governance and compliance / operations and process / consulting and advisory.",
  "seniority_level": "Seniority inferred from titles. Examples: manager / senior manager / director / head of / partner / VP.",
  "career_highlights": ["Array of 3-5 notable projects or achievements mentioned in the CV. Each item is a single sentence."],
  "qualifications": ["Array of professional qualifications, certifications, and degrees. Include ACA, ACCA, CIMA, MBA, degree subject and institution if mentioned."],
  "sectors_worked_in": ["Array of all sectors the person has worked in across their career."],
  "skills_mentioned": ["Array of explicit skills, tools, or competencies mentioned in the CV."],
  "independent_experience": "Any mention of freelance, advisory, non-executive, or independent work. Single string summary, or null if none found.",
  "confidence_score": "Integer 0-100. How confidently was this CV parsed? 90-100 = clear CV. 60-89 = mostly clear. 30-59 = partial. 0-29 = not reliably parseable.",
  "parse_notes": "Caveats about what could not be reliably extracted, or null."
}`;

    // Call OpenAI P0
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 800,
        messages: [
          { role: "system", content: P0_SYSTEM },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const openAIData = await openAIResponse.json();
    const rawOutput = openAIData.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let cvExtract;
    try {
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      cvExtract = JSON.parse(jsonMatch ? jsonMatch[0] : rawOutput);
    } catch {
      return new Response(JSON.stringify({ error: "json_malformed", message: "Failed to parse CV extraction output", raw: rawOutput.slice(0, 200) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confidenceScore = cvExtract.confidence_score || 0;

    // Store in Supabase if user_id provided and confidence is sufficient
    if (userId && confidenceScore >= 30) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          cv_uploaded: true,
          cv_extract: cvExtract,
          cv_confidence_score: confidenceScore,
          cv_raw_text: truncatedText,
        }, { onConflict: "user_id" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        cv_extract: cvExtract,
        cv_uploaded: confidenceScore >= 30,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "internal_error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
