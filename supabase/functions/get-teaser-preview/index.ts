// get-teaser-preview v1 (2026-08-18, Blueprint Move 5)
//
// WHY THIS EXISTS. Until today the teaser page selected the FULL core_report
// (plus ai_impact_section, hook_insight, activation_plan, market_snapshots)
// into the unpaid browser, then rendered hard-coded fictional sample content
// behind the blur. Two defects in one: the paywall was only a rendering
// choice (all paid content readable in devtools pre-payment), and the buyer
// was shown someone else's fake locked content at the moment of decision.
//
// This function is the new single source for everything /teaser renders:
//   free  -> a server-sanitised core_report subset (the legitimate free zone:
//            archetype, transferable value, skills, all 10 options, the hook
//            HEADLINE with only the opening words of the paragraph, per bible
//            §7d: headline free, paragraph paid; first_move stripped).
//   locked_preview -> the user's REAL recommendation, reality check, income
//            outlook, AI impact and first move, redacted server-side: opening
//            words only, masked word-counts for the remainder, and income
//            bars as fractions of the max with no absolute numbers. Nothing
//            sensitive ever reaches the client.
//
// Paired migration `teaser_preview_column_privileges` revokes anon SELECT on
// the sensitive report columns, so the old leak path is closed at the
// database, not just in the page code.
//
// verify_jwt=false (anonymous funnel surface). The report UUID acts as the
// capability token, matching the existing anonymous-select trust model.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FUNCTION_VERSION = "v1-real-redacted-teaser";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** First N words of a string, trimmed; empty-safe. */
function openingWords(s: unknown, n: number): string {
  if (typeof s !== "string") return "";
  const words = s.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, n).join(" ");
}

/** How many words remain beyond the shown opening (drives mask-bar count). */
function maskedWordCount(s: unknown, shown: string): number {
  if (typeof s !== "string") return 0;
  const total = s.trim().split(/\s+/).filter(Boolean).length;
  const visible = shown ? shown.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(0, total - visible);
}

function redactField(s: unknown, showWords: number) {
  const opening = openingWords(s, showWords);
  return { opening, masked_words: maskedWordCount(s, opening) };
}

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = (await req.json().catch(() => ({}))) as { report_id?: string };
    const reportId = body?.report_id;
    if (!reportId || !/^[0-9a-f-]{36}$/i.test(reportId)) {
      return json({ error: "report_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error } = await supabase
      .from("reports")
      .select("id, status, core_report, answers")
      .eq("id", reportId)
      .maybeSingle();

    if (error) {
      console.error(`${FUNCTION_VERSION} fetch error:`, error.message);
      return json({ error: "fetch_failed" }, 500);
    }
    if (!row) return json({ error: "not_found" }, 404);

    const core = (row.core_report ?? {}) as Any;
    const answers = (row.answers ?? {}) as Any;

    // ── The free zone, sanitised server-side ────────────────────────────────
    const hook = core?.hook_insight ?? {};
    const paragraphOpening = openingWords(hook?.paragraph, 12);
    const free_core = {
      archetype: core?.archetype ?? null,
      transferable_value: core?.transferable_value ?? null,
      transferable_skills: core?.transferable_skills ?? null,
      options: core?.options ?? [],
      hook_insight: {
        headline: hook?.headline ?? "",
        // Bible §7d: the headline is free; the full paragraph is paid.
        paragraph: paragraphOpening,
        paragraph_masked_words: maskedWordCount(hook?.paragraph, paragraphOpening),
        // first_move deliberately absent pre-payment.
      },
    };

    // ── The locked preview: real content, redacted here, never client-side ──
    const rec = core?.recommendation ?? null;
    const options: Any[] = Array.isArray(core?.options) ? core.options : [];
    const leadOption =
      options.find((o) => o?.rank === rec?.recommended_rank) ?? options[0] ?? null;

    const reality = core?.reality_check ?? null;
    const income = core?.income_outlook ?? null;

    const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);
    const yearRows = income
      ? (["year_1", "year_2", "year_3"] as const).map((k, i) => {
          const y = (income as Any)[k] ?? {};
          return {
            label: `Year ${i + 1}`,
            low: num(y.low_gbp ?? y.low),
            mid: num(y.mid_gbp ?? y.mid),
            high: num(y.high_gbp ?? y.high),
          };
        })
      : [];
    const maxHigh = Math.max(1, ...yearRows.map((y) => y.high));
    // Fractions only: the real shape of their earnings curve, no absolutes.
    const income_preview = yearRows.map((y) => ({
      label: y.label,
      low_frac: Math.round((y.low / maxHigh) * 100) / 100,
      mid_frac: Math.round((y.mid / maxHigh) * 100) / 100,
      high_frac: Math.round((y.high / maxHigh) * 100) / 100,
    }));

    const ai = core?.ai_impact ?? null;
    const firstMove = hook?.first_move ?? null;

    const locked_preview = {
      recommendation: rec
        ? {
            lead_option_name: leadOption?.model_name ?? null, // option names are already free
            rationale: redactField(rec.rationale, 9),
            key_condition: redactField(rec.key_condition, 5),
          }
        : null,
      reality_check: reality
        ? {
            most_likely_failure_mode: redactField(reality.most_likely_failure_mode, 7),
            honest_income_outlook: redactField(reality.honest_income_outlook, 6),
          }
        : null,
      income_outlook: income
        ? {
            primary_option_name: leadOption?.model_name ?? null,
            years: income_preview,
            sensitivity: redactField(income.sensitivity_factors, 6),
          }
        : null,
      ai_impact: ai
        ? {
            displacement_risk: ai?.part_1?.displacement_risk ?? null, // one real signal, free
            risk_horizon_masked_words: maskedWordCount(ai?.part_1?.risk_horizon, ""),
            part_1: redactField(ai?.part_1?.content, 8),
            part_2: redactField(ai?.part_2?.content, 0),
            adaptation_steps: Array.isArray(ai?.part_3?.steps) ? ai.part_3.steps.length : 0,
          }
        : null,
      first_move: firstMove
        ? {
            has_named_target: Boolean(firstMove.target),
            action: redactField(firstMove.action, 4),
            window: "24 hours",
            draft_ready: Boolean(firstMove.draft_body),
          }
        : null,
    };

    return json({
      version: FUNCTION_VERSION,
      status: row.status,
      first_name:
        (typeof answers?.first_name === "string" && answers.first_name) ||
        (typeof answers?.email_first_name === "string" && answers.email_first_name) ||
        null,
      free_core,
      locked_preview,
    });
  } catch (err) {
    console.error(`${FUNCTION_VERSION} error:`, err);
    return json({ error: "internal" }, 500);
  }
});
