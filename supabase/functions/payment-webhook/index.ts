// payment-webhook v24 — ADR-013 (anonymous-first return-to-spec).
//
// Additive changes over v23:
//   1. Accept `client_session_id` in checkout session metadata (new anon flow).
//   2. Resolve user by Stripe customer email when metadata.userId is absent:
//      - find existing auth user by email (admin.listUsers + in-memory match), OR
//      - create a new auth user via admin.createUser (email_confirm=true).
//   3. After resolution, link any anon rows tagged with the same
//      client_session_id (reports, questionnaire_responses, payments) to the
//      resolved user_id. Idempotent — only rows with user_id IS NULL are touched.
//
// Unchanged:
//   - Stripe signature verification.
//   - payments.status='completed' update by stripe_session_id.
//   - user_profiles.stripe_customer_id attach.
//   - Tranche 1 guidance module unlock (modules 1,2,3).
//   - Background generate-plan kick.
//   - Welcome email with magic-link (Resend + supabase.auth.admin.generateLink).
//   - second_report branch (non-subscriber £9.99 second purchase).
//   - charge.refunded handler.
//
// The existing authed path (metadata.userId explicit) is byte-equivalent to v23.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v24-adr013";

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

// Look up an existing auth user by email. supabase-js 2.49.1 does not expose
// getUserByEmail; use admin.listUsers and filter in memory. Pre-launch scale
// is tiny; the perPage:1000 ceiling comfortably covers early production. Swap
// to paginated lookup / REST admin filter if user count grows beyond that.
async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    console.error("admin.listUsers failed:", error.message);
    return null;
  }
  const users = data?.users ?? [];
  const match = users.find(
    (u) => (u.email ?? "").trim().toLowerCase() === needle,
  );
  return match?.id ?? null;
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

    // ── DEFAULT BRANCH: initial £19.99 report purchase (unchanged) ──────────
    try {
      const { data: existingSession } = await supabase
        .from("subscription_sessions")
        .select("id, modules_unlocked")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingSession) {
        const currentUnlocked: number[] = existingSession.modules_unlocked || [];
        const merged = Array.from(
          new Set([...currentUnlocked, ...TRANCHE_1_MODULES]),
        ).sort((a, b) => a - b);
        const { error: updateErr } = await supabase
          .from("subscription_sessions")
          .update({ modules_unlocked: merged, updated_at: new Date().toISOString() })
          .eq("id", existingSession.id);
        if (updateErr) console.error("Error updating modules_unlocked:", updateErr);
        else console.log(`Tranche 1 modules unlocked for user ${userId}: ${merged}`);
      } else {
        const { error: insertErr } = await supabase.from("subscription_sessions").insert({
          user_id: userId,
          modules_unlocked: TRANCHE_1_MODULES,
          modules_completed: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (insertErr) console.error("Error inserting subscription_sessions:", insertErr);
        else
          console.log(
            `New subscription_sessions row created for user ${userId}, modules [1,2,3] unlocked`,
          );
      }
    } catch (moduleErr) {
      console.error("Module unlock failed (non-fatal):", moduleErr);
    }

    console.log(`Payment completed for user ${userId}, session ${session.id}`);

    // Background plan generation — runs after linkAnonRows, so the lookup works.
    try {
      const { data: report } = await supabase
        .from("reports")
        .select("id, recommended_selection, status")
        .eq("user_id", userId)
        .eq("status", "pending_selection")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (report?.id && report?.recommended_selection?.selected_ranks?.length > 0) {
        fetch(`${supabaseUrl}/functions/v1/generate-plan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            report_id: report.id,
            selected_ranks: report.recommended_selection.selected_ranks,
            background: true,
          }),
        }).catch((err: Error) => {
          console.error("Background generate-plan trigger failed:", err.message);
        });
        console.log(`Background plan generation triggered for report ${report.id}`);
      }
    } catch (bgErr) {
      console.error("Background generation lookup failed (non-fatal):", bgErr);
    }

    // Welcome email with magic link (unchanged).
    if (resendApiKey && customerEmail) {
      try {
        const { data: linkData, error: linkError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: customerEmail,
            options: { redirectTo: "https://solo-plan.com/plan" },
          });

        if (linkError || !linkData?.properties?.action_link) {
          console.error(
            "Magic link generation failed (non-fatal):",
            linkError?.message,
          );
        } else {
          await sendWelcomeEmail(
            resendApiKey,
            customerEmail,
            linkData.properties.action_link,
          );
          console.log(`Welcome email with magic link sent to ${customerEmail}`);
        }
      } catch (emailErr) {
        console.error(
          "Welcome email send failed (non-fatal):",
          (emailErr as Error).message,
        );
      }
    } else if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set — welcome email skipped");
    } else if (!customerEmail) {
      console.warn(
        `No customer email available for user ${userId} — welcome email skipped`,
      );
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

  // ───── charge.refunded (unchanged) ───────────────────────────────────────
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = charge.payment_intent as string;

    if (paymentIntentId) {
      const { error } = await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("status", "completed");

      if (error) console.error("Error updating refund status:", error);
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
