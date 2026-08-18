// generate-content-batch v3 (2026-08-18, Blueprint Phase A) — RETRY + LOUD FAIL
//
// v3: the silent-skip fix. Editions of 27 Jul, 3 Aug and 17 Aug got no batch
// while the cron stayed green: a transient OpenAI failure made generateOnce
// return null, the function answered 500 into pg_net, and nobody heard it.
// v3 adds:
//   1. Retry: the model call runs up to 3 attempts with backoff before giving up.
//   2. Loud failure: a final failure emails the owner immediately with the
//      reason (the weekly watchdog proved too quiet to act on).
//   3. Backfill poke: body.edition_id targets a specific edition, bypassing
//      the 8-day window (idempotence still applies).
//   4. Model re-pin: gpt-4o-2024-08-06 → gpt-5.4-mini (Move 6 modernisation).
// NOTE: this file also lands the deployed v2 voice gate into git; the repo
// copy had drifted (v2 was deployed 23 Jul via MCP and never committed).
//
// v2 (2026-07-23, Day Zero C1.3) — VOICE + CLAIMS GATE
// The first two live batches leaked banned voice ("crucial", "Start your
// journey" on 15 Jul; "Discover your potential", an unverifiable "30%
// increase" statistic on 20 Jul) despite prompt rules. Human approval caught
// them, but the gate now lives in code:
//   1. checkVoice(): two tiers — HARD lexicon/phrase violations (banned list
//      from the system prompt + observed leaks) and UNGROUNDED CLAIMS
//      (numeric percentages in the output that do not appear in the edition
//      source text; editions are themselves synthesised, so a percentage the
//      edition never stated must not reach a public post).
//   2. One regeneration attempt with the violations fed back verbatim.
//   3. If still dirty: batch persists as status 'draft_flagged', flags stored
//      inside the batch json (_voice_flags), and the email opens with a red
//      FIX BY HAND block. Nothing auto-publishes either way (ADR-024).
//   4. body.test_mode=true generates + gates but does NOT insert or email —
//      returns the gated batch + flags for smoke testing.
//
// generate-content-batch v1 (2026-07-18, Day Zero C1.3)
// The weekly content loop: every Monday at 08:30 UTC (after the 08:00 Signal
// edition publishes) this turns the fresh edition into three brand-page
// LinkedIn posts and one Reddit-ready insight, stores the batch in
// content_batches, and emails it to the owner for the single Monday approval
// session. Publishing stays human and brand-page only (ADR-024): nothing here
// posts anywhere. Guards in code: KPMG never appears, em dashes stripped,
// one batch per edition (unique index). verify_jwt=false (cron-callable).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v3-retry-loud";
const OPENAI_MODEL = "gpt-5.4-mini";
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

// ── v2 voice gate ────────────────────────────────────────────────────
const HARD_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "banned word: delve", re: /\bdelv(e|ing|ed)\b/i },
  { label: "banned word: tapestry", re: /\btapestry\b/i },
  { label: "banned word: intricate", re: /\bintricate\b/i },
  { label: "banned word: pivotal", re: /\bpivotal\b/i },
  { label: "banned word: underscore", re: /\bunderscor(e|es|ed|ing)\b/i },
  { label: "banned word: landscape", re: /\blandscape\b/i },
  { label: "banned word: foster", re: /\bfoster(s|ed|ing)?\b/i },
  { label: "banned word: testament", re: /\btestament\b/i },
  { label: "banned word: enhance", re: /\benhanc(e|es|ed|ing|ement)\b/i },
  { label: "banned word: crucial", re: /\bcrucial\b/i },
  { label: "banned word: navigate", re: /\bnavigat(e|es|ed|ing|ion)\b/i },
  { label: "banned word: elevate", re: /\belevat(e|es|ed|ing)\b/i },
  { label: "banned word: unlock", re: /\bunlock(s|ed|ing)?\b/i },
  { label: "banned word: unleash", re: /\bunleash(es|ed|ing)?\b/i },
  { label: "banned word: embark", re: /\bembark(s|ed|ing)?\b/i },
  { label: "banned word: harness", re: /\bharness(es|ed|ing)?\b/i },
  { label: "banned word: leverage", re: /\bleverag(e|es|ed|ing)\b/i },
  { label: "banned word: robust", re: /\brobust\b/i },
  { label: "banned word: streamline", re: /\bstreamlin(e|es|ed|ing)\b/i },
  { label: "banned word: seamless", re: /\bseamless(ly)?\b/i },
  { label: "banned word: holistic", re: /\bholistic\b/i },
  { label: "banned word: empower", re: /\bempower(s|ed|ing|ment)?\b/i },
  { label: "banned word: realm", re: /\brealm\b/i },
  { label: "banned word: journey", re: /\bjourney\b/i },
  { label: "motivational phrase: discover/realise your potential", re: /\b(discover|realise|realize|reach)\s+your\s+potential\b/i },
  { label: "motivational phrase: take the leap/plunge", re: /\btake\s+the\s+(leap|plunge)\b/i },
  { label: "motivational phrase: dream (job/life/career)", re: /\bdream\s+(job|life|career)\b/i },
  { label: "cliché: game-changer", re: /game.?chang/i },
  { label: "cliché: results-driven", re: /\bresults.?driven\b/i },
  { label: "exclamation mark", re: /!/ },
  { label: "emoji/hashtag", re: /#\w+|[\u{1F300}-\u{1FAFF}]/u },
];

/** Percentages in output must appear in the edition source, else they are
 * invented. Compares the numeric token (e.g. "30") followed by %/per cent. */
function ungroundedClaims(output: string, source: string): string[] {
  const found = output.match(/\d+(?:\.\d+)?\s?(?:%|per\s?cent)/gi) ?? [];
  const bad: string[] = [];
  for (const claim of found) {
    const num = claim.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
    const grounded = new RegExp(`${num.replace(".", "\\.")}\\s?(%|per\\s?cent)`, "i").test(source);
    if (!grounded) bad.push(claim.trim());
  }
  return [...new Set(bad)];
}

function checkVoice(batch: Batch, sourceText: string): string[] {
  const flags: string[] = [];
  const pieces: Array<{ where: string; text: string }> = [
    ...batch.linkedin_posts.map((p, i) => ({ where: `LinkedIn post ${i + 1}`, text: p.text })),
    { where: "Reddit title", text: batch.reddit_insight.title },
    { where: "Reddit body", text: batch.reddit_insight.body },
    { where: "Reddit promo line", text: batch.reddit_insight.optional_promo_line },
  ];
  for (const { where, text } of pieces) {
    for (const { label, re } of HARD_PATTERNS) {
      const m = text.match(re);
      if (m) flags.push(`${where}: ${label} ("${m[0]}")`);
    }
    for (const claim of ungroundedClaims(text, sourceText)) {
      flags.push(`${where}: statistic not present in the edition ("${claim}") — verify or delete`);
    }
  }
  return flags;
}
// ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You write outward content for Solo (solo-plan.com), a UK product that turns a professional's experience into a concrete, priced Plan B for independent income. The brand voice is a commercially literate peer: direct, plain English, calm, specific, UK spelling. The brand is faceless; never write as or about a founder, and never name KPMG in any context (write "a Big Four firm" if ever needed).

Write in concrete nouns and named facts from the edition provided. Never state a number, percentage or statistic unless it appears verbatim in the edition text you are given. Vary sentence length deliberately. Use commas, semicolons and colons for pause; do not use em dashes. Avoid these words entirely: delve, tapestry, intricate, pivotal, underscore, landscape, foster, testament, enhance, crucial, navigate, elevate, unlock, unleash, embark, harness, leverage, robust, streamline, seamless, holistic, empower, realm, journey. Avoid "not X but Y" constructions and adjective triplets. No motivational language (nothing about potential, leaps, or dreams), no exclamation marks, no emojis, no hashtags.

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

async function generateOnce(openaiKey: string, userPrompt: string, repairNote?: string): Promise<Batch | null> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
  if (repairNote) messages.push({ role: "user", content: repairNote });
  const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: "json_schema", json_schema: { name: "ContentBatch", schema: RESPONSE_SCHEMA, strict: true } },
      temperature: 0.5,
    }),
  });
  if (!aiResp.ok) {
    console.error(`${FUNCTION_VERSION} openai error:`, aiResp.status, (await aiResp.text()).slice(0, 300));
    return null;
  }
  const aiData = await aiResp.json();
  try {
    return JSON.parse(aiData?.choices?.[0]?.message?.content) as Batch;
  } catch {
    console.error(`${FUNCTION_VERSION} unparseable model output`);
    return null;
  }
}

/** v3: retry wrapper. Transient OpenAI failures were the silent-skip root
 * cause; three attempts with backoff before the loud failure path. */
async function generateWithRetry(openaiKey: string, userPrompt: string, repairNote?: string): Promise<Batch | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const batch = await generateOnce(openaiKey, userPrompt, repairNote);
    if (batch) return batch;
    console.warn(`${FUNCTION_VERSION} attempt ${attempt}/3 failed${attempt < 3 ? "; backing off" : ""}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 4000));
  }
  return null;
}

/** v3: loud failure. The weekly watchdog proved too quiet; a missing batch
 * now emails the owner the moment it fails. Best-effort, never throws. */
async function sendFailureAlert(resendKey: string | undefined, ownerEmail: string, reason: string, editionLabel: string) {
  if (!resendKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [ownerEmail],
        subject: `Content batch FAILED (${editionLabel})`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAF9F7;color:#1A1915;font-size:14px;line-height:1.7;"><p><strong>The Monday content batch did not generate.</strong></p><p>Edition: ${esc(editionLabel)}<br/>Reason: ${esc(reason)}</p><p>It will not retry on its own this week. Ask Claude to poke generate-content-batch (it accepts an edition_id), or the drill email can write posts manually from the edition.</p></div>`,
      }),
    });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} failure-alert email failed:`, (e as Error)?.message ?? e);
  }
}

function cleanBatch(batch: Batch): Batch {
  return {
    linkedin_posts: (batch.linkedin_posts ?? []).slice(0, 3).map((p) => ({
      angle: sanitise(p.angle),
      text: sanitise(p.text).replace(/\{DIAGNOSTIC_LINK\}/g, linkedinLink()),
    })),
    reddit_insight: {
      suggested_subreddits: sanitise(batch.reddit_insight.suggested_subreddits),
      title: sanitise(batch.reddit_insight.title),
      body: sanitise(batch.reddit_insight.body),
      optional_promo_line: sanitise(batch.reddit_insight.optional_promo_line),
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("WATCHDOG_EMAIL") || DEFAULT_OWNER_EMAIL;
    if (!openaiKey) return json({ skipped: true, reason: "no_openai_key" });

    const body = await req.json().catch(() => ({}));
    const testMode = body?.test_mode === true;
    const targetEditionId = typeof body?.edition_id === "string" ? body.edition_id : null;

    // v3: an explicit edition_id poke targets that edition (backfill path);
    // otherwise, latest published edition within 8 days (the Monday ride).
    const since = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
    let editionQuery = supabase
      .from("signal_editions")
      .select("id, publish_date, slug, lead_headline, lead_subheadline, lead_body, key_takeaways")
      .eq("published", true);
    editionQuery = targetEditionId
      ? editionQuery.eq("id", targetEditionId)
      : editionQuery.gte("created_at", since);
    const { data: edition, error: edErr } = await editionQuery
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

    // Idempotence: one batch per edition (test mode bypasses; it never writes).
    if (!testMode) {
      const { data: existing } = await supabase
        .from("content_batches")
        .select("id")
        .eq("edition_id", edition.id)
        .maybeSingle();
      if (existing) {
        console.log(`${FUNCTION_VERSION} batch already exists for edition ${edition.id}; skipping`);
        return json({ skipped: true, reason: "batch_exists" });
      }
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

    // Everything the model was shown counts as "grounded" source for claims.
    const sourceText = userPrompt;

    // ── generate (with retry) → gate → (one) regenerate → gate ──
    let batch = await generateWithRetry(openaiKey, userPrompt);
    if (!batch) {
      await sendFailureAlert(resendKey, ownerEmail, "OpenAI call failed after 3 attempts", `${edition.publish_date} (${edition.lead_headline ?? edition.id})`);
      return json({ error: "openai_failed_after_retries" }, 500);
    }
    batch = cleanBatch(batch);
    let flags = checkVoice(batch, sourceText);

    if (flags.length > 0) {
      console.warn(`${FUNCTION_VERSION} voice gate caught ${flags.length} issue(s); regenerating once:`, flags.join(" | "));
      const repairNote = `Your previous draft violated the house rules below. Rewrite the full batch fixing every one. Do not introduce new statistics; keep only facts stated in the edition.\n\nVIOLATIONS:\n- ${flags.join("\n- ")}`;
      const retry = await generateWithRetry(openaiKey, userPrompt, repairNote);
      if (retry) {
        const retryClean = cleanBatch(retry);
        const retryFlags = checkVoice(retryClean, sourceText);
        if (retryFlags.length < flags.length) {
          batch = retryClean;
          flags = retryFlags;
        }
      }
    }

    const status = flags.length > 0 ? "draft_flagged" : "draft";
    const stored = { ...(batch as unknown as Record<string, unknown>), _voice_flags: flags };

    if (testMode) {
      console.log(`${FUNCTION_VERSION} TEST MODE: gate ran, ${flags.length} residual flag(s); nothing written`);
      return json({ ok: true, test_mode: true, edition_id: edition.id, status, flags, batch });
    }

    const { error: insErr } = await supabase.from("content_batches").insert({
      edition_id: edition.id,
      batch: stored,
      status,
    });
    if (insErr) console.error(`${FUNCTION_VERSION} batch insert error:`, insErr.message);

    // Email the batch for the Monday approval session.
    if (resendKey) {
      const flagBlock = flags.length
        ? `<div style="background:#FDF0F0;border-left:3px solid #D94F4F;padding:14px 16px;margin:0 0 16px;">
            <div style="color:#D94F4F;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px;">Voice flags · fix by hand before posting</div>
            <div style="color:#1A1915;font-size:13px;line-height:1.7;">${flags.map((f) => `• ${esc(f)}`).join("<br>")}</div>
          </div>`
        : "";
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
          ${flagBlock}
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
          subject: `Monday batch: 3 LinkedIn posts + 1 Reddit insight (${edition.publish_date})${flags.length ? " · " + flags.length + " voice flag(s)" : ""}`,
          html,
        }),
      });
      if (!res.ok) console.error(`${FUNCTION_VERSION} batch email failed:`, res.status, (await res.text()).slice(0, 200));
    }

    console.log(`${FUNCTION_VERSION} batch generated for edition ${edition.id} (${status}, ${flags.length} flags)`);
    return json({ ok: true, edition_id: edition.id, posts: batch.linkedin_posts.length, status, flags });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, (e as Error)?.message ?? String(e));
    return json({ error: "server_error" }, 500);
  }
});
