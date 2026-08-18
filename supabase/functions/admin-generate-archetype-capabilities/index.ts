// admin-generate-archetype-capabilities v1 (Phase C, 2026-08-18)
//
// One-off batch job (re-runnable) that generates a capability vector for
// each of the 95 kb_archetypes: every one of the 33 model capability slugs
// rated strong / present / none for that archetype. This is the archetype
// side of the Move 2 capability join; kb_models.capability_requirements is
// the model side (backfilled from knowledge-bank JSON).
//
// Grounding and calibration: the prompt sees the archetype's core identity
// plus two calibration sets from the HAND mapping grid, which remains the
// judgment layer: models the grid scores cap_fit >= 4 (their critical
// requirements should mostly be held) and models the grid vetoes. After
// generation the function computes hand-pair coverage (share of critical
// requirements of cap_fit>=4 models rated strong/present) and stores it in
// capability_vector_meta so low-coverage archetypes are flaggable in SQL.
//
// Invocation (pg_net, same pattern as the cron jobs):
//   POST { confirm: "regen-vectors-dnnxmjazillhktwttkux", offset?: 0,
//          limit?: 10, force?: false }
// Batched: each call processes `limit` archetypes ordered by id from
// `offset`; returns next_offset until done. Skips archetypes that already
// have a vector unless force=true. verify_jwt=false (cron pattern); the
// guard is the confirm token, idempotency, and a per-IP rate limit. Writes
// only KB columns; reads no user data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import OpenAI from "https://esm.sh/openai@4.79.1";

const FUNCTION_VERSION = "v1-archetype-capability-vectors";
const MODEL = "gpt-5.4-mini";
const CONFIRM = "regen-vectors-dnnxmjazillhktwttkux";
const DEFAULT_LIMIT = 10;
const CONCURRENCY = 5;
const RATE_LIMIT_PER_DAY = 40;

const CAPABILITIES: Record<string, string> = {
  recommendation_design: "Designing recommendations others act on",
  stakeholder_facilitation: "Facilitating and aligning senior stakeholders",
  client_relationship: "Building and holding client relationships",
  commercial_judgement: "Commercial judgement on money and risk trade-offs",
  policy_documentation: "Writing policies, frameworks and formal documentation",
  research_synthesis: "Synthesising research and evidence into positions",
  regulatory_interpretation: "Interpreting regulation and applying it",
  domain_expertise: "Deep named-domain subject expertise",
  process_design: "Designing operational processes",
  board_communication: "Communicating at board level",
  risk_assessment: "Assessing and articulating risk",
  diagnostic_analysis: "Diagnosing what is actually wrong",
  change_management: "Managing people through change",
  operational_improvement: "Improving how operations run",
  financial_modelling: "Building and interrogating financial models",
  proposal_writing: "Writing winning proposals and cases",
  project_management: "Running projects to time and budget",
  data_analysis: "Analysing data for decisions",
  compliance_monitoring: "Monitoring and evidencing compliance",
  vendor_management: "Managing suppliers and vendor relationships",
  technical_implementation: "Implementing technical systems",
  systems_integration: "Integrating systems and platforms",
  content_creation: "Creating audience-facing content",
  programme_delivery: "Delivering multi-workstream programmes",
  financial_strategy: "Setting financial strategy",
  management_reporting: "Producing management reporting",
  sales_process: "Designing and running sales processes",
  knowledge_transfer: "Transferring knowledge so it sticks",
  due_diligence: "Running due diligence",
  relationship_management: "Managing long-run commercial relationships",
  audit_methodology: "Applying formal audit methodology",
  training_design: "Designing training and development",
  control_design: "Designing internal controls",
};

const SLUGS = Object.keys(CAPABILITIES);

const VECTOR_SCHEMA = {
  name: "archetype_capability_vector",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      capabilities: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(SLUGS.map((s) => [s, { type: "string", enum: ["strong", "present", "none"] }])),
        required: SLUGS,
      },
    },
    required: ["capabilities"],
  },
} as const;

const SYSTEM = `You assign a capability vector to one professional archetype from Solo's knowledge bank (UK mid-career professionals moving into independent work). For EVERY capability in the fixed list, rate what a typical strong member of this archetype could credibly SELL, judged from the archetype's identity, not aspiration:

- "strong": core, daily-practice capability; central to how this archetype earns trust.
- "present": performed credibly at a professional level, but not the centre of the offer.
- "none": would not claim it commercially; a buyer probing it would find a gap.

Calibration rules:
- Expect roughly 5 to 10 strong and 8 to 14 present for most archetypes; rating too many strong destroys the signal.
- The provided WELL-MATCHED models come from a hand-scored grid. Their critical requirements should mostly land strong or present. The VETOED models are hand-vetoed; the capabilities that make them distinctive usually land none.
- Judge the archetype as it is, not as adjacent archetypes are.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

interface CapReq {
  capability: string;
  importance: string;
}

interface ModelRow {
  id: string;
  name: string;
  capability_requirements: CapReq[] | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== CONFIRM) return json({ error: "bad_confirm" }, 403);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

    try {
      const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
      const { data: allowed } = await supabase.rpc("consume_rate_limit", { p_key: `archvec:${ip}`, p_limit: RATE_LIMIT_PER_DAY });
      if (allowed === false) return json({ error: "rate_limited" }, 429);
    } catch { /* fail-open */ }

    const offset = Number.isInteger(body?.offset) && body.offset >= 0 ? body.offset : 0;
    const limit = Number.isInteger(body?.limit) && body.limit > 0 && body.limit <= 20 ? body.limit : DEFAULT_LIMIT;
    const force = body?.force === true;

    const { data: archetypes, error: aErr } = await supabase
      .from("kb_archetypes")
      .select("id, name, category, core_identity, capability_vector")
      .order("id")
      .range(offset, offset + limit - 1);
    if (aErr) return json({ error: "archetype_fetch_failed", detail: aErr.message }, 500);
    if (!archetypes || archetypes.length === 0) return json({ ok: true, processed: [], skipped: [], failures: [], next_offset: null, done: true });

    const targets = archetypes.filter((a) => force || !a.capability_vector);
    const skipped = archetypes.filter((a) => !force && a.capability_vector).map((a) => a.id as string);

    const archetypeIds = targets.map((a) => a.id as string);
    const { data: mappings } = archetypeIds.length
      ? await supabase.from("kb_mapping").select("archetype, model, cap_fit, avoid").in("archetype", archetypeIds)
      : { data: [] };
    const modelIds = Array.from(new Set((mappings || []).map((m) => m.model as string)));
    const { data: models } = modelIds.length
      ? await supabase.from("kb_models").select("id, name, capability_requirements").in("id", modelIds)
      : { data: [] };
    const modelIndex = new Map<string, ModelRow>();
    for (const m of models || []) modelIndex.set(m.id as string, m as unknown as ModelRow);

    const processed: string[] = [];
    const failures: { id: string; reason: string }[] = [];

    async function processOne(a: Record<string, unknown>): Promise<void> {
      const id = a.id as string;
      try {
        const rows = (mappings || []).filter((m) => m.archetype === id);
        const good = rows
          .filter((m) => !m.avoid && (m.cap_fit as number) >= 4)
          .sort((x, y) => (y.cap_fit as number) - (x.cap_fit as number))
          .slice(0, 6)
          .map((m) => modelIndex.get(m.model as string))
          .filter((m): m is ModelRow => !!m);
        const vetoed = rows
          .filter((m) => m.avoid)
          .slice(0, 4)
          .map((m) => modelIndex.get(m.model as string))
          .filter((m): m is ModelRow => !!m);

        const goodText = good.length
          ? good.map((m) => `- ${m.name}: requires ${(m.capability_requirements || []).map((r) => `${r.capability}(${r.importance})`).join(", ")}`).join("\n")
          : "- (none in the hand grid at cap_fit >= 4; judge from identity alone)";
        const vetoText = vetoed.length ? vetoed.map((m) => `- ${m.name}`).join("\n") : "- (none)";

        const user = `ARCHETYPE
Name: ${a.name}
Category: ${a.category}
Core identity: ${String(a.core_identity || "").slice(0, 900)}

WELL-MATCHED MODELS (hand grid, cap_fit >= 4):
${goodText}

VETOED MODELS (hand grid says avoid):
${vetoText}

CAPABILITY LIST (rate every one):
${SLUGS.map((s) => `${s}: ${CAPABILITIES[s]}`).join("\n")}`;

        const completion = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0.1,
          max_completion_tokens: 900,
          response_format: { type: "json_schema", json_schema: VECTOR_SCHEMA },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        });
        const parsed = JSON.parse(completion.choices[0].message.content || "{}") as { capabilities?: Record<string, string> };
        const vec: Record<string, string> = {};
        for (const s of SLUGS) {
          const v = parsed.capabilities?.[s];
          vec[s] = v === "strong" || v === "present" || v === "none" ? v : "none";
        }
        const strongCount = SLUGS.filter((s) => vec[s] === "strong").length;
        const presentCount = SLUGS.filter((s) => vec[s] === "present").length;

        // Hand-pair coverage: of the critical requirements of cap_fit>=4
        // models, what share does the vector hold at strong/present?
        let critTotal = 0;
        let critHeld = 0;
        for (const m of good) {
          for (const r of m.capability_requirements || []) {
            if (r.importance !== "critical") continue;
            critTotal += 1;
            if (vec[r.capability] === "strong" || vec[r.capability] === "present") critHeld += 1;
          }
        }
        const coverage = critTotal > 0 ? Math.round((critHeld / critTotal) * 100) / 100 : null;

        const { error: upErr } = await supabase
          .from("kb_archetypes")
          .update({
            capability_vector: vec,
            capability_vector_meta: {
              version: FUNCTION_VERSION,
              model: MODEL,
              generated_at: new Date().toISOString(),
              strong_count: strongCount,
              present_count: presentCount,
              hand_pairs_used: good.length,
              hand_critical_coverage: coverage,
              usage: completion.usage ?? null,
            },
          })
          .eq("id", id);
        if (upErr) throw new Error(`update: ${upErr.message}`);
        processed.push(id);
      } catch (e) {
        failures.push({ id, reason: String((e as Error)?.message ?? e).slice(0, 300) });
      }
    }

    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      await Promise.all(targets.slice(i, i + CONCURRENCY).map((a) => processOne(a as Record<string, unknown>)));
    }

    const nextOffset = archetypes.length === limit ? offset + limit : null;
    console.log(`${FUNCTION_VERSION}: offset=${offset} processed=${processed.length} skipped=${skipped.length} failures=${failures.length} next=${nextOffset}`);
    return json({ ok: true, processed, skipped, failures, next_offset: nextOffset, done: nextOffset === null });
  } catch (e) {
    console.error(`${FUNCTION_VERSION} error:`, e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
