/**
 * exchange-payment-token v1
 *
 * Called by PaymentSuccess.tsx immediately after Stripe checkout redirect.
 * The `token` is the Stripe Checkout Session ID (passed as ?token= in the
 * success_url by create-payment v10).
 *
 * Flow:
 *   1. Verify the Stripe session is paid
 *   2. Get userId from session.metadata.userId
 *   3. Failsafe: if payment-webhook missed it, apply its side-effects
 *      (mark payment completed, unlock Tranche 1 modules, trigger plan gen)
 *   4. Create a new Supabase auth session for the user via GoTrue Admin API
 *   5. Return { session: { access_token, refresh_token } }
 *
 * PaymentSuccess.tsx then calls supabase.auth.setSession() with the returned
 * tokens, establishing the user's authenticated context before polling
 * get-account-readiness.
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRANCHE_1_MODULES = [1, 2, 3];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body.token;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "token required", response_text: "No payment token provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify Stripe session
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
    let stripeSession: Stripe.Checkout.Session;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(token);
    } catch (stripeErr) {
      console.error("Stripe session retrieval failed:", stripeErr);
      return new Response(
        JSON.stringify({ error: "invalid_token", response_text: "Payment token not recognised." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPaid =
      stripeSession.status === "complete" &&
      stripeSession.payment_status === "paid";

    if (!isPaid) {
      console.warn("Token presented but payment not complete:", stripeSession.status, stripeSession.payment_status);
      return new Response(
        JSON.stringify({ error: "payment_incomplete", response_text: "Payment not yet confirmed." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get userId — create-payment stores as metadata.userId (camelCase)
    const userId = stripeSession.metadata?.userId || stripeSession.metadata?.user_id;
    if (!userId) {
      console.error("No userId in stripe session metadata", stripeSession.metadata);
      return new Response(
        JSON.stringify({ error: "invalid_token", response_text: "Payment token has no user context." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Failsafe side-effects (in case payment-webhook missed them)
    // 3a. Mark payment as completed
    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id, status")
      .eq("stripe_session_id", token)
      .single();

    if (paymentRow && paymentRow.status !== "completed") {
      await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("id", paymentRow.id);
      console.log(`[failsafe] Marked payment ${paymentRow.id} as completed`);

      // 3b. Unlock Tranche 1 modules
      try {
        const { data: existingSubSession } = await supabase
          .from("subscription_sessions")
          .select("id, modules_unlocked")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingSubSession) {
          const current: number[] = existingSubSession.modules_unlocked || [];
          const merged = Array.from(new Set([...current, ...TRANCHE_1_MODULES])).sort((a, b) => a - b);
          await supabase
            .from("subscription_sessions")
            .update({ modules_unlocked: merged, updated_at: new Date().toISOString() })
            .eq("id", existingSubSession.id);
        } else {
          await supabase.from("subscription_sessions").insert({
            user_id: userId,
            modules_unlocked: TRANCHE_1_MODULES,
            modules_completed: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        console.log(`[failsafe] Tranche 1 modules ensured for user ${userId}`);
      } catch (modErr) {
        console.error("[failsafe] Module unlock failed (non-fatal):", modErr);
      }

      // 3c. Trigger plan generation if not yet started
      try {
        const { data: trackerRow } = await supabase
          .from("tracker_sessions")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (!trackerRow) {
          const { data: report } = await supabase
            .from("reports")
            .select("id, recommended_selection, status")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (report?.id && report?.recommended_selection?.selected_ranks?.length > 0) {
            fetch(`${supabaseUrl}/functions/v1/generate-plan`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                report_id: report.id,
                selected_ranks: report.recommended_selection.selected_ranks,
                background: true,
              }),
            }).catch((err: Error) => {
              console.error("[failsafe] generate-plan trigger failed:", err.message);
            });
            console.log(`[failsafe] Background plan generation triggered for report ${report.id}`);
          }
        }
      } catch (planErr) {
        console.error("[failsafe] Plan generation check failed (non-fatal):", planErr);
      }
    }

    // 4. Create a new Supabase auth session for this user via GoTrue Admin API
    // This establishes a fresh authenticated session regardless of browser state.
    const sessionRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userId}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: "{}",
      }
    );

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      console.error("GoTrue admin session creation failed:", sessionRes.status, errText);
      return new Response(
        JSON.stringify({ error: "session_creation_failed", response_text: "Could not establish your session. Please sign in with your magic link." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionData = await sessionRes.json();
    const { access_token, refresh_token } = sessionData;

    if (!access_token || !refresh_token) {
      console.error("GoTrue returned unexpected session shape:", JSON.stringify(sessionData));
      return new Response(
        JSON.stringify({ error: "session_creation_failed", response_text: "Session format unexpected. Please sign in with your magic link." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Session created for user ${userId} via exchange-payment-token`);

    return new Response(
      JSON.stringify({
        session: { access_token, refresh_token },
        response_text: "Session established.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("exchange-payment-token unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", response_text: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
