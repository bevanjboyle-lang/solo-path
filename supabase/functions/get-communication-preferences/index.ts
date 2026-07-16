// get-communication-preferences v1 — 2026-07-01 — ADR-027
// Authed (verify_jwt:true). Returns the caller's communication preference row
// (get-or-create via ensure_comm_prefs) plus whether marketing is globally
// suppressed, for the /account preference centre.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "config", response_text: "Server config error" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);

  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user?.email) {
    return json({ error: "unauthorized", response_text: "Not signed in" }, 401);
  }
  const user = userData.user;

  const { data, error } = await supabase.rpc("ensure_comm_prefs", {
    p_email: user.email,
    p_user_id: user.id,
  });
  if (error) return json({ error: error.message, response_text: "Could not load preferences" }, 500);

  const prefs = Array.isArray(data) ? data[0] : data;

  const { data: supp } = await supabase
    .from("email_suppressions")
    .select("scope")
    .eq("email", (user.email as string).toLowerCase());
  const scopes = (supp ?? []).map((s: { scope: string }) => s.scope);

  return json(
    {
      response_text: "ok",
      preferences: {
        email: prefs.email,
        signal_opt_in: prefs.signal_opt_in,
        product_news_opt_in: prefs.product_news_opt_in,
        lifecycle_opt_in: prefs.lifecycle_opt_in,
        tracker_emails_opt_in: prefs.tracker_emails_opt_in,
        radar_digest_opt_in: prefs.radar_digest_opt_in,
        checkin_cadence: prefs.checkin_cadence,
        checkin_paused_until: prefs.checkin_paused_until,
        all_marketing_suppressed: scopes.includes("all") || scopes.includes("marketing"),
      },
    },
    200,
  );
});
