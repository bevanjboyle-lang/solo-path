// weekly-cron-watchdog v1 — 2026-07-15 (Day Zero C0.2)
//
// Why this exists: the Signal generator failed silently every Monday for six
// weeks (rotation jam, fixed in generate-signal-edition v2) and nobody knew,
// and delete-old-cvs has been failing nightly. This function makes silent
// scheduled-job failure impossible: it checks that the weekly machines
// actually produced output and that no cron run failed, and emails Bevan
// when something is wrong.
//
// Checks:
//   1. signal_editions: at least one row created in the last 8 days.
//   2. radar_items: at least one row created in the last 8 days.
//   3. public.get_recent_cron_failures(): zero failed cron runs in 8 days.
//
// Behaviour: sends an email via Resend ONLY when a problem is found, or when
// invoked with body {"force": true} (used for smoke tests — sends a status
// email either way). Operational mail to the owner; not a marketing send.
//
// Triggered by: pg_cron job `weekly-cron-watchdog-tuesday` (Tue 09:00 UTC),
// after Monday's 07:30-08:15 job wave. Manual invocation any time.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1";
const FROM_ADDRESS = "Solo <hello@solo-plan.com>";
const DEFAULT_OWNER_EMAIL = "bevan.j.boyle@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const ownerEmail = Deno.env.get("WATCHDOG_EMAIL") || DEFAULT_OWNER_EMAIL;

  if (!supabaseUrl || !serviceKey) {
    return jsonResp(500, { error: "server_config", response_text: "Missing Supabase env vars." });
  }

  let force = false;
  try {
    const text = await req.text();
    if (text && text.trim().length > 0) force = Boolean(JSON.parse(text)?.force);
  } catch { /* ignore malformed body */ }

  const supabase = createClient(supabaseUrl, serviceKey);
  const problems: string[] = [];
  const okNotes: string[] = [];
  const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Signal edition produced in the last 8 days?
  const { count: editionCount, error: edErr } = await supabase
    .from("signal_editions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (edErr) problems.push(`Could not check signal_editions: ${edErr.message}`);
  else if ((editionCount ?? 0) === 0) problems.push("No Signal edition in the last 8 days. The Monday generator (cron job 9 / generate-signal-edition) has produced nothing.");
  else okNotes.push(`Signal editions in last 8 days: ${editionCount}`);

  // 2. Radar items produced in the last 8 days?
  const { count: radarCount, error: rdErr } = await supabase
    .from("radar_items")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (rdErr) problems.push(`Could not check radar_items: ${rdErr.message}`);
  else if ((radarCount ?? 0) === 0) problems.push("No Radar items in the last 8 days. The Monday radar (cron job 11 / generate-radar) has produced nothing.");
  else okNotes.push(`Radar items in last 8 days: ${radarCount}`);

  // 3. Any failed cron runs?
  const { data: failures, error: cfErr } = await supabase.rpc("get_recent_cron_failures");
  if (cfErr) {
    problems.push(`Could not check cron failures: ${cfErr.message}`);
  } else if (Array.isArray(failures) && failures.length > 0) {
    const byJob = new Map<string, { count: number; sample: string; last: string }>();
    for (const f of failures) {
      const key = `${f.jobname} (job ${f.jobid})`;
      const cur = byJob.get(key);
      if (cur) { cur.count++; }
      else byJob.set(key, { count: 1, sample: String(f.return_message || "").slice(0, 200), last: String(f.start_time) });
    }
    for (const [job, info] of byJob) {
      problems.push(`Cron failures: ${job} failed ${info.count}x in the last 8 days (latest ${info.last}). Error: ${info.sample}`);
    }
  } else {
    okNotes.push("No failed cron runs in the last 8 days.");
  }

  const healthy = problems.length === 0;
  const shouldEmail = !healthy || force;
  let emailed = false;

  if (shouldEmail && resendApiKey) {
    const subject = healthy
      ? "Solo watchdog: all clear (forced status check)"
      : `Solo watchdog: ${problems.length} issue${problems.length === 1 ? "" : "s"} need attention`;
    const lines = [
      healthy ? "Forced status check. Everything looks healthy." : "The weekly self-check found problems:",
      "",
      ...(healthy ? [] : problems.map((p, i) => `${i + 1}. ${p}`)),
      ...(healthy ? [] : [""]),
      "Healthy checks:",
      ...okNotes.map((n) => `- ${n}`),
      "",
      "This is the automated Tuesday self-check (weekly-cron-watchdog).",
      "Reply to nobody; tell Claude and it will investigate.",
    ];
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({ from: FROM_ADDRESS, to: [ownerEmail], subject, text: lines.join("\n") }),
      });
      if (res.ok) emailed = true;
      else console.error(`${FUNCTION_VERSION} Resend send failed:`, res.status, await res.text());
    } catch (err) {
      console.error(`${FUNCTION_VERSION} Resend send threw:`, (err as Error)?.message ?? String(err));
    }
  } else if (shouldEmail && !resendApiKey) {
    console.error(`${FUNCTION_VERSION} RESEND_API_KEY not set; cannot send watchdog email. Problems:`, problems);
  }

  console.log(`${FUNCTION_VERSION} healthy=${healthy} problems=${problems.length} emailed=${emailed} force=${force}`);
  return jsonResp(200, {
    healthy,
    problems,
    ok_notes: okNotes,
    emailed,
    forced: force,
    response_text: healthy ? "All scheduled jobs healthy." : `${problems.length} problem(s) found.`,
  });
});
