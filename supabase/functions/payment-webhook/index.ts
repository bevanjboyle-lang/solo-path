import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (webhookSecret && signature) {
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
      });
    }
  } else {
    // For development/testing without webhook signing secret
    event = JSON.parse(body);
  }

  console.log("Received event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const userId = session.metadata?.user_id;
      if (!userId) {
        console.error("No user_id in session metadata");
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error } = await supabaseAdmin.from("payments").upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_session_id: session.id,
          amount: session.amount_total ?? 0,
          currency: session.currency ?? "gbp",
          status: "paid",
        },
        { onConflict: "stripe_session_id" }
      );

      if (error) {
        console.error("Error inserting payment:", error);
        return new Response(JSON.stringify({ error: "DB insert failed" }), {
          status: 500,
        });
      }

      console.log(`Payment recorded for user ${userId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
