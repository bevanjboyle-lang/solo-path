/**
 * exchange-payment-token v5 — use supabase-js verifyOtp(token_hash).
 * Frontend contract unchanged: returns { session: { access_token, refresh_token } }.
 *
 * v4 used POST /auth/v1/verify with `token` parameter, got otp_expired (param name wrong).
 * v5 uses supabase-js anon client's verifyOtp({ type: 'magiclink', token_hash }) which
 * sends the correct parameter to GoTrue.
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v5-verifyotp-tokenhash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const TRANCHE_1_MODULES = [1, 2, 3];

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

  // Anon client for verifyOtp — must NOT use service role key.
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

    let userEmail = stripeSession.customer_details?.email || null;
    if (!userEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      userEmail = userData?.user?.email ?? null;
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
      } catch (modErr) {
        console.error(`${FUNCTION_VERSION} module unlock failed (non-fatal):`, modErr);
      }
    }

    // Mint a fresh magic-link OTP for this user.
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

    // v5: use supabase-js verifyOtp with token_hash. This is the supported path.
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
