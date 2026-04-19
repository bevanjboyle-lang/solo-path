import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://solo-plan.com";
const FROM_ADDRESS = "Solo <hello@solo-plan.com>";

// Abandonment email cadence (route-map §12.13)
// T+1h:  "Your report is ready"
// T+24h: "Still interested?"
// T+72h: "Last chance"
// Stop after 72h.

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
  html: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend error for ${to}:`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Email send error for ${to}:`, err.message);
    return false;
  }
}

function makeTeaser1hHtml(reportId: string, magicLink: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 32px;">
        <span style="color: #2ECDB0; font-weight: 700; font-size: 20px;">Solo</span>
      </div>
      <h1 style="color: #1a1a1a; font-size: 22px; font-weight: 700; margin: 0 0 16px;">Your report is ready.</h1>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
        We finished building your personalised Plan B report. It maps out your real options based on your experience, sector, and goals — including routes you probably haven't considered.
      </p>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">
        Unlock it now for £19.99 and you'll have your full report plus a 30-day activation plan.
      </p>
      <a href="${magicLink}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
        See my report &rarr;
      </a>
      <p style="color: #999; font-size: 13px; line-height: 1.6; margin-top: 32px;">
        This link takes you straight back to your report. No sign-in required.
      </p>
    </div>
  `;
}

function makeTeaser24hHtml(reportId: string, magicLink: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 32px;">
        <span style="color: #2ECDB0; font-weight: 700; font-size: 20px;">Solo</span>
      </div>
      <h1 style="color: #1a1a1a; font-size: 22px; font-weight: 700; margin: 0 0 16px;">Still thinking about it?</h1>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
        Your Plan B report is still here. Most people who go back to it say the same thing: it’s more specific than they expected.
      </p>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">
        It’s not a list of generic career tips. It’s built around your background, your sector, and what you’re actually trying to move toward.
      </p>
      <a href="${magicLink}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
        Go back to my report &rarr;
      </a>
      <p style="color: #999; font-size: 13px; line-height: 1.6; margin-top: 32px;">
        Your report is saved and waiting. This link signs you straight in.
      </p>
    </div>
  `;
}

function makeTeaser72hHtml(reportId: string, magicLink: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 32px;">
        <span style="color: #2ECDB0; font-weight: 700; font-size: 20px;">Solo</span>
      </div>
      <h1 style="color: #1a1a1a; font-size: 22px; font-weight: 700; margin: 0 0 16px;">Last one from us.</h1>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
        We’ll stop chasing you after this. Your report will stay saved in case you want it later.
      </p>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">
        If the timing isn’t right, that’s fine. When it is, your results will still be here.
      </p>
      <a href="${magicLink}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
        View my report &rarr;
      </a>
      <p style="color: #999; font-size: 13px; line-height: 1.6; margin-top: 32px;">
        We won’t email you again about this report.
      </p>
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set — abandonment emails skipped");
    return new Response(
      JSON.stringify({ skipped: true, response_text: "RESEND_API_KEY not set" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch teaser_ready reports created more than 1 hour ago
  // that have not yet received the T+72h email (i.e. still in active window)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: fetchError } = await supabase
    .from("reports")
    .select("id, user_id, created_at, abandonment_1h_sent_at, abandonment_24h_sent_at, abandonment_72h_sent_at")
    .eq("status", "teaser_ready")
    .lt("created_at", oneHourAgo)         // at least 1 hour old
    .gt("created_at", seventyTwoHoursAgo) // no older than 72h (stop after that)
    .is("abandonment_72h_sent_at", null); // 72h email not yet sent (catches all active)

  if (fetchError) {
    console.error("Error fetching abandoned reports:", fetchError);
    return new Response(
      JSON.stringify({ error: fetchError.message, response_text: "Fetch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!candidates || candidates.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, response_text: "No abandoned reports to process" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Filter out reports where user has paid
  const reportUserIds = candidates.map((r: AbandonedReport) => r.user_id);
  const { data: paidUsers } = await supabase
    .from("payments")
    .select("user_id")
    .in("user_id", reportUserIds)
    .eq("status", "completed");

  const paidUserSet = new Set((paidUsers || []).map((p: { user_id: string }) => p.user_id));
  const unpaidCandidates = (candidates as AbandonedReport[]).filter(
    (r) => !paidUserSet.has(r.user_id)
  );

  if (unpaidCandidates.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, response_text: "All candidates have paid" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let sent1h = 0, sent24h = 0, sent72h = 0, errors = 0;

  for (const report of unpaidCandidates) {
    const hoursOld = hoursSince(report.created_at);

    // Determine which email to send in this pass
    let emailType: "1h" | "24h" | "72h" | null = null;

    if (hoursOld >= 72 && !report.abandonment_72h_sent_at) {
      emailType = "72h";
    } else if (hoursOld >= 24 && !report.abandonment_24h_sent_at) {
      emailType = "24h";
    } else if (hoursOld >= 1 && !report.abandonment_1h_sent_at) {
      emailType = "1h";
    }

    if (!emailType) continue; // Already sent this pass's email, or not due yet

    // Get user email via Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(report.user_id);
    if (userError || !userData?.user?.email) {
      console.warn(`No email for user ${report.user_id} — skipping`);
      continue;
    }
    const userEmail = userData.user.email;

    // Generate a magic link back to the teaser
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
      console.warn(`Magic link exception for ${userEmail}:`, linkErr.message);
    }

    // Build and send the email
    let subject: string;
    let html: string;

    if (emailType === "1h") {
      subject = "Your report is ready";
      html = makeTeaser1hHtml(report.id, magicLink);
    } else if (emailType === "24h") {
      subject = "Still thinking about your plan?";
      html = makeTeaser24hHtml(report.id, magicLink);
    } else {
      subject = "Last one from us";
      html = makeTeaser72hHtml(report.id, magicLink);
    }

    const ok = await sendEmail(resendApiKey, userEmail, subject, html);

    if (ok) {
      // Mark as sent
      const updateField = `abandonment_${emailType}_sent_at`;
      const { error: updateError } = await supabase
        .from("reports")
        .update({ [updateField]: new Date().toISOString() })
        .eq("id", report.id);

      if (updateError) {
        console.error(`Failed to mark ${emailType} sent for report ${report.id}:`, updateError);
      } else {
        console.log(`Abandonment ${emailType} sent to ${userEmail} (report ${report.id})`);
        if (emailType === "1h") sent1h++;
        else if (emailType === "24h") sent24h++;
        else sent72h++;
      }
    } else {
      errors++;
    }
  }

  const totalSent = sent1h + sent24h + sent72h;
  console.log(`Abandonment emails: ${sent1h} T+1h, ${sent24h} T+24h, ${sent72h} T+72h, ${errors} errors`);

  return new Response(
    JSON.stringify({
      sent_1h: sent1h,
      sent_24h: sent24h,
      sent_72h: sent72h,
      total_sent: totalSent,
      errors,
      candidates_checked: unpaidCandidates.length,
      response_text: `Sent ${totalSent} abandonment emails (${sent1h} T+1h, ${sent24h} T+24h, ${sent72h} T+72h)`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
