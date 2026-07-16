// generate-signal-edition v2.1 — 2026-07-15 (KPMG guard)
// v2.1: adds a hard editorial prohibition on mentioning KPMG in any output
// (Day Zero programme §2 constraint). No other changes from v2.
//
// generate-signal-edition v2 — 2026-07-15 (rotation fix + slug)
//
// v2 changes (root-cause fix for the silent 6-week outage found 2026-07-15):
//   - ROTATION rebuilt with ids VERIFIED against kb_archetypes (12 of the v1
//     ids did not exist; the picker jammed on ARCH_FRACTIONAL_CFO from 8 June
//     and every weekly run 404'd silently).
//   - Picker is now jam-proof: iterates candidates and skips any id that
//     fails the kb_archetypes lookup instead of dying.
//   - Generates a slug for /signal/:slug permalinks (go-live migration added
//     the column after v1 shipped, so v1 editions relied on backfill).
//
// Track C C2 of the post-guidance programme. Fires the Signal generator:
// pick the next theme archetype from rotation, call OpenAI with the canonical
// prompt + injected archetype data, insert the resulting edition + sub-rows
// into signal_editions / signal_market_signals / signal_archetype_spotlights /
// signal_ai_watch with published=true.
//
// v1 simplifications that still apply (review under WP10 / Signal v2 pass):
//   - Market signals are synthesised by the LLM from its own knowledge rather
//     than gathered from live web sources.
//   - kb_ai_impact lookup is skipped; AI Watch relies on LLM general knowledge.
//   - Prompt is inlined verbatim from prompts/prompt-signal-generator.md.
//   - OPENAI_MODEL deliberately unchanged (single surgical fix);
//     modernisation to the house-standard model rides an eval-protected pass.
//
// Triggered by:
//   - pg_cron job `generate-signal-edition-weekly` (Monday 08:00 UTC).
//   - Manual invocation with optional { archetype_id } body for editorial override.
//
// Returns: { edition_id, theme_archetype_id, theme_title, response_text }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v2.1-kpmg-guard";
const OPENAI_MODEL = "gpt-4o-2024-08-06";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

// Curated rotation. EVERY id below verified to exist in kb_archetypes on
// 2026-07-15. Spread across Legal / Finance / HR / Marketing / Tech / Risk /
// Strategy / Sales for a ~4-month cycle. Round-robin advances each week.
// Editorial override via the request body's archetype_id bypasses this list.
const ROTATION: string[] = [
  "ARCH_EMPLOYMENT_SOL",
  "ARCH_TAX_DIRECT",
  "ARCH_TAX_INDIRECT",
  "ARCH_FRACTIONAL_CHRO",
  "ARCH_CMO_FRAC",
  "ARCH_CTO_FRAC",
  "ARCH_CYBER",
  "ARCH_RESTRUCTURING",
  "ARCH_DATA_PRIVACY",
  "ARCH_AI_STRATEGIST",
  "ARCH_RISK",
  "ARCH_PMO",
  "ARCH_DEMAND_GEN",
  "ARCH_CRO_FRAC",
  "ARCH_GC",
  "ARCH_CORP_FIN",
];

const SYSTEM_PROMPT = `You are Solo's editorial intelligence engine. Your job is to synthesise market intelligence, archetype expertise, and AI impact data into a weekly intelligence digest called The Signal.

The Signal is written for independent professionals — consultants, service providers, fractional leaders, advisory practitioners — who are building or scaling micro-enterprises. The audience is savvy, experienced, commercially literate, and sceptical of hype. They read to understand: what is changing in their market, what does it mean for their business, and what should they do about it.

Do NOT use motivational language, startup hype, or vague encouragement. Do NOT make claims without grounding them in evidence or specifics. Do NOT use em dashes (use commas, full stops, or colons instead). Do NOT use "this is not X, this is Y" constructions. Do NOT generate generic content that could apply to any archetype or market.

HARD RULE: never mention KPMG in any output, in any context, for any reason. If a market event involves that firm, write "a Big Four firm" instead. This rule overrides every instruction to name companies.

DO ground every signal and insight in specific, credible evidence. DO translate market trends into concrete commercial implications. DO acknowledge trade-offs, tensions, and what could go wrong. DO speak as a commercially literate peer, not a cheerleader.

--- LEAD ARTICLE RULES ---
Scope: 500-700 words. Structure: (1) Opening 50-100w: specific grounded observation. (2) Why this matters 100-150w: commercial implications. (3) What's actually happening 150-200w: dig into specifics. (4) What this means for the archetype 100-150w: direct translation. (5) Closing 50-100w: forward-looking but activating, not motivational.

Voice: peer in professional services, not journalist. Name companies, products, sectors. Acknowledge trade-offs. Avoid hype. Every claim must reference evidence or a specific source.

--- MARKET SIGNALS RULES ---
Count: exactly 4 signals. At least 2 relate directly to the theme archetype. At least 1 is cross-cutting. At least 1 is AI-related. All dated within the last 30-45 days from the publish_date provided.

Each signal: signal_text (2-3 sentences of factual statement); source (publication + date); what_this_means (2-3 sentences of commercial interpretation); archetypes_affected (array of archetype_ids). Signals must be newsy not evergreen; commercial implication must be specific not abstract.

--- ARCHETYPE SPOTLIGHT RULES ---
150-200 word summary plus metadata. Headline must be specific and executable (e.g. "Why In-House Teams Now Pay £800 per Day for Specialists Over Full-Service Firms"). Summary covers who they are, what they do, why independence now, market opportunity. Day rate range from the provided archetype data. Demand signal: 2-3 sentences on current state of demand. First step: 1-2 executable actions, not motivational. CTA: "Are you [archetype name]? Get your Solo plan →".

Reference actual capabilities and rates from the provided archetype data. Do not invent capabilities or models.

--- AI WATCH RULES ---
150-250 words. Name a specific AI development, product, or trend affecting the theme archetype (Harvey, CoCounsel, Copilot, ChatFin, or comparable real tools). What was released or changed; what it does; what it means for the theme archetype as threat AND opportunity. Archetypes most affected: 1-3 ids. Opportunity: 1-2 sentences on positioning. No catastrophising; no hype.

--- OUTPUT ---
Produce a single JSON object matching the provided schema exactly. All text must be production-ready (no placeholder markers).`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    lead_article: {
      type: "object",
      properties: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        body: { type: "string", description: "500-700 word lead article body. Multi-paragraph; use \\n\\n between paragraphs." },
        word_count: { type: "integer" },
        cta_text: { type: "string" },
        seo_keywords: { type: "array", items: { type: "string" } },
        key_takeaways: { type: "array", items: { type: "string" }, description: "3 commercially specific takeaways." },
      },
      required: ["headline", "subheadline", "body", "word_count", "cta_text", "seo_keywords", "key_takeaways"],
      additionalProperties: false,
    },
    market_signals: {
      type: "array",
      description: "Exactly 4 signals.",
      items: {
        type: "object",
        properties: {
          signal_text: { type: "string" },
          source: { type: "string" },
          source_date: { type: "string", description: "YYYY-MM-DD" },
          source_reliability: { type: "string", enum: ["high", "medium", "low"] },
          what_this_means: { type: "string" },
          archetypes_affected: { type: "array", items: { type: "string" } },
        },
        required: ["signal_text", "source", "source_date", "source_reliability", "what_this_means", "archetypes_affected"],
        additionalProperties: false,
      },
    },
    archetype_spotlight: {
      type: "object",
      properties: {
        headline: { type: "string" },
        summary: { type: "string" },
        day_rate_range: { type: "string" },
        demand_signal: { type: "string" },
        first_step: { type: "string" },
        cta_text: { type: "string" },
      },
      required: ["headline", "summary", "day_rate_range", "demand_signal", "first_step", "cta_text"],
      additionalProperties: false,
    },
    ai_watch: {
      type: "object",
      properties: {
        headline: { type: "string" },
        body: { type: "string" },
        development_date: { type: "string", description: "YYYY-MM-DD approximate date of the AI development referenced." },
        archetypes_most_affected: { type: "array", items: { type: "string" } },
        opportunity: { type: "string" },
        source: { type: "string" },
      },
      required: ["headline", "body", "development_date", "archetypes_most_affected", "opportunity", "source"],
      additionalProperties: false,
    },
  },
  required: ["lead_article", "market_signals", "archetype_spotlight", "ai_watch"],
  additionalProperties: false,
};

function stripEmDashes(s: string): string {
  return s.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, ", ");
}

function deepStripEmDashes(value: unknown): unknown {
  if (typeof value === "string") return stripEmDashes(value);
  if (Array.isArray(value)) return value.map(deepStripEmDashes);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepStripEmDashes(v);
    return out;
  }
  return value;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}


/*
 * C0.10 rate-limit shim (Day Zero, 2026-07-16). Per-IP daily counter via the
 * consume_rate_limit() SECURITY DEFINER function (migration
 * day_zero_c010_rate_limit_shim). The pre-existing per-user/per-session caps
 * remain; this adds the dimension an abuser cannot rotate for free. Fail-OPEN
 * on infrastructure errors (availability first at this scale), fail-CLOSED on
 * the limit itself. Limits are env-overridable without a redeploy.
 */
// deno-lint-ignore no-explicit-any
async function consumeRateLimit(admin: any, name: string, req: Request, limit: number, globalBucket = false): Promise<boolean> {
  try {
    const ip = globalBucket
      ? "global"
      : (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("cf-connecting-ip") ||
         "unknown");
    const { data, error } = await admin.rpc("consume_rate_limit", { p_key: `${name}:${ip}`, p_limit: limit });
    if (error) {
      console.error(`rate-limit rpc error (fail-open) [${name}]:`, error.message);
      return true;
    }
    if (data !== true) console.warn(`rate-limit exceeded: ${name} key=${ip}`);
    return data === true;
  } catch (e) {
    console.error(`rate-limit threw (fail-open) [${name}]:`, e);
    return true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
    return new Response(
      JSON.stringify({ error: "server_config", response_text: "Missing required environment variables." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // C0.10: this endpoint is public for pg_cron's sake but each call is an LLM
  // edition generation. A GLOBAL daily cap (default 8) keeps abuse at pennies
  // without breaking the Monday cron or manual fires.
  const GLOBAL_LIMIT = parseInt(Deno.env.get("RATE_LIMIT_SIGNAL_GLOBAL_DAY") || "8", 10);
  if (!(await consumeRateLimit(supabase, "generate-signal-edition", req, GLOBAL_LIMIT, true))) {
    return new Response(
      JSON.stringify({ error: "rate_limited", response_text: "Signal generation daily cap reached." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let bodyOverride: { archetype_id?: string } = {};
  try {
    const text = await req.text();
    if (text && text.trim().length > 0) bodyOverride = JSON.parse(text);
  } catch {
    bodyOverride = {};
  }

  // 1. Build candidate list: explicit override OR rotation order (skipping
  //    archetypes featured in the last 12 editions), with the full rotation
  //    as fallback so a stale rotation can never jam the generator again.
  const { data: recentEditions } = await supabase
    .from("signal_editions")
    .select("theme_archetype_id, week_number, publish_date")
    .order("publish_date", { ascending: false })
    .limit(20);

  const recentlyFeatured = new Set(
    (recentEditions ?? []).slice(0, 12).map((r) => r.theme_archetype_id as string),
  );
  const nextWeekNumber =
    ((recentEditions ?? []).reduce((m, r) => Math.max(m, r.week_number ?? 0), 0) || 0) + 1;

  const candidateIds: string[] = bodyOverride.archetype_id
    ? [bodyOverride.archetype_id]
    : [
        ...ROTATION.filter((id) => !recentlyFeatured.has(id)),
        ...ROTATION.filter((id) => recentlyFeatured.has(id)),
      ];

  // 2. Resolve the first candidate that actually exists in kb_archetypes.
  //    v1 died permanently on the first unresolvable id; v2 skips it.
  let themeArchetypeId: string | null = null;
  let archetype: Record<string, unknown> | null = null;
  const attempted: string[] = [];

  for (const candidate of candidateIds) {
    attempted.push(candidate);
    const { data: row, error: lookupError } = await supabase
      .from("kb_archetypes")
      .select("id, name, category, core_identity, day_rate, retainer_monthly, time_to_revenue_bias")
      .eq("id", candidate)
      .maybeSingle();
    if (!lookupError && row) {
      themeArchetypeId = candidate;
      archetype = row as Record<string, unknown>;
      break;
    }
    console.error(`${FUNCTION_VERSION} rotation candidate not found in kb_archetypes, skipping:`, candidate);
  }

  if (!themeArchetypeId || !archetype) {
    return new Response(
      JSON.stringify({
        error: "archetype_not_found",
        response_text: "No rotation candidate resolved in kb_archetypes.",
        archetype_ids_attempted: attempted,
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const publishDate = new Date().toISOString().slice(0, 10);
  const archetypeName = String((archetype as { name?: unknown }).name ?? themeArchetypeId);
  const themeTitle = `${archetypeName} — Going Independent`;
  const editionSlug = `${slugify(archetypeName)}-going-independent-${publishDate}`;

  // 3. Build OpenAI request.
  const userPrompt = `Generate this week's Signal edition.

INJECTIONS:

Theme:
${JSON.stringify({
    week_number: nextWeekNumber,
    publish_date: publishDate,
    theme_archetype_id: themeArchetypeId,
    theme_title: themeTitle,
  }, null, 2)}

Archetype:
${JSON.stringify(archetype, null, 2)}

Note on signals: generate four plausible, commercially-grounded market signals using your knowledge of 2025-2026 UK professional services dynamics. Source dates should be within 30-45 days of the publish_date. Sources should be credible UK publications (FT, Economist, sector trade press like Legal Week, The Lawyer, Accountancy Age, etc.). Reliability values "high" or "medium" preferred.

Note on AI Watch: name a real AI product or capability relevant to the theme archetype (Harvey, CoCounsel, Microsoft Copilot, ChatFin, GitHub Copilot, Anthropic Claude, OpenAI o3, etc. as appropriate to the domain).

Output the JSON matching the provided schema.`;

  const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "SignalEdition",
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
      },
      temperature: 0.4,
    }),
  });

  if (!openaiResp.ok) {
    const errBody = await openaiResp.text();
    console.error(`${FUNCTION_VERSION} OpenAI error:`, openaiResp.status, errBody);
    return new Response(
      JSON.stringify({
        error: "openai_failed",
        status: openaiResp.status,
        response_text: "OpenAI request failed.",
        detail: errBody.slice(0, 500),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const openaiJson = await openaiResp.json();
  const rawContent = openaiJson?.choices?.[0]?.message?.content;
  if (!rawContent) {
    return new Response(
      JSON.stringify({ error: "openai_empty_content", response_text: "OpenAI returned no content." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "openai_invalid_json",
        response_text: "OpenAI response was not valid JSON.",
        detail: (err as Error).message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Strip em-dashes from all string fields before persisting.
  parsed = deepStripEmDashes(parsed);

  const lead = parsed.lead_article;
  const signals = parsed.market_signals ?? [];
  const spot = parsed.archetype_spotlight;
  const aiw = parsed.ai_watch;

  if (!lead || !spot || !aiw || signals.length === 0) {
    return new Response(
      JSON.stringify({
        error: "output_incomplete",
        response_text: "Generated content was incomplete.",
        keys: Object.keys(parsed ?? {}),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Helper: ensure the edition carries a slug for /signal/:slug permalinks.
  async function ensureSlug(editionId: string) {
    const { error: slugErr } = await supabase
      .from("signal_editions")
      .update({ slug: editionSlug })
      .eq("id", editionId)
      .is("slug", null);
    if (slugErr) console.error(`${FUNCTION_VERSION} slug update failed:`, slugErr);
  }

  // 4. Insert edition + sub-rows in one transactional pass.
  const { data: insertResult, error: insertError } = await supabase.rpc(
    "insert_signal_edition_v1",
    {
      p_week_number: nextWeekNumber,
      p_publish_date: publishDate,
      p_theme_archetype_id: themeArchetypeId,
      p_theme_title: themeTitle,
      p_lead_headline: lead.headline,
      p_lead_subheadline: lead.subheadline,
      p_lead_body: lead.body,
      p_lead_word_count: lead.word_count,
      p_lead_cta_text: lead.cta_text,
      p_seo_keywords: lead.seo_keywords,
      p_key_takeaways: lead.key_takeaways,
      p_market_signals: signals,
      p_spotlight: { ...spot, archetype_id: themeArchetypeId, archetype_name: archetypeName },
      p_ai_watch: aiw,
    },
  );

  if (insertError || !insertResult) {
    console.error(`${FUNCTION_VERSION} RPC insert failed:`, insertError);
    // Fall back: do the inserts directly, mirroring the C1 manual pattern.
    const { data: edition, error: ed1Err } = await supabase
      .from("signal_editions")
      .insert({
        week_number: nextWeekNumber,
        publish_date: publishDate,
        theme_archetype_id: themeArchetypeId,
        theme_title: themeTitle,
        published: true,
        published_at: new Date().toISOString(),
        lead_headline: lead.headline,
        lead_subheadline: lead.subheadline,
        lead_body: lead.body,
        lead_word_count: lead.word_count,
        lead_cta_text: lead.cta_text,
        seo_keywords: lead.seo_keywords,
        key_takeaways: lead.key_takeaways,
        slug: editionSlug,
      })
      .select("id")
      .single();

    if (ed1Err || !edition) {
      return new Response(
        JSON.stringify({
          error: "edition_insert_failed",
          response_text: "Failed to insert edition.",
          detail: ed1Err?.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const editionId = edition.id as string;

    const signalRows = signals.map((s: any, i: number) => ({
      edition_id: editionId,
      signal_text: s.signal_text,
      source: s.source,
      source_date: s.source_date,
      source_reliability: s.source_reliability,
      what_this_means: s.what_this_means,
      archetypes_affected: s.archetypes_affected,
      position_in_edition: i + 1,
    }));
    const { error: msErr } = await supabase.from("signal_market_signals").insert(signalRows);
    if (msErr) console.error(`${FUNCTION_VERSION} market_signals insert failed:`, msErr);

    const { error: spErr } = await supabase.from("signal_archetype_spotlights").insert({
      edition_id: editionId,
      archetype_id: themeArchetypeId,
      archetype_name: archetypeName,
      headline: spot.headline,
      summary: spot.summary,
      day_rate_range: spot.day_rate_range,
      demand_signal: spot.demand_signal,
      first_step: spot.first_step,
      cta_text: spot.cta_text,
    });
    if (spErr) console.error(`${FUNCTION_VERSION} spotlight insert failed:`, spErr);

    const { error: awErr } = await supabase.from("signal_ai_watch").insert({
      edition_id: editionId,
      headline: aiw.headline,
      body: aiw.body,
      development_date: aiw.development_date,
      archetypes_most_affected: aiw.archetypes_most_affected,
      opportunity: aiw.opportunity,
      source: aiw.source,
    });
    if (awErr) console.error(`${FUNCTION_VERSION} ai_watch insert failed:`, awErr);

    return new Response(
      JSON.stringify({
        edition_id: editionId,
        theme_archetype_id: themeArchetypeId,
        theme_title: themeTitle,
        week_number: nextWeekNumber,
        slug: editionSlug,
        response_text: `Signal edition ${nextWeekNumber} published for ${archetypeName}.`,
        path: "direct-insert",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await ensureSlug(String(insertResult));

  return new Response(
    JSON.stringify({
      edition_id: insertResult,
      theme_archetype_id: themeArchetypeId,
      theme_title: themeTitle,
      week_number: nextWeekNumber,
      slug: editionSlug,
      response_text: `Signal edition ${nextWeekNumber} published for ${archetypeName}.`,
      path: "rpc",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
