// generate-asset — Asset Forge v1 (ADR-025 'Hands' layer, 2026-06-11)
// FUNCTION_VERSION: forge-v1.0
//
// Generates ONE piece of collateral (positioning one-pager, rate card, or
// LinkedIn About section) personalised from the caller's latest paid report:
// core_report archetype + editorial read, selected strands (or top options),
// questionnaire answers for seniority/sector/proof context. One gpt-5.4 call
// (quality is the product here), markdown out, persisted to forge_assets.
//
// verify_jwt: true — gateway-verified JWT; identity via supabase.auth.getUser
// (never inline decode for identity, per the 2026-06-10 security review).
// Service-role callers may pass test_user_id (eval/smoke bypass, same
// getJwtRole pattern as generate-plan); real users are always scoped to their
// own latest paid report.
// Cost guard: refuses if the same asset type was generated in the last 10 min.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
};

const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
const OPENAI_MODEL = "gpt-5.4";
const COOLDOWN_MS = 10 * 60 * 1000;

const VOICE_RULES =
  `Voice rules (hard): UK English. Direct, specific, commercially grounded. ` +
  `No motivational language, no hype words (passionate, journey, empower, leverage, unlock), ` +
  `no exclamation marks, no em dashes (use commas or full stops). ` +
  `Never invent credentials, employers, client names, statistics, qualifications or testimonials: ` +
  `use ONLY the facts provided. Write so a sceptical senior buyer nods rather than winces. ` +
  `Respond as JSON: {"title": "<short document title>", "content_md": "<the full document as markdown>"}.`;

const ASSET_SPECS: Record<string, { label: string; system: string }> = {
  one_pager: {
    label: "Positioning one-pager",
    system:
      `You write a positioning one-pager for a senior professional setting up independent work. ` +
      `Output content_md as MARKDOWN with these sections in order:\n` +
      `# A plain positioning line: who they are, for what work, max 12 words. No buzzwords.\n` +
      `Then one standalone sentence: the single problem they remove for buyers.\n` +
      `## Who I help — 2-3 sentences naming the buyer types from the chosen paths.\n` +
      `## The problem — 2-3 sentences stating the buyer's pain in commercial terms.\n` +
      `## The work — 3-5 bullets, each one engagement-shaped capability drawn from the archetype and chosen paths.\n` +
      `## Proof — 2-3 bullets grounded strictly in the achievement and capability facts provided. Specific, no embellishment.\n` +
      `## How an engagement starts — 2-3 bullets on typical shapes (scoped diagnostic, project, retained advisory) consistent with the pricing models in the chosen paths. No prices on the one-pager.\n` +
      `## Contact — exactly this placeholder line: [Your name] · [email] · [phone or LinkedIn]\n` +
      `Whole page under 350 words.\n` + VOICE_RULES,
  },
  rate_card: {
    label: "Rate card",
    system:
      `You write a rate card for a senior independent professional. Ground every number in the pricing ` +
      `bands provided from their own report. Do not exceed those bands; prefer the conservative end. ` +
      `UK market, GBP, sensible round numbers. Output content_md as MARKDOWN:\n` +
      `# Rate card\n` +
      `One-sentence intro stating the positioning in plain terms.\n` +
      `## Scoped diagnostic — a fixed-fee entry engagement: what it covers (2 sentences) and a fee range derived from the lower end of the report's project bands.\n` +
      `## Project work — what a typical project covers and the report's project fee ranges.\n` +
      `## Day rate — a defensible day-rate range derived from the bands and the seniority given, plus one sentence on what a day buys.\n` +
      `## Retained advisory — a monthly retainer range consistent with the bands, what it includes, and a suggested minimum term.\n` +
      `## Terms — 2-3 short bullets: payment terms, expenses, what changes the price.\n` +
      `End with the line: Rates reviewed quarterly. Fixed quotes on scoped work.\n` +
      `Under 300 words.\n` + VOICE_RULES,
  },
  linkedin_about: {
    label: "LinkedIn About",
    system:
      `You write a LinkedIn About section in the FIRST PERSON for this professional, built from the ` +
      `archetype's editorial read of where they are strongest. Short sentences. Concrete claims. ` +
      `No emojis. Do not name employers unless they appear in the facts and read naturally. ` +
      `Structure for content_md: open with the problem you solve (2 sentences), then where that strength ` +
      `comes from (2-3 sentences drawing on the editorial read and the achievement), then the work you ` +
      `take on (2-3 sentences naming the engagement types from the chosen paths), then one closing line ` +
      `inviting the right kind of message. 150-220 words. Plain markdown paragraphs only, NO headings ` +
      `(LinkedIn has none) and NO bullet lists.\n` + VOICE_RULES,
  },
};

// Role claim from a GATEWAY-VERIFIED JWT (verify_jwt:true upstream), so reading
// the payload here is safe. Same pattern as generate-plan's eval bypass.
function getJwtRole(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(
      atob(authHeader.slice(7).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role || null;
  } catch {
    return null;
  }
}

function fmtPricing(p: Record<string, unknown> | null | undefined): string {
  if (!p) return "no band given";
  const lo = typeof p.range_low_gbp === "number" ? `£${p.range_low_gbp.toLocaleString("en-GB")}` : null;
  const hi = typeof p.range_high_gbp === "number" ? `£${p.range_high_gbp.toLocaleString("en-GB")}` : null;
  const band = lo && hi ? `${lo} to ${hi}` : lo ?? hi ?? "no band given";
  return `${p.model ?? "project"} pricing, ${band}${p.cadence ? ` ${p.cadence}` : ""}`;
}

async function openaiJson(system: string, user: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
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
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const assetType = String(body.asset_type ?? "");
    const spec = ASSET_SPECS[assetType];
    if (!spec) {
      return json({ response_text: "Pick a valid asset type.", error: true }, 400);
    }

    // Identity. Service-role callers may act as a named test user (eval/smoke).
    let userId: string;
    if (getJwtRole(authHeader) === "service_role" && typeof body.test_user_id === "string") {
      userId = body.test_user_id;
    } else {
      const { data: userData, error: userErr } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (userErr || !userData?.user) {
        return json({ response_text: "Sign in to use the Forge." }, 401);
      }
      userId = userData.user.id;
    }

    // Cost guard: one generation per type per 10 minutes.
    const { data: recent } = await supabase
      .from("forge_assets")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("asset_type", assetType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < COOLDOWN_MS) {
      return json(
        {
          response_text:
            "You forged this one less than ten minutes ago. Give it a few minutes, then regenerate if you want a fresh take.",
          rate_limited: true,
        },
        429,
      );
    }

    // Latest paid report (same gate as the rest of the paid surface).
    const { data: report } = await supabase
      .from("reports")
      .select("id, status, core_report, selected_strands, answers, hook_insight")
      .eq("user_id", userId)
      .in("status", PAID_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report) {
      return json(
        { response_text: "The Forge unlocks with your report.", gated: true },
        403,
      );
    }

    // Assemble the personalisation context.
    const core = (report.core_report ?? {}) as Record<string, any>;
    const arch = (core.archetype ?? {}) as Record<string, any>;
    const answers = (report.answers ?? {}) as Record<string, string>;

    type Opt = Record<string, any>;
    let strandOpts: Opt[] = [];
    if (Array.isArray(report.selected_strands) && report.selected_strands.length > 0) {
      strandOpts = (report.selected_strands as Opt[])
        .map((s) => (s && typeof s === "object" && s.option ? s.option : s))
        .filter(Boolean);
    }
    if (strandOpts.length === 0 && Array.isArray(core.options)) {
      strandOpts = (core.options as Opt[]).slice(0, 3);
    }
    const strandLines = strandOpts.slice(0, 5).map((o, i) =>
      `${i + 1}. ${o.model_name ?? "Unnamed path"} | buyer: ${String(o.target_buyer ?? "").slice(0, 160)} | ` +
      `they are buying: ${String(o.what_they_are_buying ?? "").slice(0, 200)} | ` +
      `pricing: ${fmtPricing(o.pricing)} | positioning: ${String(o.positioning ?? "").slice(0, 280)}`
    );

    const context = [
      `CURRENT ROLE: ${answers["1"] ?? "not given"}`,
      `EXPERIENCE: ${answers["2"] ?? "not given"}`,
      `SECTOR / ORGANISATION TYPE: ${[answers["3"], answers["3a"], answers["3b"]].filter(Boolean).join("; ") || "not given"}`,
      `PROUDEST ACHIEVEMENT (their own words): ${answers["6"] ?? "not given"}`,
      `ARCHETYPE: ${arch.primary ?? "not given"}${arch.secondary ? ` (secondary: ${arch.secondary})` : ""}`,
      `ARCHETYPE SUMMARY: ${String(arch.summary ?? "").slice(0, 900)}`,
      `EDITORIAL READ: ${String(arch.editorial_description ?? "").slice(0, 900)}`,
      `CAPABILITY TAGS: ${Array.isArray(arch.capability_tags) ? arch.capability_tags.join(", ") : "none"}`,
      `HOOK INSIGHT FROM THEIR REPORT: ${String(report.hook_insight ?? "").slice(0, 500)}`,
      `CHOSEN PATHS (from their report):\n${strandLines.join("\n") || "none recorded"}`,
    ].join("\n\n");

    // One quality-tier LLM call.
    const out = await openaiJson(spec.system, context);
    let title = String(out.title ?? spec.label).trim().slice(0, 140) || spec.label;
    let content = String(out.content_md ?? "").trim();
    if (!content) throw new Error("model returned empty content_md");
    // Em-dash strip at source (WP6 discipline; prompt asks, code enforces).
    content = content.replace(/\s*—\s*/g, ", ");
    title = title.replace(/\s*—\s*/g, ", ");

    const { data: row, error: insErr } = await supabase
      .from("forge_assets")
      .insert({
        user_id: userId,
        asset_type: assetType,
        title,
        content_md: content,
        source_report_id: report.id,
      })
      .select("id, asset_type, title, content_md, source_report_id, created_at")
      .single();
    if (insErr) throw new Error("insert failed: " + insErr.message);

    console.log(`generate-asset: ${assetType} forged for ${userId} from report ${report.id} (${content.length} chars)`);
    return json({ response_text: `${spec.label} forged.`, asset: row });
  } catch (e) {
    console.error("generate-asset error:", e);
    return json(
      { response_text: "The Forge couldn't finish that just now. Try again in a minute.", error: true },
      500,
    );
  }
});
