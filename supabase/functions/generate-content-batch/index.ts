// generate-content-batch v1 (2026-07-18, Day Zero C1.3)
//
// The weekly content loop: every Monday at 08:30 UTC (after the 08:00 Signal
// edition publishes) this turns the fresh edition into three brand-page
// LinkedIn posts and one Reddit-ready insight, stores the batch in
// content_batches, and emails it to the owner for the single Monday approval
// session. Publishing stays human and brand-page only (ADR-024): nothing here
// posts anywhere.
//
// Guards, in code not just prompt: KPMG can never appear (same hard rule as
// generate-signal-edition v2.1; regex replace to "a Big Four firm"), em dashes
// stripped (house sanitiser pattern), one batch per edition (unique index).
// Idempotent: re-runs on an edition that already has a batch skip quietly.
// verify_jwt=false (cron-callable). Cost: one gpt-4o call per week.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1-weekly-loop";
const OPENAI_MODEL = "gpt-4o-2024-08-06";
const FROM_ADDRESS = "Solo <hello@solo-plan.com>";
const DEFAULT_OWNER_EMAIL = "bevan.j.boyle@gmail.com";
const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://www.solo-plan.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/** House sanitisers: em dashes to commas (LLMs leak them), KPMG never named. */
function sanitise(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/kpmg/gi, "a Big Four firm");
}

const SYSTEM_PROMPT = `You write outward content for Solo (solo-plan.com), a UK product that turns a professional's experience into a concrete, priced Plan B for independent income. The brand voice is a commercially literate peer: direct, plain English, calm, specific, UK spelling. The brand is faceless; never write as or about a founder, and never name KPMG in any context (write "a Big Four firm" if ever needed).

Write in concrete nouns and named facts from the edition provided. Vary sentence length deliberately. Use commas, semicolons and colons for pause; do not use em dashes. Avoid these words entirely: delve, tapestry, intricate, pivotal, underscore, landscape, foster, testament, enhance, crucial, navigate, elevate, unlock, unleash, embark, harness, leverage, robust, streamline, seamless, holistic, empower, realm. Avoid "not X but Y" constructions and adjective triplets. No motivational language, no exclamation marks, no emojis, no hashtags.

You produce:
1. Three LinkedIn posts for the Solo company page, each 80 to 150 words, each a different angle on this week's edition: (a) the lead insight retold for a professional feeling exposed, (b) the sharpest single market signal with what it means, (c) a practical takeaway that stands alone. Each ends with one quiet sentence pointing at the free 90-second diagnostic and the link placeholder {DIAGNOSTIC_LINK} on its own line.
2. One Reddit-ready insight: a title and a 120-to-220-word body that is genuinely useful with no product mention and no links, written like a knowledgeable practitioner sharing what they see in the market. Plus one separate optional closing line mentioning the free diagnostic, used only where a subreddit's rules allow self-promotion.

The reader should learn something true whether or not they ever click.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    linkedin_posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          angle: { type: "string" },
          text: { type: "string" },
        },
        required: ["angle", "text"],
      },
    },
    reddit_insight: {
      type: "object",
      additionalProperties: false,
      properties: {
        suggested_subreddits: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        optional_promo_line: { type: "string" },
      },
      required: ["suggested_subreddits", "title", "body", "optional_promo_line"],
    },
  },
  required: ["linkedin_posts", "reddit_insight"],
};

interface Batch {
  linkedin_posts: Array<{ angle: string; text: string }>;
  reddit_insight: { suggested_subreddits: string; title: string; body: string; optional_promo_line: string };
}

function linkedinLink(): string {
  return `${APP_URL}/diagnostic?utm_source=linkedin&utm_medium=social&utm_campaign=weekly-loop`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function block(title: string, body: string): string {
  return `<div style="background:#ffffff;border:1px solid #E5E2DC;padding:18px 20px;margin:0 0 16px;">
    <div style="color:#8a857d;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;">${title}</div>
    <div style="color:#1A1915;font-size:14px;line-height:1.7;white-space:pre-wrap;">${body}</div>
  </div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("WATCHDOG_EMAIL") || DEFAULT_OWNER_EMAIL;
    if (!openaiKey) return json({ skipped: true, reason: "no_openai_key" });

    // Latest published edition within 8 days (the loop rides the Monday publish).
    const since = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
    const { data: edition, error: edErr } = await supabase
      .from("signal_editions")
      .select("id, publish_date, slug, lead_headline, lead_subheadline, lead_body, key_takeaways")
      .eq("published", true)
      .gte("created_at", since)
      .order("publish_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (edErr) {
      console.error(`${FUNCTION_VERSION} edition fetch error:`, edErr.message);
      return json({ error: "edition_fetch_failed" }, 500);
    }
    if (!edition) {
      console.log(`${FUNCTION_VERSION} no fresh edition; nothing to do (watchdog covers a missing Monday edition)`);
      return json({ skipped: true, reason: "no_fresh_edition" });
    }

    // Idempotence: one batch per edition.
    const { data: existing } = await supabase
      .from("content_batches")
      .select("id")
      .eq("edition_id", edition.id)
      .maybeSingle();
    if (existing) {
      console.log(`${FUNCTION_VERSION} batch already exists for edition ${edition.id}; skipping`);
      return json({ skipped: true, reason: "batch_exists" });
    }

    const { data: signals } = await supabase
      .from("signal_market_signals")
      .select("signal_text, what_this_means, position_in_edition")
      .eq("edition_id", edition.id)
      .order("position_in_edition", { ascending: true })
      .limit(3);

    const takeaways = Array.isArray(edition.key_takeaways) ? edition.key_takeaways.join("\n- ") : "";
    const signalLines = (signals ?? [])
      .map((s, i) => `${i + 1}. ${s.signal_text}\n   What it means: ${s.what_this_means}`)
      .join("\n");

    const userPrompt = `This week's Signal edition (published ${edition.publish_date}, permalink ${APP_URL}/signal/${edition.slug}):

HEADLINE: ${edition.lead_headline}
SUBHEADLINE: ${edition.lead_subheadline}

LEAD BODY:
${edition.lead_body}

KEY TAKEAWAYS:
- ${takeaways}

MARKET SIGNALS:
${signalLines}

Produce the batch.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: "ContentBatch", schema: RESPONSE_SCHEMA, strict: true } },
        temperature: 0.5,
      }),
    });
    if (!aiResp.ok) {
      console.error(`${FUNCTION_VERSION} openai error:`, aiResp.status, (await aiResp.text()).slice(0, 300));
      return json({ error: "openai_failed" }, 500);
    }
    const aiData = await aiResp.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    let batch: Batch;
    try {
      batch = JSON.parse(raw);
    } catch {
      console.error(`${FUNCTION_VERSION} unparseable model output`);
      return json({ error: "bad_model_output" }, 500);
    }

    // Sanitise everything, resolve the link placeholder, keep exactly 3 posts.
    batch.linkedin_posts = (batch.linkedin_posts ?? []).slice(0, 3).map((p) => ({
      angle: sanitise(p.angle),
      text: sanitise(p.text).replace(/\{DIAGNOSTIC_LINK\}/g, linkedinLink()),
    }));
    batch.reddit_insight = {
      suggested_subreddits: sanitise(batch.reddit_insight.suggested_subreddits),
      title: sanitise(batch.reddit_insight.title),
      body: sanitise(batch.reddit_insight.body),
      optional_promo_line: sanitise(batch.reddit_insight.optional_promo_line),
    };

    const { error: insErr } = await supabase.from("content_batches").insert({
      edition_id: edition.id,
      batch: batch as unknown as Record<string, unknown>,
      status: "draft",
    });
    if (insErr) console.error(`${FUNCTION_VERSION} batch insert error:`, insErr.message);

    // Email the batch for the Monday approval session.
    if (resendKey) {
      const posts = batch.linkedin_posts
        .map((p, i) => block(`LinkedIn post ${i + 1}: ${esc(p.angle)}`, esc(p.text)))
        .join("\n");
      const reddit = block(
        `Reddit insight · suggested: ${esc(batch.reddit_insight.suggested_subreddits)}`,
        `TITLE: ${esc(batch.reddit_insight.title)}\n\n${esc(batch.reddit_insight.body)}\n\n[Only where rules allow] ${esc(batch.reddit_insight.optional_promo_line)}`,
      );
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#FAF9F7;">
          <div style="margin-bottom:24px;"><span style="color:#15735F;font-weight:800;font-size:20px;">Solo</span>
          <span style="color:#8a857d;font-size:12px;margin-left:10px;text-transform:uppercase;letter-spacing:0.14em;">Monday content batch</span></div>
          <h1 style="color:#1A1915;font-size:20px;font-weight:700;margin:0 0 6px;">From this week's Signal: ${esc(edition.lead_headline ?? "")}</h1>
          <p style="color:#8a857d;font-size:13px;margin:0 0 20px;">Copy-paste ready. LinkedIn posts go to the company page only; the Reddit insight follows the playbook (useful first, promo line only where rules allow). Edits welcome; nothing publishes itself.</p>
          ${posts}
          ${reddit}
          <p style="color:#8a857d;font-size:12px;line-height:1.6;margin-top:16px;">Edition permalink: ${APP_URL}/signal/${esc(edition.slug ?? "")}</p>
        </div>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [ownerEmail],
          subject: `Monday batch: 3 LinkedIn posts + 1 Reddit insight (${edition.publish_date})`,
          html,
        }),
      });
      if (!res.ok) console.error(`${FUNCTION_VERSION} batch email failed:`, res.status, (await res.text()).slice(0, 200));
    }

    console.log(`${FUNCTION_VERSION} batch generated for edition ${edition.id}`);
    return json({ ok: true, edition_id: edition.id, posts: batch.linkedin_posts.length });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, (e as Error)?.message ?? String(e));
    return json({ error: "server_error" }, 500);
  }
});
