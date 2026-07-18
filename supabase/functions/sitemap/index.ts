// sitemap v1 — 2026-07-15 (Day Zero C0.6)
//
// Serves sitemap.xml for solo-plan.com. The site is a client-rendered SPA
// with no static sitemap, which undermines the Signal-as-SEO-asset strategy;
// this function generates one dynamically so new Signal editions are
// discoverable the moment they publish. Wired via a vercel.json rewrite:
//   { "source": "/sitemap.xml", "destination": "<this function's URL>" }
// placed BEFORE the SPA catch-all rewrite.
//
// Static public routes + /signal/:slug for every published edition.
// v1.1 (2026-07-18, C1.1): /diagnostic added to the static route list.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BASE = "https://www.solo-plan.com";

const STATIC_ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/how-it-works", priority: "0.8", changefreq: "monthly" },
  { path: "/pricing", priority: "0.8", changefreq: "monthly" },
  { path: "/sample-report", priority: "0.8", changefreq: "monthly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/signal", priority: "0.9", changefreq: "weekly" },
  { path: "/diagnostic", priority: "0.9", changefreq: "monthly" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
];

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const urls: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const r of STATIC_ROUTES) {
    urls.push(
      `  <url>\n    <loc>${BASE}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
    );
  }

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: editions } = await supabase
        .from("signal_editions")
        .select("slug, publish_date")
        .eq("published", true)
        .not("slug", "is", null)
        .order("publish_date", { ascending: false })
        .limit(500);
      for (const e of editions ?? []) {
        const lastmod = e.publish_date ? String(e.publish_date).slice(0, 10) : today;
        urls.push(
          `  <url>\n    <loc>${BASE}/signal/${xmlEscape(String(e.slug))}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
        );
      }
    } catch (err) {
      console.error("sitemap: edition lookup failed", (err as Error)?.message ?? String(err));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
