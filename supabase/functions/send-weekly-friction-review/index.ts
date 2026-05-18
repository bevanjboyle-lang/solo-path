/*
 * send-weekly-friction-review v1 — 2026-05-18
 *
 * Coaching layer Phase 2 slice 2b (admin/coaching-layer-design.md v1.3).
 *
 * Sends out generated Weekly Friction Reviews via email. Triggered by
 * the Monday ~9am UK cron (added in slice 2b alongside the generator
 * cron, ~10 min after so the generator finishes before this runs).
 *
 * Flow:
 *   1. Query weekly_friction_reviews where email_sent_at IS NULL.
 *   2. Look up user emails via the existing get_user_emails_for_checkin RPC.
 *   3. For each row: mint a magic-link auth URL that lands the user on /plan
 *      already authed (same pattern as send-checkin-email v25), format the
 *      HTML email, POST to Resend.
 *   4. On 200 OK from Resend, set email_sent_at = now().
 *   5. On any failure, leave email_sent_at NULL so the next run retries.
 *
 * Idempotent against cron retries: only rows with email_sent_at IS NULL
 * are processed. A row that's already been emailed never gets re-sent
 * by this function.
 *
 * verify_jwt:false — cron-triggered, no user context. Function does not
 * accept user input that could leak data; all selection is service-role
 * driven against the weekly_friction_reviews table.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const APP_URL = "https://solo-plan.com";
const FROM_ADDRESS = "Solo <hello@solo-plan.com>";

interface ReviewRow {
  id: string;
  user_id: string;
  tracker_session_id: string;
  week_start: string;
  week_end: string;
  review_content: {
    week_summary: string;
    dominant_pattern: string;
    reframe: string;
    next_week_action: string;
    cohort_pulse?: string | null;
  };
}

interface RpcUser {
  id: string;
  email: string;
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
    return jsonResp(500, {
      error: "Server configuration error",
      response_text: "Missing config",
    });
  }

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — emails will not be sent");
    return jsonResp(200, {
      error: "Email service not configured",
      response_text: "RESEND_API_KEY not set. Skipping email send.",
      skipped: true,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Pull all reviews that have not yet been emailed.
  const { data: reviews, error: reviewsError } = await supabase
    .from("weekly_friction_reviews")
    .select(
      "id, user_id, tracker_session_id, week_start, week_end, review_content",
    )
    .is("email_sent_at", null)
    .order("generated_at", { ascending: true });

  if (reviewsError) {
    console.error("Error fetching unsent reviews:", reviewsError);
    return jsonResp(500, {
      error: reviewsError.message,
      response_text: "Failed to fetch reviews",
    });
  }

  if (!reviews || reviews.length === 0) {
    console.log("send-weekly-friction-review: no unsent reviews");
    return jsonResp(200, {
      sent: 0,
      response_text: "No emails to send",
    });
  }

  // 2. Look up user emails. RPC returns [{id, email}].
  const userIds = (reviews as ReviewRow[]).map((r) => r.user_id);
  const { data: authUsers, error: authError } = await supabase.rpc(
    "get_user_emails_for_checkin",
    { user_ids: userIds },
  );

  if (authError || !authUsers) {
    console.error("Cannot retrieve user emails:", authError);
    return jsonResp(200, {
      error: "Cannot retrieve user emails",
      response_text: "Email lookup failed",
      sent: 0,
    });
  }

  const emailByUserId: Record<string, string> = {};
  for (const u of authUsers as RpcUser[]) {
    emailByUserId[u.id] = u.email;
  }

  // 3+4. For each review, mint magic link, format email, send, mark sent.
  let sent = 0;
  let errors = 0;
  let magicLinkFailures = 0;
  let missingEmail = 0;

  async function getMagicLinkUrl(email: string): Promise<string> {
    // Mirrors the send-checkin-email pattern: admin.generateLink returns a
    // hashed_token, which we hand to /auth/confirm to mint a session without
    // the broken PKCE round-trip. Falls back to bare /plan if generateLink
    // fails, so emails still send rather than silently dropping.
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${APP_URL}/plan` },
      });
      const props = (data as {
        properties?: { hashed_token?: string };
      } | null)?.properties;
      const hashedToken = props?.hashed_token;
      if (error || !hashedToken) {
        console.warn(
          `generateLink missing hashed_token for ${email} — falling back to bare /plan. err=`,
          error,
        );
        magicLinkFailures++;
        return `${APP_URL}/plan`;
      }
      const params = new URLSearchParams({
        token_hash: hashedToken,
        type: "magiclink",
        redirect_to: `${APP_URL}/plan`,
      });
      return `${APP_URL}/auth/confirm?${params.toString()}`;
    } catch (err) {
      console.warn(
        `generateLink threw for ${email} — falling back to bare /plan.`,
        err,
      );
      magicLinkFailures++;
      return `${APP_URL}/plan`;
    }
  }

  for (const r of reviews as ReviewRow[]) {
    const email = emailByUserId[r.user_id];
    if (!email) {
      console.warn(`No email for user_id ${r.user_id}, skipping review ${r.id}`);
      missingEmail++;
      continue;
    }

    const planUrl = await getMagicLinkUrl(email);
    const html = renderHtmlEmail(r, planUrl);
    const text = renderTextEmail(r, planUrl);
    const subject = `Your Friction Review · ${formatDateRange(r.week_start, r.week_end)}`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [email],
          subject,
          html,
          text,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(
          `Failed to send weekly friction review email to ${email}:`,
          errBody,
        );
        errors++;
        continue;
      }

      // Mark email_sent_at so the row isn't re-sent on next cron tick.
      const { error: updateError } = await supabase
        .from("weekly_friction_reviews")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      if (updateError) {
        // Email was sent but mark failed — log and count as error so we
        // can investigate. Next cron run will resend (annoying but not
        // dangerous). Better than silently double-counting as success.
        console.error(
          `Email sent to ${email} for review ${r.id} but email_sent_at update failed:`,
          updateError,
        );
        errors++;
      } else {
        sent++;
      }
    } catch (err) {
      console.error(
        `Error sending weekly friction review email to ${email}:`,
        (err as Error)?.message ?? String(err),
      );
      errors++;
    }
  }

  console.log(
    `send-weekly-friction-review: sent=${sent} errors=${errors} missing_email=${missingEmail} magic_link_failures=${magicLinkFailures} total_unsent=${reviews.length}`,
  );

  return jsonResp(200, {
    sent,
    errors,
    missing_email: missingEmail,
    magic_link_failures: magicLinkFailures,
    total_unsent: reviews.length,
    response_text: `Sent ${sent} weekly friction review email(s).`,
  });
});

/* ─────────────────────────── Helpers ─────────────────────────── */

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatDateRange(weekStart: string, weekEnd: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

/*
 * renderHtmlEmail — email-safe HTML rendering of a Weekly Friction Review.
 *
 * Pattern: table-based layout, inline styles, no tailwind/CSS classes,
 * no external resources. Mirrors the /plan WeeklyFrictionReviewCard
 * visual structure but uses the brand's editorial palette (ivory panel
 * #FAF9F7, mint accent #2ECDB0, foreground #1D2025, muted #6B6660).
 *
 * Voice register matches the on-surface render: eyebrow + dominant_pattern
 * H2 + week_summary muted + reframe in display weight + "This week" label
 * + next_week_action + CTA button to /plan.
 */
function renderHtmlEmail(r: ReviewRow, planUrl: string): string {
  const rc = r.review_content;
  const dateRange = formatDateRange(r.week_start, r.week_end);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Your Friction Review · ${escapeHtml(dateRange)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F1ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1D2025;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F1ED;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FAF9F7;max-width:600px;width:100%;">
        <tr>
          <td style="padding:40px 40px 8px 40px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#6B6660;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#2ECDB0;vertical-align:middle;margin-right:8px;"></span>
              <span style="color:#1D2025;">This week</span>
              <span style="color:#C8C3BA;margin:0 6px;">·</span>
              <span>Friction review</span>
              <span style="color:#C8C3BA;margin:0 6px;">·</span>
              <span style="text-transform:none;letter-spacing:normal;font-weight:400;">${escapeHtml(dateRange)}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0 40px;">
            <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;line-height:1.2;font-weight:700;margin:0;color:#1D2025;letter-spacing:-0.018em;">
              ${escapeHtml(rc.dominant_pattern)}
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 40px 0 40px;">
            <p style="font-size:13.5px;line-height:1.55;color:#6B6660;margin:0;">
              ${escapeHtml(rc.week_summary)}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0 40px;">
            <p style="font-size:16px;line-height:1.5;color:#1D2025;font-weight:500;margin:0;letter-spacing:-0.012em;">
              ${escapeHtml(rc.reframe)}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0 40px;">
            <div style="border-top:1px solid #E5E2DC;padding-top:20px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#2ECDB0;margin-bottom:8px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#2ECDB0;vertical-align:middle;margin-right:8px;"></span>
                This week
              </div>
              <p style="font-size:15px;line-height:1.6;color:#1D2025;margin:0;">
                ${escapeHtml(rc.next_week_action)}
              </p>
            </div>
          </td>
        </tr>
        ${rc.cohort_pulse ? `
        <tr>
          <td style="padding:24px 40px 0 40px;">
            <div style="border-top:1px solid #E5E2DC;padding-top:20px;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#6B6660;margin-bottom:8px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#9A958E;vertical-align:middle;margin-right:8px;"></span>
                Cohort pulse
              </div>
              <p style="font-size:14px;line-height:1.6;color:#3A3A3A;margin:0;font-style:italic;">
                ${escapeHtml(rc.cohort_pulse)}
              </p>
              <p style="font-size:11px;line-height:1.5;color:#9A958E;margin:8px 0 0 0;">
                Qualitative at launch. As Solo accumulates real cohort data, this line will become quantitative and specific to your archetype.
              </p>
            </div>
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:32px 40px 40px 40px;">
            <a href="${escapeHtmlAttr(planUrl)}" style="display:inline-block;background:#2ECDB0;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">
              Open your plan
            </a>
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin-top:16px;">
        <tr>
          <td style="padding:0 40px;font-size:11px;line-height:1.5;color:#9A958E;text-align:center;">
            You're receiving this because you have an active Solo plan.
            <br>To stop these reviews, manage your subscription from your account.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderTextEmail(r: ReviewRow, planUrl: string): string {
  const rc = r.review_content;
  const dateRange = formatDateRange(r.week_start, r.week_end);
  const lines: string[] = [
    `This week · Friction review · ${dateRange}`,
    "",
    rc.dominant_pattern,
    "",
    rc.week_summary,
    "",
    rc.reframe,
    "",
    `This week:`,
    rc.next_week_action,
  ];
  // Phase 5a: append cohort_pulse block if present. Older rows (pre-v3
  // prompt) won't have it, in which case the block is suppressed cleanly.
  if (rc.cohort_pulse) {
    lines.push("");
    lines.push("Cohort pulse:");
    lines.push(rc.cohort_pulse);
    lines.push("");
    lines.push(
      "(Qualitative at launch; will become quantitative as Solo accumulates real cohort data.)",
    );
  }
  lines.push(
    "",
    `Open your plan: ${planUrl}`,
    "",
    "—",
    "You're receiving this because you have an active Solo plan.",
    "To stop these reviews, manage your subscription from your account.",
  );
  return lines.join("\n");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttr(input: string): string {
  // For URLs going into href attributes — escape quotes + amp.
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
