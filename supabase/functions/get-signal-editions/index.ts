// get-signal-editions v2 (2026-06-01) — Signal archive for the SEO moat.
// No slug -> list all published editions (newest first) for the /signal index.
// ?slug=<slug> or POST {slug} -> FULL edition (lead + market signals + spotlight +
// ai watch), mirroring get-latest-signal, for the /signal/<slug> permalink.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let slug = new URL(req.url).searchParams.get("slug");
  if (!slug && req.method === "POST") {
    try { const b = await req.json(); slug = (b && b.slug) ? String(b.slug) : null; } catch { /* no body */ }
  }

  if (slug) {
    const { data: edition, error } = await sb
      .from("signal_editions")
      .select("id, slug, week_number, publish_date, theme_archetype_id, theme_title, lead_headline, lead_subheadline, lead_body, lead_word_count, lead_cta_text, seo_keywords, key_takeaways, published_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!edition) return json({ error: "not_found", response_text: "That edition was not found." }, 404);

    const [{ data: market_signals }, { data: spotlight }, { data: ai_watch }] = await Promise.all([
      sb.from("signal_market_signals").select("signal_text, source, source_date, source_reliability, what_this_means, archetypes_affected, position_in_edition").eq("edition_id", edition.id).order("position_in_edition", { ascending: true }),
      sb.from("signal_archetype_spotlights").select("archetype_id, archetype_name, headline, summary, day_rate_range, demand_signal, first_step, cta_text").eq("edition_id", edition.id).maybeSingle(),
      sb.from("signal_ai_watch").select("headline, body, development_date, archetypes_most_affected, opportunity, source, source_url").eq("edition_id", edition.id).maybeSingle(),
    ]);

    return json({ edition, market_signals: market_signals ?? [], spotlight: spotlight ?? null, ai_watch: ai_watch ?? null });
  }

  const { data, error } = await sb
    .from("signal_editions")
    .select("slug, lead_headline, lead_subheadline, publish_date")
    .eq("published", true)
    .order("publish_date", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ editions: data ?? [] });
});
