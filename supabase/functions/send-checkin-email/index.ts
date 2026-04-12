import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, email, first_name, current_day, report_id, tracker_session_id } = await req.json();

    if (!email || !tracker_session_id || current_day == null) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, tracker_session_id, current_day" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appDomain = "solo-app.lovable.app";
    const checkinUrl = `https://${appDomain}/checkin/${tracker_session_id}`;
    const displayName = first_name || "there";

    const subject = `Day ${current_day} check-in  - your plan is waiting`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 16px; line-height: 1.5;">Hey ${displayName},</p>
  <p style="font-size: 16px; line-height: 1.5;">It's <strong>Day ${current_day}</strong> of your activation plan. Your tasks are lined up and ready.</p>
  <p style="font-size: 16px; line-height: 1.5;">Take 2 minutes to check in  - it keeps your momentum going.</p>
  <p style="margin: 28px 0;">
    <a href="${checkinUrl}" style="background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">Check in now →</a>
  </p>
  <p style="font-size: 14px; color: #666; margin-top: 32px;"> - Solo</p>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Solo <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", resendResponse.status, errText);
      return new Response(JSON.stringify({ error: "Email send failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await resendResponse.json();
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-checkin-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
