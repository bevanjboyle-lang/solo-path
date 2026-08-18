// diagnostic-read v1 (2026-08-18, Blueprint Phase B / Move 3)
//
// The free diagnostic's read moves from a 45-cell deterministic template to a
// real classification against the 95-archetype knowledge bank, grounded in
// the person's own CV and answers, and closed with one live demand signal
// from the Radar (the evidence artefact a general chatbot cannot fake,
// because the feed and the taxonomy are ours).
//
// Contract with the frontend (src/pages/Diagnostic.tsx v2):
//   POST { profile:{title,years,sector,work_type?,seniority?}, cv_text?,
//          situation, appetite, evidence:{recency,note?} }
//   → 200 { ok:true, archetype:{id,name,category},
//           read:{identity,signal,strengths[],direction,blocker},   // same
//                 shape as the deterministic DiagnosticRead, so the renderer
//                 needs no dual model
//           evidence_signal:{title,source_name,value_text,deadline,week_start} | null }
//   → 200 { ok:false, fallback:true, reason } on ANY quality or infra failure;
//     the client falls back to the deterministic read. This surface must
//     never hard-fail a user who just answered questions.
//
// Two model calls, ~£0.005/run at current rates:
//   1. TIER3 classify: profile + cv summary vs the compact catalogue → id.
//      Confidence < 0.55 → honest fallback (never a confident wrong read).
//   2. TIER2 compose: strict schema, grounded ONLY in the catalogue entry +
//      the person's own material. Bible §7d boundary held: category-level
//      direction, no named business models, no option names.
//
// Guards: per-IP daily rate limit (consume_rate_limit, C0.10 shim), em-dash
// strip + banned-lexicon lint in CODE (fallback on violation), 8s per-call
// timeout. verify_jwt=false (anonymous funnel; config.toml pinned).
//
// Catalogue regeneration (when the KB changes): see catalogue.ts header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { CATALOGUE, type CatalogueEntry } from "./catalogue.ts";

const FUNCTION_VERSION = "v1-kb-classified-read";
const MODEL_CLASSIFY = "gpt-5.4-nano";
const MODEL_COMPOSE = "gpt-5.4-mini";
const RATE_LIMIT_PER_DAY = 40;
const MIN_CONFIDENCE = 0.55;
const CALL_TIMEOUT_MS = 9000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function fallback(reason: string) {
  console.warn(`${FUNCTION_VERSION} fallback: ${reason}`);
  return json({ ok: false, fallback: true, reason });
}

/** House sanitiser: em dashes never ship (tone-of-voice v1.2). */
function stripDashes(s: string): string {
  return s.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, ", ");
}

// Banned lexicon + constructions (WP6 register): a violation in generated
// output means the read does not ship; the deterministic fallback does.
const BANNED = /\b(delve|tapestry|intricate|pivotal|underscor\w*|landscape|foster\w*|testament|enhanc\w*|crucial|navigat\w*|elevat\w*|unlock\w*|unleash\w*|embark\w*|harness\w*|leverag\w*|robust|streamlin\w*|seamless\w*|holistic|empower\w*|realm|journey|game.?chang\w*)\b/i;
const MOTIVATIONAL = /\b(discover|realise|realize|reach)\s+your\s+potential\b|\btake\s+the\s+(leap|plunge)\b|\bdream\s+(job|life|career)\b/i;

function lintFails(text: string): string | null {
  if (BANNED.test(text)) return `banned lexicon: ${text.match(BANNED)?.[0]}`;
  if (MOTIVATIONAL.test(text)) return "motivational language";
  if (/!/.test(text)) return "exclamation mark";
  return null;
}

interface OpenAIUsage { prompt_tokens?: number; completion_tokens?: number }

async function callOpenAI(args: {
  key: string;
  model: string;
  system: string;
  user: string;
  schema?: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
}): Promise<{ parsed: Record<string, unknown> | null; usage: OpenAIUsage }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.key}` },
      body: JSON.stringify({
        model: args.model,
        temperature: args.temperature,
        max_completion_tokens: args.maxTokens,
        response_format: args.schema
          ? { type: "json_schema", json_schema: { name: "Out", schema: args.schema, strict: true } }
          : { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
    if (!resp.ok) {
      console.error(`${FUNCTION_VERSION} openai ${args.model}:`, resp.status, (await resp.text()).slice(0, 200));
      return { parsed: null, usage: {} };
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    try {
      return { parsed: JSON.parse(raw) as Record<string, unknown>, usage: data?.usage ?? {} };
    } catch {
      console.error(`${FUNCTION_VERSION} unparseable ${args.model} output`);
      return { parsed: null, usage: data?.usage ?? {} };
    }
  } catch (e) {
    console.error(`${FUNCTION_VERSION} openai ${args.model} threw:`, (e as Error)?.message ?? e);
    return { parsed: null, usage: {} };
  } finally {
    clearTimeout(t);
  }
}

const COMPOSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    identity: { type: "string", description: "Archetype-flavoured identity as a lowercase-leading noun phrase, 3 to 8 words, e.g. 'a commercially fluent procurement operator'. No sentence, no full stop." },
    signal: { type: "string", description: "How portable their value currently is, 45 to 75 words, referencing at least one concrete detail from their CV or answers verbatim or near-verbatim." },
    strengths: { type: "array", items: { type: "string" }, description: "Exactly 2 transferable strengths, each 12 to 24 words, each anchored to something specific in their material (not generic to the job title)." },
    direction: { type: "string", description: "30 to 50 words: the KIND of independent work their profile points at, category level only. Never name a specific business model, product, or the archetype's option list." },
    blocker: { type: "string", description: "One honest line, 18 to 35 words, on what most holds this profile back, drawn from the archetype's known weakness and their stated situation. Direct, not cruel." },
  },
  required: ["identity", "signal", "strengths", "direction", "blocker"],
};

const COMPOSE_SYSTEM = `You write the free "optionality read" for Solo (solo-plan.com), a UK product for mid-career professionals building an independent-income Plan B. Voice: a commercially literate peer; direct, specific, calm, UK spelling. Rules that are checked in code and will reject your output: no em dashes anywhere; no exclamation marks; never use these words: delve, tapestry, intricate, pivotal, underscore, landscape, foster, testament, enhance, crucial, navigate, elevate, unlock, unleash, embark, harness, leverage, robust, streamline, seamless, holistic, empower, realm, journey; no motivational language (nothing about potential, leaps, or dreams); avoid "not X but Y" constructions.

You are given ONE archetype entry from Solo's knowledge bank (name, one-liner, two known hidden assets, one known weakness), plus the person's own profile, CV summary and three situational answers. Ground everything in that material. The read should feel like it was written about this one person, because it was: quote or closely paraphrase at least one concrete detail of theirs in the signal, and anchor each strength to their material. The direction stays at the category level; the paid report names the routes, so you never do. The blocker draws on the archetype weakness, sharpened by their stated situation. This is the first ninety seconds of a conversation with someone who gets it; it ends where it gets interesting.`;

interface EvidenceRow {
  title: string;
  source_name: string | null;
  value_text: string | null;
  deadline: string | null;
  week_start: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return fallback("no_openai_key");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Per-IP daily budget via the C0.10 shim; fail-open on shim errors.
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    try {
      const { data: allowed, error: rlErr } = await supabase.rpc("consume_rate_limit", {
        p_key: `diagread:${ip}`,
        p_limit: RATE_LIMIT_PER_DAY,
      });
      if (!rlErr && allowed === false) return json({ ok: false, fallback: true, reason: "rate_limited" }, 429);
    } catch { /* fail-open */ }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const profile = (body.profile ?? {}) as Record<string, unknown>;
    const title = String(profile.title ?? "").slice(0, 160);
    if (!title.trim()) return fallback("no_title");
    const years = String(profile.years ?? "").slice(0, 60);
    const sector = String(profile.sector ?? "").slice(0, 80);
    const workType = String(profile.work_type ?? "").slice(0, 80);
    const seniority = String(profile.seniority ?? "").slice(0, 80);
    const cvText = String(body.cv_text ?? "").slice(0, 4500);
    const situation = String(body.situation ?? "").slice(0, 220);
    const appetite = String(body.appetite ?? "").slice(0, 220);
    const evidence = (body.evidence ?? {}) as Record<string, unknown>;
    const evidenceRecency = String(evidence.recency ?? "").slice(0, 80);
    const evidenceNote = String(evidence.note ?? "").slice(0, 300);

    const personBlock = [
      `Job title: ${title}`,
      years && `Experience: ${years}`,
      sector && `Sector: ${sector}`,
      workType && `Work type: ${workType}`,
      seniority && `Seniority: ${seniority}`,
      situation && `What's behind this today: ${situation}`,
      appetite && `What they'd choose to do if income were covered: ${appetite}`,
      evidenceRecency && `Last asked for their take outside their reporting line: ${evidenceRecency}${evidenceNote ? ` ("${evidenceNote}")` : ""}`,
      cvText && `CV summary:\n${cvText}`,
    ].filter(Boolean).join("\n");

    // ── Call 1: classify against the compact catalogue ──────────────────────
    const t0 = Date.now();
    const classifyList = CATALOGUE.map((c) => `${c.id} | ${c.name} | ${c.one_liner}`).join("\n");
    const cls = await callOpenAI({
      key,
      model: MODEL_CLASSIFY,
      system: "You classify a professional profile to exactly one archetype from Solo's catalogue. Judge by what they have actually done and could credibly sell, not the literal job title. Return JSON: {\"archetype_id\": string (an id from the list), \"confidence\": number 0 to 1, \"runner_up_id\": string}.",
      user: `CATALOGUE (id | name | one-liner):\n${classifyList}\n\nPROFILE:\n${personBlock}\n\nClassify.`,
      maxTokens: 200,
      temperature: 0.1,
    });
    const archetypeId = String(cls.parsed?.archetype_id ?? "");
    const confidence = Number(cls.parsed?.confidence ?? 0);
    const entry: CatalogueEntry | undefined = CATALOGUE.find((c) => c.id === archetypeId);
    if (!entry) return fallback(`unknown_archetype:${archetypeId.slice(0, 40)}`);
    if (!(confidence >= MIN_CONFIDENCE)) return fallback(`low_confidence:${confidence}`);

    // ── Live evidence: one Radar item in the archetype's domain ─────────────
    let evidenceSignal: EvidenceRow | null = null;
    try {
      const { data: radar } = await supabase
        .from("radar_items")
        .select("title, source_name, value_text, deadline, week_start")
        .eq("category", entry.category)
        .order("created_at", { ascending: false })
        .limit(6);
      if (Array.isArray(radar) && radar.length > 0) {
        const scored = [...radar].sort((a, b) => {
          const s = (r: Record<string, unknown>) => (r.value_text ? 2 : 0) + (r.deadline ? 1 : 0);
          return s(b as Record<string, unknown>) - s(a as Record<string, unknown>);
        });
        evidenceSignal = scored[0] as unknown as EvidenceRow;
      }
    } catch (e) {
      console.warn(`${FUNCTION_VERSION} radar lookup failed:`, (e as Error)?.message ?? e);
    }

    // ── Call 2: compose the read, grounded in the entry + their material ────
    const composeUser = `ARCHETYPE ENTRY (Solo knowledge bank):
Name: ${entry.name}
One-liner: ${entry.one_liner}
Known hidden asset A: ${entry.assets[0] ?? ""}
Known hidden asset B: ${entry.assets[1] ?? ""}
Known weakness: ${entry.weakness}

THE PERSON:
${personBlock}

Write the read.`;
    const comp = await callOpenAI({
      key,
      model: MODEL_COMPOSE,
      system: COMPOSE_SYSTEM,
      user: composeUser,
      schema: COMPOSE_SCHEMA,
      maxTokens: 900,
      temperature: 0.6,
    });
    if (!comp.parsed) return fallback("compose_failed");

    const read = {
      identity: stripDashes(String(comp.parsed.identity ?? "")),
      signal: stripDashes(String(comp.parsed.signal ?? "")),
      strengths: (Array.isArray(comp.parsed.strengths) ? comp.parsed.strengths : []).slice(0, 2).map((s) => stripDashes(String(s))),
      direction: stripDashes(String(comp.parsed.direction ?? "")),
      blocker: stripDashes(String(comp.parsed.blocker ?? "")),
    };
    if (!read.identity || !read.signal || read.strengths.length < 2 || !read.direction || !read.blocker) {
      return fallback("incomplete_read");
    }
    const lint = lintFails([read.identity, read.signal, ...read.strengths, read.direction, read.blocker].join(" "));
    if (lint) return fallback(`lint:${lint}`);

    console.log(
      `${FUNCTION_VERSION} ok | ${entry.id} conf=${confidence} | evidence=${evidenceSignal ? "yes" : "no"} | ${Date.now() - t0}ms | cls=${cls.usage.prompt_tokens}/${cls.usage.completion_tokens} comp=${comp.usage.prompt_tokens}/${comp.usage.completion_tokens}`,
    );

    return json({
      ok: true,
      version: FUNCTION_VERSION,
      archetype: { id: entry.id, name: entry.name, category: entry.category },
      read,
      evidence_signal: evidenceSignal
        ? {
            title: stripDashes(String(evidenceSignal.title ?? "")).slice(0, 200),
            source_name: evidenceSignal.source_name,
            value_text: evidenceSignal.value_text,
            deadline: evidenceSignal.deadline,
            week_start: evidenceSignal.week_start,
          }
        : null,
    });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, (e as Error)?.message ?? e);
    return fallback("server_error");
  }
});
