// check-payment v21 — Audit P0 #6: Stripe API version standardised to 2025-01-27.acacia
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let body: Record<string, string> = {};
    try {
      body = await req.json();
    } catch {
      // empty body is ok
    }

    const sessionId: string = body.session_id || body.sessionId || '';

    if (sessionId && (sessionId.startsWith('cs_test_') || sessionId.startsWith('cs_live_'))) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
      // Audit fix #6: standardise API version
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const isComplete = session.status === "complete" && session.payment_status === "paid";
      return new Response(
        JSON.stringify({
          paid: isComplete,
          is_complete: isComplete,
          payment_status: session.payment_status,
          status: session.status,
          customer_email: session.customer_details?.email || null,
          amount_total: session.amount_total,
          currency: session.currency,
          response_text: isComplete ? "Payment confirmed." : `Payment status: ${session.payment_status}.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    let userId = getUserIdFromJwt(authHeader);

    if (!userId && sessionId && sessionId.includes('-') && !sessionId.startsWith('cs_')) {
      userId = sessionId;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ paid: false, error: "Could not identify user", is_complete: false, response_text: "Authentication required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: payments, error: dbError } = await supabase
      .from('payments')
      .select('id, status, stripe_session_id, amount, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) {
      console.error('DB error:', dbError);
      return new Response(
        JSON.stringify({ paid: false, error: dbError.message, is_complete: false, response_text: "Database error." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isComplete = payments && payments.length > 0;
    return new Response(
      JSON.stringify({
        paid: isComplete,
        is_complete: isComplete,
        payment_status: isComplete ? 'paid' : 'unpaid',
        status: isComplete ? 'complete' : 'incomplete',
        response_text: isComplete ? "Payment confirmed." : "No completed payment found.",
        payment: isComplete ? payments[0] : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-payment error:", err);
    return new Response(
      JSON.stringify({ paid: false, error: String(err), is_complete: false, response_text: "Failed to check payment status." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
