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
  let userMap: Record<string, string> = {};

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
          <a href="${appUrl}/plan" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
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
          <a href="${appUrl}/plan" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
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
      } else {
        const errBody = await res.text();
        console.error(`Failed to send email to ${email}:`, errBody);
        errorCount++;
      }
    } catch (err) {
      console.error(`Error sending email to ${email}:`, err.message);
      errorCount++;
    }
  }

  const totalSent = sentStandard + sentReentry;
  console.log(`Check-in emails: ${sentStandard} standard, ${sentReentry} re-entry, ${errorCount} errors, ${sessions.length} total sessions`);
  return new Response(
    JSON.stringify({
      sent: totalSent,
      sent_standard: sentStandard,
      sent_reentry: sentReentry,
      errors: errorCount,
      total_sessions: sessions.length,
      response_text: `Sent ${totalSent} emails (${sentStandard} standard, ${sentReentry} re-entry)`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
