// get-radar — Opportunity Radar v1 read path (ADR-025, 2026-06-10)
// FUNCTION_VERSION: radar-read-v1.1
// v1.1 display-quality pass (real data was reading as placeholder):
//   - strips the 'GB-Town:' notice prefix from titles
//   - dedupes multiple lots of the same framework (keeps the first, notes count)
//   - drops items over £2m (not solo-winnable) and lapsed deadlines
//   - labels framework-ceiling values as such ('framework value')
// v1.0 initial.
//
// Paid surface: requires a paid report. verify_jwt: true (gateway-verified).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
const MAX_SOLO_VALUE = 2_000_000;

function parseValue(v: string | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanTitle(t: string): string {
  return t.replace(/^GB-[^:]+:\s*/, "").trim();
}

/** Framework/lot grouping key: buyer + title up to a 'Lot N' marker. */
function frameworkKey(title: string, buyer: string | null): string {
  const stem = cleanTitle(title).split(/\blot\s*\d+/i)[0].trim().toLowerCase();
  return `${(buyer ?? "").toLowerCase()}|${stem}`;
}

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
      .order("source_type", { ascending: false });
    if (category) {
      query = query.in("category", [category, "General"]);
    } else {
      query = query.eq("source_type", "tender").limit(10);
    }
    const { data: raw, error: itemsErr } = await query;
    if (itemsErr) throw new Error(itemsErr.message);

    // Display-quality pass.
    const now = Date.now();
    const seenFrameworks = new Map<string, number>();
    const shaped = [] as Record<string, unknown>[];
    for (const i of raw ?? []) {
      if (i.source_type === "tender") {
        if (i.deadline && new Date(i.deadline).getTime() < now) continue;
        const v = parseValue(i.value_text);
        if (v !== null && v > MAX_SOLO_VALUE) continue;
        const key = frameworkKey(i.title, i.buyer);
        if (seenFrameworks.has(key)) {
          seenFrameworks.set(key, (seenFrameworks.get(key) ?? 1) + 1);
          continue; // collapse sibling lots of the same framework
        }
        seenFrameworks.set(key, 1);
        shaped.push({
          ...i,
          title: cleanTitle(i.title),
          value_text: v !== null && v >= 250_000 ? `${i.value_text} framework` : i.value_text,
        });
      } else {
        shaped.push(i);
      }
    }
    // Annotate collapsed-lot counts.
    for (const s of shaped) {
      if (s.source_type !== "tender") continue;
      const key = frameworkKey(s.title as string, s.buyer as string | null);
      const n = seenFrameworks.get(key) ?? 1;
      if (n > 1) s.title = `${s.title} (${n} lots open)`;
    }

    return new Response(
      JSON.stringify({
        response_text: `${shaped.length} radar items for ${category ?? "your market"}.`,
        category,
        archetype: primary || null,
        matched: !!category,
        items: shaped,
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
