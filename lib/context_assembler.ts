// lib/context_assembler.ts
//
// WP4 — Ask Solo context assembly. The compound-context-over-time moat.
// Design: admin/wp4-context-assembly-design-2026-05-31.md.
//
// Single chokepoint for user-state assembly: no edge function pulls user state
// directly after this lands (mirrors the llm_client rule). P8 (guidance) and P9
// (Ask Solo) both consume the typed UserContext, not a free-form object.
//
// HARD INVARIANT: total assembled context <= 8,000 tokens for any user at any
// subscription month. Held via per-section token budgets + summary-fallback
// (drop whole oldest items / clip at boundaries — never truncate mid-content).
// The time-growing sections (checkins / advisory / topic history) are the ones
// that compress; the always-on sections (profile / archetype / model / plan) fit
// comfortably. Heavy summarisation of old check-ins is the nightly cron's job
// (§4.3); this module's fallback is cheap deterministic compression, no per-call LLM.
//
// Salience (§4.4): when a question is supplied (Ask Solo), embed it and pull the
// top-5 most similar prior check-ins / advisory sessions from context_embeddings
// via the match_context_embeddings RPC into topic_relevant_history.

import { embed, toPgVector } from "./llm_client.ts";

// ~4 chars/token is the standard rough proxy; good enough for budgeting.
export function estTokens(s: string): number {
  return Math.ceil((s?.length ?? 0) / 4);
}

export const SECTION_BUDGETS: Record<string, number> = {
  profile_summary: 700,
  archetype_block: 700,
  selected_model_block: 700,
  plan_state: 1100,
  running_narrative: 900,
  recent_checkins: 1400,
  prior_advisory_sessions: 700,
  open_questions: 300,
  topic_relevant_history: 1000,
};
export const HARD_CAP_TOKENS = 8000;

export interface UserContext {
  profile_summary: string;
  archetype_block: string;
  selected_model_block: string;
  plan_state: string;
  running_narrative: string;
  recent_checkins: string;
  prior_advisory_sessions: string;
  open_questions: string;
  topic_relevant_history: string;
}

export interface SectionLog {
  section: string;
  tokens: number;
  budget: number;
  compressed: boolean;
}

export interface AssembleResult {
  context: UserContext;
  rendered: string;
  sections_log: SectionLog[];
  total_tokens: number;
  within_cap: boolean;
}

type SB = {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

/** Clip a text block to a token budget at a paragraph/sentence boundary. */
function clipToBudget(text: string, budgetTokens: number): { text: string; compressed: boolean } {
  if (estTokens(text) <= budgetTokens) return { text, compressed: false };
  const charBudget = budgetTokens * 4;
  let cut = text.slice(0, charBudget);
  const lastBreak = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(". "));
  if (lastBreak > charBudget * 0.5) cut = cut.slice(0, lastBreak + 1);
  return { text: cut.trimEnd() + "\n[…older detail summarised in running_narrative]", compressed: true };
}

/** Add list items (newest-first) until the budget is hit; drop the rest whole. */
function packItems(items: string[], budgetTokens: number): { text: string; compressed: boolean } {
  const kept: string[] = [];
  let used = 0;
  let dropped = 0;
  for (const item of items) {
    const t = estTokens(item) + 1;
    if (used + t <= budgetTokens) {
      kept.push(item);
      used += t;
    } else {
      dropped++;
    }
  }
  let text = kept.join("\n");
  if (dropped > 0) text += `\n[${dropped} older item(s) omitted — see running_narrative]`;
  return { text, compressed: dropped > 0 };
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

export async function assembleUserContext(args: {
  supabase: SB;
  api_key: string;
  user_id: string;
  question?: string;
  function_name?: string;
}): Promise<AssembleResult> {
  const { supabase, user_id } = args;

  // ---- Fetch sources in parallel ----
  const [reportRes, trackerRes, checkinRes, advisoryRes, profileRes] = await Promise.all([
    supabase.from("reports").select("answers, core_report, ai_impact_section, recommended_selection, selected_strands, user_context_profile, created_at")
      .eq("user_id", user_id).not("core_report", "is", null).order("created_at", { ascending: false }).limit(1),
    supabase.from("tracker_sessions").select("working_plan, running_narrative, current_day, strand_status, tasks_completed, tasks_total")
      .eq("user_id", user_id).order("created_at", { ascending: false }).limit(1),
    supabase.from("checkin_history").select("id, day_number, state, narrative_addition, exchanges, created_at")
      .eq("user_id", user_id).order("day_number", { ascending: false }).limit(10),
    supabase.from("advisory_conversation_summaries").select("summary, significant_decisions, key_topics, created_at")
      .eq("user_id", user_id).order("created_at", { ascending: false }).limit(6),
    supabase.from("user_profiles").select("cv_extract").eq("user_id", user_id).limit(1),
  ]);

  const report = reportRes.data?.[0] ?? null;
  const tracker = trackerRes.data?.[0] ?? null;
  const checkins = (checkinRes.data ?? []) as any[];
  const advisory = (advisoryRes.data ?? []) as any[];
  const profile = profileRes.data?.[0] ?? null;

  // ---- Build raw section text ----
  const core = (report?.core_report ?? {}) as Record<string, any>;

  const profileRaw = (() => {
    const ucp = report?.user_context_profile;
    if (ucp) return typeof ucp === "string" ? ucp : JSON.stringify(ucp, null, 1);
    const a = (report?.answers ?? {}) as Record<string, string>;
    const cv = profile?.cv_extract as Record<string, any> | null;
    const lines = [
      a["1"] ? `Role: ${a["1"]}` : "",
      a["2"] ? `Experience: ${a["2"]}` : "",
      a["3"] ? `Sector: ${a["3"]}` : "",
      a["3b"] || a["30"] ? `Employer type: ${a["3b"] || a["30"]}` : "",
      a["5"] ? `Seniority: ${a["5"]}` : "",
      a["6"] ? `Signature achievement: ${a["6"]}` : "",
      a["11"] ? `Client context: ${a["11"]}` : "",
      a["12"] ? `Independent experience: ${a["12"]}` : "",
      a["13"] ? `Network: ${a["13"]}` : "",
      cv?.qualifications ? `Qualifications: ${safeStr(cv.qualifications)}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  })();

  const archetypeRaw = (() => {
    const arch = core.archetype ?? core.archetype_classification ?? null;
    const ai = report?.ai_impact_section;
    const parts = [arch ? `Archetype: ${safeStr(arch)}` : "", ai ? `AI impact: ${safeStr(ai)}` : ""].filter(Boolean);
    return parts.join("\n");
  })();

  const modelRaw = (() => {
    const sel = report?.recommended_selection ?? report?.selected_strands ?? null;
    if (sel) return `Selected direction(s):\n${safeStr(sel)}`;
    const opts = Array.isArray(core.options) ? core.options : [];
    const rec = core.recommendation?.recommended_rank;
    const chosen = opts.find((o: any) => Number(o.rank) === Number(rec)) ?? opts[0];
    return chosen ? `Recommended model: ${safeStr(chosen.model_name ?? chosen)}` : "";
  })();

  const planRaw = (() => {
    const wp = tracker?.working_plan;
    const head = tracker
      ? `Day ${tracker.current_day ?? "?"} of 30. Tasks ${tracker.tasks_completed ?? 0}/${tracker.tasks_total ?? "?"} complete.`
      : "No active plan.";
    const strand = tracker?.strand_status ? `Strand status: ${safeStr(tracker.strand_status)}` : "";
    return [head, strand, wp ? `Working plan: ${safeStr(wp)}` : ""].filter(Boolean).join("\n");
  })();

  const narrativeRaw = safeStr(tracker?.running_narrative);

  const checkinItems = checkins.map((c) => {
    const note = c.narrative_addition || "";
    const exchanges = Array.isArray(c.exchanges)
      ? c.exchanges.map((e: any) => safeStr(e?.user ?? e?.text ?? e)).join(" ")
      : "";
    const body = (note || exchanges).slice(0, 600);
    return `Day ${c.day_number} (${c.state ?? "?"}): ${body}`;
  });

  const advisoryItems = advisory.map((s) => {
    const decisions = s.significant_decisions ? ` Decisions: ${s.significant_decisions}` : "";
    return `- ${safeStr(s.summary).slice(0, 500)}${decisions}`;
  });

  // ---- Salience retrieval (Ask Solo only) ----
  let topicRaw = "";
  if (args.question && args.question.trim()) {
    try {
      const qvec = await embed({ api_key: args.api_key, text: args.question });
      const { data: matches, error } = await supabase.rpc("match_context_embeddings", {
        p_user_id: user_id,
        p_query_embedding: toPgVector(qvec),
        p_match_count: 5,
      });
      if (!error && Array.isArray(matches) && matches.length) {
        // Resolve matched source rows to text.
        const lines: string[] = [];
        for (const m of matches) {
          if (m.source_table === "checkin_history") {
            const { data } = await supabase.from("checkin_history")
              .select("day_number, narrative_addition").eq("id", m.source_id).limit(1);
            const row = data?.[0];
            if (row) lines.push(`(relevant) Day ${row.day_number}: ${safeStr(row.narrative_addition).slice(0, 500)}`);
          } else if (m.source_table === "advisory_conversation_summaries") {
            const { data } = await supabase.from("advisory_conversation_summaries")
              .select("summary").eq("id", m.source_id).limit(1);
            const row = data?.[0];
            if (row) lines.push(`(relevant prior discussion) ${safeStr(row.summary).slice(0, 500)}`);
          }
        }
        topicRaw = lines.join("\n");
      }
    } catch (e) {
      // Salience is best-effort; an embedding/RPC failure must not break assembly.
      console.warn("[context_assembler] salience retrieval failed (non-fatal):", (e as Error)?.message ?? e);
    }
  }

  // ---- Apply budgets ----
  const sections_log: SectionLog[] = [];
  const out: Record<string, string> = {};

  const textSection = (name: string, raw: string) => {
    const { text, compressed } = clipToBudget(raw, SECTION_BUDGETS[name]);
    out[name] = text;
    sections_log.push({ section: name, tokens: estTokens(text), budget: SECTION_BUDGETS[name], compressed });
  };
  const listSection = (name: string, items: string[]) => {
    const { text, compressed } = packItems(items, SECTION_BUDGETS[name]);
    out[name] = text;
    sections_log.push({ section: name, tokens: estTokens(text), budget: SECTION_BUDGETS[name], compressed });
  };

  textSection("profile_summary", profileRaw);
  textSection("archetype_block", archetypeRaw);
  textSection("selected_model_block", modelRaw);
  textSection("plan_state", planRaw);
  textSection("running_narrative", narrativeRaw);
  listSection("recent_checkins", checkinItems);
  listSection("prior_advisory_sessions", advisoryItems);
  out["open_questions"] = ""; // derived elsewhere; reserved
  sections_log.push({ section: "open_questions", tokens: 0, budget: SECTION_BUDGETS.open_questions, compressed: false });
  textSection("topic_relevant_history", topicRaw);

  // ---- Enforce hard cap: if over, compress time-growing sections further ----
  const compressOrder = ["topic_relevant_history", "prior_advisory_sessions", "recent_checkins", "running_narrative", "plan_state"];
  let total = sections_log.reduce((a, s) => a + s.tokens, 0);
  for (const name of compressOrder) {
    if (total <= HARD_CAP_TOKENS) break;
    const log = sections_log.find((s) => s.section === name)!;
    const over = total - HARD_CAP_TOKENS;
    const newBudget = Math.max(0, log.tokens - over);
    const { text } = clipToBudget(out[name], newBudget);
    total -= log.tokens;
    out[name] = text;
    log.tokens = estTokens(text);
    log.compressed = true;
    total += log.tokens;
  }

  const context: UserContext = {
    profile_summary: out.profile_summary,
    archetype_block: out.archetype_block,
    selected_model_block: out.selected_model_block,
    plan_state: out.plan_state,
    running_narrative: out.running_narrative,
    recent_checkins: out.recent_checkins,
    prior_advisory_sessions: out.prior_advisory_sessions,
    open_questions: out.open_questions,
    topic_relevant_history: out.topic_relevant_history,
  };

  const rendered = (Object.keys(context) as (keyof UserContext)[])
    .filter((k) => context[k] && context[k].trim())
    .map((k) => `## ${k}\n${context[k]}`)
    .join("\n\n");

  const within_cap = total <= HARD_CAP_TOKENS;

  // ---- Observability: log section sizes to public.events (best-effort) ----
  try {
    await supabase.from("events").insert({
      event_type: "context_assembled",
      user_id,
      payload: {
        function_name: args.function_name ?? null,
        total_tokens: total,
        within_cap,
        had_question: Boolean(args.question && args.question.trim()),
        sections: sections_log,
      },
    });
  } catch (e) {
    console.warn("[context_assembler] events log failed (non-fatal):", (e as Error)?.message ?? e);
  }

  return { context, rendered, sections_log, total_tokens: total, within_cap };
}
