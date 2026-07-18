// send-nurture-emails v1 (2026-07-18, C1.2) — the diagnostic nurture drip,
// run on our own stack because Beehiiv automations sit behind the Scale plan.
//
// Sequence (approved drafts at admin/day-zero-staging-2026-07-15/nurture-sequence-c12.md):
//   1 Day 0  — read recap + copy on file           (sent at capture via subscribe-signal v5 poke)
//   2 Day 2  — the optionality gap
//   3 Day 4  — sample report walk
//   4 Day 7  — pre-filled bridge
//   5 Day 11 — quiet Tuesday trigger
//
// Mechanics:
//   - rows live in public.diagnostic_nurture (service-role only)
//   - invoked daily by pg_cron ('diagnostic-nurture-daily', 08:10 UTC) with
//     {cron:true}, or poked with {email} by subscribe-signal right after a
//     capture so email 1 lands immediately
//   - every send is gated by can_send_email(email,'lifecycle') (ADR-027):
//     suppressed/opted-out → sequence stops; frequency_cap → deferred a day
//     without consuming the step
//   - exit-on-purchase is automatic: nurture_exit_check(email) joins
//     auth.users → reports; a paid report ends the sequence
//   - all sends recorded via log_email_send, List-Unsubscribe headers on every
//     email, unsubscribe link from the recipient's comm-prefs token
// verify_jwt=false (cron-callable, same as send-abandonment-email). A poke can
// never jump the queue: only rows with next_send_at <= now() are processed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1-c12-drip";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://www.solo-plan.com";
const FROM_ADDRESS = Deno.env.get("NURTURE_FROM_ADDRESS") ?? "Solo <hello@solo-plan.com>";
const POSTAL_LINE = "Solo · 35 Beagle Road, Cambridge CB3 0UH, United Kingdom";

/** Days to wait after sending step N (1-indexed) before the next step. */
const STEP_DELAYS_DAYS = [2, 2, 3, 4];

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function utm(path: string): string {
  return `${APP_URL}${path}?utm_source=nurture&utm_medium=email&utm_campaign=diagnostic-nurture`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

interface NurtureRow {
  id: string;
  email: string;
  read_snapshot: string | null;
  emails_sent: number;
  status: string;
  next_send_at: string;
}

interface RenderedEmail {
  subject: string;
  preview: string;
  html: string;
}

function shell(preview: string, inner: string, unsubUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #FAF9F7;">
      <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</span>
      <div style="margin-bottom: 28px;">
        <span style="color: #15735F; font-weight: 800; font-size: 20px; letter-spacing: -0.01em;">Solo</span>
        <span style="color: #8a857d; font-size: 12px; margin-left: 10px; text-transform: uppercase; letter-spacing: 0.14em;">The Signal</span>
      </div>
      ${inner}
      <p style="color: #8a857d; font-size: 12px; line-height: 1.6; margin-top: 36px; border-top: 1px solid #E5E2DC; padding-top: 16px;">
        You're receiving this because you took the free diagnostic at solo-plan.com and asked for your read by email.
        <a href="${unsubUrl}" style="color: #8a857d;">Unsubscribe</a> and we'll stop.
      </p>
      <p style="color: #b5b0a8; font-size: 11px; line-height: 1.6; margin-top: 8px;">${POSTAL_LINE}</p>
    </div>
  `;
}

function h1(text: string): string {
  return `<h1 style="color: #1A1915; font-size: 21px; font-weight: 700; line-height: 1.3; margin: 0 0 18px;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `<p style="margin: 26px 0 8px;"><a href="${href}" style="display: inline-block; background: #2ECDB0; color: #1A1915; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-weight: 700; font-size: 14.5px;">${label} &rarr;</a></p>`;
}

function quietLink(label: string, href: string): string {
  return `<p style="margin: 22px 0 8px;"><a href="${href}" style="color: #15735F; font-weight: 600; font-size: 14.5px; text-decoration: underline; text-underline-offset: 3px;">${label} &rarr;</a></p>`;
}

function snapshotBlock(snapshot: string | null): string {
  if (snapshot && snapshot.trim()) {
    return `<div style="background: #ffffff; border: 1px solid #E5E2DC; border-left: 3px solid #2ECDB0; padding: 20px 22px; margin: 0 0 20px; color: #1A1915; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(snapshot)}</div>`;
  }
  return p(`If your read doesn't appear here, it's waiting for you at <a href="${utm("/diagnostic")}" style="color: #15735F;">solo-plan.com/diagnostic</a> on the device where you took it.`);
}

function renderEmail(step: number, snapshot: string | null, unsubUrl: string): RenderedEmail {
  switch (step) {
    case 1:
      return {
        subject: "Your optionality read, kept safe",
        preview: "The full version of what you just saw, plus what sits behind it.",
        html: shell(
          "The full version of what you just saw, plus what sits behind it.",
          [
            h1("Your optionality read, kept safe"),
            p("Your optionality read is below, so you have it on file. Worth keeping; most people's sense of their own position is vaguer than they think, and a written version is something you can disagree with productively."),
            snapshotBlock(snapshot),
            p("Two honest notes on what that read is and is not."),
            p("It is a surface reading. Six structured answers can place you in a family of professionals and say something true about how portable your value is. That is all they can do."),
            p("What it cannot see is the specific shape of your experience: the work you'd actually enjoy being paid for, the sector knowledge that prices at a premium, and which of the routes open to someone like you fit your appetite for risk. That is what the full Solo report does. It takes about fifteen minutes of real questions, your answers from today are already filled in, and it produces ten named, scored routes to independent income with a first move you could take in 24 hours. It costs £19.99, once."),
            p("No pressure to do that today. The Signal arrives on Mondays either way."),
            ctaButton("Continue where you left off", utm("/questionnaire")),
          ].join("\n"),
          unsubUrl,
        ),
      };
    case 2:
      return {
        subject: "The gap most professional careers quietly carry",
        preview: "The optionality gap, in plain terms.",
        html: shell(
          "The optionality gap, in plain terms.",
          [
            h1("One employer, one income, one point of failure"),
            p("There is a structural fact about most professional careers that rarely gets said plainly: the more senior you become inside an organisation, the more of your value gets denominated in that organisation's currency."),
            p("Your title means something because the org chart says so. Your network is dense where the company is dense. Your compensation rises on internal bands. All rational, and all of it repricing sharply the day the structure changes. Restructures, mergers, offshoring, a new operating model: none of these care how good you are. They change what the organisation needs, and your position with it."),
            p("The gap is this: professionals insure their houses, their health, sometimes their income, but almost never their employability itself. The genuine insurance is optionality. Knowing, specifically and in writing, what you would sell independently, who buys it, and at what rate. Not because you plan to leave; most people with real optionality stay, and negotiate differently because they know their outside number."),
            p("Building that knowledge takes a few focused hours, not a career break. Next email, we'll show you what it looks like when it's written down properly, using a real example."),
            quietLink("Read the latest Signal edition", utm("/signal")),
          ].join("\n"),
          unsubUrl,
        ),
      };
    case 3:
      return {
        subject: "What a written Plan B actually looks like",
        preview: "A walk through one person's full report.",
        html: shell(
          "A walk through one person's full report.",
          [
            h1("Ten routes, priced and ranked: a real example"),
            p("Easiest way to judge whether Solo's report is worth £19.99: read one."),
            p("The sample on the site belongs to a composite HR director, fifteen years in, no independent income, no public profile to trade on. Her report runs to ten named routes. Not &quot;consulting&quot; but fractional HR leadership for 50-to-200-person companies at £700 to £900 a day, interim people-lead cover, retainer-based ER support for founders without an HR function. Each route scored for fit against her actual answers, each with the realistic UK rate, each with what makes her credible and what she'd need to shore up."),
            p("Then the part people say they didn't expect: a hook insight, one paragraph naming the specific angle that makes her offer distinct rather than generic, and a first move designed to be completed within 24 hours. Small enough to actually do; concrete enough to mean something happened."),
            p("The whole thing reads like a briefing from someone who knows her field, because that is the standard the engine is held to. If the sample doesn't clear that bar for you, don't buy the report."),
            ctaButton("Read the sample report", utm("/sample-report")),
          ].join("\n"),
          unsubUrl,
        ),
      };
    case 4:
      return {
        subject: "Your answers are still saved",
        preview: "The diagnostic was the first six questions. Here's the rest.",
        html: shell(
          "The diagnostic was the first six questions. Here's the rest.",
          [
            h1("Fifteen minutes from here"),
            p("A practical note: the six answers you gave in the diagnostic are still saved, and they pre-fill the full questionnaire. From where you are, the full report is about fifteen minutes of answering, mostly the questions only you can answer. The achievement you'd point to. The thing colleagues ask your advice on. What you know about your sector that outsiders don't."),
            p("Those questions are where the report gets its specificity. The diagnostic told you which family of professionals you sit in; the report is about you alone."),
            p("What you get for £19.99, once: ten named and scored independent-income routes with realistic UK day rates, the hook insight that makes your offer distinct, a first move for the next 24 hours, and a 30-day activation plan with daily check-ins to run it. No subscription required to buy the report; the ongoing tracker is optional afterwards."),
            p("Who it is not for, said plainly: anyone who wants to be told everything will be fine, and anyone six months from retirement with no intention of working again. The report is a working document. It rewards people who will use it."),
            ctaButton("Finish your questionnaire", utm("/questionnaire")),
          ].join("\n"),
          unsubUrl,
        ),
      };
    default:
      return {
        subject: "The quiet Tuesday problem",
        preview: "When people build their Plan B, and when they wish they had.",
        html: shell(
          "When people build their Plan B, and when they wish they had.",
          [
            h1("Before the announcement, not after"),
            p("There is a pattern in when people do this work."),
            p("A restructure gets announced. Consultation letters go out. And that week, people who have meant to map their options for years finally sit down to do it, at the exact moment their leverage is lowest and their judgement is most clouded. Plans made in fear read like it: rushed, defensive, priced too low."),
            p("The better version happens on a quiet Tuesday. Nothing is wrong. You map what you would sell, who buys it, and your realistic rate, and then you file it. The plan's value is mostly in the calm it buys: meetings change when the worst case is a documented, priced set of options rather than a blank."),
            p("If this lands somewhere real, the full report is the fastest route from vague intention to written plan: fifteen minutes of questions from where you are, £19.99, done tonight."),
            p("And if now isn't the moment, that is a fine outcome too. The Signal will keep arriving on Mondays with a read on where independent work in your field is heading. When the quiet Tuesday comes, you'll know where we are."),
            ctaButton("Get your full report", utm("/questionnaire")),
          ].join("\n"),
          unsubUrl,
        ),
      };
  }
}

async function sendViaResend(apiKey: string, to: string, email: RenderedEmail, unsubUrl: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: email.subject,
        html: email.html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) {
      console.error(`${FUNCTION_VERSION} resend error for ${to}:`, res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`${FUNCTION_VERSION} resend threw for ${to}:`, (err as Error)?.message ?? String(err));
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const pokeEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error(`${FUNCTION_VERSION} RESEND_API_KEY not set — drip skipped`);
      return json({ skipped: true, reason: "no_resend_key" });
    }

    let query = admin
      .from("diagnostic_nurture")
      .select("id, email, read_snapshot, emails_sent, status, next_send_at")
      .eq("status", "active")
      .lt("emails_sent", 5)
      .lte("next_send_at", new Date().toISOString())
      .order("next_send_at", { ascending: true })
      .limit(50);
    if (pokeEmail) query = query.eq("email", pokeEmail);

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) {
      console.error(`${FUNCTION_VERSION} fetch error:`, fetchErr.message);
      return json({ error: "fetch_failed" }, 500);
    }

    let sent = 0, deferred = 0, exited = 0, suppressed = 0, errors = 0;

    for (const row of (rows ?? []) as NurtureRow[]) {
      const email = row.email.toLowerCase();
      const step = row.emails_sent + 1;
      const stepKey = `diagnostic_nurture_${step}`;

      // 1. Exit on purchase (automatic; the reason this beats the Beehiiv tag).
      const { data: exitData } = await admin.rpc("nurture_exit_check", { p_email: email });
      const exit = Array.isArray(exitData) ? exitData[0] : exitData;
      const userId = exit?.found_user_id ?? null;
      if (exit?.purchased === true) {
        await admin.from("diagnostic_nurture").update({ status: "exited_purchase", updated_at: new Date().toISOString() }).eq("id", row.id);
        await admin.rpc("log_email_send", { p_email: email, p_user_id: userId, p_class: "lifecycle", p_key: stepKey, p_status: "skipped", p_skip_reason: "purchased" });
        exited++;
        continue;
      }

      // 2. Consent + frequency gate (ADR-027).
      const { data: prefsRow } = await admin.rpc("ensure_comm_prefs", { p_email: email, p_user_id: userId });
      const prefs = Array.isArray(prefsRow) ? prefsRow[0] : prefsRow;
      const unsubUrl = `${supabaseUrl}/functions/v1/manage-unsubscribe?token=${prefs?.unsubscribe_token ?? ""}`;

      const { data: gateData } = await admin.rpc("can_send_email", { p_email: email, p_class: "lifecycle", p_user_id: userId });
      const gate = Array.isArray(gateData) ? gateData[0] : gateData;
      if (gate?.allowed !== true) {
        const reason = gate?.reason ?? "blocked";
        if (reason === "frequency_cap") {
          // Too much marketing this week; try again tomorrow without consuming the step.
          await admin.from("diagnostic_nurture").update({
            next_send_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", row.id);
          deferred++;
        } else {
          await admin.from("diagnostic_nurture").update({ status: "suppressed", updated_at: new Date().toISOString() }).eq("id", row.id);
          suppressed++;
        }
        await admin.rpc("log_email_send", { p_email: email, p_user_id: userId, p_class: "lifecycle", p_key: stepKey, p_status: "skipped", p_skip_reason: reason });
        continue;
      }

      // 3. Render + send.
      const rendered = renderEmail(step, row.read_snapshot, unsubUrl);
      const ok = await sendViaResend(resendKey, email, rendered, unsubUrl);
      if (!ok) {
        // Retry in 6 hours; keep the step unconsumed.
        await admin.from("diagnostic_nurture").update({
          next_send_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        await admin.rpc("log_email_send", { p_email: email, p_user_id: userId, p_class: "lifecycle", p_key: stepKey, p_status: "error", p_skip_reason: "resend_failed" });
        errors++;
        continue;
      }

      await admin.rpc("log_email_send", { p_email: email, p_user_id: userId, p_class: "lifecycle", p_key: stepKey, p_status: "sent", p_skip_reason: null });

      const completed = step >= 5;
      const delayDays = STEP_DELAYS_DAYS[step - 1] ?? 0;
      await admin.from("diagnostic_nurture").update({
        emails_sent: step,
        last_sent_at: new Date().toISOString(),
        next_send_at: new Date(Date.now() + delayDays * 24 * 3600 * 1000).toISOString(),
        status: completed ? "completed" : "active",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id).eq("emails_sent", row.emails_sent);
      sent++;
      console.log(`${FUNCTION_VERSION} sent step ${step} to ${email}`);
    }

    return json({ ok: true, processed: (rows ?? []).length, sent, deferred, exited, suppressed, errors });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, (e as Error)?.message ?? String(e));
    return json({ error: "server_error" }, 500);
  }
});
