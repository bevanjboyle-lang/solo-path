// get-account-readiness v16 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
/**
 * get-account-readiness v2 — F43 (2026-04-19)
 *
 * F43 fix: project rotated to asymmetric JWT signing (ES256). The edge runtime's
 * built-in verify_jwt: true gateway is HS256-only and rejects ES256 tokens with
 * 401 UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM before the function runs. This
 * version deploys with verify_jwt: false and verifies in-app via
 * supabase.auth.getClaims(token), which fetches the JWKS discovery endpoint
 * (/auth/v1/.well-known/jwks.json, cached 10min) and handles ES256 natively.
 *
 * v1 baseline: called by PaymentSuccess.tsx on a polling loop after
 * exchange-payment-token has established an auth session. Returns { ready: true }
 * once the user's tracker_sessions row is active (meaning generate-plan has
 * completed). PaymentSuccess.tsx polls at 2s intervals for up to 60s, then shows
 * a "stuck" state with a support link.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// F43: JWT verification via supabase.auth.getClaims(token) — works for both
// ES256 (asymmetric) and HS256 (legacy) tokens. Singleton auth client below.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getUserIdFromJwt(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const { data, error } = await authClient.auth.getClaims(token);
    if (error) {
      console.warn("getClaims rejected JWT:", error.message);
      return null;
    }
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch (e) {
    console.warn("getClaims threw:", (e as Error)?.message ?? String(e));
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userId = await getUserIdFromJwt(req.headers.get("authorization"));
  if (!userId) {
    return new Response(
      JSON.stringify({ ready: false, error: "Not authenticated", response_text: "Authentication required." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Check if tracker_sessions has an active row for this user.
    // generate-plan creates this row when the plan is ready.
    const { data: trackerRow, error } = await supabase
      .from("tracker_sessions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("get-account-readiness DB error:", error);
      return new Response(
        JSON.stringify({ ready: false, response_text: "Readiness check failed." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ready = !!trackerRow;
    console.log(`Readiness check for user ${userId}: ${ready ? 'READY' : 'not yet'}`);

    return new Response(
      JSON.stringify({ ready, response_text: ready ? "Account ready." : "Plan still generating." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-account-readiness unhandled error:", err);
    return new Response(
      JSON.stringify({ ready: false, response_text: "Unexpected error during readiness check." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
