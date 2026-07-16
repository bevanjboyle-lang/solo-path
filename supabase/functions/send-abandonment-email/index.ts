// send-abandonment-email v4 — 2026-07-01 — ADR-027 consent gating.
//   Each abandonment nudge is now gated by can_send_email(email,'lifecycle') before
//   sending: a suppressed / opted-out / frequency-capped recipient is skipped and
//   the step is consumed (sent flag marked) so we do not re-evaluate every 30 min.
//   Every send is recorded in email_send_log. Each email carries a one-click
//   unsubscribe footer link + List-Unsubscribe headers (RFC 8058). See
//   admin/communication-preferences-design.md.
//
// v3 — F44 fix: cron-callable (verify_jwt:false) — 2026-06-01
// v2 — vibe code review fix V-058 — 2026-05-14
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v4-consent-gated";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://solo-plan.com";
const FROM_ADDRESS = Deno.env.get("ABANDONMENT_FROM_ADDRESS") ?? "Solo <hello@solo-plan.com>";

interface AbandonedReport {
  id: string;
  user_id: string;
  created_at: string;
  abandonment_1h_sent_at: string | null;
  abandonment_24h_sent_at: string | null;
  abandonment_72h_sent_at: string | null;
}

function hoursSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  html: string,
  unsubUrl: string,
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend error for ${to}:`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Email send error for ${to}:`, (err as Error).message);
    return false;
  }
}

function emailShell(heading: string, p1: string, p2: string, cta: string, magicLink: string, footer: string, unsubUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 32px;">
        <span style="color: #2ECDB0; font-weight: 700; font-size: 20px;">Solo</span>
      </div>
      <h1 style="color: #1a1a1a; font-size: 22px; font-weight: 700; margin: 0 0 16px;">${heading}</h1>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">${p1}</p>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">${p2}</p>
      <a href="${magicLink}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">${cta} &rarr;</a>
      <p style="color: #999; font-size: 13px; line-height: 1.6; margin-top: 32px;">${footer}</p>
      <p style="color: #bbb; font-size: 12px; line-height: 1.6; margin-top: 16px;">Not useful? <a href="${unsubUrl}" style="color: #999;">Unsubscribe</a> and we'll stop.</p>
    </div>
  `;
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — abandonment emails skipped");
    return new Response(
      JSON.stringify({ skipped: true, response_text: "RESEND_API_KEY not set" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: fetchError } = await supabase
    .from("reports")
    .select("id, user_id, created_at, abandonment_1h_sent_at, abandonment_24h_sent_at, abandonment_72h_sent_at")
    .eq("status", "teaser_ready")
    .lt("created_at", oneHourAgo)
    .gt("created_at", seventyTwoHoursAgo)
    .is("abandonment_72h_sent_at", null);

  if (fetchError) {
    console.error("Error fetching abandoned reports:", fetchError);
    return new Response(
      JSON.stringify({ error: fetchError.message, response_text: "Fetch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!candidates || candidates.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, response_text: "No abandoned reports to process" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const reportUserIds = candidates.map((r: AbandonedReport) => r.user_id);
  const { data: paidUsers } = await supabase
    .from("payments")
    .select("user_id")
    .in("user_id", reportUserIds)
    .eq("status", "completed");

  const paidUserSet = new Set((paidUsers || []).map((p: { user_id: string }) => p.user_id));
  const unpaidCandidates = (candidates as AbandonedReport[]).filter(
    (r) => !paidUserSet.has(r.user_id),
  );

  if (unpaidCandidates.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, response_text: "All candidates have paid" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let sent1h = 0, sent24h = 0, sent72h = 0, errors = 0, skipped = 0;

  for (const report of unpaidCandidates) {
    const hoursOld = hoursSince(report.created_at);

    let emailType: "1h" | "24h" | "72h" | null = null;

    if (hoursOld >= 72 && !report.abandonment_72h_sent_at) {
      emailType = "72h";
    } else if (hoursOld >= 24 && !report.abandonment_24h_sent_at) {
      emailType = "24h";
    } else if (hoursOld >= 1 && !report.abandonment_1h_sent_at) {
      emailType = "1h";
    }

    if (!emailType) continue;

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(report.user_id);
    if (userError || !userData?.user?.email) {
      console.warn(`No email for user ${report.user_id} — skipping`);
      continue;
    }
    const userEmail = userData.user.email;

    // ADR-027: consent gate. Resolve prefs (get token), check can_send_email('lifecycle').
    const { data: prefsRow } = await supabase.rpc("ensure_comm_prefs", {
      p_email: userEmail,
      p_user_id: report.user_id,
    });
    const prefs = Array.isArray(prefsRow) ? prefsRow[0] : prefsRow;
    const unsubUrl = `${supabaseUrl}/functions/v1/manage-unsubscribe?token=${prefs?.unsubscribe_token ?? ""}`;

    const { data: gate } = await supabase.rpc("can_send_email", {
      p_email: userEmail,
      p_class: "lifecycle",
      p_user_id: report.user_id,
    });
    const allowed = Array.isArray(gate) && gate[0]?.allowed === true;
    if (!allowed) {
      const reason = (Array.isArray(gate) && gate[0]?.reason) || "blocked";
      await supabase.rpc("log_email_send", {
        p_email: userEmail,
        p_user_id: report.user_id,
        p_class: "lifecycle",
        p_key: `abandonment_${emailType}`,
        p_status: "skipped",
        p_skip_reason: reason,
      });
      // consume the step so we do not re-evaluate this recipient every 30 min
      await supabase
        .from("reports")
        .update({ [`abandonment_${emailType}_sent_at`]: new Date().toISOString() })
        .eq("id", report.id);
      skipped++;
      console.log(`Abandonment ${emailType} skipped for ${userEmail}: ${reason}`);
      continue;
    }

    let magicLink = `${APP_URL}/teaser?report_id=${report.id}`;
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
        options: { redirectTo: `${APP_URL}/teaser?report_id=${report.id}` },
      });
      if (!linkError && linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link;
      } else {
        console.warn(`Magic link generation failed for ${userEmail}, using fallback URL`);
      }
    } catch (linkErr) {
      console.warn(`Magic link exception for ${userEmail}:`, (linkErr as Error).message);
    }

    let subject: string;
    let html: string;

    if (emailType === "1h") {
      subject = "Your report is ready";
      html = emailShell(
        "Your report is ready.",
        "We finished building your personalised Plan B report. It maps out your real options based on your experience, sector, and goals — including routes you probably haven't considered.",
        "Unlock it now for £19.99 and you'll have your full report plus a 30-day activation plan.",
        "See my report",
        magicLink,
        "This link takes you straight back to your report. No sign-in required.",
        unsubUrl,
      );
    } else if (emailType === "24h") {
      subject = "Still thinking about your plan?";
      html = emailShell(
        "Still thinking about it?",
        "Your Plan B report is still here. Most people who go back to it say the same thing: it's more specific than they expected.",
        "It's not a list of generic career tips. It's built around your background, your sector, and what you're actually trying to move toward.",
        "Go back to my report",
        magicLink,
        "Your report is saved and waiting. This link signs you straight in.",
        unsubUrl,
      );
    } else {
      subject = "Last one from us";
      html = emailShell(
        "Last one from us.",
        "We'll stop chasing you after this. Your report will stay saved in case you want it later.",
        "If the timing isn't right, that's fine. When it is, your results will still be here.",
        "View my report",
        magicLink,
        "We won't email you again about this report.",
        unsubUrl,
      );
    }

    const ok = await sendEmail(resendApiKey, userEmail, subject, html, unsubUrl);

    if (ok) {
      const updateField = `abandonment_${emailType}_sent_at`;
      const { error: updateError } = await supabase
        .from("reports")
        .update({ [updateField]: new Date().toISOString() })
        .eq("id", report.id);

      await supabase.rpc("log_email_send", {
        p_email: userEmail,
        p_user_id: report.user_id,
        p_class: "lifecycle",
        p_key: `abandonment_${emailType}`,
        p_status: "sent",
        p_skip_reason: null,
      });

      if (updateError) {
        console.error(`Failed to mark ${emailType} sent for report ${report.id}:`, updateError);
      } else {
        console.log(`Abandonment ${emailType} sent to ${userEmail} (report ${report.id})`);
        if (emailType === "1h") sent1h++;
        else if (emailType === "24h") sent24h++;
        else sent72h++;
      }
    } else {
      await supabase.rpc("log_email_send", {
        p_email: userEmail,
        p_user_id: report.user_id,
        p_class: "lifecycle",
        p_key: `abandonment_${emailType}`,
        p_status: "error",
        p_skip_reason: null,
      });
      errors++;
    }
  }

  const totalSent = sent1h + sent24h + sent72h;
  console.log(`Abandonment emails: ${sent1h} T+1h, ${sent24h} T+24h, ${sent72h} T+72h, ${skipped} skipped, ${errors} errors`);

  return new Response(
    JSON.stringify({
      sent_1h: sent1h,
      sent_24h: sent24h,
      sent_72h: sent72h,
      total_sent: totalSent,
      skipped,
      errors,
      candidates_checked: unpaidCandidates.length,
      version: FUNCTION_VERSION,
      response_text: `Sent ${totalSent} abandonment emails (${sent1h} T+1h, ${sent24h} T+24h, ${sent72h} T+72h), ${skipped} skipped by consent gate`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
