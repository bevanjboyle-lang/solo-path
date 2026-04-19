// stripe-subscription-webhook v20 — Audit P0 #7: price IDs via env vars with fallback
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const BASE_SUBSCRIPTION_MODULES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function getApplicableTrackEModules(q3a: string, q11: string, archetype: string): number[] {
  const s = (q3a + ' ' + q11 + ' ' + archetype).toLowerCase();
  const applicable: number[] = [];
  if (/financial services|banking|insurance|asset management|wealth|fintech|risk.*compli|compliance.*risk|audit/.test(s)) applicable.push(20);
  if (/public sector|government|local authority|nhs|central government|defence|education|regulatory bod/.test(s)) applicable.push(21);
  if (/technology|digital|software|data.*analytic|analytic.*data|\bai\b|machine learning|cloud|cybersecurity|product manager|product director|tech/.test(s)) applicable.push(22);
  if (/healthcare|\bnhs\b|life sciences|pharma|medical device|biotech|clinical|health tech/.test(s)) applicable.push(23);
  if (/legal|management consult|strategy consult|\bhr\b|people.*consult|executive coach|talent|organisational development|\bod\b/.test(s)) applicable.push(24);
  if (/marketing|creative|advertising|\bbrand\b|content|\bdesign\b|communications|\bpr\b|public relations|digital marketing|growth market/.test(s)) applicable.push(25);
  return applicable;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error", response_text: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No stripe-signature header", response_text: "No signature" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(
      JSON.stringify({ error: "Invalid signature", response_text: "Invalid webhook signature" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const allowedEvents = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  if (!allowedEvents.includes(event.type)) {
    return new Response(
      JSON.stringify({ received: true, response_text: "Event type not handled" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price?.id;

  // Audit fix #7: price IDs via env vars with test fallback
  const MONTHLY_PRICE_ID = Deno.env.get("STRIPE_PRICE_SUB_MONTHLY") || "price_1TL0r90PR8c2G6smxBdarC7B";
  const ANNUAL_PRICE_ID  = Deno.env.get("STRIPE_PRICE_SUB_ANNUAL")  || "price_1TL0qZ0PR8c2G6smwP3tWZ59";
  if (!Deno.env.get("STRIPE_PRICE_SUB_MONTHLY") || !Deno.env.get("STRIPE_PRICE_SUB_ANNUAL")) {
    console.warn("STRIPE_PRICE_SUB_MONTHLY/ANNUAL not fully set — using test fallbacks. Set env vars before production cutover.");
  }
  let plan = "monthly";
  if (priceId === ANNUAL_PRICE_ID) plan = "annual";

  const subscriptionActive = ["active", "trialing"].includes(status);

  let userId = subscription.metadata?.user_id;
  if (!userId) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    if (profile) userId = profile.id;
  }
  if (!userId) {
    const { data: profile2 } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .single();
    if (profile2) userId = profile2.user_id;
  }

  if (!userId) {
    console.error("Could not find user for customer:", customerId);
    return new Response(
      JSON.stringify({ error: "User not found", response_text: "User not found for this customer" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const updateData: Record<string, unknown> = {
    subscription_active: subscriptionActive,
    subscription_plan: subscriptionActive ? plan : null,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  };

  if (event.type === "customer.subscription.created" && subscriptionActive) {
    updateData.subscription_started_at = new Date().toISOString();
  }

  if (event.type === "customer.subscription.deleted") {
    updateData.subscription_active = false;
    updateData.subscription_plan = null;
  }

  const { error } = await supabase
    .from("user_profiles")
    .update(updateData)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user_profiles:", error);
    return new Response(
      JSON.stringify({ error: error.message, response_text: "Failed to update subscription" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    if (subscriptionActive) {
      try {
        const { data: profileForSector } = await supabase
          .from("user_profiles")
          .select("q3a_sector, q11_sector_client_context")
          .eq("user_id", userId)
          .single();
        const { data: reportForSector } = await supabase
          .from("reports")
          .select("core_report")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const q3a = profileForSector?.q3a_sector || '';
        const q11 = profileForSector?.q11_sector_client_context || '';
        const cr = (reportForSector?.core_report as Record<string, unknown>) || {};
        const archObj = (cr.archetype as Record<string, unknown>) || {};
        const archetype = (archObj.name as string) || (cr.primary_archetype as string) || '';

        const trackEModules = getApplicableTrackEModules(q3a, q11, archetype);
        const allUnlocked = [...BASE_SUBSCRIPTION_MODULES, ...trackEModules].sort((a, b) => a - b);

        const { data: existingSession } = await supabase
          .from("subscription_sessions")
          .select("id, modules_unlocked")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existingSession) {
          const { error: updateErr } = await supabase
            .from("subscription_sessions")
            .update({
              modules_unlocked: allUnlocked,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSession.id);
          if (updateErr) console.error("Error updating modules_unlocked:", updateErr);
          else console.log(`Subscription modules unlocked for user ${userId}: ${allUnlocked}`);
        } else {
          const { error: insertErr } = await supabase
            .from("subscription_sessions")
            .insert({
              user_id: userId,
              modules_unlocked: allUnlocked,
              modules_completed: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          if (insertErr) console.error("Error inserting subscription_sessions:", insertErr);
          else console.log(`New subscription_sessions row created for user ${userId}, modules ${allUnlocked} unlocked`);
        }
      } catch (moduleErr) {
        console.error("Module unlock failed (non-fatal):", moduleErr);
      }
    } else if (!subscriptionActive && event.type === "customer.subscription.updated") {
      try {
        const { data: existingSession } = await supabase
          .from("subscription_sessions")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (existingSession) {
          await supabase
            .from("subscription_sessions")
            .update({
              modules_unlocked: [1, 2, 3],
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSession.id);
          console.log(`Subscription lapsed for user ${userId} — modules downgraded to [1,2,3]`);
        }
      } catch (downgradeErr) {
        console.error("Module downgrade failed (non-fatal):", downgradeErr);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    try {
      const { data: existingSession } = await supabase
        .from("subscription_sessions")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (existingSession) {
        await supabase
          .from("subscription_sessions")
          .update({
            modules_unlocked: [1, 2, 3],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSession.id);
        console.log(`Subscription cancelled for user ${userId} — modules downgraded to [1,2,3]`);
      }
    } catch (cancelErr) {
      console.error("Cancellation module downgrade failed (non-fatal):", cancelErr);
    }
  }

  console.log(`Subscription event processed for user ${userId}: ${event.type}, active=${subscriptionActive}, plan=${plan}`);
  return new Response(
    JSON.stringify({ received: true, response_text: "Subscription updated successfully" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
