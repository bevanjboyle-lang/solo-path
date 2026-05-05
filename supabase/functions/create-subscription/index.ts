// create-subscription v24 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
// create-subscription v21 — Audit P0 #6,#7,#8: Stripe API version standardised to 2025-01-27.acacia, price IDs via env vars, APP_URL fail-loud
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Audit fix #7: Price IDs sourced from env vars; fall back to current test IDs (warn). Bevan must set STRIPE_PRICE_SUB_MONTHLY / STRIPE_PRICE_SUB_ANNUAL at prod cutover.
const MONTHLY_PRICE_FALLBACK = "price_1TL0r90PR8c2G6smxBdarC7B";
const ANNUAL_PRICE_FALLBACK  = "price_1TL0qZ0PR8c2G6smwP3tWZ59";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const plan: string = body.plan_type || body.plan || "monthly";

    const monthlyPriceId = Deno.env.get("STRIPE_PRICE_SUB_MONTHLY") || MONTHLY_PRICE_FALLBACK;
    const annualPriceId  = Deno.env.get("STRIPE_PRICE_SUB_ANNUAL")  || ANNUAL_PRICE_FALLBACK;
    if (!Deno.env.get("STRIPE_PRICE_SUB_MONTHLY") || !Deno.env.get("STRIPE_PRICE_SUB_ANNUAL")) {
      console.warn("STRIPE_PRICE_SUB_MONTHLY/ANNUAL not fully set — using test fallbacks. Set env vars before production cutover.");
    }
    const priceId = plan === "annual" ? annualPriceId : monthlyPriceId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Audit fix #8: APP_URL must be set. No Lovable preview fallback.
    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      console.error("APP_URL env var not set — cannot create subscription session");
      return new Response(
        JSON.stringify({
          error: "server_misconfigured",
          details: "APP_URL environment variable is not set",
          response_text: "Server configuration error.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // Audit fix #6: standardise API version.
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, email")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
    }

    let stripeCustomerId: string | undefined = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email || profile?.email;

      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      await supabase
        .from("user_profiles")
        .upsert({ user_id: userId, stripe_customer_id: stripeCustomerId }, { onConflict: "user_id" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/payment-success?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?payment_cancelled=1`,
      metadata: { userId, plan },
    });

    return new Response(
      JSON.stringify({
        sessionUrl: session.url,
        sessionId: session.id,
        response_text: "Subscription checkout session created.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-subscription error:", err);
    return new Response(
      JSON.stringify({ error: String(err), response_text: "Failed to create subscription session." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
