/*
 * admin-regenerate-ai-impact v1 — 2026-08-18 (Move 7: corpus pipeline)
 *
 * The quarterly AI-impact pass. The 480-entry kb_ai_impact corpus was
 * hand-assembled in April/May 2026 and marketed as the freshest layer in
 * the product; by August it had decayed exactly as the blueprint predicted
 * (the manual refresh ran zero times). This function turns it into a
 * pipeline: each quarter, every row is REVISED by the current model with
 * three grounding inputs:
 *
 *   1. Last quarter's prose (continuity: revise, correct staleness, keep
 *      what is still true rather than reinventing from nothing).
 *   2. The model's kb_models row (category, buyer, commercial shape).
 *   3. This fortnight's live Radar signals in the model's categories
 *      (real, dated market evidence, the same join the report engine uses).
 *
 * Output is strict-schema, validated (voice rules, length bounds, no
 * monetary figures — rate truth lives in the calibrated bands, not here),
 * retried once WITH hints, and written back with last_updated='2026-08'
 * plus a meta provenance stamp. The hand-era corpus is snapshotted in
 * kb_ai_impact_archive_2026_05 for rollback and for the human spot-audit
 * (June R4: generated pass + human spot-audit, not generated-and-forgotten).
 *
 * Batch protocol (same shape as admin-generate-archetype-capabilities):
 *   POST { confirm: "regen-ai-impact-dnnxmjazillhktwttkux",
 *          limit?: <=30, force?: boolean, model_ids?: string[] }
 * Each call processes the next `limit` rows still on a pre-2026-08
 * vintage (deterministic model_id order) and reports `remaining`, so the
 * runner just repeats the call until remaining is 0. force + model_ids
 * re-does specific rows (spot-audit corrections).
 *
 * verify_jwt true (deploy default); callers send the anon Bearer. The
 * confirm token is the real gate; rate limit backstops it.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.52.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const FUNCTION_VERSION = "admin-regenerate-ai-impact-v1";
const PROMPT_VERSION = "M7-ai-impact-regen-v1";
const OPENAI_MODEL = "gpt-5.4-mini";
const CONFIRM_TOKEN = "regen-ai-impact-dnnxmjazillhktwttkux";
const VINTAGE = "2026-08";
const MAX_LIMIT = 30;
const CONCURRENCY = 4;
const RATE_LIMIT_PER_DAY = 700;

/** Mirror of generate-report v46.1 / weekly-heartbeat. Keep in step. */
const MODEL_CAT_TO_RADAR_CATS: Record<string, string[]> = {
  "Finance": ["Finance", "Finance & Accounting"],
  "Risk & Compliance": ["Risk & Governance"],
  "Delivery & Transformation": ["Change & Delivery"],
  "Operations": ["Operations & Efficiency"],
  "Strategy": ["Strategy & Advisory"],
  "HR & People": ["HR & People"],
  "Tech & Digital": ["Tech & Digital"],
  "Legal": ["Legal"],
  "Marketing & Communications": ["Marketing & Communications"],
  "Sales & Commercial": ["Sales & Commercial"],
  "Procurement & Supply Chain": ["Procurement & Supply Chain"],
  "Healthcare & Life Sciences": ["Healthcare & Life Sciences"],
  "ESG & Sustainability": ["ESG & Sustainability"],
  "Property & Real Estate": ["Property & Real Estate"],
  "Public Sector & Policy": ["Public Sector & Policy"],
  "Customer Experience & Service Design": ["Customer Experience & Service Design"],
};

const OUTPUT_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "ai_impact_revision",
    strict: true,
    schema: {
      type: "object",
      properties: {
        displacement_risk: {
          type: "string",
          enum: ["low", "low-medium", "medium", "medium-high", "high"],
        },
        opportunity: { type: "string" },
        resilient_positioning: { type: "string" },
        adaptation_skills: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 4,
        },
      },
      required: [
        "displacement_risk",
        "opportunity",
        "resilient_positioning",
        "adaptation_skills",
      ],
      additionalProperties: false,
    },
  },
};

interface AiImpactRow {
  model_id: string;
  model_name: string;
  displacement_risk: string | null;
  opportunity: string | null;
  resilient_positioning: string | null;
  adaptation_skills: unknown;
  last_updated: string | null;
}

interface KbModelRow {
  id: string;
  name: string;
  category: string | null;
  commercial_model: string | null;
  target_buyer: string | null;
  time_to_revenue: string | null;
  difficulty: string | null;
  recurrence: string | null;
  primary_move_type: string | null;
}

interface RadarSlim {
  category: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  value_text: string | null;
  week_start: string | null;
}

interface Revision {
  displacement_risk: string;
  opportunity: string;
  resilient_positioning: string;
  adaptation_skills: string[];
}

/* ── Validation with retry hints (the v46.1 lesson: a hard failure with no
 *    hint makes the retry blind). Returns [] when clean. ── */
function validateRevision(r: Revision): string[] {
  const hints: string[] = [];
  const all = [r.opportunity, r.resilient_positioning, ...r.adaptation_skills].join("\n");
  if (all.includes("—")) {
    hints.push("Remove every em dash; use commas or full stops.");
  }
  if (/\bnot\s+[^.,;]{0,40},?\s*but\b/i.test(all)) {
    hints.push("Remove the 'not X, but Y' construction; state the positive claim directly.");
  }
  if (/£\s?\d/.test(all) || /\$\s?\d/.test(all)) {
    hints.push("Remove all specific monetary figures; rate truth lives elsewhere. Keep the claims qualitative.");
  }
  if (r.opportunity.length < 280 || r.opportunity.length > 1100) {
    hints.push(`opportunity must be 280-1100 characters of substantive prose (got ${r.opportunity.length}).`);
  }
  if (r.resilient_positioning.length < 180 || r.resilient_positioning.length > 700) {
    hints.push(`resilient_positioning must be 180-700 characters (got ${r.resilient_positioning.length}).`);
  }
  for (const [i, s] of r.adaptation_skills.entries()) {
    if (s.length < 80 || s.length > 380) {
      hints.push(`adaptation_skills[${i}] must be 80-380 characters, one concrete named-tool or named-regulation skill (got ${s.length}).`);
    }
    if (/^["'“]/.test(s.trim())) {
      hints.push(`adaptation_skills[${i}] must not start with a quote character; plain prose only.`);
    }
  }
  if (/\b(game-chang|revolutioni[sz]|exciting|incredible|leverage the power)\b/i.test(all)) {
    hints.push("Remove hype vocabulary (game-changing, revolutionise, exciting, incredible, 'leverage the power').");
  }
  return hints;
}

function buildMessages(
  model: KbModelRow,
  current: AiImpactRow,
  radar: RadarSlim[],
): Array<{ role: "system" | "user"; content: string }> {
  const skills = Array.isArray(current.adaptation_skills)
    ? (current.adaptation_skills as unknown[]).map((s) => String(s).replace(/^\\?"|\\?"$/g, ""))
    : [];
  const radarText = radar.length > 0
    ? radar.map((r) => {
      const bits = [
        `- "${r.title}" (${r.source_name || "Radar"}, ${r.category}, week of ${r.week_start})`,
        r.value_text ? `value: ${r.value_text}` : null,
        r.summary ? `note: ${String(r.summary).slice(0, 160)}` : null,
      ].filter(Boolean);
      return bits.join(" | ");
    }).join("\n")
    : "(no live signals in this category this fortnight)";
  return [
    {
      role: "system",
      content: [
        "You maintain the AI-impact layer of a UK career-transition knowledge bank. Each entry tells a senior UK professional, honestly and specifically, how AI is changing one independent business model they might run: the displacement risk, where the AI opportunity actually is, how to position so the human work stays valuable, and 3-4 concrete adaptation skills.",
        "",
        "It is August 2026. You are REVISING last quarter's entry, written in spring 2026. Your job: keep what is still true, update what has moved (tool landscape, buyer expectations, regulatory movement), cut anything that now reads stale, and sharpen vague claims into specific ones. If last quarter's entry is still accurate, improving its precision is a legitimate revision; do not change facts merely to look different.",
        "",
        "Voice contract, strictly enforced: British English. Plain confident prose, no hype vocabulary. No em dashes anywhere. Never use the construction 'not X, but Y'. No monetary figures at all (rates live in a separate calibrated layer). Name real tools, platforms and regulations wherever you are confident they exist and are current; prefer a named specific over a generic category. Each adaptation skill is one sentence-length item: a named tool, platform, standard or regulation plus what the practitioner does with it.",
        "",
        "displacement_risk calibration: 'low' means AI compresses tasks but the buyer still needs the human accountable; 'high' means buyers can now self-serve most of the deliverable. Move the rating from last quarter only if you can justify the move in the prose.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `BUSINESS MODEL: ${model.name} [${model.id}]`,
        `Category: ${model.category} | Buyer: ${model.target_buyer} | Commercial: ${model.commercial_model} | Recurrence: ${model.recurrence} | Difficulty: ${model.difficulty} | Move type: ${model.primary_move_type}`,
        "",
        "LAST QUARTER'S ENTRY (spring 2026), to be revised:",
        `displacement_risk: ${current.displacement_risk}`,
        `opportunity: ${current.opportunity}`,
        `resilient_positioning: ${current.resilient_positioning}`,
        `adaptation_skills: ${skills.map((s, i) => `\n  ${i + 1}. ${s}`).join("")}`,
        "",
        "LIVE SIGNALS in this category from the product's Radar, last fortnight (real, dated; use as evidence of current demand direction where relevant, never quote their values):",
        radarText,
        "",
        "Write the August 2026 revision.",
      ].join("\n"),
    },
  ];
}

function getUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch {
    return null;
  }
}

function jsonResp(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface RequestBody {
  confirm?: string;
  limit?: number;
  force?: boolean;
  model_ids?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    let body: RequestBody = {};
    try { body = await req.json(); } catch { /* fallthrough to confirm check */ }
    if (body.confirm !== CONFIRM_TOKEN) {
      return jsonResp(403, { error: "Bad confirm token" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    /* Rate limit: same counter table pattern as the other admin batch fn. */
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rlKey = `aiimpact:${ip}`;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { data: rl } = await supabase
        .from("rate_limit_counters")
        .select("count")
        .eq("key", rlKey)
        .eq("window_start", today)
        .maybeSingle();
      if ((rl?.count ?? 0) >= RATE_LIMIT_PER_DAY) {
        return jsonResp(429, { error: "Rate limit exceeded for today" });
      }
      await supabase.from("rate_limit_counters").upsert(
        { key: rlKey, window_start: today, count: (rl?.count ?? 0) + 1 },
        { onConflict: "key,window_start" },
      );
    } catch { /* rate limiting must never take the batch down */ }

    const limit = Math.max(1, Math.min(MAX_LIMIT, body.limit ?? 20));

    /* Select targets: explicit ids (spot fixes) or the next unrevised slice. */
    let targetQuery = supabase
      .from("kb_ai_impact")
      .select("model_id, model_name, displacement_risk, opportunity, resilient_positioning, adaptation_skills, last_updated")
      .order("model_id", { ascending: true });
    if (Array.isArray(body.model_ids) && body.model_ids.length > 0) {
      targetQuery = targetQuery.in("model_id", body.model_ids.slice(0, MAX_LIMIT));
    } else if (!body.force) {
      targetQuery = targetQuery.neq("last_updated", VINTAGE).limit(limit);
    } else {
      targetQuery = targetQuery.limit(limit);
    }
    const { data: targetRows, error: targetError } = await targetQuery;
    if (targetError) return jsonResp(500, { error: targetError.message });
    const targets = (targetRows || []) as AiImpactRow[];

    const { count: remainingBefore } = await supabase
      .from("kb_ai_impact")
      .select("model_id", { count: "exact", head: true })
      .neq("last_updated", VINTAGE);

    if (targets.length === 0) {
      return jsonResp(200, {
        success: true,
        processed: 0,
        remaining: remainingBefore ?? 0,
        response_text: "Nothing left to revise.",
      });
    }

    /* Shared context. */
    const modelIds = targets.map((t) => t.model_id);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const [{ data: modelRows }, { data: radarRows }] = await Promise.all([
      supabase
        .from("kb_models")
        .select("id, name, category, commercial_model, target_buyer, time_to_revenue, difficulty, recurrence, primary_move_type")
        .in("id", modelIds),
      supabase
        .from("radar_items")
        .select("category, title, summary, source_name, value_text, week_start")
        .gte("week_start", twoWeeksAgo)
        .limit(200),
    ]);
    const modelById = new Map<string, KbModelRow>();
    for (const m of (modelRows || []) as KbModelRow[]) modelById.set(m.id, m);
    const radar = (radarRows || []) as RadarSlim[];

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") || "" });
    const callerId = getUserIdFromJwt(req.headers.get("authorization"));

    /* Worker: revise one row, one retry with hints. */
    async function reviseOne(row: AiImpactRow): Promise<{ model_id: string; status: string; attempts?: number; error?: string }> {
      const model = modelById.get(row.model_id);
      if (!model) return { model_id: row.model_id, status: "failed", error: "no kb_models row" };
      const cats = model.category ? MODEL_CAT_TO_RADAR_CATS[model.category] ?? [model.category] : [];
      const modelRadar = radar
        .filter((r) => cats.includes(r.category))
        .slice(0, 6);
      const messages = buildMessages(model, row, modelRadar);
      let lastHints: string[] = [];
      for (let attempt = 1; attempt <= 2; attempt++) {
        const t0 = Date.now();
        const msgs = attempt === 1 ? messages : [
          ...messages,
          {
            role: "user" as const,
            content: `Your previous attempt failed validation. Fix ONLY these problems and resend the full revision:\n${lastHints.map((h) => `- ${h}`).join("\n")}`,
          },
        ];
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          temperature: 0.3,
          max_completion_tokens: 1400,
          response_format: OUTPUT_SCHEMA,
          messages: msgs,
        });
        try {
          const usage = completion.usage;
          const rates = { input: 0.4, output: 1.5 };
          const cost = usage ? ((usage.prompt_tokens ?? 0) * rates.input + (usage.completion_tokens ?? 0) * rates.output) / 1_000_000 : null;
          await supabase.from("prompt_runs").insert({
            prompt_id: "M7-ai-impact-regen",
            prompt_version_hash: PROMPT_VERSION,
            function_name: "admin-regenerate-ai-impact",
            user_id: callerId,
            model: OPENAI_MODEL,
            input_token_count: usage?.prompt_tokens ?? null,
            output_token_count: usage?.completion_tokens ?? null,
            cost_estimate_gbp: cost,
            latency_ms: Date.now() - t0,
            guardrails_passed: null,
          });
        } catch { /* telemetry never blocks */ }
        const raw = completion.choices[0]?.message?.content;
        if (!raw) { lastHints = ["Return the full JSON object; the last response was empty."]; continue; }
        let parsed: Revision;
        try { parsed = JSON.parse(raw) as Revision; } catch {
          lastHints = ["Return valid JSON matching the schema."];
          continue;
        }
        const hints = validateRevision(parsed);
        if (hints.length > 0) { lastHints = hints; continue; }
        const { error: upError } = await supabase
          .from("kb_ai_impact")
          .update({
            displacement_risk: parsed.displacement_risk,
            opportunity: parsed.opportunity,
            resilient_positioning: parsed.resilient_positioning,
            adaptation_skills: parsed.adaptation_skills,
            last_updated: VINTAGE,
            meta: {
              generated_at: new Date().toISOString(),
              generator: FUNCTION_VERSION,
              prompt_version: PROMPT_VERSION,
              openai_model: OPENAI_MODEL,
              radar_signals_grounded: modelRadar.length,
              previous_vintage: row.last_updated,
              previous_risk: row.displacement_risk,
              attempts: attempt,
            },
          })
          .eq("model_id", row.model_id);
        if (upError) return { model_id: row.model_id, status: "failed", error: upError.message };
        return { model_id: row.model_id, status: "updated", attempts: attempt };
      }
      return { model_id: row.model_id, status: "failed", error: `validation failed twice: ${lastHints.join("; ")}` };
    }

    /* Bounded concurrency. */
    const results: Array<{ model_id: string; status: string; attempts?: number; error?: string }> = [];
    const queue = [...targets];
    async function worker() {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) return;
        try {
          results.push(await reviseOne(row));
        } catch (err) {
          results.push({ model_id: row.model_id, status: "failed", error: String(err) });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

    const updated = results.filter((r) => r.status === "updated").length;
    const { count: remainingAfter } = await supabase
      .from("kb_ai_impact")
      .select("model_id", { count: "exact", head: true })
      .neq("last_updated", VINTAGE);

    console.log(`${FUNCTION_VERSION}: ${updated}/${targets.length} updated, remaining ${remainingAfter}, ${Date.now() - startedAt}ms`);
    return jsonResp(200, {
      success: true,
      processed: targets.length,
      updated,
      failed: results.filter((r) => r.status === "failed").length,
      remaining: remainingAfter ?? null,
      results: results.filter((r) => r.status === "failed"),
      response_text: `Revised ${updated}/${targets.length}; ${remainingAfter} remaining; ${Date.now() - startedAt}ms.`,
    });
  } catch (error) {
    console.error(`${FUNCTION_VERSION} unhandled:`, error);
    return jsonResp(500, { error: String(error) });
  }
});
