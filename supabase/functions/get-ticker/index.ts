// get-ticker — public feed for the always-on Radar ticker (ADR-026, 2026-06-10)
// FUNCTION_VERSION: ticker-v1.1 (filters: future deadlines only, solo-scale values ≤£2m;
// v1.0 surfaced a £59m programme and a lapsed deadline)
//
// Returns a small, public-safe slice of live data for the site-wide ticker:
// the current week's real tender items (category, short title, value, deadline;
// deliberately NO urls — the full radar is a paid surface) plus the latest
// Signal edition headline + slug. Anonymous-safe by design; verify_jwt:false.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const MAX_SOLO_VALUE = 2_000_000;

function parseValue(v: string | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const { data: raw } = await supabase
      .from("radar_items")
      .select("category, title, value_text, deadline, week_start")
      .eq("source_type", "tender")
      .gte("week_start", since)
      .order("week_start", { ascending: false })
      .limit(40);

    const now = Date.now();
    const items = (raw ?? [])
      .filter((i) => {
        if (i.deadline && new Date(i.deadline).getTime() < now) return false;
        const v = parseValue(i.value_text);
        if (v !== null && v > MAX_SOLO_VALUE) return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 10)
      .map((i) => ({
        category: i.category,
        title: (i.title ?? "").replace(/^GB-[^:]+:\s*/, "").slice(0, 90),
        value_text: i.value_text,
        deadline: i.deadline,
      }));

    const { data: signal } = await supabase
      .from("signal_editions")
      .select("lead_headline, slug")
      .eq("published", true)
      .order("publish_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        response_text: `${items.length} ticker items.`,
        items,
        signal: signal ? { headline: signal.lead_headline, slug: signal.slug } : null,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (e) {
    console.error("get-ticker error:", e);
    return new Response(JSON.stringify({ items: [], signal: null, error: true }), {
      status: 200, // ticker must never break a page; empty feed is the failure mode
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
