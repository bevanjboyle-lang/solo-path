// link-anon-session v1 — F50 fix
//
// Called from the frontend after a magic-link sign-in completes. Takes the
// authenticated user's JWT plus the client_session_id from localStorage, and
// links the anonymous rows (reports / questionnaire_responses / payments)
// keyed by that client_session_id to the now-known user_id.
//
// Mirrors payment-webhook v24's linkAnonRows logic so anon-first sign-in and
// anon-first payment paths produce the same end state. Idempotent — re-running
// against already-linked rows is a no-op (.is("user_id", null) filter).
//
// Auth: in-function JWT validation via supabase.auth.getClaims (matches
// generate-report v44.1 / ADR-013 pattern). verify_jwt: false at the gateway.
//
// Body: { client_session_id: "uuid" }
// Returns: 200 { linked: { reports, questionnaire_responses, payments } }
//          401 if no/invalid JWT
//          400 if missing or malformed client_session_id

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getUserIdFromJwt(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const { data, error } = await authClient.auth.getClaims(token);
    if (error) return null;
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the caller.
    const userId = await getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          response_text: "Sign in required.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Validate the client_session_id from the request body.
    const body = await req.json().catch(() => ({}));
    const csidRaw =
      (typeof body.client_session_id === "string" && body.client_session_id) ||
      (typeof body.clientSessionId === "string" && body.clientSessionId) ||
      "";
    const csid = csidRaw.trim().toLowerCase();
    if (!csid || !UUID_RE.test(csid)) {
      return new Response(
        JSON.stringify({
          error: "Invalid client_session_id",
          response_text: "Missing or malformed client_session_id.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Service-role client for the linking writes (bypasses RLS).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 4. Update the three anon-keyed tables. Idempotent — only touches rows
    //    that are still unowned. Mirrors payment-webhook linkAnonRows.
    const tables = ["reports", "questionnaire_responses", "payments"] as const;
    const linked: Record<string, number> = {};

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .update({ user_id: userId }, { count: "exact" })
        .eq("client_session_id", csid)
        .is("user_id", null);

      if (error) {
        console.error(
          `${FUNCTION_VERSION} link ${table} failed for user=${userId} csid=${csid}:`,
          error.message,
        );
        linked[table] = -1;
      } else {
        linked[table] = count ?? 0;
        console.log(
          `${FUNCTION_VERSION} linked ${count ?? 0} row(s) in ${table} | user=${userId} csid=${csid}`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        linked,
        response_text: "Anonymous session linked.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error(`${FUNCTION_VERSION} entry error:`, err);
    return new Response(
      JSON.stringify({
        error: String((err as Error)?.message ?? err),
        response_text: "Linking failed.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
