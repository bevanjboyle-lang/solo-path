// get-radar — Opportunity Radar v1 read path (ADR-025, 2026-06-10)
// FUNCTION_VERSION: radar-read-v1.0
//
// Returns the current radar for the calling user: items for their archetype's
// category (mapped via kb_archetypes.name) from the last 14 days, tenders first.
// Paid surface: requires a paid report (same statuses the funnel guard uses).
// verify_jwt: true — gateway-verified JWT (per the 2026-06-10 security review:
// no inline-decode identity on sensitive reads).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ response_text: "Sign in to see your radar." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Paid gate + archetype.
    const { data: report } = await supabase
      .from("reports")
      .select("id, status, core_report")
      .eq("user_id", userId)
      .in("status", PAID_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report) {
      return new Response(
        JSON.stringify({ response_text: "The radar unlocks with your report.", gated: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const primary: string = report.core_report?.archetype?.primary ?? "";

    // Map archetype name -> category. Exact match first, then fuzzy.
    let category: string | null = null;
    if (primary) {
      const { data: exact } = await supabase
        .from("kb_archetypes").select("category").eq("name", primary).limit(1).maybeSingle();
      category = exact?.category ?? null;
      if (!category) {
        const { data: fuzzy } = await supabase
          .from("kb_archetypes").select("category")
          .ilike("name", `%${primary.split("/")[0].trim().slice(0, 30)}%`)
          .limit(1).maybeSingle();
        category = fuzzy?.category ?? null;
      }
    }

    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    let query = supabase
      .from("radar_items")
      .select("id, week_start, category, source_type, title, summary, url, source_name, buyer, value_text, deadline, relevance_tags")
      .gte("week_start", since)
      .order("week_start", { ascending: false })
      .order("source_type", { ascending: false }); // 'tender' sorts after 'analysis'; desc puts tenders first.
    if (category) {
      query = query.in("category", [category, "General"]);
    } else {
      query = query.eq("source_type", "tender").limit(10);
    }
    const { data: items, error: itemsErr } = await query;
    if (itemsErr) throw new Error(itemsErr.message);

    return new Response(
      JSON.stringify({
        response_text: `${(items ?? []).length} radar items for ${category ?? "your market"}.`,
        category,
        archetype: primary || null,
        matched: !!category,
        items: items ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-radar error:", e);
    return new Response(
      JSON.stringify({ response_text: "Couldn't load the radar just now.", error: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
