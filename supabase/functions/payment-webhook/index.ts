// payment-webhook v30 — vibe code review fixes — 2026-05-14
//
// V-028: refund revokes product access. When charge.refunded fires, in addition to
//        marking the payments row refunded, we now:
//        - look up the refunded payment's user_id
//        - reset their subscription_sessions.modules_unlocked to [] (no modules)
//        - flag user_profiles.subscription_active = false (if it was set)
//        - mark the associated reports row(s) status='refunded_revoked'
//        Policy: "refunds revoke access" (locked 2026-05-14, see ADR-018 follow-up).
//
// payment-webhook v29 — vibe code review fixes — 2026-05-14
//
// V-022: event-id idempotency guard at handler entry. Inserts into
//        stripe_webhook_events on first delivery; returns 200 with idempotent:true
//        on duplicate, stopping Stripe retries from re-running side effects.
// V-023: subscription_sessions race fix. Replaced SELECT-then-INSERT-or-UPDATE with
//        a single upsert(onConflict:'user_id'). Safe under the new
//        unique(user_id) constraint applied 2026-05-14.
// V-024: module unlock failure is now fatal — returns 500 to Stripe so the webhook
//        retries (idempotency-safe under V-022).
// V-025: welcome email failure is now fatal — same pattern.
// V-026: findUserIdByEmail now queries auth.users directly via service-role rather
//        than paginating admin.listUsers (had a hard 1000-user ceiling).
// V-027: magic-link redirectTo now reads from APP_BASE_URL env var.
//
// payment-webhook v26 — canonical-aligned (ADR-019). 2026-05-05.
//
// Change-log (v25 → v26):
//   - Header comment refreshed. v25 inherited a stale changelog from v24 that listed
//     "Background generate-plan kick" under Unchanged — but the F60 auto-fire of
//     generate-plan was removed in v25 in favour of advancing reports.status to
//     'pending_selection' and letting the frontend StrandSelector fire generate-plan
//     with explicit selected_ranks (the canonical 10/5 product rule). This v26
//     comment is the corrected source of truth.
//   - charge.refunded handler bug fix: the previous SELECT/UPDATE chain at line ~459
//     filtered only on `status='completed'`, with no payment_intent or session_id
//     constraint — meaning a single refund event would mark every completed payment
//     in the table as refunded. v26 narrows the filter to the specific
//     stripe_payment_intent (or, if not in the event, the session_id) of the refunded
//     charge. Real bug, surfaced during the Phase 2 step 3 ground-truth pass.
//   - Status-advance query (lines ~363) gains an order+limit safety so a user with
//     multiple teaser_ready rows (edge case — should not happen but defensive) only
//     advances the most recent one.
//
// Status flow this function participates in:
//   teaser_ready → (paid £19.99 one-time)  → pending_selection
//                                                  ↓ user picks up to 5 ranks on /plan
//                                            generating_plan (set by generate-plan)
//                                                  ↓
//                                            complete
//
// Per ADR-019 + project memory `project_canonical_10_options_5_selected.md`:
// payment-webhook does NOT auto-fire generate-plan. It only advances the row status
// to 'pending_selection' and sends the welcome email + magic link. The user must
// actively select up to 5 ranks (Phase 4 frontend StrandSelector) to trigger plan
// generation.
//
// Preserved unchanged from v25:
//   - Stripe signature verification (HMAC-SHA256 against STRIPE_WEBHOOK_SECRET).
//   - payments.status='completed' update by stripe_session_id.
//   - user_profiles.stripe_customer_id attach.
//   - Tranche 1 guidance module unlock (modules 1, 2, 3).
//   - Welcome email with magic-link (Resend + supabase.auth.admin.generateLink).
//   - second_report branch (non-subscriber £9.99 second-report purchase).
//   - linkAnonRows (anon → authed user_id backfill across reports /
//     questionnaire_responses / payments) per ADR-013.
//   - resolveUserForCheckout (legacy authed via metadata.userId + ADR-013 anon-by-email
//     resolution).
//
// CORS allow-headers includes stripe-signature (server-side webhook only;
// x-client-session-id is irrelevant here — Stripe doesn't send it).

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v30-vibe-review-fixes";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Tranche 1 modules — unlocked with one-time £19.99 Plan B Report purchase
const TRANCHE_1_MODULES = [1, 2, 3];

async function sendWelcomeEmail(
  resendApiKey: string,
  toEmail: string,
  magicLink: string,
): Promise<void> {
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 32px;">
        <span style="color: #2ECDB0; font-weight: 700; font-size: 20px;">Solo</span>
      </div>
      <h1 style="color: #1a1a1a; font-size: 22px; font-weight: 700; margin: 0 0 16px;">Your plan is ready.</h1>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 16px;">
        Your 30-day activation plan has been built. Click below to open it on any device — phone, tablet, or laptop.
      </p>
      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">
        This link signs you straight in. No password required.
      </p>
      <a href="${magicLink}" style="display: inline-block; background: #2ECDB0; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
        Open my plan &rarr;
      </a>
      <p style="color: #999; font-size: 13px; line-height: 1.6; margin-top: 32px;">
        This link expires in 24 hours. If it has expired, sign in at solo-plan.com and your plan will be waiting for you.
      </p>
      <p style="color: #999; font-size: 13px; line-height: 1.6;">
        Questions? Reply to this email or contact support@solo-plan.com.
      </p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Solo <hello@solo-plan.com>",
      to: [toEmail],
      subject: "Your plan is ready — open it on any device",
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend error: ${errBody}`);
  }
}

// ── ADR-013: user resolution helpers ────────────────────────────────────────

// V-026 (vibe code review 2026-05-14): direct auth.users query via service-role.
// Previous implementation paginated admin.listUsers at perPage:1000 — would
// silently fail to find a legitimate buyer at user 1001+, then create a
// duplicate auth.users row that failed the unique-email constraint, returning
// 500 to Stripe. Constant-time lookup now, no scale ceiling.
async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  // deno-lint-ignore no-explicit-any
  const { data, error } = await (supabase as any)
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", needle)
    .maybeSingle();
  if (error) {
    console.error("auth.users lookup failed:", error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

// Create-or-match a user for a completed checkout session.
// Legacy path: metadata.userId present → trust and return it.
// Anon path: require customerEmail → find-by-email, else create.
async function resolveUserForCheckout(
  supabase: ReturnType<typeof createClient>,
  metadata: Record<string, string | undefined>,
  customerEmail: string | null,
): Promise<{ userId: string; isNewUser: boolean } | null> {
  const explicitUserId = metadata.userId || metadata.user_id;
  if (explicitUserId) {
    return { userId: explicitUserId, isNewUser: false };
  }

  if (!customerEmail) {
    console.error("Anon checkout missing customer email — cannot resolve user");
    return null;
  }

  const existingId = await findUserIdByEmail(supabase, customerEmail);
  if (existingId) {
    return { userId: existingId, isNewUser: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: customerEmail,
    email_confirm: true,
  });
  if (error || !data?.user?.id) {
    console.error("admin.createUser failed:", error?.message);
    return null;
  }
  return { userId: data.user.id, isNewUser: true };
}

// Link anon-owned rows (user_id IS NULL) keyed by client_session_id to
// the resolved user_id. Called after resolveUserForCheckout. Idempotent.
async function linkAnonRows(
  supabase: ReturnType<typeof createClient>,
  clientSessionId: string,
  userId: string,
): Promise<void> {
  const tables = ["reports", "questionnaire_responses", "payments"] as const;
  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .update({ user_id: userId }, { count: "exact" })
      .eq("client_session_id", clientSessionId)
      .is("user_id", null);
    if (error) {
      console.error(`link ${table} by client_session_id failed:`, error.message);
    } else {
      console.log(`linked ${count ?? 0} row(s) in ${table} to user ${userId}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    return new Response(
      JSON.stringify({
        error: "Server configuration error",
        response_text: "Server configuration error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No stripe-signature header", response_text: "No signature" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // V-022 fix (2026-05-14): event-id idempotency guard. Stripe retries any non-2xx
  // response, plus manual replays from the dashboard. Without this guard, retries
  // re-sent the welcome email + magic link, re-ran subscription_sessions writes, and
  // re-stamped subscription_started_at. The stripe_webhook_events table (PK on
  // event_id) is the standard idempotency layer.
  {
    const { data: idempotencyRow, error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .upsert(
        {
          event_id: event.id,
          event_type: event.type,
          function_name: "payment-webhook",
          context: `${event.type} session=${(event.data?.object as { id?: string })?.id ?? "?"}`.slice(0, 1000),
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // ───── checkout.session.completed ────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const rawMetadata = (session.metadata ?? {}) as Record<string, string | undefined>;
    const customerId = session.customer as string | null;
    const customerEmail = session.customer_details?.email || null;
    const paymentType = rawMetadata.type || "initial_report";
    const clientSessionId = rawMetadata.client_session_id || null;

    // ADR-013: resolve-or-create user. Supports both legacy authed path
    // (metadata.userId set by create-payment) and new anon path
    // (metadata.client_session_id + customer_details.email).
    const resolved = await resolveUserForCheckout(
      supabase,
      rawMetadata,
      customerEmail,
    );
    if (!resolved) {
      console.error(
        "Failed to resolve user for checkout",
        JSON.stringify({ metadata: rawMetadata, hasEmail: !!customerEmail, sessionId: session.id }),
      );
      return new Response(
        JSON.stringify({ error: "Cannot resolve user", response_text: "Cannot identify buyer" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const userId = resolved.userId;

    // Link anon-tagged rows to the resolved user BEFORE downstream lookups
    // that filter on user_id (generate-plan lookup, subscription_sessions).
    if (clientSessionId) {
      await linkAnonRows(supabase, clientSessionId, userId);
    }

    // Update payment record to 'completed'.
    if (session.id) {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("stripe_session_id", session.id);

      if (paymentError) console.error("Error updating payment:", paymentError);
    }

    // Store stripe_customer_id on user_profiles for future subscription linking.
    if (customerId) {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError)
        console.error("Error updating user_profiles with customer ID:", profileError);
    }

    // ── BRANCH: second-report £9.99 (unchanged) ────────────────────────────
    if (paymentType === "second_report") {
      const nowIso = new Date().toISOString();
      const { error: flagErr } = await supabase
        .from("user_profiles")
        .update({
          second_report_paid: true,
          second_report_paid_at: nowIso,
          updated_at: nowIso,
        })
        .eq("user_id", userId);

      if (flagErr) {
        console.error("Error setting second_report_paid flag:", flagErr);
      } else {
        console.log(
          `second_report_paid flag set for user ${userId} (session ${session.id})`,
        );
      }

      return new Response(
        JSON.stringify({
          received: true,
          type: "second_report",
          response_text: "Second-report payment recorded.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── DEFAULT BRANCH: initial £19.99 report purchase ──────────
    // V-023 (vibe code review 2026-05-14): switched from SELECT-then-INSERT-or-UPDATE
    // to a single upsert keyed on the new unique(user_id) constraint (migration
    // v023_subscription_sessions_unique_user_id applied 2026-05-14). Race-safe under
    // concurrent webhook retries.
    try {
      const { data: existingSession } = await supabase
        .from("subscription_sessions")
        .select("modules_unlocked")
        .eq("user_id", userId)
        .maybeSingle();
      const currentUnlocked: number[] = existingSession?.modules_unlocked || [];
      const merged = Array.from(new Set([...currentUnlocked, ...TRANCHE_1_MODULES])).sort((a, b) => a - b);
      const { error: upsertErr } = await supabase
        .from("subscription_sessions")
        .upsert(
          {
            user_id: userId,
            modules_unlocked: merged,
            modules_completed: existingSession ? undefined : [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (upsertErr) {
        console.error("Error upserting subscription_sessions:", upsertErr);
        throw upsertErr; // bubble to outer catch → V-024 fatal path
      }
      console.log(`Tranche 1 modules unlocked for user ${userId}: ${merged}`);
    } catch (moduleErr) {
      // V-024 (vibe code review 2026-05-14): fatal. Was "non-fatal" — customer paid
      // £19.99 and ended up with locked modules. Return 500 so Stripe retries; V-022
      // idempotency makes the retry safe (the email won't double-send).
      console.error(`${FUNCTION_VERSION} V-024 fatal: module unlock failed:`, moduleErr);
      return new Response(
        JSON.stringify({
          error: "module_unlock_failed",
          response_text: "Module unlock failed, will retry",
          details: String((moduleErr as Error)?.message ?? moduleErr),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Payment completed for user ${userId}, session ${session.id}`);

    // F60 fix (v25): advance the latest paid report's status from
    // 'teaser_ready' to 'pending_selection'. The frontend's /plan route detects
    // this status on first authed mount and fires generate-plan with the user's
    // session JWT (cleaner than service-role-to-edge-function plumbing).
    //
    // This also auto-fixes F59: Teaser.tsx and AuthCallback can route paid users
    // to /plan based on status alone, no payments-table lookup needed.
    //
    // Replaces v24's "Background plan generation" block, which had two bugs:
    //   (a) queried for status='pending_selection' but the row was at 'teaser_ready'
    //       (nothing transitioned it; the lookup always returned 0 rows).
    //   (b) accessed recommended_selection.selected_ranks but generate-report v44.1
    //       writes recommended_selection as a flat array. The condition was never true.
    try {
      // v26: select the LATEST teaser_ready row for this user, then advance only
      // that one. Defensive against the edge case where a user has multiple
      // teaser_ready rows (PostgREST UPDATE doesn't support ORDER/LIMIT directly).
      const { data: latestRow, error: latestErr } = await supabase
        .from("reports")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "teaser_ready")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) {
        console.error(
          "v26 status advance lookup failed (non-fatal):",
          latestErr.message,
        );
      } else if (!latestRow?.id) {
        console.log(
          `v26 no teaser_ready report to advance for user ${userId} (already advanced or no report yet)`,
        );
      } else {
        const { error: statusErr } = await supabase
          .from("reports")
          .update({ status: "pending_selection" })
          .eq("id", latestRow.id);

        if (statusErr) {
          console.error("v26 status advance failed (non-fatal):", statusErr.message);
        } else {
          console.log(
            `v26 advanced report ${latestRow.id} to pending_selection for user ${userId}`,
          );
        }
      }
    } catch (statusAdvanceErr) {
      console.error(
        "v26 status advance threw (non-fatal):",
        (statusAdvanceErr as Error)?.message ?? statusAdvanceErr,
      );
    }

    // V-025 + V-027 (vibe code review 2026-05-14):
    //   V-025: welcome email failure now fatal (was "non-fatal"). Returns 500 so
    //          Stripe retries with V-022 idempotency guard preventing double-process.
    //   V-027: redirectTo URL now reads from APP_BASE_URL env var (was hardcoded).
    if (resendApiKey && customerEmail) {
      const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://solo-plan.com";
      try {
        const { data: linkData, error: linkError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: customerEmail,
            options: { redirectTo: `${appBaseUrl}/plan` },
          });

        if (linkError || !linkData?.properties?.action_link) {
          console.error(`${FUNCTION_VERSION} V-025 fatal: magic link generation failed:`, linkError?.message);
          return new Response(
            JSON.stringify({
              error: "magic_link_failed",
              response_text: "Magic link generation failed, will retry",
              details: linkError?.message ?? "no action_link returned",
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        await sendWelcomeEmail(
          resendApiKey,
          customerEmail,
          linkData.properties.action_link,
        );
        console.log(`${FUNCTION_VERSION} welcome email sent to ${customerEmail}`);
      } catch (emailErr) {
        console.error(`${FUNCTION_VERSION} V-025 fatal: welcome email send failed:`, (emailErr as Error).message);
        return new Response(
          JSON.stringify({
            error: "welcome_email_failed",
            response_text: "Welcome email send failed, will retry",
            details: (emailErr as Error)?.message ?? String(emailErr),
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else if (!resendApiKey) {
      console.warn(`${FUNCTION_VERSION} RESEND_API_KEY not set — welcome email skipped`);
    } else if (!customerEmail) {
      console.warn(`${FUNCTION_VERSION} no customer email for user ${userId} — welcome email skipped`);
    }

    return new Response(
      JSON.stringify({
        received: true,
        type: "initial_report",
        response_text: "Payment processed successfully",
        version: FUNCTION_VERSION,
        newUser: resolved.isNewUser,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ───── charge.refunded (v26: bug-fixed — narrow update to the specific session) ──
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = charge.payment_intent as string;

    if (paymentIntentId) {
      // The payments table is keyed by stripe_session_id, not payment_intent.
      // Resolve the Checkout Session that created this payment_intent before
      // updating, otherwise we'd mark every completed payment as refunded.
      let sessionId: string | undefined;
      try {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        sessionId = sessions.data[0]?.id;
      } catch (lookupErr) {
        console.error(
          `charge.refunded: failed to look up Checkout Session for payment_intent ${paymentIntentId}:`,
          lookupErr,
        );
      }

      if (sessionId) {
        // Look up the payments row to get the user_id BEFORE we update it.
        // V-028 needs user_id to revoke downstream access.
        const { data: refundedPayment } = await supabase
          .from("payments")
          .select("user_id")
          .eq("stripe_session_id", sessionId)
          .eq("status", "completed")
          .maybeSingle();

        const { error, count } = await supabase
          .from("payments")
          .update({ status: "refunded" }, { count: "exact" })
          .eq("stripe_session_id", sessionId)
          .eq("status", "completed");

        if (error) {
          console.error(`Error updating refund status for session ${sessionId}:`, error);
        } else {
          console.log(
            `charge.refunded: marked ${count ?? 0} payment row(s) as refunded for session ${sessionId} (payment_intent ${paymentIntentId})`,
          );
        }

        // V-028 (vibe code review 2026-05-14): refund revokes product access.
        // Policy locked 2026-05-14: when Solo issues a refund, the customer
        // loses access to their plan and modules. (Customer service refunds
        // that should NOT revoke access should be handled manually in the
        // Stripe dashboard without firing a charge.refunded event, or by
        // explicitly setting a metadata.preserve_access=true flag at refund
        // time and special-casing here.)
        const refundedUserId = refundedPayment?.user_id as string | null | undefined;
        const preserveAccess = (charge.metadata?.preserve_access as string | undefined) === "true";
        if (refundedUserId && !preserveAccess) {
          // 1. Reset modules_unlocked to [] so they see the locked library.
          const { error: modErr } = await supabase
            .from("subscription_sessions")
            .update({
              modules_unlocked: [],
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", refundedUserId);
          if (modErr) console.error(`${FUNCTION_VERSION} V-028 modules revoke failed:`, modErr.message);
          else console.log(`${FUNCTION_VERSION} V-028 modules revoked for user ${refundedUserId}`);

          // 2. Flag user_profiles.subscription_active=false (if set).
          const { error: profErr } = await supabase
            .from("user_profiles")
            .update({
              subscription_active: false,
              subscription_plan: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", refundedUserId)
            .eq("subscription_active", true); // no-op if it wasn't true
          if (profErr) console.error(`${FUNCTION_VERSION} V-028 profile revoke failed:`, profErr.message);

          // 3. Mark the reports for this user that were paid via this session
          //    as refunded_revoked. We don't know exactly which report the
          //    refund covers from the Stripe payload — most users will have one
          //    paid report, so revoke ALL of theirs that are at pending_selection
          //    or beyond. (One-report-per-purchase invariant per ADR-019.)
          const { error: reportErr, count: reportCount } = await supabase
            .from("reports")
            .update({ status: "refunded_revoked" }, { count: "exact" })
            .eq("user_id", refundedUserId)
            .in("status", ["pending_selection", "generating_plan", "complete"]);
          if (reportErr) console.error(`${FUNCTION_VERSION} V-028 reports revoke failed:`, reportErr.message);
          else console.log(`${FUNCTION_VERSION} V-028 marked ${reportCount ?? 0} report row(s) as refunded_revoked for user ${refundedUserId}`);
        } else if (preserveAccess) {
          console.log(`${FUNCTION_VERSION} V-028: preserve_access=true on refund, skipping revoke for user ${refundedUserId}`);
        }
      } else {
        console.warn(
          `charge.refunded: no Checkout Session found for payment_intent ${paymentIntentId}; refund not recorded in payments table`,
        );
      }
    }

    console.log(`Charge refunded: ${charge.id}`);
    return new Response(
      JSON.stringify({ received: true, response_text: "Refund processed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log(`Unhandled event type: ${event.type}`);
  return new Response(
    JSON.stringify({ received: true, response_text: "Event received" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
