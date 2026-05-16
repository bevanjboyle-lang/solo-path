// get-account-readiness v17 — V-055 consolidation: inline JWT decode — 2026-05-16
//
// V-055 fix: replace authClient.auth.getClaims(token) with the inline base64
// JWT-payload decoder pattern proven in generate-guidance v27 + create-payment v23+.
// Gateway verify_jwt is flipped from false → true so the gateway validates the
// JWT signature. The F43 comment below (about ES256-only support) is stale —
// the Supabase gateway has handled ES256 in verify_jwt:true mode for some time,
// as evidenced by every other verify_jwt:true function (generate-plan,
// process-checkin, refine-report, claim-second-report, get-library-content,
// send-abandonment-email, ask-solo, generate-guidance v27, process-replan)
// running successfully in production. The function only needs to extract the
// `sub` claim, so the authClient + JWKS-cache dependency is removed.
//
// v16 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
//
// v2 — F43 (2026-04-19): project rotated to asymmetric JWT signing (ES256).
// At the time, the edge runtime's verify_jwt:true gateway was HS256-only and
// rejected ES256 tokens. This version deployed with verify_jwt:false and
// verified in-app via supabase.auth.getClaims. (V-055 fix supersedes.)
//
// v1 baseline: called by PaymentSuccess.tsx on a polling loop after
// exchange-payment-token has established an auth session. Returns { ready: true }
// once the user's tracker_sessions row is active (meaning generate-plan has
// completed). PaymentSuccess.tsx polls at 2s intervals for up to 60s, then shows
// a "stuck" state with a support link.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v17-v055-getclaims-fix";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    const sub = payload?.sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
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
