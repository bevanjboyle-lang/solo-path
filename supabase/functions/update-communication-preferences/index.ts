// update-communication-preferences v1 — 2026-07-01 — ADR-027
// Authed (verify_jwt:true). Applies preference changes for the caller.
// Body fields (all optional):
//   signal_opt_in, product_news_opt_in, lifecycle_opt_in, tracker_emails_opt_in,
//   radar_digest_opt_in : booleans
//   checkin_cadence     : 'daily' | 'every_other_day' | 'weekly'
//   pause_weeks         : 0 (resume) | 2 | 4  -> sets/clears checkin_paused_until
//   stop_all_marketing  : true -> writes a global scope 'all' suppression
// Turning any stream ON through the authed centre clears the blocking suppression
// (being signed in and opting in is fresh consent). An explicit stop_all_marketing wins.
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

const BOOL_FIELDS = [
  "signal_opt_in",
  "product_news_opt_in",
  "lifecycle_opt_in",
  "tracker_emails_opt_in",
  "radar_digest_opt_in",
] as const;

const SCOPE_FOR_FIELD: Record<string, string> = {
  signal_opt_in: "signal",
  product_news_opt_in: "product_news",
  lifecycle_opt_in: "lifecycle",
  radar_digest_opt_in: "radar",
};

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
  const email = (user.email as string).toLowerCase();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_e) {
    body = {};
  }

  // ensure the row exists
  await supabase.rpc("ensure_comm_prefs", { p_email: user.email, p_user_id: user.id });

  // build column updates
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const turnedOnScopes = new Set<string>();

  for (const f of BOOL_FIELDS) {
    if (typeof body[f] === "boolean") {
      update[f] = body[f];
      if (body[f] === true && SCOPE_FOR_FIELD[f]) turnedOnScopes.add(SCOPE_FOR_FIELD[f]);
    }
  }

  if (typeof body.checkin_cadence === "string") {
    if (!["daily", "every_other_day", "weekly"].includes(body.checkin_cadence as string)) {
      return json({ error: "bad_cadence", response_text: "Invalid cadence" }, 400);
    }
    update.checkin_cadence = body.checkin_cadence;
  }

  if (body.pause_weeks !== undefined) {
    const pw = Number(body.pause_weeks);
    if (![0, 2, 4].includes(pw)) {
      return json({ error: "bad_pause", response_text: "pause_weeks must be 0, 2 or 4" }, 400);
    }
    update.checkin_paused_until =
      pw === 0 ? null : new Date(Date.now() + pw * 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error: updErr } = await supabase
    .from("communication_preferences")
    .update(update)
    .eq("email", email);
  if (updErr) return json({ error: updErr.message, response_text: "Could not save" }, 500);

  // clear blocking suppressions for streams turned back on (fresh consent)
  if (turnedOnScopes.size > 0) {
    const toClear = new Set<string>(["all", "marketing"]);
    for (const s of turnedOnScopes) toClear.add(s);
    await supabase.from("email_suppressions").delete().eq("email", email).in("scope", Array.from(toClear));
  }

  // explicit global stop wins over any opt-in in the same request
  if (body.stop_all_marketing === true) {
    await supabase.rpc("record_email_suppression", {
      p_email: email,
      p_scope: "all",
      p_reason: "user_unsubscribe",
      p_source: "account_centre",
    });
  }

  // consent audit
  await supabase.from("email_consent_log").insert({
    email,
    user_id: user.id,
    event: body.stop_all_marketing === true ? "unsubscribe_all" : "preference_change",
    channel: "account_centre",
    detail: body,
  });

  // return the fresh state (same shape as GET)
  const { data: fresh } = await supabase.rpc("ensure_comm_prefs", {
    p_email: user.email,
    p_user_id: user.id,
  });
  const prefs = Array.isArray(fresh) ? fresh[0] : fresh;
  const { data: supp } = await supabase.from("email_suppressions").select("scope").eq("email", email);
  const scopes = (supp ?? []).map((s: { scope: string }) => s.scope);

  return json(
    {
      response_text: "Preferences saved",
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
