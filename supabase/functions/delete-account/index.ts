// delete-account v13 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromJwt(req.headers.get("authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", response_text: "Authentication required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Safety: require confirmation token in body
    const body = await req.json();
    if (body.confirmation !== "delete" || body.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Invalid confirmation", response_text: "Confirmation required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Delete in dependency order to avoid FK violations
    // 1. advisory_conversation_summaries (FK → advisory_conversations)
    await supabase.from("advisory_conversation_summaries").delete().eq("user_id", userId);

    // 2. advisory_conversations
    await supabase.from("advisory_conversations").delete().eq("user_id", userId);

    // 3. checkin_history (FK → tracker_sessions)
    await supabase.from("checkin_history").delete().eq("user_id", userId);

    // 4. replans (FK → tracker_sessions)
    await supabase.from("replans").delete().eq("user_id", userId);

    // 5. checkin_tokens (FK → tracker_sessions)
    await supabase.from("checkin_tokens").delete().eq("user_id", userId);

    // 6. tracker_sessions
    await supabase.from("tracker_sessions").delete().eq("user_id", userId);

    // 7. tracker_progress
    await supabase.from("tracker_progress").delete().eq("user_id", userId);

    // 8. guidance_module_completions
    await supabase.from("guidance_module_completions").delete().eq("user_id", userId);

    // 9. subscription_sessions
    await supabase.from("subscription_sessions").delete().eq("user_id", userId);

    // 10. report_generation_log
    await supabase.from("report_generation_log").delete().eq("user_id", userId);

    // 11. reports
    await supabase.from("reports").delete().eq("user_id", userId);

    // 12. payments
    await supabase.from("payments").delete().eq("user_id", userId);

    // 13. questionnaire_responses
    await supabase.from("questionnaire_responses").delete().eq("user_id", userId);

    // 14. business_profiles
    await supabase.from("business_profiles").delete().eq("user_id", userId);

    // 15. user_profiles
    await supabase.from("user_profiles").delete().eq("user_id", userId);

    // 16. Delete the auth user (must be last)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("delete-account auth.admin.deleteUser error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message, response_text: "Failed to delete account." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Account deleted for user ${userId}`);
    return new Response(
      JSON.stringify({ success: true, response_text: "Account and all data deleted successfully." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("delete-account error:", error);
    return new Response(
      JSON.stringify({ error: String(error), response_text: "Failed to delete account." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
