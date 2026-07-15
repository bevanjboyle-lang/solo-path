// stripe-subscription-webhook v26 — Day Zero smoke-test fix — 2026-07-15
//
// LIVE BUG (found during the first real £19 subscription, 2026-07-15):
// v25's userId fallback selected user_profiles.id (the table's own PK) and
// used it as the auth user_id. Every downstream update then filtered on
// user_id = <that PK value>, matched ZERO rows, raised no error, and the
// function returned 200 "Subscription updated successfully" having written
// nothing. Stripe marked both deliveries successful; the customer paid and
// stayed locked. Fixes in v26:
//   (1) metadata first: accept subscription.metadata.user_id OR .userId
//       (create-subscription v25+ stamps subscription_data.metadata.user_id
//       so subscription objects carry the mapping natively).
//   (2) customer fallback selects user_id (not id), via maybeSingle.
//   (3) fail-loud guard: if the user_profiles update matches 0 rows, return
//       500 so Stripe retries — a zero-row update is a failure, never success.
//   (4) idempotency release: any post-guard non-2xx return now deletes the
//       stripe_webhook_events row first. Without that, Stripe's retry hit the
//       duplicate check and was swallowed as 200 idempotent, so "will retry"
//       never actually re-ran.
//
// stripe-subscription-webhook v25 — Track F unlock — 2026-05-18
//
// Coaching layer Phase 5b (admin/coaching-layer-design.md v1.10 §4.4):
// BASE_SUBSCRIPTION_MODULES extended from [1..19] to [1..19, 26..32] so new
// subscribers' modules_unlocked list includes the 7 Rejection & Resilience
// modules unconditionally. Track E (20-25) remains sector-gated via
// getApplicableTrackEModules. Existing subscribers' rows are NOT backfilled
// by this version — their modules_unlocked won't include 26-32 until a
// subsequent subscription event triggers a re-upsert. That's acceptable for
// MVP (Bevan can run a one-off backfill SQL if needed).
//
// stripe-subscription-webhook v24 — Drift 6 fix — 2026-05-18
//
// Drift 6 (journey-trace audit 2026-05-18): mirror subscription state from
//   user_profiles.subscription_active (boolean) onto tracker_sessions
//   .subscription_status (text). The frontend (Plan.tsx + Library.tsx) reads
//   tracker_sessions.subscription_status === "active" — never user_profiles.
//   Without this mirror, subscribers could pay £19/mo and the app would treat
//   them as non-subscribers forever. Mapping: active → "active";
//   deleted/cancelled → "cancelled". activate-plan sets initial "trial" which
//   gets overwritten the moment a real subscription event arrives.
//
// Deploy note (Drift 6 fix, 2026-05-18): the Track-E mapping helper was
// previously imported from ../_shared/track-e-mapping.ts (V-057, 2026-05-14)
// but the Supabase deploy bundler cannot reach sibling-directory imports.
// Helper is now inlined below. The shared module still exists in
// _shared/track-e-mapping.ts and is the source-of-truth for the pattern set —
// if patterns ever change, update both this inlined copy AND the shared file,
// AND check that get-library-content was deployed with the same patterns
// (it imports the shared module too).
//
// stripe-subscription-webhook v23 — vibe code review V-057 — 2026-05-14
//
// V-057: getApplicableTrackEModules originally extracted to
//        _shared/track-e-mapping.ts. See deploy note above for why it's
//        now inlined again.
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

// Inlined from _shared/track-e-mapping.ts (V-057). See deploy note in file
// header for why. Keep in sync with the shared module if patterns change.
const TRACK_E_PATTERNS: Array<{ moduleId: number; pattern: RegExp }> = [
  { moduleId: 20, pattern: /financial services|banking|insurance|asset management|wealth|fintech|risk.*compli|compliance.*risk|audit|treasury/ },
  { moduleId: 21, pattern: /public sector|government|local authority|nhs|central government|defence|education|regulatory bod/ },
  { moduleId: 22, pattern: /technology|digital|software|data.*analytic|analytic.*data|\bai\b|machine learning|cloud|cybersecurity|product manager|product director|\btech\b/ },
  { moduleId: 23, pattern: /healthcare|\bnhs\b|life sciences|pharma|medical device|biotech|clinical|health tech/ },
  { moduleId: 24, pattern: /legal|management consult|strategy consult|\bhr\b|people.*consult|executive coach|talent|organisational development|\bod\b|professional services/ },
  { moduleId: 25, pattern: /marketing|creative|advertising|\bbrand\b|content|\bdesign\b|communications|\bpr\b|public relations|digital marketing|growth market/ },
];
function getApplicableTrackEModules(q3a: string, q11: string, archetype: string = ""): number[] {
  const haystack = `${q3a} ${q11} ${archetype}`.toLowerCase();
  return TRACK_E_PATTERNS.filter(({ pattern }) => pattern.test(haystack)).map(({ moduleId }) => moduleId);
}

const FUNCTION_VERSION = "v26-userid-fix";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Tracks A-D modules (1-19) PLUS Track F resilience modules (26-32) for all
// subscribers. Track E (20-25) is sector-gated via getApplicableTrackEModules.
// Track F added 2026-05-18 for coaching layer Phase 5b (admin/coaching-layer-design.md
// v1.10 §4.4 — Rejection Library: subscription-only, unconditional unlock).
const BASE_SUBSCRIPTION_MODULES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 26, 27, 28, 29, 30, 31, 32];

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

  // v26: release the idempotency claim before any post-guard non-2xx return.
  // Stripe retries non-2xx deliveries; without this delete, the retry hits the
  // duplicate check below and gets swallowed as 200 idempotent.
  const releaseIdempotency = async () => {
    const { error: relErr } = await supabase
      .from("stripe_webhook_events")
      .delete()
      .eq("event_id", event.id);
    if (relErr) console.error(`${FUNCTION_VERSION} idempotency release failed:`, relErr.message);
  };

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

  // v26 fix (2026-07-15): resolve the auth user_id.
  // Priority 1: subscription metadata (create-subscription v25+ sets
  // subscription_data.metadata.user_id; accept legacy camelCase too).
  // Priority 2: user_profiles lookup by stripe_customer_id — selecting the
  // user_id column. v25 selected `id` (the table PK) here and used it as the
  // auth user_id, which silently matched zero rows in every later update.
  let userId = subscription.metadata?.user_id || subscription.metadata?.userId;
  if (!userId) {
    const { data: profile, error: lookupErr } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (lookupErr) {
      console.error("user_profiles lookup by stripe_customer_id failed:", lookupErr.message);
    }
    if (profile?.user_id) userId = profile.user_id as string;
  }

  if (!userId) {
    console.error("Could not find user for customer:", customerId);
    await releaseIdempotency(); // let Stripe's retry re-attempt resolution
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

  const { data: updatedProfiles, error } = await supabase
    .from("user_profiles")
    .update(updateData)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    console.error("Error updating user_profiles:", error);
    await releaseIdempotency();
    return new Response(
      JSON.stringify({ error: error.message, response_text: "Failed to update subscription" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // v26 fail-loud guard: an update that matches zero rows is a failure, not a
  // success. Return 500 so Stripe retries (idempotency released above) rather
  // than reporting success on a no-op — the exact phantom-200 failure mode
  // that let a paid subscriber stay locked on 2026-07-15.
  if (!updatedProfiles || updatedProfiles.length === 0) {
    console.error(`${FUNCTION_VERSION} user_profiles update matched 0 rows for user_id=${userId} (customer=${customerId}, sub=${subscriptionId})`);
    await releaseIdempotency();
    return new Response(
      JSON.stringify({ error: "No matching user_profiles row", response_text: "Subscription user row not found" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Drift 6 fix (2026-05-18, journey-trace audit): mirror the subscription
  // state onto tracker_sessions so the frontend can see it. Plan.tsx and
  // Library.tsx read tracker_sessions.subscription_status === "active" — they
  // never look at user_profiles.subscription_active. Without this mirror, a
  // user could pay £19/month and the app would treat them as a non-subscriber
  // forever (Library locked to 3 modules, tracker stays on 30-day variant,
  // Day-31 wall still fires).
  //
  // Map Stripe-event semantics → tracker_sessions text column:
  //   created/updated + active → "active"
  //   updated + inactive       → "cancelled" (cancel-at-period-end window)
  //   deleted                  → "cancelled"
  // Activate-plan sets it to "trial" on initial activation; that gets
  // overwritten the moment a real subscription event arrives.
  const trackerStatus = subscriptionActive ? "active" : "cancelled";
  const { error: trackerErr } = await supabase
    .from("tracker_sessions")
    .update({
      subscription_status: trackerStatus,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (trackerErr) {
    // Non-fatal — user_profiles is the authoritative subscription record.
    // Without this mirror the frontend won't see the subscription, but the
    // billing relationship still holds.
    console.error("Drift 6 mirror: failed to update tracker_sessions:", trackerErr);
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
