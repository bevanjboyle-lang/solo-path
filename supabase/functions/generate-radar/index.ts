// generate-radar — Opportunity Radar v1 (ADR-025, 2026-06-10)
// FUNCTION_VERSION: radar-v1.2 (idempotent analysis fallback: categories already
// covered this week are skipped, so cron re-runs never duplicate; v1.1 added
// User-Agent after the gov.uk API rejected UA-less fetches; v1.0 initial)
//
// Weekly generator. Pulls the last 7 days of UK Contracts Finder tender notices
// (OCDS public API), uses one LLM pass to match genuinely-winnable notices to
// Solo's archetype categories with a one-line 'why this matters' in Solo voice,
// and writes radar_items. Categories with no item this week get ONE clearly-
// labelled 'analysis' item (Solo's read) so no user sees an empty radar.
//
// verify_jwt: false — cron-called via pg_net (same posture as generate-signal-edition).
// Writes via service role only (radar_items has no authenticated write policies).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const OPENAI_MODEL = "gpt-5.4-mini";
const MAX_NOTICES = 350;
const MAX_PER_CATEGORY = 4;
const UA = "SoloRadar/1.0 (+https://www.solo-plan.com; market radar for independent professionals)";

type Notice = {
  idx: number;
  title: string;
  desc: string;
  buyer: string;
  url: string | null;
  deadline: string | null;
  valueText: string | null;
  sme: boolean | null;
};

function fmtValue(v: { amount?: number; currency?: string } | null | undefined): string | null {
  if (!v || typeof v.amount !== "number" || v.amount <= 0) return null;
  const cur = v.currency === "GBP" || !v.currency ? "£" : v.currency + " ";
  return cur + Math.round(v.amount).toLocaleString("en-GB");
}

async function fetchContractsFinder(daysBack: number, diag: string[]): Promise<Notice[]> {
  const from = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  let url: string | null =
    `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?stages=tender&publishedFrom=${from}&publishedTo=${to}`;
  const notices: Notice[] = [];
  const seen = new Set<string>();
  let pages = 0;
  while (url && pages < 5 && notices.length < MAX_NOTICES) {
    pages++;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        redirect: "follow",
      });
      if (!res.ok) {
        diag.push(`CF page ${pages}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
        break;
      }
      const j = await res.json();
      const releases = j.releases ?? [];
      diag.push(`CF page ${pages}: ${releases.length} releases`);
      for (const rel of releases) {
        const t = rel.tender ?? {};
        if (t.status && t.status !== "active") continue;
        const title = (t.title ?? "").trim();
        if (!title || seen.has(title.toLowerCase())) continue;
        seen.add(title.toLowerCase());
        const doc = (t.documents ?? []).find(
          (d: { documentType?: string; url?: string }) =>
            d.documentType === "tenderNotice" && (d.url ?? "").includes("contractsfinder"),
        ) ?? (t.documents ?? [])[0];
        notices.push({
          idx: notices.length,
          title: title.slice(0, 200),
          desc: (t.description ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
          buyer: (rel.buyer?.name ?? "").slice(0, 100),
          url: doc?.url ?? null,
          deadline: t.tenderPeriod?.endDate ?? null,
          valueText: fmtValue(t.value) ?? fmtValue(t.minValue),
          sme: typeof t.suitability?.sme === "boolean" ? t.suitability.sme : null,
        });
        if (notices.length >= MAX_NOTICES) break;
      }
      url = j.links?.next ?? null;
    } catch (e) {
      diag.push(`CF page ${pages}: fetch threw ${(e as Error).message}`);
      break;
    }
  }
  return notices;
}

async function openaiJson(system: string, user: string, maxTokens: number): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return JSON.parse(j.choices[0].message.content);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  const diag: string[] = [];
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Week anchor: Monday of the current week.
    const now = new Date();
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    const weekStart = monday.toISOString().slice(0, 10);

    // 1. Categories from the KB (source of truth).
    const { data: catRows, error: catErr } = await supabase
      .from("kb_archetypes")
      .select("category");
    if (catErr) throw new Error("kb_archetypes read failed: " + catErr.message);
    const categories = [...new Set((catRows ?? []).map((r: { category: string }) => r.category))].filter(Boolean);
    if (categories.length === 0) throw new Error("no categories found");

    // Idempotency: categories already covered this week never get fresh analysis
    // fallback (tender inserts are deduped by the unique index regardless).
    const { data: existing } = await supabase
      .from("radar_items")
      .select("category")
      .eq("week_start", weekStart);
    const alreadyCovered = new Set((existing ?? []).map((r: { category: string }) => r.category));

    // 2. Real notices from Contracts Finder (last 7 days).
    const notices = await fetchContractsFinder(7, diag);
    console.log(`radar: fetched ${notices.length} CF notices; ${diag.join(" | ")}`);

    // 3. LLM matching pass — strict on winnability for a solo independent.
    const rows: Record<string, unknown>[] = [];
    const matchedCategories = new Set<string>();
    if (notices.length > 0) {
      const compact = notices.map((n) =>
        `${n.idx}|${n.title}|${n.buyer}|${n.valueText ?? ""}|${n.desc.slice(0, 120)}`
      ).join("\n");
      const sys =
        `You match UK public-sector tender notices to categories of senior independent professionals. ` +
        `Be strict: only match a notice if a SOLO independent consultant of that category could credibly bid and win it ` +
        `(advisory, professional services, review, programme, comms, audit-adjacent work; NOT construction, transport, catering, ` +
        `equipment supply, or anything needing a firm's scale). At most ${MAX_PER_CATEGORY} per category; fewer is better than weak matches. ` +
        `For each match write "why": ONE sentence, direct and commercially grounded, telling the reader why this is worth a look ` +
        `(no hype, no exclamation marks, plain UK English). Respond JSON: {"assignments":[{"idx":<int>,"category":"<exact category>","why":"..."}]}`;
      const user = `Categories:\n${categories.join("\n")}\n\nNotices (idx|title|buyer|value|description):\n${compact}`;
      const out = await openaiJson(sys, user, 4000);
      const assignments = Array.isArray(out.assignments) ? out.assignments : [];
      const perCat: Record<string, number> = {};
      for (const a of assignments) {
        const n = notices[a.idx as number];
        const cat = a.category as string;
        if (!n || !categories.includes(cat)) continue;
        perCat[cat] = (perCat[cat] ?? 0) + 1;
        if (perCat[cat] > MAX_PER_CATEGORY) continue;
        matchedCategories.add(cat);
        rows.push({
          week_start: weekStart,
          category: cat,
          source_type: "tender",
          title: n.title,
          summary: String(a.why ?? "").slice(0, 400),
          url: n.url,
          source_name: "Contracts Finder",
          buyer: n.buyer || null,
          value_text: n.valueText,
          deadline: n.deadline,
          relevance_tags: n.sme === true ? ["sme-suitable"] : [],
        });
      }
    }

    // 4. One labelled analysis item ONLY for categories with nothing this week.
    const empty = categories.filter((c) => !matchedCategories.has(c) && !alreadyCovered.has(c));
    if (empty.length > 0) {
      const sys2 =
        `You write ONE short market observation per category for senior UK professionals weighing independent work. ` +
        `Each item: a specific, plausible, useful observation about where demand for independent work in that category is opening up right now ` +
        `(buyer behaviour, regulation cycles, budget seasons, common triggers). This is analysis, not news: do NOT invent named companies, ` +
        `statistics, or events. Direct, commercially grounded, no hype. ` +
        `Respond JSON: {"items":[{"category":"<exact category>","title":"<7-12 word headline>","summary":"<2 sentences>"}]}`;
      const out2 = await openaiJson(sys2, `Categories:\n${empty.join("\n")}`, 3500);
      for (const it of (Array.isArray(out2.items) ? out2.items : [])) {
        if (!empty.includes(it.category as string)) continue;
        rows.push({
          week_start: weekStart,
          category: it.category,
          source_type: "analysis",
          title: String(it.title ?? "").slice(0, 200),
          summary: String(it.summary ?? "").slice(0, 400),
          url: null,
          source_name: "Solo analysis",
          buyer: null,
          value_text: null,
          deadline: null,
          relevance_tags: [],
        });
      }
    }

    // 5. Insert, ignoring duplicates on (week_start, category, title).
    let inserted = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await supabase
        .from("radar_items")
        .upsert(rows, { onConflict: "week_start,category,title", ignoreDuplicates: true, count: "exact" });
      if (insErr) throw new Error("insert failed: " + insErr.message);
      inserted = count ?? rows.length;
    }

    const summary = {
      response_text: `Radar generated for week ${weekStart}: ${rows.length} items (${matchedCategories.size} categories with real tenders, ${empty.length} analysis fallback), ${inserted} written, ${notices.length} notices scanned, ${Math.round((Date.now() - started) / 1000)}s.`,
      week_start: weekStart,
      items: rows.length,
      inserted,
      notices_scanned: notices.length,
      tender_categories: [...matchedCategories],
      diag,
    };
    console.log(summary.response_text);
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-radar error:", e);
    return new Response(
      JSON.stringify({ response_text: "Radar generation failed: " + (e as Error).message, error: true, diag }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
