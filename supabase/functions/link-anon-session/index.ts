// link-anon-session
// Called from client immediately after a magic-link / OAuth sign-in completes.
// Re-keys any anonymous rows (user_id IS NULL) that share the caller's
// client_session_id to the now-authenticated user_id. Idempotent and
// best-effort — clients should not block on failure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const userId = userData.user.id;

  let body: { client_session_id?: string } = {};
  try { body = await req.json(); } catch (_e) {}
  const clientSessionId = (body.client_session_id || "").trim();
  if (!clientSessionId) {
    return new Response(
      JSON.stringify({ error: "missing_client_session_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const tables = ["reports", "questionnaire_responses", "payments"] as const;
  const linked: Record<string, number> = {};

  for (const table of tables) {
    const { error, count } = await admin
      .from(table)
      .update({ user_id: userId }, { count: "exact" })
      .eq("client_session_id", clientSessionId)
      .is("user_id", null);
    if (error) {
      console.error(`link ${table} failed:`, error.message);
      linked[table] = 0;
    } else {
      linked[table] = count ?? 0;
    }
  }

  return new Response(
    JSON.stringify({ linked }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
