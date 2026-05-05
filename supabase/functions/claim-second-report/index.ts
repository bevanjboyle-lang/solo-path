// claim-second-report v16 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// claim-second-report v13 — Audit P0 #7: STRIPE_PRICE_SECOND_REPORT env var support
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// £9.99 GBP one-time price for a second Plan B Report (non-subscribers)
// Audit fix #7: sourced from env var; fall back to test ID (warn). Bevan must set STRIPE_PRICE_SECOND_REPORT at prod cutover.
const SECOND_REPORT_PRICE_FALLBACK = "price_1TNGaj0PR8c2G6sm8EVtTm8V";
const DEFAULT_SITE_URL = "https://solo-plan.com";

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("subscription_active, subscription_started_at, stripe_customer_id, second_report_paid")
      .eq("user_id", userId)
      .single();

    let customerEmail: string | null = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      customerEmail = authUser?.user?.email || null;
    } catch (emailErr) {
      console.warn("auth.admin.getUserById failed (non-fatal):", emailErr);
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReports } = await supabase
      .from("reports")
      .select("id, created_at")
      .eq("user_id", userId)
      .in("status", ["complete", "completed"])
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    const recentCount = recentReports?.length || 0;

    if (recentCount >= 1) {
      const mostRecent = recentReports![0];
      const nextEligibleAt = new Date(
        new Date(mostRecent.created_at).getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const daysUntil = Math.ceil(
        (new Date(nextEligibleAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return new Response(
        JSON.stringify({
          eligible: false,
          reason: "cap_reached",
          message: `You've already generated a report in the last 30 days. Your next report is available in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`,
          next_eligible_at: nextEligibleAt,
          days_until_eligible: daysUntil,
          response_text: "Report cap reached for this 30-day window.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile?.subscription_active) {
      return new Response(
        JSON.stringify({
          eligible: true,
          requires_payment: false,
          message: "You can start a new report. Your previous answers will be pre-filled where relevant.",
          response_text: "Eligible for new report.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile?.second_report_paid) {
      await supabase
        .from("user_profiles")
        .update({
          second_report_paid: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          eligible: true,
          requires_payment: false,
          message: "You've already paid for your second report. You can start now.",
          response_text: "Eligible — second report payment already on file.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not set");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          response_text: "Unable to create payment session.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit fix #6: API version already standardised to 2025-01-27.acacia
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
    const siteUrl = Deno.env.get("SITE_URL") || DEFAULT_SITE_URL;

    // Audit fix #7: env var for second-report price
    const secondReportPriceId = Deno.env.get("STRIPE_PRICE_SECOND_REPORT") || SECOND_REPORT_PRICE_FALLBACK;
    if (!Deno.env.get("STRIPE_PRICE_SECOND_REPORT")) {
      console.warn("STRIPE_PRICE_SECOND_REPORT not set — using test fallback. Set env var before production cutover.");
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        { price: secondReportPriceId, quantity: 1 },
      ],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : (customerEmail || undefined),
      success_url: `${siteUrl}/payment-success?type=second_report&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/account`,
      metadata: {
        type: "second_report",
        userId,
        user_id: userId,
      },
      payment_intent_data: {
        metadata: {
          type: "second_report",
          userId,
          user_id: userId,
        },
      },
    });

    const { error: paymentInsertErr } = await supabase.from("payments").insert({
      user_id: userId,
      stripe_session_id: checkoutSession.id,
      stripe_customer_id: profile?.stripe_customer_id || null,
      amount: 999,
      currency: "gbp",
      status: "pending",
    });
    if (paymentInsertErr) {
      console.warn("payments row insert failed (non-fatal):", paymentInsertErr.message);
    }

    return new Response(
      JSON.stringify({
        eligible: false,
        requires_payment: true,
        reason: "payment_required",
        message: "A second Plan B Report costs £9.99. Complete payment to continue.",
        checkout_url: checkoutSession.url,
        session_id: checkoutSession.id,
        amount: 999,
        currency: "gbp",
        response_text: "Payment required for second report.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("claim-second-report error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
        response_text: "Failed to check eligibility.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
