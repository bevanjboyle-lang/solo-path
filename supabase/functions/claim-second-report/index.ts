// claim-second-report v17 — vibe code review fixes — 2026-05-14
//
// V-039: second_report_paid flag consumption is now atomic via conditional UPDATE
//        with row-count check. Previously a double-click could let two concurrent
//        invocations both see the flag as true, both write false, both return
//        eligible — letting the user take two reports for one payment.
// V-040: dropped the hardcoded test-mode price ID fallback. If STRIPE_PRICE_SECOND_REPORT
//        env var is missing, function now fails fast with 500 instead of using a
//        test-mode price ID that would fail in live mode.
//
// claim-second-report v16 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// claim-second-report v13 — Audit P0 #7: STRIPE_PRICE_SECOND_REPORT env var support
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// V-040 (vibe code review 2026-05-14): hardcoded test-mode price ID fallback removed.
// STRIPE_PRICE_SECOND_REPORT must be set in Supabase secrets — function fails fast
// otherwise (see check inside handler).
const FUNCTION_VERSION = "v17-vibe-review-fixes";
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
      // V-039 (vibe code review 2026-05-14): atomic consumption. Conditional update
      // with row-count check ensures only one concurrent invocation can "win" the
      // flag. Previously a double-click could let two requests both see the flag as
      // true, both set it false, both return eligible — letting the user generate
      // two reports for one payment.
      const { count, error: consumeErr } = await supabase
        .from("user_profiles")
        .update({
          second_report_paid: false,
          updated_at: new Date().toISOString(),
        }, { count: "exact" })
        .eq("user_id", userId)
        .eq("second_report_paid", true);

      if (consumeErr) {
        console.error(`${FUNCTION_VERSION} V-039 consume error:`, consumeErr.message);
      }

      if (count === 1) {
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
      // Lost the race — flag was already consumed by a concurrent request. Fall
      // through to the standard payment-required path below.
      console.log(`${FUNCTION_VERSION} V-039: lost race on second_report_paid for user ${userId}`);
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

    // V-040 (vibe code review 2026-05-14): no test-mode fallback. STRIPE_PRICE_SECOND_REPORT
    // must be set; otherwise fail-fast 500 instead of silently using a dead test ID.
    const secondReportPriceId = Deno.env.get("STRIPE_PRICE_SECOND_REPORT");
    if (!secondReportPriceId) {
      console.error(`${FUNCTION_VERSION} V-040 fatal: STRIPE_PRICE_SECOND_REPORT env var not set`);
      return new Response(
        JSON.stringify({
          error: "server_misconfigured",
          response_text: "Server configuration error — second report price not configured.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
