/*
 * weekly-heartbeat v1 — 2026-08-18 (Phase D, blueprint Move 4)
 *
 * The living dossier's Monday pulse. Two jobs, both cheap:
 *
 *   1. EVIDENCE REFRESH (deterministic, no AI). For every live report,
 *      re-run the same evidence attach that generate-report v46 performs
 *      at generation time, against THIS fortnight's radar_items. Results
 *      go to report_evidence_refresh (one row per report per week,
 *      append-only; core_report is never touched). The frontend overlays
 *      the latest row, so a returning reader sees "Updated 18 August"
 *      and this week's live signals instead of a snapshot from purchase
 *      day. Works on pre-v46 reports too: their options carry
 *      business_model_id, which is all the attach needs.
 *
 *   2. HEARTBEAT (one gpt-5.4-mini call per active tracker per week).
 *      For users mid-plan: radar matches for their focus strands plus a
 *      single market-movement sentence, stored on their report's refresh
 *      row. The weekly friction review (separate function, Monday 08:00)
 *      already reviews their week and sets next week's focus; the two
 *      cards compose on /plan. The market note is validated against the
 *      input digest (no invented £ figures) and falls back to a
 *      deterministic sentence rather than shipping an unchecked one.
 *
 * "Live" means: report created in the last 37 days, OR an active paid
 * subscription, OR an active tracker within its plan window (+grace).
 * Lapsed dossiers stop refreshing; that is the £19/month mechanic.
 *
 * Called by pg_cron Mondays 07:50 UTC (after generate-radar at 07:30)
 * with {"cron": true}. Manual path: {"report_id": "..."} requires the
 * authed owner, or service-role/cron caller; used for testing.
 *
 * verify_jwt: false in config.toml (pg_net posts without user auth); the
 * cron SQL sends the anon Bearer anyway so it survives an accidental
 * verify_jwt=true flip from an MCP redeploy.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.52.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const FUNCTION_VERSION = "weekly-heartbeat-v1";
const OPENAI_MODEL = "gpt-5.4-mini";
const RADAR_PER_OPTION_MAX = 2;
const STRAND_MATCHES_MAX = 3;
const LIVE_WINDOW_DAYS = 37; // 30-day dossier plus a grace week
const TRACKER_GRACE_DAY_MAX = 37;

/** kb_models.category (16) → radar_items.category names. Mirror of
 * generate-report v46.1; keep the two in step when categories move. */
const MODEL_CAT_TO_RADAR_CATS: Record<string, string[]> = {
  "Finance": ["Finance", "Finance & Accounting"],
  "Risk & Compliance": ["Risk & Governance"],
  "Delivery & Transformation": ["Change & Delivery"],
  "Operations": ["Operations & Efficiency"],
  "Strategy": ["Strategy & Advisory"],
  "HR & People": ["HR & People"],
  "Tech & Digital": ["Tech & Digital"],
  "Legal": ["Legal"],
  "Marketing & Communications": ["Marketing & Communications"],
  "Sales & Commercial": ["Sales & Commercial"],
  "Procurement & Supply Chain": ["Procurement & Supply Chain"],
  "Healthcare & Life Sciences": ["Healthcare & Life Sciences"],
  "ESG & Sustainability": ["ESG & Sustainability"],
  "Property & Real Estate": ["Property & Real Estate"],
  "Public Sector & Policy": ["Public Sector & Policy"],
  "Customer Experience & Service Design": ["Customer Experience & Service Design"],
};

interface RadarItem {
  id: string;
  category: string;
  source_type: string | null;
  title: string;
  summary: string | null;
  url: string | null;
  source_name: string | null;
  buyer: string | null;
  value_text: string | null;
  deadline: string | null;
  week_start: string | null;
}

function radarItemScore(r: RadarItem): number {
  return (r.value_text ? 2 : 0) + (r.deadline ? 1 : 0);
}

interface KbModelSlim { id: string; name: string; category: string | null }
interface ArchetypeSlim { name: string; day_rate: string | null; retainer_monthly: string | null }

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

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mondayOf(d: Date): Date {
  const result = new Date(d);
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/* ── Evidence attach (port of generate-report v46.1 attachOptionEvidence,
 *    reshaped to return a map instead of mutating options, and to carry
 *    the radar item id + is_new so weekly diffs are precise). ── */
function buildEvidenceByOption(
  options: Array<Record<string, unknown>>,
  modelIndex: Map<string, KbModelSlim>,
  radar: RadarItem[],
  rateLine: string | null,
  previousIds: Set<string>,
): { byOption: Record<string, unknown>; attachedIds: string[] } {
  const usedIds = new Set<string>();
  const attachedIds: string[] = [];
  const byOption: Record<string, unknown> = {};
  options.forEach((o, idx) => {
    const key = String(o.rank ?? idx + 1);
    const model = modelIndex.get(String(o.business_model_id ?? ""));
    const cats = model?.category ? MODEL_CAT_TO_RADAR_CATS[model.category] ?? [model.category] : [];
    const pool = radar.filter((r) => cats.includes(r.category)).sort((a, b) => radarItemScore(b) - radarItemScore(a));
    const fresh = pool.filter((r) => !usedIds.has(r.id));
    const picked = (fresh.length > 0 ? fresh : pool).slice(0, RADAR_PER_OPTION_MAX);
    picked.forEach((r) => { usedIds.add(r.id); attachedIds.push(r.id); });
    const evidence: Array<Record<string, unknown>> = picked.map((r) => ({
      kind: "radar",
      id: r.id,
      is_new: !previousIds.has(r.id),
      title: r.title,
      summary: r.summary ? String(r.summary).slice(0, 280) : null,
      source_name: r.source_name,
      source_type: r.source_type,
      buyer: r.buyer,
      value_text: r.value_text,
      deadline: r.deadline,
      week_start: r.week_start,
      url: r.url,
    }));
    if (rateLine) evidence.push({ kind: "rate", text: rateLine });
    if (picked.length === 0) {
      evidence.push({
        kind: "coverage",
        text: "No live Radar signal matched this route this week. The Radar refreshes every Monday; thin coverage is stated rather than papered over.",
      });
    }
    byOption[key] = { business_model_id: o.business_model_id ?? null, evidence };
  });
  return { byOption, attachedIds };
}

/* ── Market note: one mini call, hard-validated, deterministic fallback. ── */
function violatesVoice(note: string, digest: string): string | null {
  if (note.includes("—")) return "em dash";
  if (/\bnot\s+[^.,;]{0,40},?\s*but\b/i.test(note)) return "not-x-but-y construction";
  const words = note.trim().split(/\s+/).length;
  if (words < 10 || words > 55) return `length ${words} words`;
  for (const m of note.matchAll(/£[\d,.]+[km]?/gi)) {
    if (!digest.includes(m[0])) return `invented figure ${m[0]}`;
  }
  return null;
}

async function generateMarketNote(
  openai: OpenAI,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  args: { strandNames: string[]; items: RadarItem[]; reportId: string; userId: string },
): Promise<{ note: string; source: "model" | "deterministic" }> {
  const digest = args.items.slice(0, 10).map((r) => {
    const bits = [
      `"${r.title}" (${r.source_name || r.source_type || "Radar"}, ${r.category}, week of ${r.week_start})`,
      r.buyer ? `buyer: ${r.buyer}` : null,
      r.value_text ? `value: ${r.value_text}` : null,
      r.deadline ? `deadline: ${String(r.deadline).slice(0, 10)}` : null,
      r.summary ? `note: ${String(r.summary).slice(0, 160)}` : null,
    ].filter(Boolean);
    return "- " + bits.join(" | ");
  }).join("\n");

  const fallback = (() => {
    const n = args.items.length;
    const top = args.items[0];
    if (n === 0 || !top) {
      return "A quiet week on the Radar for your strands; the next sweep lands Monday.";
    }
    return `The Radar logged ${n} signal${n === 1 ? "" : "s"} relevant to your strands this week, led by "${top.title}" (${top.source_name || top.category}).`;
  })();

  if (args.items.length === 0) return { note: fallback, source: "deterministic" };

  const t0 = Date.now();
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_completion_tokens: 200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "market_note",
          strict: true,
          schema: {
            type: "object",
            properties: { market_note: { type: "string" } },
            required: ["market_note"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: [
            "You write one sentence for a UK professional's weekly market pulse. British English, plain prose, second person where natural.",
            "Rules: exactly one sentence, 15 to 45 words. Name at most one signal from the list, in quotes, exactly as titled. Never state a monetary figure unless it appears verbatim in the list. No em dashes. No hype words (exciting, incredible, game-changing). Do not use the construction 'not X, but Y'.",
            "The sentence should say what moved in their market this week and why it matters for someone building these income strands.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Strands they are building: ${args.strandNames.join("; ")}\n\nThis week's Radar signals in their categories:\n${digest}`,
        },
      ],
    });
    try {
      const usage = completion.usage;
      const rates = { input: 0.4, output: 1.5 };
      const cost = usage ? ((usage.prompt_tokens ?? 0) * rates.input + (usage.completion_tokens ?? 0) * rates.output) / 1_000_000 : null;
      await supabase.from("prompt_runs").insert({
        prompt_id: "PD-heartbeat-market-note",
        function_name: "weekly-heartbeat",
        user_id: args.userId,
        report_id: args.reportId,
        model: OPENAI_MODEL,
        input_token_count: usage?.prompt_tokens ?? null,
        output_token_count: usage?.completion_tokens ?? null,
        cost_estimate_gbp: cost,
        latency_ms: Date.now() - t0,
        guardrails_passed: true,
      });
    } catch { /* telemetry never blocks */ }
    const raw = completion.choices[0]?.message?.content;
    const parsed = raw ? (JSON.parse(raw) as { market_note?: string }) : {};
    const note = (parsed.market_note || "").trim();
    const violation = note ? violatesVoice(note, digest) : "empty";
    if (!violation) return { note, source: "model" };
    console.warn(`weekly-heartbeat market note rejected (${violation}); using deterministic fallback`);
    return { note: fallback, source: "deterministic" };
  } catch (e) {
    console.warn("weekly-heartbeat market note call failed:", (e as Error)?.message ?? e);
    return { note: fallback, source: "deterministic" };
  }
}

/* ── Main ── */
interface RequestBody { cron?: boolean; report_id?: string; force?: boolean }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    let body: RequestBody = {};
    try { body = await req.json(); } catch { /* {} is fine for cron */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );
    const weekStartIso = mondayOf(new Date()).toISOString().slice(0, 10);

    /* Resolve target reports. */
    interface ReportRow { id: string; user_id: string | null; created_at: string; core_report: Record<string, unknown> | null }
    let targets: ReportRow[] = [];

    if (body.report_id) {
      // Manual path: the authed owner may refresh their own report on demand.
      // A caller presenting only the anon key gets 403 unless the report is
      // ownerless (test rows). Cron/service callers use cron:true instead.
      const { data, error } = await supabase
        .from("reports")
        .select("id, user_id, created_at, core_report")
        .eq("id", body.report_id)
        .eq("status", "complete")
        .maybeSingle();
      if (error || !data) return jsonResp(404, { error: "Report not found or not complete" });
      const callerId = getUserIdFromJwt(req.headers.get("authorization"));
      if (data.user_id && callerId !== data.user_id) {
        return jsonResp(403, { error: "Forbidden", response_text: "You do not own this report." });
      }
      targets = [data as ReportRow];
    } else if (body.cron === true) {
      // Liveness rule: recent purchase, active subscription, or an active
      // tracker inside its window (+grace). Lapsed dossiers stop refreshing.
      const liveCutoff = new Date(Date.now() - LIVE_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
      const { data: trackers } = await supabase
        .from("tracker_sessions")
        .select("report_id, user_id, subscription_status, current_day, status")
        .eq("status", "active");
      const liveTrackerReportIds = new Set(
        ((trackers || []) as Array<{ report_id: string; subscription_status: string | null; current_day: number }>)
          .filter((t) => t.subscription_status === "active" || (t.current_day ?? 0) <= TRACKER_GRACE_DAY_MAX)
          .map((t) => t.report_id),
      );
      const { data: recent, error } = await supabase
        .from("reports")
        .select("id, user_id, created_at, core_report")
        .eq("status", "complete")
        .gte("created_at", liveCutoff);
      if (error) return jsonResp(500, { error: error.message });
      targets = [...((recent || []) as ReportRow[])];
      const have = new Set(targets.map((r) => r.id));
      const extraIds = Array.from(liveTrackerReportIds).filter((id) => !have.has(id));
      if (extraIds.length > 0) {
        const { data: extra } = await supabase
          .from("reports")
          .select("id, user_id, created_at, core_report")
          .in("id", extraIds)
          .eq("status", "complete");
        targets.push(...((extra || []) as ReportRow[]));
      }
      if (!body.force) {
        const { data: done } = await supabase
          .from("report_evidence_refresh")
          .select("report_id")
          .eq("week_start", weekStartIso)
          .in("report_id", targets.length > 0 ? targets.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]);
        const doneSet = new Set(((done || []) as Array<{ report_id: string }>).map((d) => d.report_id));
        targets = targets.filter((r) => !doneSet.has(r.id));
      }
    } else {
      return jsonResp(400, { error: "Provide report_id (manual) or cron:true (batch)." });
    }

    if (targets.length === 0) {
      return jsonResp(200, { success: true, refreshed: 0, heartbeats: 0, response_text: "Nothing to refresh this week." });
    }

    /* Shared reference data: one fetch each, filtered in code. */
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const [{ data: modelRows }, { data: archRows }, { data: radarRows }] = await Promise.all([
      supabase.from("kb_models").select("id, name, category"),
      supabase.from("kb_archetypes").select("name, day_rate, retainer_monthly"),
      supabase
        .from("radar_items")
        .select("id, category, source_type, title, summary, url, source_name, buyer, value_text, deadline, week_start")
        .gte("week_start", twoWeeksAgo)
        .order("week_start", { ascending: false })
        .limit(200),
    ]);
    const modelIndex = new Map<string, KbModelSlim>();
    for (const m of (modelRows || []) as KbModelSlim[]) modelIndex.set(m.id, m);
    const modelByName = new Map<string, KbModelSlim>();
    for (const m of (modelRows || []) as KbModelSlim[]) modelByName.set(m.name.toLowerCase(), m);
    const archByName = new Map<string, ArchetypeSlim>();
    for (const a of (archRows || []) as ArchetypeSlim[]) archByName.set(a.name, a);
    const radar = (radarRows || []) as RadarItem[];

    /* Active trackers by report, for the heartbeat layer. */
    const { data: activeTrackers } = await supabase
      .from("tracker_sessions")
      .select("id, report_id, user_id, strand_status, subscription_status, current_day")
      .eq("status", "active");
    const trackerByReport = new Map<string, { id: string; user_id: string; strand_status: Record<string, { status?: string; model_name?: string }> | null }>();
    for (const t of (activeTrackers || []) as Array<{ id: string; report_id: string; user_id: string; strand_status: Record<string, { status?: string; model_name?: string }> | null; subscription_status: string | null; current_day: number }>) {
      if (t.subscription_status === "active" || (t.current_day ?? 0) <= TRACKER_GRACE_DAY_MAX) {
        trackerByReport.set(t.report_id, { id: t.id, user_id: t.user_id, strand_status: t.strand_status });
      }
    }

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") || "" });

    /* Per-report refresh. */
    const results: Array<{ report_id: string; status: string; new_items?: number; heartbeat?: boolean; error?: string }> = [];
    for (const report of targets) {
      try {
        const cr = report.core_report;
        const options = Array.isArray(cr?.options) ? (cr!.options as Array<Record<string, unknown>>) : [];
        if (options.length === 0) {
          results.push({ report_id: report.id, status: "skipped_no_options" });
          continue;
        }
        // Previous week's attached ids → is_new flags and the delta count.
        const { data: prevRow } = await supabase
          .from("report_evidence_refresh")
          .select("meta")
          .eq("report_id", report.id)
          .lt("week_start", weekStartIso)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        const previousIds = new Set<string>(
          Array.isArray((prevRow?.meta as Record<string, unknown> | undefined)?.attached_ids)
            ? ((prevRow!.meta as Record<string, unknown>).attached_ids as string[])
            : [],
        );

        const archetypeName = String((cr?.archetype as Record<string, unknown> | undefined)?.primary ?? "");
        const arch = archByName.get(archetypeName) ?? null;
        const rateLine = arch
          ? `Calibrated bands for ${arch.name}: day rate ${arch.day_rate}${arch.retainer_monthly ? `, retainer ${arch.retainer_monthly}` : ""} (Solo knowledge bank, hand-reviewed).`
          : null;

        const { byOption, attachedIds } = buildEvidenceByOption(options, modelIndex, radar, rateLine, previousIds);
        const newIds = attachedIds.filter((id) => !previousIds.has(id));

        /* Heartbeat for this report's active tracker, if any. */
        let heartbeat: Record<string, unknown> | null = null;
        const tracker = trackerByReport.get(report.id);
        if (tracker) {
          const strandNames = Object.values(tracker.strand_status || {})
            .filter((s) => s && s.status === "active" && typeof s.model_name === "string")
            .map((s) => String(s.model_name));
          const strandCats = new Set<string>();
          for (const n of strandNames) {
            const m = modelByName.get(n.toLowerCase());
            const cats = m?.category ? MODEL_CAT_TO_RADAR_CATS[m.category] ?? [m.category] : [];
            cats.forEach((c) => strandCats.add(c));
          }
          const strandPool = radar
            .filter((r) => strandCats.has(r.category))
            .sort((a, b) => radarItemScore(b) - radarItemScore(a));
          const strandMatches = strandPool.slice(0, STRAND_MATCHES_MAX).map((r) => ({
            id: r.id,
            is_new: !previousIds.has(r.id),
            title: r.title,
            summary: r.summary ? String(r.summary).slice(0, 280) : null,
            source_name: r.source_name,
            source_type: r.source_type,
            buyer: r.buyer,
            value_text: r.value_text,
            deadline: r.deadline,
            week_start: r.week_start,
            url: r.url,
            category: r.category,
          }));
          const { note, source } = await generateMarketNote(openai, supabase, {
            strandNames,
            items: strandPool,
            reportId: report.id,
            userId: tracker.user_id,
          });
          heartbeat = {
            tracker_session_id: tracker.id,
            strand_names: strandNames,
            strand_matches: strandMatches,
            market_note: note,
            market_note_source: source,
            generated_at: new Date().toISOString(),
          };
        }

        const { error: upsertError } = await supabase
          .from("report_evidence_refresh")
          .upsert(
            {
              report_id: report.id,
              week_start: weekStartIso,
              evidence_by_option: byOption,
              heartbeat,
              meta: {
                function_version: FUNCTION_VERSION,
                attached_ids: attachedIds,
                new_ids: newIds,
                radar_items_available: radar.length,
                options_covered: Object.keys(byOption).length,
              },
            },
            { onConflict: "report_id,week_start" },
          );
        if (upsertError) throw new Error(`upsert failed: ${upsertError.message}`);
        results.push({ report_id: report.id, status: "refreshed", new_items: newIds.length, heartbeat: !!heartbeat });
      } catch (err) {
        console.error(`weekly-heartbeat failed for report ${report.id}:`, err);
        results.push({ report_id: report.id, status: "failed", error: String(err) });
      }
    }

    const refreshed = results.filter((r) => r.status === "refreshed").length;
    const heartbeats = results.filter((r) => r.heartbeat).length;
    console.log(`weekly-heartbeat: ${refreshed}/${targets.length} refreshed, ${heartbeats} heartbeat(s), ${Date.now() - startedAt}ms`);
    return jsonResp(200, {
      success: true,
      week_start: weekStartIso,
      refreshed,
      heartbeats,
      failed: results.filter((r) => r.status === "failed").length,
      results,
      response_text: `Refreshed ${refreshed} report(s), ${heartbeats} heartbeat(s), in ${Date.now() - startedAt}ms.`,
    });
  } catch (error) {
    console.error("weekly-heartbeat unhandled error:", error);
    return jsonResp(500, { error: String(error) });
  }
});
