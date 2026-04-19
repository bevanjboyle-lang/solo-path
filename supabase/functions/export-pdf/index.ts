// export-pdf — Supabase Edge Function v3
// Fixes: verify_jwt false, core_report column name

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PDFDocument, rgb, PDFPage, PDFFont } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ExportRequest {
  report_id: string;
}

interface ReportData {
  id: string;
  user_id: string;
  core_report: Record<string, unknown>;  // FIXED: correct column name
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

// Text wrapping helper
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function generatePdf(reportData: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pageWidth = 595;
  const pageHeight = 842; // A4
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  const mintColor = rgb(0.184, 0.804, 0.690); // #2ECDB0
  const darkText = rgb(0.2, 0.2, 0.2);
  const lightGrey = rgb(0.7, 0.7, 0.7);

  const helvetica = await doc.embedFont('Helvetica');
  const helveticaBold = await doc.embedFont('Helvetica-Bold');

  let page = doc.addPage([pageWidth, pageHeight]);
  let yOffset = pageHeight - margin;

  function ensureSpace(needed: number): void {
    if (yOffset - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      yOffset = pageHeight - margin;
    }
  }

  function drawSection(title: string): void {
    ensureSpace(40);
    page.drawText(title, { x: margin, y: yOffset, size: 14, font: helveticaBold, color: darkText });
    yOffset -= 22;
  }

  function drawBody(text: string): void {
    const lines = wrapText(text, helvetica, 10, contentWidth);
    for (const line of lines) {
      ensureSpace(16);
      page.drawText(line, { x: margin, y: yOffset, size: 10, font: helvetica, color: darkText });
      yOffset -= 14;
    }
    yOffset -= 6;
  }

  function drawLabel(label: string, value: string): void {
    ensureSpace(16);
    const labelWidth = helveticaBold.widthOfTextAtSize(label + ': ', 10);
    page.drawText(label + ': ', { x: margin + 10, y: yOffset, size: 10, font: helveticaBold, color: darkText });
    const valLines = wrapText(value, helvetica, 10, contentWidth - 20 - labelWidth);
    page.drawText(valLines[0] || '', { x: margin + 10 + labelWidth, y: yOffset, size: 10, font: helvetica, color: darkText });
    yOffset -= 14;
    for (let i = 1; i < valLines.length; i++) {
      ensureSpace(14);
      page.drawText(valLines[i], { x: margin + 10 + labelWidth, y: yOffset, size: 10, font: helvetica, color: darkText });
      yOffset -= 14;
    }
  }

  // === TITLE PAGE ===
  page.drawText('SOLO', { x: margin, y: yOffset, size: 28, font: helveticaBold, color: mintColor });
  yOffset -= 40;
  page.drawText('Your Plan B Execution Plan', { x: margin, y: yOffset, size: 16, font: helveticaBold, color: darkText });
  yOffset -= 30;

  const generatedDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(`Generated: ${generatedDate}`, { x: margin, y: yOffset, size: 10, font: helvetica, color: lightGrey });
  yOffset -= 50;

  // FIXED: read from core_report (correct column name)
  const report = reportData.core_report as Record<string, unknown>;

  // === ARCHETYPE ===
  if (report.archetype && typeof report.archetype === 'object') {
    const arch = report.archetype as Record<string, unknown>;
    drawSection('Your Profile');
    if (arch.primary) drawLabel('Archetype', String(arch.primary));
    if (arch.secondary) drawLabel('Secondary', String(arch.secondary));
    if (arch.summary) drawBody(String(arch.summary));
    yOffset -= 10;
  }

  // === RECOMMENDATION ===
  if (report.recommendation && typeof report.recommendation === 'object') {
    const rec = report.recommendation as Record<string, unknown>;
    drawSection('Recommendation');
    if (rec.rationale) drawBody(String(rec.rationale));
    if (rec.key_condition) drawLabel('Key condition', String(rec.key_condition));
    yOffset -= 10;
  }

  // === OPTIONS ===
  if (report.options && Array.isArray(report.options)) {
    drawSection('Your Options');
    const options = report.options as Array<Record<string, unknown>>;
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      ensureSpace(60);
      const title = String(opt.model_name || opt.title || `Option ${i + 1}`);
      const score = opt.composite_score ? ` (Score: ${opt.composite_score})` : '';
      page.drawText(`${i + 1}. ${title}${score}`, { x: margin + 10, y: yOffset, size: 11, font: helveticaBold, color: darkText });
      yOffset -= 16;
      if (opt.positioning) drawBody(String(opt.positioning));
      if (opt.pricing && typeof opt.pricing === 'object') {
        const p = opt.pricing as Record<string, unknown>;
        if (p.range_low_gbp && p.range_high_gbp) {
          drawLabel('Pricing', `\u00a3${p.range_low_gbp} \u2013 \u00a3${p.range_high_gbp} ${p.cadence || ''}`);
        }
      }
      if (opt.target_buyer) drawLabel('Target buyer', String(opt.target_buyer));
      if (opt.time_to_first_revenue) drawLabel('Time to revenue', String(opt.time_to_first_revenue));
      yOffset -= 8;
    }
  }

  // === TRANSFERABLE VALUE ===
  if (report.transferable_value && typeof report.transferable_value === 'object') {
    const tv = report.transferable_value as Record<string, unknown>;
    drawSection('What You Can Sell');
    if (tv.what_they_can_sell) drawBody(String(tv.what_they_can_sell));
    if (tv.why_buyers_would_pay) drawLabel('Why buyers pay', String(tv.why_buyers_would_pay));
    if (Array.isArray(tv.credibility_assets)) {
      drawLabel('Credibility assets', (tv.credibility_assets as string[]).join('; '));
    }
    yOffset -= 10;
  }

  // === REALITY CHECK ===
  if (report.reality_check && typeof report.reality_check === 'object') {
    const rc = report.reality_check as Record<string, unknown>;
    drawSection('Reality Check');
    if (rc.most_likely_failure_mode) drawLabel('Most likely failure', String(rc.most_likely_failure_mode));
    if (rc.second_failure_mode) drawLabel('Second risk', String(rc.second_failure_mode));
    if (rc.what_they_will_find_hard) drawLabel('What will be hard', String(rc.what_they_will_find_hard));
    if (rc.honest_income_outlook) drawBody(String(rc.honest_income_outlook));
    yOffset -= 10;
  }

  // === FIRST STEPS ===
  if (report.first_steps && Array.isArray(report.first_steps)) {
    drawSection('First Steps');
    const steps = report.first_steps as string[];
    for (let i = 0; i < steps.length; i++) {
      ensureSpace(20);
      drawBody(`${i + 1}. ${steps[i]}`);
    }
    yOffset -= 10;
  }

  // === FOOTER on every page ===
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText('Solo \u2014 Career independence engine', { x: margin, y: 25, size: 8, font: helvetica, color: lightGrey });
    pages[i].drawText(`Page ${i + 1} of ${pages.length}`, { x: pageWidth - margin - 60, y: 25, size: 8, font: helvetica, color: lightGrey });
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const userId = getUserIdFromJwt(authHeader);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', response_text: 'Authentication failed. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as ExportRequest;
    const reportId = body.report_id;

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', response_text: 'report_id is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reportData = await getReport(reportId);

    if (reportData.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', response_text: 'You do not have permission to export this report.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBytes = await generatePdf(reportData);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Solo-Plan-${reportId}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in export-pdf function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', response_text: 'Something went wrong while generating your PDF. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
