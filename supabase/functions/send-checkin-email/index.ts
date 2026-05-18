// send-checkin-email v26 — 2026-05-18: coaching layer Phase 3 slice 3b.
//   Extend the daily check-in email to also inject any active Non-Response
//   Catcher rows for the user (admin/coaching-layer-design.md v1.7 §4.2).
//   Per session-in-loop, before composing the email body we fetch
//   non_response_catchers WHERE user_id = ... AND action_taken IS NULL
//   AND dismissed_at IS NULL AND email_sent_at IS NULL, ordered by oldest
//   dispatched_at, capped at 3 to keep emails scannable. If any exist, a
//   compact "About the message(s) you sent" section is rendered between
//   the intro copy and the Check-in CTA, with one short block per catcher
//   showing the direct_address line and a link to /plan where the three
//   action buttons live. On Resend 2xx we mark email_sent_at on those
//   rows so they aren't re-sent on subsequent days. Idempotent against
//   cron retries (same email_sent_at IS NULL filter).
//
//   Applies to both standard and re-entry email variants. The catcher
//   section is structurally separate from the existing copy so the
//   email reads cleanly whether or not any catchers are present.
//
// send-checkin-email v25 — 2026-05-08: F94 third try — use token_hash + a Solo
//   /auth/confirm route that calls supabase.auth.verifyOtp() client-side. Live
//   testing of v24 showed: /auth/v1/verify created a fresh auth.sessions row on
//   the user's tap, AND redirected to /auth/callback as configured, BUT the
//   client AuthCallback timed out polling for a session and rendered "expired".
//   Root cause: client.ts has flowType: 'pkce'. Supabase /verify on a PKCE
//   project redirects with ?code=... requiring exchangeCodeForSession with a
//   PKCE code_verifier from localStorage — but admin.generateLink produces
//   server-side magic links with no client-side verifier ever created. So the
//   exchange fails silently, getSession() returns null, AuthCallback gives up.
//   Canonical fix per Supabase docs (Magic Link section, "If you're using PKCE
//   flow, edit the Magic Link email template to send a token hash"):
//   - admin.generateLink response includes properties.hashed_token
//   - Email button URL: https://solo-plan.com/auth/confirm?token_hash=...&type=magiclink
//   - /auth/confirm calls supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
//   - verifyOtp does a direct POST to /auth/v1/verify, no PKCE roundtrip,
//     session lands directly in localStorage. No redirect, no fragment, no
//     verifier needed. Then /auth/confirm routes to /plan.
// send-checkin-email v24 — 2026-05-08: F94 follow-up — switch redirectTo from
//   /plan to /auth/callback. Live testing showed v23's magic-link mint
//   succeeded (auth.sessions row created on user's tap) but the /verify
//   endpoint redirected the user to /auth instead of /plan, because
//   https://solo-plan.com/plan is not in the project's Auth → URL
//   Configuration → Redirect URLs allowlist. Supabase /verify silently falls
//   back to the Site URL when redirect_to is not allowlisted.
//   /auth/callback IS allowlisted (it's the canonical post-auth landing page
//   used by every other sign-in flow) and AuthCallback.tsx already polls for
//   the session that supabase-js picks up from the URL hash fragment, then
//   routes the user to /plan based on report status. So clicking the email
//   button now lands the user on /auth/callback for ~1s, which forwards to
//   /plan with a valid session. Same end-state, no dashboard config needed.
// send-checkin-email v23 — 2026-05-08: F94 — embed magic-link auth URL in the
//   "Check in now" button. Previously the button linked to bare /plan with no
//   auth, so users who clicked it on phones (where Gmail's in-app browser does
//   not share PKCE state with the user's main browser) hit a 2-step flow:
//     /plan → /auth → enter email → magic link → AuthCallback → "expired"
//   The "expired" copy is the silent-failure rendering for PKCE
//   exchangeCodeForSession when the code verifier is missing from localStorage
//   (because the magic link opened in a different browser context than the
//   /auth form did). Cross-browser PKCE failure is unfixable on mobile email.
//
//   This version mints a magic-link URL server-side via supabase.auth.admin
//   .generateLink({ type: "magiclink" }) for each recipient and uses that as
//   the button href. The action_link goes through Supabase /auth/v1/verify
//   (token-hash flow, no PKCE) and redirects to /plan with auth tokens in the
//   URL fragment, which supabase-js picks up via detectSessionInUrl: true.
//   Result: user clicks → lands on /plan already authenticated, no second
//   email, no PKCE roundtrip, works in any browser.
//
//   Caveat: token TTL is the project's email_otp_expiry seconds (default
//   3600 = 1 hour). Bevan must bump this in Supabase Auth settings to
//   something more user-friendly (24h) so users who click later in the day
//   don't get re-auth'd anyway.
//
//   If generateLink fails for any reason, we fall back to the bare /plan URL
//   so the email still sends — preserves the prior (broken) flow rather than
//   silently dropping emails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function daysBetweenDateAndNow(dateStr: string | null): number {
  if (!dateStr) return 999;
  const past = new Date(dateStr + "T00:00:00Z");
  const now = new Date();
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursSinceTimestamp(ts: string | null): number {
  if (!ts) return 999;
  const past = new Date(ts);
  const now = new Date();
  return (now.getTime() - past.getTime()) / (1000 * 60 * 60);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error", response_text: "Missing config" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — emails will not be sent");
    return new Response(
      JSON.stringify({
        error: "Email service not configured",
        response_text: "RESEND_API_KEY not set. Skipping email send.",
        skipped: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const today = new Date().toISOString().split("T")[0];

  const { data: sessions, error: sessionsError } = await supabase
    .from("tracker_sessions")
    .select("id, user_id, current_day, last_checkin_date, last_reentry_email_sent_at, notification_time, notification_timezone")
    .eq("status", "active")
    .neq("last_checkin_date", today);

  if (sessionsError) {
    console.error("Error fetching tracker sessions:", sessionsError);
    return new Response(
      JSON.stringify({ error: sessionsError.message, response_text: "Failed to fetch sessions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!sessions || sessions.length === 0) {
    console.log("No active sessions needing check-in emails today");
    return new Response(
      JSON.stringify({ sent: 0, response_text: "No emails to send" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userIds = sessions.map((s) => s.user_id);
  const userMap: Record<string, string> = {};

  const { data: authUsers, error: authError } = await supabase.rpc("get_user_emails_for_checkin", {
    user_ids: userIds,
  });

  if (authError || !authUsers) {
    console.error("Cannot retrieve user emails. Skipping email send.");
    return new Response(
      JSON.stringify({
        error: "Cannot retrieve user emails",
        response_text: "Email lookup failed",
        sent: 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  for (const u of authUsers) {
    userMap[u.id] = u.email;
  }

  const appUrl = "https://solo-plan.com";
  let sentStandard = 0;
  let sentReentry = 0;
  let errorCount = 0;
  let magicLinkFailures = 0;

  // F94 (2026-05-08): server-side magic-link minter. Returns a one-click auth URL
  // that lands the user on /plan with a session, bypassing the broken PKCE
  // 2-step flow. Falls back to bare /plan if generateLink errors so emails
  // still send rather than silently dropping.
  async function getCheckinUrl(email: string): Promise<string> {
    try {
      // F94 v25: use admin.generateLink to get a hashed_token, then construct
      // a Solo-controlled URL. The client at /auth/confirm calls verifyOtp
      // directly with the token_hash — no PKCE verifier required, no redirect
      // dance, session lands in localStorage on the first POST.
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${appUrl}/plan` },
      });
      const props = (data as {
        properties?: { hashed_token?: string; action_link?: string };
      } | null)?.properties;
      const hashedToken = props?.hashed_token;
      if (error || !hashedToken) {
        console.warn(
          `generateLink missing hashed_token for ${email} — falling back to bare /plan. err=`,
          error
        );
        magicLinkFailures++;
        return `${appUrl}/plan`;
      }
      return `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
    } catch (err) {
      console.warn(
        `generateLink threw for ${email} — falling back to bare /plan. err=`,
        (err as Error)?.message ?? String(err)
      );
      magicLinkFailures++;
      return `${appUrl}/plan`;
    }
  }

  // v26 (coaching layer Phase 3 slice 3b): tracks catcher rows surfaced
  // in emails this run so we can mark email_sent_at on those rows after a
  // successful Resend send. Keyed by user_id so we look up the right list
  // per session.
  let catcherEmailsSent = 0;

  for (const session of sessions) {
    const email = userMap[session.user_id];
    if (!email) {
      console.warn(`No email found for user ${session.user_id}`);
      continue;
    }

    const dayNumber = session.current_day || 1;
    const daysSinceLastCheckin = daysBetweenDateAndNow(session.last_checkin_date);
    const hoursSinceReentry = hoursSinceTimestamp(session.last_reentry_email_sent_at);

    const isReentry = daysSinceLastCheckin > 3;
    const reentryDeduped = isReentry && hoursSinceReentry < 72;

    let subject: string;
    let htmlBody: string;

    // F94: mint a fresh magic-link URL for this recipient before composing the email.
    const checkinUrl = await getCheckinUrl(email);

    // v26: pull active catcher rows for this user that haven't been emailed
    // yet. Cap at 3 by oldest so even users with many silenced moves get a
    // scannable section. The /plan banner shows them all; the email is
    // just a nudge to come back and act.
    const catcherRows = await loadCatchersForUser(supabase, session.user_id);
    const catcherHtml = renderCatcherSectionHtml(catcherRows, checkinUrl);

    if (isReentry && !reentryDeduped) {
      subject = "Your plan is still here — whenever you're ready";
      htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <div style="margin-bottom: 24px;">
            <span style="color: #2ECDB0; font-weight: 700; font-size: 18px;">Solo</span>
          </div>
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            You're on Day ${dayNumber} of your 30-day plan. Everything is exactly where you left it.
          </p>
          <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            There's no catching up required. Just check in when you're ready and we'll start from where you actually are today.
          </p>
          ${catcherHtml}
          <a href="${checkinUrl}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
            Check in now &rarr;
          </a>
          <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-top: 24px; margin-bottom: 0;">
            If something has changed and you want to rethink your direction, the check-in can handle that too — just tell us what's shifted.
          </p>
          <p style="color: #999; font-size: 13px; margin-top: 32px; line-height: 1.5;">
            You're receiving this because you have an active Solo tracker session.
            <br>To stop these emails, pause or complete your tracker from your dashboard.
          </p>
        </div>
      `;

      await supabase
        .from("tracker_sessions")
        .update({ last_reentry_email_sent_at: new Date().toISOString() })
        .eq("id", session.id);

    } else if (!isReentry) {
      subject = `Solo Day ${dayNumber} — Time for your check-in`;
      htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <div style="margin-bottom: 24px;">
            <span style="color: #2ECDB0; font-weight: 700; font-size: 18px;">Solo</span>
          </div>
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Day ${dayNumber} of your Plan B activation.
          </p>
          <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Take 2 minutes to check in — log what you did, what's next, and how you're tracking against your plan.
          </p>
          ${catcherHtml}
          <a href="${checkinUrl}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
            Check in now
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 32px; line-height: 1.5;">
            You're receiving this because you have an active Solo tracker session.
            <br>To stop these emails, pause or complete your tracker from your dashboard.
          </p>
        </div>
      `;
    } else {
      console.log(`Skipping re-entry email for user ${session.user_id} — sent within last 72h`);
      continue;
    }

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
          subject: subject,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        isReentry ? sentReentry++ : sentStandard++;
        console.log(`${isReentry ? "Re-entry" : "Standard"} email sent to ${email} (day ${dayNumber})`);
        // v26: mark email_sent_at on any catcher rows we surfaced in this
        // email so they aren't re-sent tomorrow. Fire and forget — if the
        // mark fails, the row will appear in tomorrow's email which is
        // annoying but not dangerous; better than silently double-counting
        // as success.
        if (catcherRows.length > 0) {
          const nowIso = new Date().toISOString();
          const { error: markErr } = await supabase
            .from("non_response_catchers")
            .update({ email_sent_at: nowIso })
            .in("id", catcherRows.map((r) => r.id));
          if (markErr) {
            console.error(
              `Failed to mark email_sent_at on catcher rows for ${email}:`,
              markErr
            );
          } else {
            catcherEmailsSent += catcherRows.length;
          }
        }
      } else {
        const errBody = await res.text();
        console.error(`Failed to send email to ${email}:`, errBody);
        errorCount++;
      }
    } catch (err) {
      console.error(`Error sending email to ${email}:`, (err as Error)?.message ?? String(err));
      errorCount++;
    }
  }

  const totalSent = sentStandard + sentReentry;
  console.log(
    `Check-in emails: ${sentStandard} standard, ${sentReentry} re-entry, ${errorCount} errors, ` +
    `${magicLinkFailures} magic-link mint failures (fell back to bare /plan), ` +
    `${catcherEmailsSent} catcher row(s) surfaced in emails, ${sessions.length} total sessions`
  );
  return new Response(
    JSON.stringify({
      sent: totalSent,
      sent_standard: sentStandard,
      sent_reentry: sentReentry,
      errors: errorCount,
      magic_link_failures: magicLinkFailures,
      catcher_rows_emailed: catcherEmailsSent,
      total_sessions: sessions.length,
      response_text: `Sent ${totalSent} emails (${sentStandard} standard, ${sentReentry} re-entry). ${catcherEmailsSent} catcher row(s) surfaced.`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

/* ─────────── v26 (coaching layer Phase 3 slice 3b): helpers ─────────── */

interface CatcherRowForEmail {
  id: string;
  task_id: string;
  direct_address: string;
}

/**
 * Load up to 3 active catcher rows for this user that haven't been emailed
 * yet. Ordered by oldest dispatched_at so the longest-silent moves bubble
 * up first. The /plan banner shows all active rows; the email surfaces a
 * capped subset to stay scannable.
 */
async function loadCatchersForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<CatcherRowForEmail[]> {
  const { data, error } = await supabase
    .from("non_response_catchers")
    .select("id, task_id, catcher_content")
    .eq("user_id", userId)
    .is("action_taken", null)
    .is("dismissed_at", null)
    .is("email_sent_at", null)
    .order("dispatched_at", { ascending: true })
    .limit(3);
  if (error) {
    console.error(`loadCatchersForUser error for ${userId}:`, error);
    return [];
  }
  if (!data || data.length === 0) return [];
  return (data as Array<{
    id: string;
    task_id: string;
    catcher_content: { direct_address?: string };
  }>).map((r) => ({
    id: r.id,
    task_id: r.task_id,
    direct_address: r.catcher_content?.direct_address ?? "",
  })).filter((r) => r.direct_address.length > 0);
}

/**
 * Render the Catcher section HTML chunk that splices into the daily
 * check-in email body between the intro copy and the Check-in CTA.
 * Returns "" when there are no rows so the email reads identically to
 * the v25 version. One short block per row with the direct_address line
 * + a link to /plan where the three action buttons live.
 *
 * Voice: same brand register as the on-/plan banner (eyebrow + line).
 * Deliberately short — the email is a nudge, the actions live on /plan.
 */
function renderCatcherSectionHtml(
  rows: CatcherRowForEmail[],
  planUrl: string,
): string {
  if (rows.length === 0) return "";

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const blocks = rows
    .map(
      (r) => `
      <div style="margin-bottom: 14px; padding: 14px 16px; background: #FAF9F7; border-left: 3px solid #2ECDB0; border-radius: 0 4px 4px 0;">
        <p style="color: #1a1a1a; font-size: 14.5px; line-height: 1.5; margin: 0;">
          ${escapeHtml(r.direct_address)}
        </p>
      </div>`,
    )
    .join("");

  const sectionTitle =
    rows.length === 1
      ? "About the message you sent"
      : `About ${rows.length} messages you sent`;

  return `
    <div style="margin-bottom: 28px; padding: 20px 0; border-top: 1px solid #E5E2DC; border-bottom: 1px solid #E5E2DC;">
      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: #6B6660; margin-bottom: 12px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #2ECDB0; vertical-align: middle; margin-right: 8px;"></span>
        Five days on
      </div>
      <h2 style="font-size: 17px; line-height: 1.3; font-weight: 700; color: #1a1a1a; margin: 0 0 12px 0;">
        ${escapeHtml(sectionTitle)}
      </h2>
      ${blocks}
      <p style="margin: 12px 0 0 0; font-size: 13px; line-height: 1.5;">
        <a href="${planUrl}" style="color: #1A8A72; text-decoration: underline; font-weight: 600;">
          See your three options on /plan &rarr;
        </a>
      </p>
    </div>
  `;
}
