// export-user-data v13 — 2026-05-05: F65 CORS — x-client-session-id added to Access-Control-Allow-Headers
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Gather all user data in parallel
    const [
      profileResult,
      authUserResult,
      questionnaireResult,
      reportsResult,
      trackerResult,
      checkinsResult,
      modulesResult,
      conversationsResult,
      paymentsResult,
    ] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", userId).single(),
      supabase.auth.admin.getUserById(userId),
      supabase.from("questionnaire_responses").select("answers, completed, created_at").eq("user_id", userId).single(),
      supabase.from("reports").select("id, created_at, status, core_report, hook_insight").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("tracker_sessions").select("id, created_at, activated_at, current_day, status, running_narrative").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("checkin_history").select("checkin_date, day_number, state, narrative_addition, created_at").eq("user_id", userId).order("checkin_date", { ascending: true }),
      supabase.from("guidance_module_completions").select("module_id, module_name, track, module_answers, output, completed_at").eq("user_id", userId).order("module_id"),
      supabase.from("advisory_conversation_summaries").select("summary, key_topics, significant_decisions, created_at").eq("user_id", userId).order("created_at"),
      supabase.from("payments").select("amount, currency, status, created_at").eq("user_id", userId).order("created_at"),
    ]);

    const authUser = authUserResult.data?.user;
    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        email: authUser?.email || null,
        created_at: authUser?.created_at || null,
        user_metadata: authUser?.user_metadata || {},
      },
      profile: profileResult.data || null,
      questionnaire_responses: questionnaireResult.data || null,
      reports: reportsResult.data || [],
      tracker_sessions: trackerResult.data || [],
      checkin_history: checkinsResult.data || [],
      guidance_modules_completed: modulesResult.data || [],
      ask_solo_conversation_summaries: conversationsResult.data || [],
      payments: paymentsResult.data || [],
    };

    // Return as downloadable JSON
    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="solo-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );

  } catch (error) {
    console.error("export-user-data error:", error);
    return new Response(
      JSON.stringify({ error: String(error), response_text: "Failed to export user data." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
