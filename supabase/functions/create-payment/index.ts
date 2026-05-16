// create-payment v24 — F44 fix: force Stripe email capture — 2026-05-16
//
// F44 (today): a live anon checkout completed but the webhook 400'd with
//   resolveUserForCheckout returning null. Root cause: Stripe checkout.sessions
//   defaulted to customer_creation:'if_required', which for one-time card payments
//   does NOT create a Customer object and does NOT reliably populate
//   customer_details.email on the resulting session. With no email, the anon
//   webhook path cannot find-or-create a user, links no rows, sends no welcome
//   email, and the report stays stuck at teaser_ready. v24 sets
//   customer_creation:'always' so a Customer is always created and the email
//   collected on Checkout is persisted to customer_details.email. This is the
//   minimum change; no other call-site or contract changes.
//
// create-payment v23 — vibe code review fixes — 2026-05-14
//
// V-030: drop client-supplied body.userId fallback (P0 paid identity spoofing).
//        userId now comes only from a verified JWT; anon path uses client_session_id.
// V-032: reportId ownership check. Caller can no longer attribute a payment to a
//        report they don't own (low blast radius, but tightens the trust boundary).
// V-033: payments row insert error is now fatal. Previously the .then() handler
//        logged errors but the function proceeded to send the user to Stripe with
//        no DB record. Customer paid, payments table had no row, payment-webhook
//        had nothing to update. Bookkeeping now consistent.
//
// create-payment v21 — ADR-013 (2026-04-19): anonymous-first checkout.
//                       Accept checkouts keyed by client_session_id (UUID from
//                       localStorage, round-tripped via body.clientSessionId or the
//                       X-Client-Session-Id request header) when no JWT / userId is
//                       present. Identity (userId xor clientSessionId — at least one)
//                       is required; include whichever is supplied in Stripe
//                       session.metadata so payment-webhook can create-or-match a
//                       user account at webhook time via email and link the anon
//                       rows (reports, questionnaire_responses, payments) back to
//                       that user_id. Legacy authed path is byte-equivalent to v20.
// v20 baseline: Audit P0 #6, #7, #8 — Stripe API version pinned, STRIPE_PRICE_ONETIME
//                                     env var support, APP_URL fail-loud.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const FUNCTION_VERSION = "v24-customer-creation-always";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
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

// ADR-013 (2026-04-19): extract anonymous client session id from body or header.
// Returns lowercase UUID string or null.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extractClientSessionId(
  req: Request,
  body: Record<string, unknown>,
): string | null {
  const raw =
    (typeof body.clientSessionId === "string" && body.clientSessionId) ||
    (typeof body.client_session_id === "string" && body.client_session_id) ||
    req.headers.get("x-client-session-id") ||
    req.headers.get("X-Client-Session-Id") ||
    "";
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed || !UUID_RE.test(trimmed)) return null;
  return trimmed;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // V-030 fix: userId is ONLY derived from the JWT. The legacy body.userId
    // fallback enabled paid identity spoofing — see admin/vibe-review-findings.md.
    const userId = getUserIdFromJwt(req.headers.get('authorization'));
    const clientSessionId = extractClientSessionId(req, body);

    // ADR-013: at least one identity is required. Authed path still works as it did
    // in v20 (userId present, clientSessionId absent). Anon path requires a client
    // session UUID. Both-present is permitted — authed wins on the DB row, and
    // webhook can still use client_session_id to link any pre-auth rows from the
    // same session.
    if (!userId && !clientSessionId) {
      return new Response(
        JSON.stringify({
          error: "identity_required",
          response_text: "Authentication or a client session is required.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const reportId = body.reportId || body.report_id;

    // Audit fix #8: APP_URL must be set. No Lovable preview fallback — fail loud.
    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      console.error("APP_URL env var not set — cannot create checkout session");
      return new Response(
        JSON.stringify({
          error: "server_misconfigured",
          details: "APP_URL environment variable is not set",
          response_text: "Server configuration error.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit fix #6: pin Stripe API version
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-01-27.acacia" });
    const supabase = createClient(supabaseUrl, supabaseKey);

    // V-032 (vibe code review 2026-05-14): report ownership check. If a reportId is
    // supplied, confirm the caller owns it (via user_id OR client_session_id). Prevents
    // a caller from attributing their payment to a report owned by someone else.
    if (reportId && (userId || clientSessionId)) {
      const { data: reportRow } = await supabase
        .from("reports")
        .select("user_id, client_session_id")
        .eq("id", reportId)
        .maybeSingle();
      if (reportRow) {
        const ownsByUser = userId && reportRow.user_id === userId;
        const ownsByCsid =
          clientSessionId &&
          reportRow.user_id === null &&
          reportRow.client_session_id === clientSessionId;
        if (!ownsByUser && !ownsByCsid) {
          console.warn(`${FUNCTION_VERSION} V-032: caller does not own report ${reportId}`);
          return new Response(
            JSON.stringify({
              error: "report_ownership_denied",
              response_text: "This report doesn't belong to you.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Audit fix #7: STRIPE_PRICE_ONETIME env var support.
    const onetimePriceId = Deno.env.get("STRIPE_PRICE_ONETIME");
    const lineItems = onetimePriceId
      ? [{ price: onetimePriceId, quantity: 1 }]
      : [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Solo \u2014 Your Plan B Report",
              description: "Full AI-powered career independence report with activation plan",
            },
            unit_amount: 1999,
          },
          quantity: 1,
        }];
    if (!onetimePriceId) {
      console.warn("STRIPE_PRICE_ONETIME not set — using inline price_data. Set env var before production cutover.");
    }

    // ADR-013: metadata carries whichever identity is present. payment-webhook v24
    // reads `userId` first; if absent, it uses `client_session_id` plus the Stripe
    // customer_details.email to create-or-match a user account and then link all
    // anon rows with the matching client_session_id.
    const metadata: Record<string, string> = {
      userId: userId ?? "",
      reportId: reportId || "",
    };
    if (clientSessionId) {
      metadata.client_session_id = clientSessionId;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      // deno-lint-ignore no-explicit-any
      line_items: lineItems as any,
      // v24: force Customer object creation so the email entered at Checkout is
      // reliably surfaced on session.customer_details.email + payment_intent.customer.
      // Without this, mode:'payment' defaults to customer_creation:'if_required',
      // which can complete a payment with no email on the resulting session and
      // breaks the anon→user resolution path in payment-webhook.
      customer_creation: "always",
      success_url: `${appUrl}/payment-success?token={CHECKOUT_SESSION_ID}&report_id=${reportId || ''}`,
      cancel_url: `${appUrl}/teaser?report_id=${reportId || ''}`,
      metadata,
    });

    // V-033 (vibe code review 2026-05-14): payments insert is now fatal on error.
    // Previously the .then() handler only logged — user proceeded to Stripe even
    // with no DB record, leaving payment-webhook unable to match the session.id back.
    const { error: paymentInsertErr } = await supabase.from("payments").insert({
      user_id: userId,
      client_session_id: clientSessionId,
      stripe_session_id: session.id,
      amount: 1999,
      currency: "gbp",
      status: "pending",
      created_at: new Date().toISOString(),
    });
    if (paymentInsertErr) {
      console.error(`${FUNCTION_VERSION} V-033 fatal: payments insert failed:`, paymentInsertErr.message);
      return new Response(
        JSON.stringify({
          error: "payment_record_failed",
          response_text: "Could not record payment. Please try again.",
          details: paymentInsertErr.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        sessionUrl: session.url || "",
        sessionId: session.id,
        version: FUNCTION_VERSION,
        response_text: "Checkout session created.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error in create-payment ${FUNCTION_VERSION}:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error), response_text: "Payment session creation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
