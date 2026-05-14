// stripe-subscription-webhook v23 — vibe code review V-057 — 2026-05-14
//
// V-057: getApplicableTrackEModules now imported from _shared/track-e-mapping.ts.
//        Previously duplicated as inline regex (and drifted) with the copy in
//        get-library-content. Single source of truth now lives in the shared
//        module.
//
// stripe-subscription-webhook v22 — vibe code review fixes — 2026-05-14
//
// V-023 + V-037: subscription_sessions race fix. Both subscription_sessions touch
//        points (active path and lapse/cancel path) switched from
//        SELECT-then-INSERT-or-UPDATE to single upsert(onConflict:'user_id').
//        Safe under the unique(user_id) constraint applied 2026-05-14.
// V-056: event-id idempotency guard at handler entry (re-applied from v21 after
//        cp-overwrite during the vibe review fix workflow). Inserts into
//        stripe_webhook_events on first delivery; returns 200 with idempotent:true
//        on duplicate.
//
// stripe-subscription-webhook v20 — Audit P0 #7: price IDs via env vars with fallback
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// V-057 (vibe code review 2026-05-14): shared Track-E classifier
import { getApplicableTrackEModules } from "../_shared/track-e-mapping.ts";

const FUNCTION_VERSION = "v23-vibe-review-fixes";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const BASE_SUBSCRIPTION_MODULES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

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
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Invalid signature", response_text: "Invalid webhook signature" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // V-056 fix (2026-05-14): event-id idempotency guard. See payment-webhook v27
  // for the same pattern. Without this, Stripe retries re-run user_profiles
  // updates and re-stamp subscription_started_at.
  {
    const { data: idempotencyRow, error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .upsert(
        {
          event_id: event.id,
          event_type: event.type,
          function_name: "stripe-subscription-webhook",
          context: `${event.type} sub=${(event.data?.object as { id?: string })?.id ?? "?"}`.slice(0, 1000),
        },
        { onConflict: "event_id", ignoreDuplicates: true },
      )
      .select("event_id");

    if (idempotencyError) {
      console.error(`${FUNCTION_VERSION} idempotency insert error (proceeding):`, idempotencyError.message);
    } else if (!idempotencyRow || idempotencyRow.length === 0) {
      console.log(`${FUNCTION_VERSION} idempotent — event ${event.id} (${event.type}) already processed`);
      return new Response(
        JSON.stringify({ received: true, idempotent: true, response_text: "Event already processed." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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

        // V-023 (vibe code review 2026-05-14): single upsert keyed on unique(user_id).
        const { data: existingSession } = await supabase
          .from("subscription_sessions")
          .select("modules_completed")
          .eq("user_id", userId)
          .maybeSingle();
        const { error: upsertErr } = await supabase
          .from("subscription_sessions")
          .upsert(
            {
              user_id: userId,
              modules_unlocked: allUnlocked,
              modules_completed: existingSession ? undefined : [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        if (upsertErr) console.error("Error upserting subscription_sessions:", upsertErr);
        else console.log(`Subscription modules unlocked for user ${userId}: ${allUnlocked}`);
      } catch (moduleErr) {
        console.error("Module unlock failed (non-fatal):", moduleErr);
      }
    } else if (!subscriptionActive && event.type === "customer.subscription.updated") {
      // V-023 (vibe code review 2026-05-14): downgrade-on-lapse via direct update on
      // user_id. No need to select first — if no row exists, the update is a no-op.
      try {
        const { error: downgradeErr } = await supabase
          .from("subscription_sessions")
          .update({
            modules_unlocked: [1, 2, 3],
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (downgradeErr) console.error("Module downgrade failed (non-fatal):", downgradeErr);
        else console.log(`Subscription lapsed for user ${userId} — modules downgraded to [1,2,3]`);
      } catch (downgradeErr) {
        console.error("Module downgrade failed (non-fatal):", downgradeErr);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    // V-023 (vibe code review 2026-05-14): same direct-update pattern as the lapse branch above.
    try {
      const { error: cancelErr } = await supabase
        .from("subscription_sessions")
        .update({
          modules_unlocked: [1, 2, 3],
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (cancelErr) console.error("Cancellation module downgrade failed (non-fatal):", cancelErr);
      else console.log(`Subscription cancelled for user ${userId} — modules downgraded to [1,2,3]`);
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
