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

const FUNCTION_VERSION = "v21-adr013";

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

    const userId = getUserIdFromJwt(req.headers.get('authorization')) || body.userId || null;
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
      success_url: `${appUrl}/payment-success?token={CHECKOUT_SESSION_ID}&report_id=${reportId || ''}`,
      cancel_url: `${appUrl}/teaser?report_id=${reportId || ''}`,
      metadata,
    });

    // ADR-013: payments row carries whichever identity is present. CHECK constraint
    // enforces that at least one of (user_id, client_session_id) is non-null.
    await supabase.from("payments").insert({
      user_id: userId,
      client_session_id: clientSessionId,
      stripe_session_id: session.id,
      amount: 1999,
      currency: "gbp",
      status: "pending",
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error("DB error storing payment:", error);
    });

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
