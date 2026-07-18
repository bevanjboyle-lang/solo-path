// send-funnel-digest v1 (2026-07-18, Day Zero C0.5 tail)
//
// The Monday-morning funnel read: last-7-days numbers from the product's own
// events table plus capture, nurture and purchase state, emailed to the owner
// at 07:45 UTC before the Monday approval session. Operational mail to the
// operator; no consent machinery involved. Always sends when invoked (the
// digest is the point), so a manual POST doubles as a smoke test.
// verify_jwt=false (cron-callable).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1-funnel-digest";
const FROM_ADDRESS = "Solo <hello@solo-plan.com>";
const DEFAULT_OWNER_EMAIL = "bevan.j.boyle@gmail.com";
const CAPTURE_GATE = 0.25; // Day Zero gate: diagnostic completion → email captured ≥ 25%

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 14px 6px 0;color:#4a4a4a;font-size:14px;">${label}</td><td style="padding:6px 0;color:#1A1915;font-size:14px;font-weight:600;text-align:right;">${value}</td></tr>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("WATCHDOG_EMAIL") || DEFAULT_OWNER_EMAIL;
    if (!resendKey) return json({ skipped: true, reason: "no_resend_key" });

    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // Diagnostic funnel events, grouped.
    const { data: events } = await supabase
      .from("events")
      .select("event_type")
      .gte("created_at", since)
      .like("event_type", "diagnostic_%");
    const counts: Record<string, number> = {};
    for (const e of events ?? []) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    const started = counts["diagnostic_started"] ?? 0;
    const completed = counts["diagnostic_completed"] ?? 0;
    const captured = counts["diagnostic_email_captured"] ?? 0;
    const toQuestionnaire = counts["diagnostic_to_questionnaire"] ?? 0;

    // New Signal subscribers by source.
    const { data: subs } = await supabase
      .from("signal_subscribers")
      .select("source")
      .gte("created_at", since);
    const subsBySource: Record<string, number> = {};
    for (const s of subs ?? []) subsBySource[s.source ?? "unknown"] = (subsBySource[s.source ?? "unknown"] ?? 0) + 1;
    const subsTotal = (subs ?? []).length;

    // Nurture sends + sequence states.
    const { count: nurtureSent } = await supabase
      .from("email_send_log")
      .select("id", { count: "exact", head: true })
      .like("message_key", "diagnostic_nurture_%")
      .eq("status", "sent")
      .gte("created_at", since);
    const { data: nurtureRows } = await supabase.from("diagnostic_nurture").select("status");
    const nurtureStates: Record<string, number> = {};
    for (const n of nurtureRows ?? []) nurtureStates[n.status] = (nurtureStates[n.status] ?? 0) + 1;

    // Purchases (paid-status reports created in the window).
    const { count: purchases } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_selection", "generating_plan", "complete"])
      .gte("created_at", since);

    const captureRate = completed > 0 ? captured / completed : null;
    const captureLine =
      captureRate === null
        ? "No completions yet, so no capture rate to read."
        : `${(captureRate * 100).toFixed(0)}% against the ${(CAPTURE_GATE * 100).toFixed(0)}% gate ${captureRate >= CAPTURE_GATE ? "(holding)" : "(below the gate)"}`;

    const subsDetail = Object.entries(subsBySource).map(([k, v]) => `${k}: ${v}`).join(" · ") || "none";
    const nurtureDetail = Object.entries(nurtureStates).map(([k, v]) => `${k}: ${v}`).join(" · ") || "none enrolled";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF9F7;">
        <div style="margin-bottom:24px;"><span style="color:#15735F;font-weight:800;font-size:20px;">Solo</span>
        <span style="color:#8a857d;font-size:12px;margin-left:10px;text-transform:uppercase;letter-spacing:0.14em;">Funnel digest</span></div>
        <h1 style="color:#1A1915;font-size:20px;font-weight:700;margin:0 0 6px;">The last seven days</h1>
        <p style="color:#8a857d;font-size:13px;margin:0 0 20px;">Generated ${new Date().toISOString().slice(0, 10)} · automated Monday digest (C0.5)</p>
        <table style="border-collapse:collapse;width:100%;background:#ffffff;border:1px solid #E5E2DC;padding:8px;">
          <tr><td colspan="2" style="padding:12px 14px 4px;color:#8a857d;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;">Diagnostic funnel</td></tr>
          ${row("Started", String(started))}
          ${row("Completed all six questions", String(completed))}
          ${row("Emails captured", String(captured))}
          ${row("Capture rate", captureLine)}
          ${row("Continued into the questionnaire", String(toQuestionnaire))}
          <tr><td colspan="2" style="padding:12px 14px 4px;color:#8a857d;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;">List and nurture</td></tr>
          ${row("New Signal subscribers", `${subsTotal} (${subsDetail})`)}
          ${row("Nurture emails sent", String(nurtureSent ?? 0))}
          ${row("Nurture sequences", nurtureDetail)}
          <tr><td colspan="2" style="padding:12px 14px 4px;color:#8a857d;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;">Revenue</td></tr>
          ${row("Paid reports started", String(purchases ?? 0))}
        </table>
        <p style="color:#8a857d;font-size:12px;line-height:1.6;margin-top:20px;">Deeper cuts (per-page views, UTM attribution) live in PostHog. This digest reads from the product's own events, keyed by client session.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [ownerEmail],
        subject: `Solo funnel digest: ${captured} captured, ${purchases ?? 0} paid (7 days)`,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} resend error:`, res.status, (await res.text()).slice(0, 300));
      return json({ error: "send_failed" }, 500);
    }
    console.log(`${FUNCTION_VERSION} digest sent to ${ownerEmail}`);
    return json({ ok: true, started, completed, captured, toQuestionnaire, subsTotal, nurtureSent: nurtureSent ?? 0, purchases: purchases ?? 0 });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, (e as Error)?.message ?? String(e));
    return json({ error: "server_error" }, 500);
  }
});
