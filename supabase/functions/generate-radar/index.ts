// generate-radar — Opportunity Radar v2 (ADR-025; v2 sprint 2026-06-11)
// FUNCTION_VERSION: radar-v2.1
// v2.1 dead-item fixes (found in the v2.0 smoke: a category can be 'covered'
//   entirely by items get-radar will never show, leaving that user an empty
//   radar and an empty digest):
//   - lapsed-deadline notices skipped at fetch (CF republished old notices
//     under stages=tender)
//   - weekly-coverage check now only counts items that survive the display
//     pass (live deadline, <=£2m); dead-only categories get fresh matches or
//     the analysis fallback again
// v2.0 second source + matcher quality:
//   - adds Find a Tender (FTS) OCDS releases as a second source
//     (endpoint verified 2026-06-11: /api/1.0/ocdsReleasePackages?updatedFrom=..&updatedTo=..
//     datetime params, cursor pagination via links.next, releases filtered to
//     tag 'tender' + status 'active'; notice URL from documents[documentType=
//     'tenderNotice'] with /Notice/{release.id} fallback)
//   - source_name now reflects the actual source per item
//   - pre-drops notices over £2m at fetch (get-radar hides them anyway, so
//     matching them was wasted LLM tokens)
//   - matcher prompt: at most ONE lot per framework, prefer under £2m,
//     prefer SME-suitable
// v1.2 idempotent analysis fallback; v1.1 User-Agent fix; v1.0 initial.
//
// Weekly generator. Pulls the last 7 days of UK tender notices (Contracts
// Finder + Find a Tender public OCDS APIs), uses one LLM pass to match
// genuinely-winnable notices to Solo's archetype categories with a one-line
// 'why this matters' in Solo voice, and writes radar_items. Categories with
// no item this week get ONE clearly-labelled 'analysis' item (Solo's read)
// so no user sees an empty radar.
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
const MAX_NOTICES_CF = 250;
const MAX_NOTICES_FTS = 100;
const MAX_PER_CATEGORY = 4;
const MAX_SOLO_VALUE = 2_000_000; // mirrors get-radar's display cap
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
  source: string; // 'Contracts Finder' | 'Find a Tender'
};

function fmtValue(v: { amount?: number; currency?: string } | null | undefined): string | null {
  if (!v || typeof v.amount !== "number" || v.amount <= 0) return null;
  const cur = v.currency === "GBP" || !v.currency ? "£" : v.currency + " ";
  return cur + Math.round(v.amount).toLocaleString("en-GB");
}

function valueAmount(v: { amount?: number } | null | undefined): number | null {
  return v && typeof v.amount === "number" && v.amount > 0 ? v.amount : null;
}

async function fetchContractsFinder(
  daysBack: number,
  notices: Notice[],
  seen: Set<string>,
  diag: string[],
): Promise<void> {
  const from = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  let url: string | null =
    `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?stages=tender&publishedFrom=${from}&publishedTo=${to}`;
  let pages = 0;
  let added = 0;
  while (url && pages < 5 && added < MAX_NOTICES_CF) {
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
        const amount = valueAmount(t.value) ?? valueAmount(t.minValue);
        if (amount !== null && amount > MAX_SOLO_VALUE) continue; // not solo-winnable
        const dl = t.tenderPeriod?.endDate ?? null;
        if (dl && new Date(dl).getTime() < Date.now()) continue; // already closed
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
          deadline: dl,
          valueText: fmtValue(t.value) ?? fmtValue(t.minValue),
          sme: typeof t.suitability?.sme === "boolean" ? t.suitability.sme : null,
          source: "Contracts Finder",
        });
        added++;
        if (added >= MAX_NOTICES_CF) break;
      }
      url = j.links?.next ?? null;
    } catch (e) {
      diag.push(`CF page ${pages}: fetch threw ${(e as Error).message}`);
      break;
    }
  }
}

async function fetchFindATender(
  daysBack: number,
  notices: Notice[],
  seen: Set<string>,
  diag: string[],
): Promise<void> {
  // FTS wants datetime params (no ms, no zone): 2026-06-04T00:00:00
  const fromDT = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 19);
  const toDT = new Date().toISOString().slice(0, 19);
  let url: string | null =
    `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=${fromDT}&updatedTo=${toDT}`;
  let pages = 0;
  let added = 0;
  while (url && pages < 10 && added < MAX_NOTICES_FTS) {
    pages++;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        redirect: "follow",
      });
      if (!res.ok) {
        diag.push(`FTS page ${pages}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
        break;
      }
      const j = await res.json();
      const releases = j.releases ?? [];
      diag.push(`FTS page ${pages}: ${releases.length} releases`);
      for (const rel of releases) {
        // FTS packages mix all release types; keep live tender notices only.
        const tags: string[] = Array.isArray(rel.tag) ? rel.tag : [];
        if (!tags.includes("tender")) continue;
        const t = rel.tender ?? {};
        if (t.status && t.status !== "active") continue;
        const title = (t.title ?? "").trim();
        if (!title || seen.has(title.toLowerCase())) continue;
        const amount = valueAmount(t.value) ?? valueAmount(t.minValue);
        if (amount !== null && amount > MAX_SOLO_VALUE) continue; // FTS skews large; most drop here
        const dl = t.tenderPeriod?.endDate ?? null;
        if (dl && new Date(dl).getTime() < Date.now()) continue; // already closed
        seen.add(title.toLowerCase());
        const doc = (t.documents ?? []).find(
          (d: { documentType?: string; url?: string }) =>
            d.documentType === "tenderNotice" && !!d.url,
        );
        notices.push({
          idx: notices.length,
          title: title.slice(0, 200),
          desc: (t.description ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
          buyer: (rel.buyer?.name ?? "").slice(0, 100),
          url: doc?.url ?? (rel.id ? `https://www.find-tender.service.gov.uk/Notice/${rel.id}` : null),
          deadline: dl,
          valueText: fmtValue(t.value) ?? fmtValue(t.minValue),
          sme: typeof t.suitability?.sme === "boolean" ? t.suitability.sme : null,
          source: "Find a Tender",
        });
        added++;
        if (added >= MAX_NOTICES_FTS) break;
      }
      url = j.links?.next ?? null;
    } catch (e) {
      diag.push(`FTS page ${pages}: fetch threw ${(e as Error).message}`);
      break;
    }
  }
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
    // v2.1: only items that survive get-radar's display pass count as coverage,
    // so a category whose only items have lapsed or are over £2m gets refilled.
    const { data: existing } = await supabase
      .from("radar_items")
      .select("category, source_type, deadline, value_text")
      .eq("week_start", weekStart);
    const nowMs = Date.now();
    const alreadyCovered = new Set(
      (existing ?? [])
        .filter((r: { source_type: string; deadline: string | null; value_text: string | null }) => {
          if (r.source_type !== "tender") return true; // analysis items always display
          if (r.deadline && new Date(r.deadline).getTime() < nowMs) return false;
          const v = Number(String(r.value_text ?? "").replace(/[^0-9.]/g, ""));
          if (Number.isFinite(v) && v > MAX_SOLO_VALUE) return false;
          return true;
        })
        .map((r: { category: string }) => r.category),
    );

    // 2. Real notices: Contracts Finder + Find a Tender (last 7 days),
    //    deduped by title across both sources.
    const notices: Notice[] = [];
    const seen = new Set<string>();
    await fetchContractsFinder(7, notices, seen, diag);
    const cfCount = notices.length;
    await fetchFindATender(7, notices, seen, diag);
    const ftsCount = notices.length - cfCount;
    console.log(`radar: ${cfCount} CF + ${ftsCount} FTS notices; ${diag.join(" | ")}`);

    // 3. LLM matching pass — strict on winnability for a solo independent.
    const rows: Record<string, unknown>[] = [];
    const matchedCategories = new Set<string>();
    if (notices.length > 0) {
      const compact = notices.map((n) =>
        `${n.idx}|${n.title}|${n.buyer}|${n.valueText ?? ""}|${n.sme === true ? "SME" : ""}|${n.desc.slice(0, 120)}`
      ).join("\n");
      const sys =
        `You match UK public-sector tender notices to categories of senior independent professionals. ` +
        `Be strict: only match a notice if a SOLO independent consultant of that category could credibly bid and win it ` +
        `(advisory, professional services, review, programme, comms, audit-adjacent work; NOT construction, transport, catering, ` +
        `equipment supply, or anything needing a firm's scale). At most ${MAX_PER_CATEGORY} per category; fewer is better than weak matches. ` +
        `Where several notices are lots of the same framework or DPS (same buyer, near-identical titles with 'Lot N' markers), ` +
        `match at most ONE of them: the single most winnable lot. ` +
        `Prefer notices under £2m, and prefer those marked SME over those not. Large framework ceilings are rarely solo-winnable. ` +
        `For each match write "why": ONE sentence, direct and commercially grounded, telling the reader why this is worth a look ` +
        `(no hype, no exclamation marks, plain UK English). Respond JSON: {"assignments":[{"idx":<int>,"category":"<exact category>","why":"..."}]}`;
      const user = `Categories:\n${categories.join("\n")}\n\nNotices (idx|title|buyer|value|sme|description):\n${compact}`;
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
          source_name: n.source,
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
      response_text: `Radar generated for week ${weekStart}: ${rows.length} items (${matchedCategories.size} categories with real tenders, ${empty.length} analysis fallback), ${inserted} written, ${notices.length} notices scanned (${cfCount} Contracts Finder, ${ftsCount} Find a Tender), ${Math.round((Date.now() - started) / 1000)}s.`,
      week_start: weekStart,
      items: rows.length,
      inserted,
      notices_scanned: notices.length,
      notices_cf: cfCount,
      notices_fts: ftsCount,
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
