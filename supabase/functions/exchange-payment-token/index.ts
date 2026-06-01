/**
 * exchange-payment-token v8 — F44 fix (2026-06-01)
 *
 * v8 (F44): mint the post-payment session for the RESOLVED OWNER's email
 *   (userId, from the payments row / metadata), NOT stripeSession.customer_details.email.
 *   F44 surfaced that when the Stripe checkout email differs from the account's
 *   signup email (e.g. a Gmail base address vs a +alias), the function logged the
 *   user into the WRONG account; the payment-success page then polled the buyer's
 *   report under the wrong session, never saw it, and stuck at 60s ("webhook_pending").
 *   Real users with matching emails were unaffected, but this is the correct,
 *   robust behaviour: the session must always match the report/payment owner.
 *   customer_details.email is now only a last-resort fallback when userId can't
 *   resolve an email.
 *
 * v6/v7 history: V-034/035 single-use token guard via payment_token_exchanges;
 *   V-037 subscription_sessions upsert race fix; v5 supabase-js verifyOtp(token_hash).
 * Frontend contract unchanged: returns { session: { access_token, refresh_token } }.
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { TRANCHE_1_MODULES } from "../_shared/constants.ts";

const FUNCTION_VERSION = "v8-session-email-from-owner";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(supabaseUrl, anonKey, {
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
    let stripeSession: Stripe.Checkout.Session;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(token);
    } catch (stripeErr) {
      console.error(`${FUNCTION_VERSION} Stripe retrieval failed:`, stripeErr);
      return new Response(
        JSON.stringify({ error: "invalid_token", response_text: "Payment token not recognised." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stripeSession.status !== "complete" || stripeSession.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "payment_incomplete", response_text: "Payment not yet confirmed." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // V-034 + V-035: single-use guard.
    {
      const { data: claimRow, error: claimError } = await supabase
        .from("payment_token_exchanges")
        .upsert(
          { token },
          { onConflict: "token", ignoreDuplicates: true },
        )
        .select("token");
      if (claimError) {
        console.error(`${FUNCTION_VERSION} V-034 claim error (proceeding):`, claimError.message);
      } else if (!claimRow || claimRow.length === 0) {
        console.log(`${FUNCTION_VERSION} V-034 reject: token ${token.slice(0, 16)}… already exchanged`);
        return new Response(
          JSON.stringify({
            error: "token_already_exchanged",
            response_text: "This payment session has already been used. Sign in via the magic link we emailed you, or request a new sign-in from the home page.",
          }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id, status, user_id")
      .eq("stripe_session_id", token)
      .single();

    const userId =
      paymentRow?.user_id ||
      stripeSession.metadata?.userId ||
      stripeSession.metadata?.user_id;

    if (!userId) {
      console.error(`${FUNCTION_VERSION} userId not resolvable`, JSON.stringify({ paymentRow, metadata: stripeSession.metadata }));
      return new Response(
        JSON.stringify({
          error: "user_not_resolved",
          response_text: "Payment received but user context not yet available. Please refresh in a moment.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // v8 (F44): resolve the session email from the OWNER (userId) first, so the
    // minted session always matches the account that owns the report/payment.
    // The Stripe checkout email is only a last-resort fallback — using it first
    // logged users into the wrong account when it differed from their signup email.
    let userEmail: string | null = null;
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    userEmail = userData?.user?.email ?? null;
    if (!userEmail) {
      userEmail = stripeSession.customer_details?.email || null;
    }
    if (!userEmail) {
      console.error(`${FUNCTION_VERSION} no email for user ${userId}`);
      return new Response(
        JSON.stringify({
          error: "email_not_resolved",
          response_text: "Could not establish your session. Please sign in with your magic link.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (paymentRow && paymentRow.status !== "completed") {
      await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("id", paymentRow.id);

      // V-037: race-safe module unlock via single upsert.
      try {
        const { data: existingSubSession } = await supabase
          .from("subscription_sessions")
          .select("modules_unlocked")
          .eq("user_id", userId)
          .maybeSingle();
        const currentUnlocked: number[] = existingSubSession?.modules_unlocked || [];
        const merged = Array.from(new Set([...currentUnlocked, ...TRANCHE_1_MODULES])).sort((a, b) => a - b);
        const { error: upsertErr } = await supabase
          .from("subscription_sessions")
          .upsert(
            {
              user_id: userId,
              modules_unlocked: merged,
              modules_completed: existingSubSession ? undefined : [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        if (upsertErr) {
          console.error(`${FUNCTION_VERSION} module unlock upsert failed (non-fatal):`, upsertErr.message);
        }
      } catch (modErr) {
        console.error(`${FUNCTION_VERSION} module unlock failed (non-fatal):`, modErr);
      }
    }

    // Mint a fresh magic-link OTP for the OWNER's email.
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    if (linkError || !linkData?.properties) {
      console.error(`${FUNCTION_VERSION} generateLink failed:`, linkError?.message);
      return new Response(
        JSON.stringify({
          error: "session_creation_failed",
          response_text: "Could not establish your session. Please sign in with your magic link.",
          details: linkError?.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hashedToken = (linkData.properties as { hashed_token?: string }).hashed_token;
    if (!hashedToken) {
      console.error(`${FUNCTION_VERSION} no hashed_token`, JSON.stringify(linkData.properties));
      return new Response(
        JSON.stringify({
          error: "session_creation_failed",
          response_text: "Session token format unexpected. Please sign in with your magic link.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
    });

    if (verifyError || !verifyData?.session) {
      console.error(`${FUNCTION_VERSION} verifyOtp failed:`, verifyError?.message);
      return new Response(
        JSON.stringify({
          error: "session_creation_failed",
          response_text: "Could not establish your session. Please sign in with your magic link.",
          details: verifyError?.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const access_token = verifyData.session.access_token;
    const refresh_token = verifyData.session.refresh_token;

    if (!access_token || !refresh_token) {
      console.error(`${FUNCTION_VERSION} verifyOtp returned no tokens:`, JSON.stringify(verifyData.session));
      return new Response(
        JSON.stringify({
          error: "session_creation_failed",
          response_text: "Session format unexpected. Please sign in with your magic link.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${FUNCTION_VERSION} session created for user ${userId} (${userEmail})`);

    return new Response(
      JSON.stringify({
        session: { access_token, refresh_token },
        response_text: "Session established.",
        version: FUNCTION_VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`${FUNCTION_VERSION} unhandled error:`, err);
    return new Response(
      JSON.stringify({ error: "internal_error", response_text: "An unexpected error occurred.", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
