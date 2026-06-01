// get-signal-editions v1 (2026-06-01) — Signal archive for the SEO moat.
// No slug -> list all published editions (newest first) for the /signal index.
// ?slug=<slug> or POST {slug} -> full edition for the /signal/<slug> permalink.
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
    const { data, error } = await sb
      .from("signal_editions")
      .select("slug, lead_headline, lead_subheadline, lead_body, key_takeaways, lead_cta_text, publish_date, theme_title, seo_keywords")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "not_found", response_text: "That edition was not found." }, 404);
    return json({ edition: data });
  }

  const { data, error } = await sb
    .from("signal_editions")
    .select("slug, lead_headline, lead_subheadline, publish_date")
    .eq("published", true)
    .order("publish_date", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ editions: data ?? [] });
});
