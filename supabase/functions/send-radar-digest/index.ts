// send-radar-digest — Opportunity Radar v2 weekly email (ADR-025; v2 sprint 2026-06-11)
// FUNCTION_VERSION: radar-digest-v1.2
// v1.2: Employer Tripwire v1 (ADR-025). Users with an active row in
//   public.tripwire_watches get a quiet "Your sector watch" section appended
//   to their digest: a count + one-line list of this week's radar tender
//   activity whose category or buyer text matches their sector (simple
//   substring/ilike matching), plus one calm gpt-5.4-mini line labelled
//   "Solo's read". If nothing matched, the section says only "No notable
//   movement in <sector> this week." Sector-level only; employer_name is
//   stored on the watch but not used in v1. Solo never invents news: the
//   list is real radar-derived movement, the read is labelled analysis.
// v1.1: reports with a NULL user_id (eval-harness artefacts) are excluded from
//   the audience. In v1.0 the null leaked into the events .in("user_id", ...)
//   idempotency lookup, which errored silently and made re-runs re-send.
//
// Weekly digest. For every user with a paid report, assembles their category's
// current radar items (same shaping pass as get-radar: lapsed-deadline drop,
// £2m cap, GB-prefix strip, framework-lot dedupe) into a table-based editorial
// HTML email (ivory/ink/mint, no images) and sends via Resend, from the same
// address pattern as send-checkin-email ("Solo <hello@solo-plan.com>").
//
// Idempotent per week: a 'radar_digest_sent' row in public.events per
// (user, week_start) guards against cron re-runs. Pass {"force": true} to
// bypass for testing.
//
// verify_jwt: false — cron-called via pg_net Mondays 08:15 UTC, after
// generate-radar at 07:30 (same posture as send-checkin-email).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
const MAX_SOLO_VALUE = 2_000_000;
const MAX_TENDERS_IN_EMAIL = 6;
const MAX_ANALYSIS_IN_EMAIL = 2;
const MAX_TRIPWIRE_LINES = 5;
const APP_URL = "https://solo-plan.com";

/* ── shaping helpers (mirrored from get-radar v1.1 so email and page agree) ── */

function parseValue(v: string | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanTitle(t: string): string {
  return t.replace(/^GB-[^:]+:\s*/, "").trim();
}

function frameworkKey(title: string, buyer: string | null): string {
  const stem = cleanTitle(title).split(/\blot\s*\d+/i)[0].trim().toLowerCase();
  return `${(buyer ?? "").toLowerCase()}|${stem}`;
}

type RadarItem = {
  id: string;
  week_start: string;
  category: string;
  source_type: string;
  title: string;
  summary: string | null;
  url: string | null;
  source_name: string | null;
  buyer: string | null;
  value_text: string | null;
  deadline: string | null;
};

function shapeItems(raw: RadarItem[]): RadarItem[] {
  const now = Date.now();
  const seenFrameworks = new Map<string, number>();
  const shaped: RadarItem[] = [];
  for (const i of raw) {
    if (i.source_type === "tender") {
      if (i.deadline && new Date(i.deadline).getTime() < now) continue;
      const v = parseValue(i.value_text);
      if (v !== null && v > MAX_SOLO_VALUE) continue;
      const key = frameworkKey(i.title, i.buyer);
      if (seenFrameworks.has(key)) {
        seenFrameworks.set(key, (seenFrameworks.get(key) ?? 1) + 1);
        continue;
      }
      seenFrameworks.set(key, 1);
      shaped.push({
        ...i,
        title: cleanTitle(i.title),
        value_text: v !== null && v >= 250_000 ? `${i.value_text} framework` : i.value_text,
      });
    } else {
      shaped.push(i);
    }
  }
  for (const s of shaped) {
    if (s.source_type !== "tender") continue;
    const key = frameworkKey(s.title, s.buyer);
    const n = seenFrameworks.get(key) ?? 1;
    if (n > 1) s.title = `${s.title} (${n} lots open)`;
  }
  return shaped;
}

/* ── email rendering ── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function renderTenderRow(i: RadarItem): string {
  const meta = [
    i.buyer ? escapeHtml(i.buyer) : null,
    i.value_text ? escapeHtml(i.value_text) : null,
    i.deadline ? `closes ${fmtDate(i.deadline)}` : null,
    i.source_name ? escapeHtml(i.source_name) : null,
  ].filter(Boolean).join(" &middot; ");
  const link = i.url
    ? `<p style="margin: 8px 0 0 0;"><a href="${escapeHtml(i.url)}" style="color: #15735F; font-size: 13px; font-weight: 600; text-decoration: underline;">View the notice &rarr;</a></p>`
    : "";
  return `
    <tr><td style="padding: 18px 0; border-top: 1px solid #E5E2DC;">
      <p style="margin: 0; color: #1A1915; font-size: 16px; line-height: 1.35; font-weight: 700;">${escapeHtml(i.title)}</p>
      ${meta ? `<p style="margin: 6px 0 0 0; color: #6B6660; font-size: 13px; line-height: 1.5;">${meta}</p>` : ""}
      ${i.summary ? `<p style="margin: 8px 0 0 0; color: #3D3A34; font-size: 14px; line-height: 1.55;">${escapeHtml(i.summary)}</p>` : ""}
      ${link}
    </td></tr>`;
}

function renderAnalysisRow(i: RadarItem): string {
  return `
    <tr><td style="padding: 18px 0; border-top: 1px solid #E5E2DC;">
      <p style="margin: 0 0 6px 0; color: #6B6660; font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;">Solo analysis</p>
      <p style="margin: 0; color: #1A1915; font-size: 16px; line-height: 1.35; font-weight: 700;">${escapeHtml(i.title)}</p>
      ${i.summary ? `<p style="margin: 8px 0 0 0; color: #3D3A34; font-size: 14px; line-height: 1.55;">${escapeHtml(i.summary)}</p>` : ""}
    </td></tr>`;
}

/* ── Employer Tripwire v1: "Your sector watch" section (quiet, factual) ── */

function renderTripwireSection(sector: string, matched: RadarItem[], read: string | null): string {
  const header = `
    <tr><td style="padding: 24px 0 4px 0; border-top: 1px solid #E5E2DC;">
      <p style="margin: 0; color: #6B6660; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;">Your sector watch &middot; ${escapeHtml(sector)}</p>
    </td></tr>`;
  if (matched.length === 0) {
    return header + `
    <tr><td style="padding: 6px 0 22px 0;">
      <p style="margin: 0; color: #3D3A34; font-size: 14px; line-height: 1.55;">No notable movement in ${escapeHtml(sector)} this week.</p>
    </td></tr>`;
  }
  const lines = matched.slice(0, MAX_TRIPWIRE_LINES).map((i) =>
    `<p style="margin: 5px 0 0 0; color: #3D3A34; font-size: 13px; line-height: 1.5;">&middot; ${escapeHtml(cleanTitle(i.title))}${i.buyer ? ` &middot; ${escapeHtml(i.buyer)}` : ""}</p>`
  ).join("");
  const readBlock = read
    ? `
      <p style="margin: 14px 0 0 0; color: #6B6660; font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;">Solo&#39;s read</p>
      <p style="margin: 4px 0 0 0; color: #3D3A34; font-size: 14px; line-height: 1.55; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(read)}</p>`
    : "";
  return header + `
    <tr><td style="padding: 6px 0 22px 0;">
      <p style="margin: 0; color: #1A1915; font-size: 14px; line-height: 1.55;">${matched.length} public tender notice${matched.length === 1 ? "" : "s"} on this week's radar touched ${escapeHtml(sector)}:</p>
      ${lines}${readBlock}
    </td></tr>`;
}

/* One calm line from gpt-5.4-mini. Informs, never inflames. Returns null on
 * any failure so the section still ships with just the factual list. */
async function soloReadLine(openaiKey: string, sector: string, matched: RadarItem[]): Promise<string | null> {
  try {
    const list = matched.slice(0, 8)
      .map((i) => `- ${cleanTitle(i.title)}${i.buyer ? ` (buyer: ${i.buyer})` : ""}`)
      .join("\n");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        max_completion_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write one calm, factual sentence for a weekly email to a professional who asked us to watch public buying activity in their sector. Inform, never alarm. No urgency, no fear, no advice to act, no exclamation marks, no em dashes. UK English, plain and specific.",
          },
          {
            role: "user",
            content:
              `Sector being watched: ${sector}\n` +
              `This week ${matched.length} public UK tender notice(s) matched the sector:\n${list}\n\n` +
              `Write ONE sentence (25 words max) plainly stating what this level and type of public buying activity suggests about demand in this sector right now. Return JSON: {"line": "..."}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("tripwire solo-read LLM call failed: " + (await res.text()).slice(0, 200));
      return null;
    }
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    const line = typeof parsed.line === "string"
      ? parsed.line.trim().replace(/\s*[—–]\s*/g, ", ")
      : null;
    return line && line.length > 0 && line.length <= 300 ? line : null;
  } catch (e) {
    console.error("tripwire solo-read threw: " + (e as Error).message);
    return null;
  }
}

function renderEmail(
  category: string,
  weekLabel: string,
  tenders: RadarItem[],
  analyses: RadarItem[],
  tripwireHtml: string,
): string {
  const headline = tenders.length > 0
    ? `${tenders.length} opening${tenders.length === 1 ? "" : "s"} worth a look in ${escapeHtml(category)}.`
    : `This week&#39;s read on ${escapeHtml(category)}.`;
  const standfirst = tenders.length > 0
    ? `Live UK tender notices a solo independent in your market could credibly bid for, picked from this week&#39;s Contracts Finder and Find a Tender publications.`
    : `No solo-winnable tender cleared our bar this week, so here is our read on where your market is moving instead.`;
  const rows = tenders.map(renderTenderRow).join("") + analyses.map(renderAnalysisRow).join("");
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FAF9F7; padding: 32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr><td style="padding-bottom: 16px; border-bottom: 2px solid #1A1915;">
        <span style="color: #2ECDB0; font-weight: 700; font-size: 18px;">Solo</span>
      </td></tr>
      <tr><td style="padding: 20px 0 4px 0;">
        <p style="margin: 0; color: #6B6660; font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;">Opportunity Radar &middot; ${escapeHtml(weekLabel)}</p>
      </td></tr>
      <tr><td style="padding: 4px 0 8px 0;">
        <h1 style="margin: 0; color: #1A1915; font-size: 24px; line-height: 1.25; font-weight: 800;">${headline}</h1>
      </td></tr>
      <tr><td style="padding: 0 0 20px 0;">
        <p style="margin: 0; color: #3D3A34; font-size: 15px; line-height: 1.6; font-family: Georgia, 'Times New Roman', serif;">${standfirst}</p>
      </td></tr>
      ${rows}
      ${tripwireHtml}
      <tr><td style="padding: 22px 0; border-top: 1px solid #E5E2DC;">
        <a href="${APP_URL}/radar" style="display: inline-block; background: #2ECDB0; color: #1A1915; text-decoration: none; padding: 12px 28px; font-weight: 700; font-size: 14px;">See your full radar</a>
      </td></tr>
      <tr><td style="padding-top: 8px; border-top: 1px solid #E5E2DC;">
        <p style="margin: 12px 0 0 0; color: #999; font-size: 12px; line-height: 1.6;">
          You're receiving this because you have a Solo report. The radar updates every Monday.
          <br>To stop these emails, reply to this one with the word unsubscribe and we'll take you off the list.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

/* ── main ── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set — radar digests will not be sent");
      return new Response(
        JSON.stringify({ response_text: "RESEND_API_KEY not set. Skipping send.", sent: 0, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? null;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let force = false;
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch (_) { /* empty body is fine */ }

    // Week anchor: Monday of the current week (same as generate-radar).
    const now = new Date();
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    const weekStart = monday.toISOString().slice(0, 10);
    const weekLabel = "Week of " + monday.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // 1. Audience: every user with a paid report (latest report per user).
    const { data: reports, error: repErr } = await supabase
      .from("reports")
      .select("user_id, status, core_report, created_at")
      .in("status", PAID_STATUSES)
      .order("created_at", { ascending: false });
    if (repErr) throw new Error("reports read failed: " + repErr.message);
    const latestByUser = new Map<string, { user_id: string; core_report: Record<string, unknown> }>();
    for (const r of reports ?? []) {
      if (!r.user_id) continue; // eval-harness reports have no user; nothing to email
      if (!latestByUser.has(r.user_id)) latestByUser.set(r.user_id, r);
    }
    const userIds = [...latestByUser.keys()];
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ response_text: "No paid-report users to email.", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Emails (same service-role RPC send-checkin-email uses).
    const { data: authUsers, error: authErr } = await supabase.rpc("get_user_emails_for_checkin", {
      user_ids: userIds,
    });
    if (authErr || !authUsers) throw new Error("email lookup failed: " + (authErr?.message ?? "no rows"));
    const emailById: Record<string, string> = {};
    for (const u of authUsers as Array<{ id: string; email: string }>) emailById[u.id] = u.email;

    // 3. Idempotency guard: who already got this week's digest.
    const { data: sentRows } = await supabase
      .from("events")
      .select("user_id, payload")
      .eq("event_type", "radar_digest_sent")
      .in("user_id", userIds);
    const alreadySent = new Set(
      (sentRows ?? [])
        .filter((r: { payload: { week_start?: string } | null }) => r.payload?.week_start === weekStart)
        .map((r: { user_id: string }) => r.user_id),
    );

    // 3b. Employer Tripwire v1: active sector watches for this audience, plus
    // this week's full tender set (all categories) to match sectors against.
    const { data: watchRows } = await supabase
      .from("tripwire_watches")
      .select("user_id, sector")
      .eq("active", true)
      .in("user_id", userIds);
    const watchByUser = new Map<string, string>();
    for (const w of (watchRows ?? []) as Array<{ user_id: string; sector: string }>) {
      if (w.sector?.trim()) watchByUser.set(w.user_id, w.sector.trim());
    }
    let weekTenders: RadarItem[] = [];
    if (watchByUser.size > 0) {
      const { data: wt, error: wtErr } = await supabase
        .from("radar_items")
        .select("id, week_start, category, source_type, title, summary, url, source_name, buyer, value_text, deadline")
        .gte("week_start", weekStart)
        .eq("source_type", "tender");
      if (wtErr) console.error("tripwire tender read failed: " + wtErr.message);
      weekTenders = (wt ?? []) as RadarItem[];
    }

    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    let sent = 0, skippedDuplicate = 0, skippedEmpty = 0, errors = 0, tripwireSections = 0;

    for (const [userId, rep] of latestByUser) {
      const email = emailById[userId];
      if (!email) { console.warn(`no email for user ${userId}`); continue; }
      if (alreadySent.has(userId) && !force) { skippedDuplicate++; continue; }

      // 4. Category mapping (same logic as get-radar).
      const primary: string = (rep.core_report as { archetype?: { primary?: string } })?.archetype?.primary ?? "";
      let category: string | null = null;
      if (primary) {
        const { data: exact } = await supabase
          .from("kb_archetypes").select("category").eq("name", primary).limit(1).maybeSingle();
        category = exact?.category ?? null;
        if (!category) {
          const { data: fuzzy } = await supabase
            .from("kb_archetypes").select("category")
            .ilike("name", `%${primary.split("/")[0].trim().slice(0, 30)}%`)
            .limit(1).maybeSingle();
          category = fuzzy?.category ?? null;
        }
      }

      // 5. Items (same query + shaping as get-radar).
      let query = supabase
        .from("radar_items")
        .select("id, week_start, category, source_type, title, summary, url, source_name, buyer, value_text, deadline")
        .gte("week_start", since)
        .order("week_start", { ascending: false })
        .order("source_type", { ascending: false });
      if (category) {
        query = query.in("category", [category, "General"]);
      } else {
        query = query.eq("source_type", "tender").limit(10);
      }
      const { data: raw, error: itemsErr } = await query;
      if (itemsErr) { console.error(`radar_items read failed for ${userId}: ${itemsErr.message}`); errors++; continue; }

      const shaped = shapeItems((raw ?? []) as RadarItem[]);
      const tenders = shaped.filter((i) => i.source_type === "tender").slice(0, MAX_TENDERS_IN_EMAIL);
      const analyses = shaped.filter((i) => i.source_type === "analysis").slice(0, MAX_ANALYSIS_IN_EMAIL);
      if (tenders.length === 0 && analyses.length === 0) { skippedEmpty++; continue; }

      // 5b. Tripwire section for users with an active sector watch.
      let tripwireHtml = "";
      const watchedSector = watchByUser.get(userId);
      if (watchedSector) {
        const sectorLc = watchedSector.toLowerCase();
        const matched = weekTenders.filter((i) =>
          (i.category ?? "").toLowerCase().includes(sectorLc) ||
          (i.buyer ?? "").toLowerCase().includes(sectorLc)
        );
        let read: string | null = null;
        if (matched.length > 0 && openaiKey) {
          read = await soloReadLine(openaiKey, watchedSector, matched);
        }
        tripwireHtml = renderTripwireSection(watchedSector, matched, read);
        tripwireSections++;
        console.log(`tripwire section for ${userId}: sector "${watchedSector}", ${matched.length} matched, read ${read ? "yes" : "no"}`);
      }

      const catLabel = category ?? "your market";
      const subject = tenders.length > 0
        ? `Your radar: ${tenders.length} opening${tenders.length === 1 ? "" : "s"} in ${catLabel} this week`
        : `Your radar: this week's read on ${catLabel}`;
      const html = renderEmail(catLabel, weekLabel, tenders, analyses, tripwireHtml);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Solo <hello@solo-plan.com>",
            to: [email],
            subject,
            html,
          }),
        });
        if (res.ok) {
          sent++;
          console.log(`radar digest sent to ${email} (${catLabel}: ${tenders.length} tenders, ${analyses.length} analysis)`);
          const { error: evErr } = await supabase.from("events").insert({
            event_type: "radar_digest_sent",
            user_id: userId,
            payload: { week_start: weekStart, category: catLabel, tenders: tenders.length, analyses: analyses.length, tripwire: !!watchedSector },
          });
          if (evErr) console.error(`failed to log radar_digest_sent for ${userId}: ${evErr.message}`);
        } else {
          console.error(`Resend failed for ${email}: ${(await res.text()).slice(0, 200)}`);
          errors++;
        }
      } catch (err) {
        console.error(`send threw for ${email}: ${(err as Error).message}`);
        errors++;
      }
    }

    const responseText =
      `Radar digest for week ${weekStart}: ${sent} sent, ${skippedDuplicate} already sent, ${skippedEmpty} empty, ${errors} errors, ${tripwireSections} sector-watch sections, ${userIds.length} paid users.`;
    console.log(responseText);
    return new Response(
      JSON.stringify({ response_text: responseText, week_start: weekStart, sent, skipped_duplicate: skippedDuplicate, skipped_empty: skippedEmpty, errors, tripwire_sections: tripwireSections, audience: userIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-radar-digest error:", e);
    return new Response(
      JSON.stringify({ response_text: "Radar digest failed: " + (e as Error).message, error: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
