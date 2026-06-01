// export-pdf v18 \u2014 F44 redesign (2026-06-01)
//
// Full document + editorial design. Previous versions exported only core_report
// (profile / options / reality check). v18 renders the COMPLETE deliverable:
// profile, recommendation, all options, what-you-can-sell, reality check, the
// AI-impact section, the full 30-day activation plan (phases \u2192 days \u2192 tasks),
// the first move, the network toolkit, and per-strand market snapshots \u2014 with a
// proper cover, mint-accented section headers, type hierarchy, and per-section
// page breaks. Reads core_report + activation_plan + market_snapshots +
// ai_impact_section. Defensive against missing fields (older reports degrade
// gracefully). Smart-punctuation sanitised for WinAnsi (pdf-lib StandardFonts).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PDFDocument, rgb, PDFPage, PDFFont } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

interface ExportRequest { report_id: string; }

interface ReportData {
  id: string;
  user_id: string;
  core_report: Record<string, unknown>;
  activation_plan: Record<string, unknown> | null;
  market_snapshots: Record<string, unknown> | null;
  ai_impact_section: Record<string, unknown> | null;
  created_at: string;
}

function getUserIdFromJwt(authHeader: string): string | null {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload)).sub;
  } catch { return null; }
}

async function getReport(reportId: string): Promise<ReportData> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/reports?id=eq.${reportId}&select=id,user_id,core_report,activation_plan,market_snapshots,ai_impact_section,created_at`,
    { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY } },
  );
  if (!response.ok) throw new Error(`Failed to fetch report: ${response.statusText}`);
  const data = await response.json();
  if (data.length === 0) throw new Error("Report not found");
  return data[0];
}

// Sanitise smart punctuation \u2192 WinAnsi-safe (pdf-lib StandardFonts crash on these).
function sanitise(s: string): string {
  return (s ?? "")
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");
}

// Single-line sanitised string for direct drawText calls (drawText throws on
// embedded newlines), used on the cover.
function oneLine(s: string): string {
  return sanitise(s).replace(/\n+/g, " ").trim();
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawpara of sanitise(text).split("\n")) {
    const words = rawpara.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
        out.push(line); line = word;
      } else { line = test; }
    }
    out.push(line);
  }
  return out;
}

async function generatePdf(reportData: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const PW = 595, PH = 842, M = 48;
  const CW = PW - 2 * M;

  const mint = rgb(0.184, 0.804, 0.690);
  const ink = rgb(0.11, 0.11, 0.11);
  const bodyC = rgb(0.23, 0.23, 0.23);
  const muted = rgb(0.55, 0.55, 0.55);
  const hair = rgb(0.9, 0.886, 0.863);
  const panel = rgb(0.953, 0.941, 0.918);

  const reg = await doc.embedFont("Helvetica");
  const bold = await doc.embedFont("Helvetica-Bold");
  const oblique = await doc.embedFont("Helvetica-Oblique");

  let page = doc.addPage([PW, PH]);
  let y = PH - M;

  const newPage = () => { page = doc.addPage([PW, PH]); y = PH - M; };
  const ensure = (need: number) => { if (y - need < M + 30) newPage(); };

  function text(s: string, opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; lh?: number; width?: number; indent?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.font ?? reg;
    const color = opts.color ?? bodyC;
    const lh = opts.lh ?? size * 1.42;
    const x = opts.x ?? (M + (opts.indent ?? 0));
    const width = opts.width ?? (CW - (opts.indent ?? 0));
    for (const line of wrapText(s, font, size, width)) {
      ensure(lh);
      page.drawText(line, { x, y, size, font, color });
      y -= lh;
    }
  }

  function gap(n = 8) { y -= n; }

  function sectionHeader(title: string, opts?: { newPageBefore?: boolean }) {
    if (opts?.newPageBefore && y < PH - M - 4) newPage();
    else ensure(64);
    y -= 10;
    page.drawText(sanitise(title), { x: M, y, size: 15, font: bold, color: ink });
    y -= 8;
    page.drawRectangle({ x: M, y, width: 46, height: 2.4, color: mint });
    y -= 18;
  }

  function subHeader(title: string) {
    ensure(28);
    y -= 4;
    text(title, { size: 11.5, font: bold, color: ink, lh: 15 });
    y -= 2;
  }

  function label(name: string, value: string, indent = 0) {
    if (!value) return;
    ensure(15);
    const lw = bold.widthOfTextAtSize(`${name}: `, 9.5);
    page.drawText(sanitise(`${name}: `), { x: M + indent, y, size: 9.5, font: bold, color: ink });
    const lines = wrapText(value, reg, 9.5, CW - indent - lw);
    page.drawText(lines[0] ?? "", { x: M + indent + lw, y, size: 9.5, font: reg, color: bodyC });
    y -= 13.5;
    for (let i = 1; i < lines.length; i++) { ensure(13.5); page.drawText(lines[i], { x: M + indent + lw, y, size: 9.5, font: reg, color: bodyC }); y -= 13.5; }
  }

  function bullet(s: string, indent = 12) {
    ensure(14);
    page.drawText("-", { x: M + indent, y, size: 10, font: reg, color: mint });
    const lines = wrapText(s, reg, 10, CW - indent - 12);
    page.drawText(lines[0] ?? "", { x: M + indent + 12, y, size: 10, font: reg, color: bodyC });
    y -= 14;
    for (let i = 1; i < lines.length; i++) { ensure(14); page.drawText(lines[i], { x: M + indent + 12, y, size: 10, font: reg, color: bodyC }); y -= 14; }
  }

  // Full-page section divider so the two halves of the deliverable read as
  // distinct parts (Part One: report, Part Two: the 30-day plan). Starts a
  // clean page, draws the part title centred, then drops y so the next
  // sectionHeader begins on a fresh page.
  function partDivider(kicker: string, title: string, subtitle: string) {
    newPage();
    y = PH * 0.58;
    page.drawText(sanitise(kicker.toUpperCase()), { x: M, y, size: 12, font: bold, color: mint });
    y -= 30;
    page.drawText(sanitise(title), { x: M, y, size: 30, font: bold, color: ink });
    y -= 16;
    page.drawRectangle({ x: M, y, width: 70, height: 3, color: mint });
    y -= 26;
    if (subtitle) text(subtitle, { size: 13, color: muted, lh: 19, width: CW - 80 });
    y = M + 20; // force the following section onto a new page
  }

  const core = (reportData.core_report ?? {}) as Record<string, any>;
  const arch = (core.archetype ?? {}) as Record<string, any>;

  // \u2500\u2500 COVER \u2500\u2500
  page.drawRectangle({ x: 0, y: PH - 8, width: PW, height: 8, color: mint });
  y = PH - 120;
  page.drawText("SOLO", { x: M, y, size: 30, font: bold, color: mint });
  y -= 46;
  page.drawText("Your Plan B Execution Plan", { x: M, y, size: 22, font: bold, color: ink });
  y -= 30;
  if (arch.primary) { page.drawText(oneLine(asStr(arch.primary)), { x: M, y, size: 13, font: reg, color: bodyC }); y -= 22; }
  page.drawRectangle({ x: M, y, width: 60, height: 2.4, color: mint });
  y -= 24;
  const genDate = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  page.drawText(sanitise(`Prepared ${genDate}`), { x: M, y, size: 10, font: reg, color: muted });
  y -= 60;

  // \u2500\u2500 PART ONE \u2500\u2500
  partDivider("Part One", "Your Report", "Who you are, the paths open to you, and an honest read on each.");

  // \u2500\u2500 PROFILE \u2500\u2500
  sectionHeader("Your Profile");
  if (arch.primary) label("Archetype", asStr(arch.primary));
  if (arch.secondary) label("Secondary", asStr(arch.secondary));
  gap(4);
  if (arch.summary) text(asStr(arch.summary));

  // \u2500\u2500 RECOMMENDATION \u2500\u2500
  const rec = (core.recommendation ?? {}) as Record<string, any>;
  if (rec.rationale || rec.key_condition) {
    sectionHeader("The Recommendation");
    if (rec.rationale) text(asStr(rec.rationale));
    if (rec.key_condition) { gap(4); label("Key condition", asStr(rec.key_condition)); }
  }

  // \u2500\u2500 OPTIONS \u2500\u2500
  const options = Array.isArray(core.options) ? core.options as Array<Record<string, any>> : [];
  if (options.length) {
    sectionHeader("Your Options");
    const sorted = [...options].sort((a, b) => Number(a.rank ?? 99) - Number(b.rank ?? 99));
    for (const opt of sorted) {
      ensure(56);
      gap(4);
      const rank = opt.rank ?? "";
      const nm = asStr(opt.model_name ?? opt.title ?? "Option");
      const score = opt.composite_score != null ? `  (score ${opt.composite_score})` : "";
      text(`${rank}. ${nm}${score}`, { size: 11.5, font: bold, color: ink, lh: 15 });
      if (opt.positioning) text(asStr(opt.positioning));
      const pricing = (opt.pricing ?? {}) as Record<string, any>;
      const priceVal = opt.day_rate_band
        ? asStr(opt.day_rate_band)
        : (pricing.range_low_gbp != null ? `\u00a3${pricing.range_low_gbp} - \u00a3${pricing.range_high_gbp} ${asStr(pricing.cadence ?? pricing.model ?? "")}`.trim() : "");
      if (priceVal) label("Pricing", priceVal, 4);
      if (opt.target_buyer) label("Target buyer", asStr(opt.target_buyer), 4);
      if (opt.primary_move_type) label("First move", asStr(opt.primary_move_type), 4);
      if (opt.time_to_first_revenue) label("Time to revenue", asStr(opt.time_to_first_revenue), 4);
    }
  }

  // \u2500\u2500 WHAT YOU CAN SELL \u2500\u2500
  const tv = (core.transferable_value ?? {}) as Record<string, any>;
  if (tv.what_they_can_sell || tv.why_buyers_would_pay || Array.isArray(tv.credibility_assets)) {
    sectionHeader("What You Can Sell");
    if (tv.what_they_can_sell) text(asStr(tv.what_they_can_sell));
    if (tv.why_buyers_would_pay) { gap(4); label("Why buyers pay", asStr(tv.why_buyers_would_pay)); }
    if (Array.isArray(tv.credibility_assets) && tv.credibility_assets.length) {
      gap(4); subHeader("Credibility assets");
      for (const a of tv.credibility_assets) bullet(asStr(a));
    }
  }

  // \u2500\u2500 REALITY CHECK \u2500\u2500
  const rcheck = (core.reality_check ?? {}) as Record<string, any>;
  if (Object.keys(rcheck).length) {
    sectionHeader("Reality Check");
    if (rcheck.most_likely_failure_mode) label("Most likely failure", asStr(rcheck.most_likely_failure_mode));
    if (rcheck.second_failure_mode) { gap(3); label("Second risk", asStr(rcheck.second_failure_mode)); }
    if (rcheck.what_they_will_find_hard) { gap(3); label("What will be hard", asStr(rcheck.what_they_will_find_hard)); }
    if (rcheck.honest_income_outlook) { gap(4); text(asStr(rcheck.honest_income_outlook)); }
  }

  // \u2500\u2500 AI IMPACT \u2500\u2500
  const ai = (reportData.ai_impact_section ?? {}) as Record<string, any>;
  const aiParts = ["part_1", "part_2", "part_3"].map((k) => ai[k]).filter(Boolean) as Array<Record<string, any>>;
  if (aiParts.length) {
    sectionHeader("How AI Is Changing Your Field", { newPageBefore: true });
    for (const p of aiParts) {
      if (p.heading || p.title) subHeader(asStr(p.heading ?? p.title));
      if (p.content) { text(asStr(p.content)); gap(4); }
    }
  }

  // \u2500\u2500 30-DAY ACTIVATION PLAN \u2500\u2500
  const apOuter = (reportData.activation_plan ?? {}) as Record<string, any>;
  const ap = (apOuter.activation_plan ?? {}) as Record<string, any>;
  const phases = Array.isArray(ap.phases) ? ap.phases as Array<Record<string, any>> : [];
  if (phases.length || ap.summary) {
    partDivider("Part Two", "Your 30-Day Plan", "Exactly what to do, day by day - with the messages to send and the market read behind each move.");
    sectionHeader("Your 30-Day Activation Plan", { newPageBefore: true });
    if (ap.summary) text(asStr(ap.summary));
    if (ap.success_metric) { gap(4); label("Success metric", asStr(ap.success_metric)); }
    if (ap.pacing_note) label("Pacing", asStr(ap.pacing_note));
    gap(6);
    for (const ph of phases) {
      ensure(48);
      gap(6);
      const phName = asStr(ph.phase ?? ph.name ?? "Phase");
      text(phName, { size: 12, font: bold, color: mint, lh: 16 });
      if (ph.goal) label("Goal", asStr(ph.goal), 0);
      if (ph.strand_focus) label("Focus", asStr(ph.strand_focus), 0);
      gap(2);
      const days = Array.isArray(ph.days_detail) ? ph.days_detail as Array<Record<string, any>> : [];
      for (const d of days) {
        ensure(26);
        gap(3);
        const dayRaw = asStr(d.day ?? "").trim();
        const dayHead = /^day\b/i.test(dayRaw) ? dayRaw : `Day ${dayRaw}`;
        const dayLabel = d.label ? ` - ${asStr(d.label)}` : "";
        const t = d.time_required ? `   (${asStr(d.time_required)})` : "";
        text(`${dayHead}${dayLabel}${t}`, { size: 10.5, font: bold, color: ink, lh: 14, indent: 6 });
        const tasks = Array.isArray(d.tasks) ? d.tasks as Array<Record<string, any>> : [];
        for (const tk of tasks) {
          const desc = asStr(tk.description ?? tk.move ?? tk.task_type ?? "");
          if (desc) bullet(desc, 18);
          if (tk.outreach_draft) { text(`Draft: ${asStr(tk.outreach_draft)}`, { size: 9, font: oblique, color: muted, indent: 30 }); }
        }
      }
    }
  }

  // \u2500\u2500 FIRST MOVE \u2500\u2500
  const fm = (apOuter.first_move ?? {}) as Record<string, any>;
  if (Object.keys(fm).length) {
    sectionHeader("Your First Move", { newPageBefore: true });
    if (fm.action) text(asStr(fm.action), { size: 11.5, font: bold, color: ink, lh: 16 });
    if (fm.why_first) { gap(2); label("Why first", asStr(fm.why_first)); }
    if (fm.window) label("Window", asStr(fm.window));
    const move = (fm.move ?? {}) as Record<string, any>;
    if (move.subject) label("Subject", asStr(move.subject));
    if (move.tone_note) label("Tone", asStr(move.tone_note));
    if (move.draft) { gap(4); subHeader("Draft"); text(asStr(move.draft)); }
    if (fm.follow_up_prompt) { gap(4); label("Follow-up", asStr(fm.follow_up_prompt)); }
  }

  // \u2500\u2500 NETWORK TOOLKIT \u2500\u2500
  const nt = (apOuter.network_toolkit ?? {}) as Record<string, any>;
  const templates = Array.isArray(nt.templates) ? nt.templates as Array<Record<string, any>> : [];
  if (templates.length || nt.intro) {
    sectionHeader("Network Toolkit", { newPageBefore: true });
    if (nt.intro) { text(asStr(nt.intro)); gap(4); }
    for (const tpl of templates) {
      ensure(40);
      gap(4);
      subHeader(asStr(tpl.use_case ?? tpl.type ?? "Template"));
      if (tpl.subject) label("Subject", asStr(tpl.subject), 0);
      if (tpl.content) text(asStr(tpl.content));
    }
  }

  // \u2500\u2500 MARKET SNAPSHOTS \u2500\u2500
  const ms = (reportData.market_snapshots ?? {}) as Record<string, any>;
  const strandKeys = Object.keys(ms);
  if (strandKeys.length) {
    sectionHeader("Local Market Snapshots", { newPageBefore: true });
    text("Indicative research based on general market knowledge and reasoning - not primary or live data.", { size: 9, font: oblique, color: muted });
    gap(6);
    for (const k of strandKeys) {
      const env = (ms[k] ?? {}) as Record<string, any>;
      const sec = (env.sections ?? {}) as Record<string, any>;
      if (!Object.keys(sec).length) continue;
      ensure(44);
      gap(6);
      text(`${asStr(env.model_name ?? k)}  -  ${asStr(env.location ?? "United Kingdom")}`, { size: 12, font: bold, color: mint, lh: 16 });
      gap(2);
      const secOrder: Array<[string, string]> = [
        ["demand_signal", "Demand signal"],
        ["pricing_benchmark", "Pricing benchmark"],
        ["competitor_landscape", "Competitor landscape"],
        ["market_entry_insight", "Market entry insight"],
        ["honest_assessment", "Honest assessment"],
      ];
      for (const [key, lbl] of secOrder) {
        if (sec[key]) { subHeader(lbl); text(asStr(sec[key])); }
      }
    }
  }

  // \u2500\u2500 FOOTER \u2500\u2500
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText("Solo - Career independence engine", { x: M, y: 28, size: 8, font: reg, color: muted });
    pages[i].drawText(`Page ${i + 1} of ${pages.length}`, { x: PW - M - 64, y: 28, size: 8, font: reg, color: muted });
  }

  return await doc.save();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = getUserIdFromJwt(req.headers.get("Authorization") || "");
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication failed. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as ExportRequest;
    const reportId = body.report_id;
    if (!reportId) {
      return new Response(
        JSON.stringify({ error: "Invalid request", response_text: "report_id is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reportData = await getReport(reportId);
    if (reportData.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden", response_text: "You do not have permission to export this report." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pdfBytes = await generatePdf(reportData);
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Solo-Plan-${reportId}.pdf"`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in export-pdf function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", response_text: "Something went wrong while generating your PDF. Please try again.", details: String((error as Error)?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
