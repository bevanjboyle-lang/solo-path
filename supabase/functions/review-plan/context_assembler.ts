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
// that compress; the always-on sections (profile / archetype / model / strands /
// modules / plan) fit comfortably. Heavy summarisation of old check-ins is the
// nightly cron's job (§4.3); this module's fallback is cheap deterministic
// compression, no per-call LLM.
//
// Salience (§4.4): when a question is supplied (Ask Solo), embed it and pull the
// top-5 most similar prior check-ins / advisory sessions from context_embeddings
// via the match_context_embeddings RPC into topic_relevant_history.
//
// 2026-06-01 (WP4 wiring — "extend then full swap"): extended to fully replace
// ask-solo's assembleContextBlock without quality loss. Added active_strands
// (ADR-007 Making Moves move_type/warmth_type per strand + live status),
// completed_modules, and a fuller selected_model_block. Grounded against real
// data: questionnaire answers live in reports.answers (numeric keys 1..15 + 3b +
// 30) — the old questionnaire_responses read was dead (0 rows); strand move
// metadata lives in reports.selected_strands (rich objects), live status in
// tracker_sessions.strand_status keyed by strand_id; module outputs are in
// guidance_module_completions.output (the old ai_output column does not exist).

import { embed, toPgVector } from "./llm_client.ts";

// ~4 chars/token is the standard rough proxy; good enough for budgeting.
export function estTokens(s: string): number {
  return Math.ceil((s?.length ?? 0) / 4);
}

// Budgets sum to ~7,550 (< 8,000 hard cap) so the always-on sections fit with
// headroom; the cap-enforcement loop compresses the time-growing sections if a
// long-running user's actual content pushes the rendered total over 8,000.
export const SECTION_BUDGETS: Record<string, number> = {
  profile_summary: 650,
  archetype_block: 550,
  selected_model_block: 700,
  active_strands: 850,
  completed_modules: 600,
  plan_state: 800,
  running_narrative: 700,
  recent_checkins: 1000,
  prior_advisory_sessions: 600,
  open_questions: 250,
  topic_relevant_history: 850,
};
export const HARD_CAP_TOKENS = 8000;

export interface UserContext {
  profile_summary: string;
  archetype_block: string;
  selected_model_block: string;
  active_strands: string;
  completed_modules: string;
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
  const [reportRes, trackerRes, checkinRes, advisoryRes, profileRes, modulesRes] = await Promise.all([
    supabase.from("reports").select(
      "answers, core_report, ai_impact_section, recommended_selection, selected_strands, user_context_profile, hook_insight, created_at",
    ).eq("user_id", user_id).not("core_report", "is", null).order("created_at", { ascending: false }).limit(1),
    supabase.from("tracker_sessions").select(
      "working_plan, running_narrative, current_day, strand_status, focus_strands, tasks_completed, tasks_total, plan_state, last_checkin_date, activated_at, narrative_summarised_through_day",
    ).eq("user_id", user_id).order("created_at", { ascending: false }).limit(1),
    supabase.from("checkin_history").select("id, day_number, state, narrative_addition, exchanges, created_at")
      .eq("user_id", user_id).order("day_number", { ascending: false }).limit(10),
    supabase.from("advisory_conversation_summaries").select("summary, significant_decisions, key_topics, created_at")
      .eq("user_id", user_id).order("created_at", { ascending: false }).limit(6),
    supabase.from("user_profiles").select("cv_extract").eq("user_id", user_id).limit(1),
    supabase.from("guidance_module_completions").select("module_id, module_name, output")
      .eq("user_id", user_id).order("module_id", { ascending: true }),
  ]);

  const report = reportRes.data?.[0] ?? null;
  const tracker = trackerRes.data?.[0] ?? null;
  // §4.3: drop check-ins already folded into running_narrative by the nightly cron.
  const summarisedThrough = Number(tracker?.narrative_summarised_through_day ?? 0) || 0;
  const checkins = ((checkinRes.data ?? []) as any[]).filter(
    (c) => Number(c.day_number ?? 0) > summarisedThrough,
  );
  const advisory = (advisoryRes.data ?? []) as any[];
  const profile = profileRes.data?.[0] ?? null;
  const modules = (modulesRes.data ?? []) as any[];

  // ---- Build raw section text ----
  const core = (report?.core_report ?? {}) as Record<string, any>;
  const answers = (report?.answers ?? {}) as Record<string, string>;

  const profileRaw = (() => {
    const ucp = report?.user_context_profile;
    const cv = profile?.cv_extract as Record<string, any> | null;
    const lines = [
      answers["1"] ? `Role: ${answers["1"]}` : "",
      answers["2"] ? `Experience: ${answers["2"]}` : "",
      answers["3"] ? `Sector (Q3a): ${answers["3"]}` : "",
      answers["3b"] || answers["30"] ? `Employer/org type (Q3b): ${answers["3b"] || answers["30"]}` : "",
      answers["4"] ? `Work type (Q4): ${answers["4"]}` : "",
      answers["5"] ? `Seniority (Q5): ${answers["5"]}` : "",
      answers["6"] ? `Signature achievement (Q6): ${answers["6"]}` : "",
      answers["7"] ? `Informal advisory (Q7): ${answers["7"]}` : "",
      answers["8"] ? `Peer perception (Q8): ${answers["8"]}` : "",
      answers["9"] ? `Income urgency (Q9): ${answers["9"]}` : "",
      answers["10"] ? `Independence confidence (Q10): ${answers["10"]}` : "",
      answers["11"] ? `Sector/client context (Q11): ${answers["11"]}` : "",
      answers["12"] ? `Independent experience (Q12): ${answers["12"]}` : "",
      answers["13"] ? `Network (Q13): ${answers["13"]}` : "",
      answers["14"] ? `Employment status (Q14): ${answers["14"]}` : "",
      answers["15"] ? `Location (Q15): ${answers["15"]}` : "",
      cv?.qualifications ? `Qualifications: ${safeStr(cv.qualifications)}` : "",
    ].filter(Boolean);
    let block = lines.join("\n");
    // If a curated user_context_profile exists, prepend its summary as the lead.
    if (ucp) {
      const ucpStr = typeof ucp === "string" ? ucp : safeStr((ucp as any).summary ?? ucp);
      if (ucpStr) block = `${ucpStr}\n${block}`;
    }
    return block;
  })();

  const archetypeRaw = (() => {
    const arch = core.archetype ?? core.archetype_classification ?? null;
    const parts: string[] = [];
    if (arch && typeof arch === "object") {
      if (arch.primary) parts.push(`Primary archetype: ${safeStr(arch.primary)}`);
      if (arch.secondary) parts.push(`Secondary archetype: ${safeStr(arch.secondary)}`);
      if (arch.summary) parts.push(`Archetype summary: ${safeStr(arch.summary)}`);
    } else if (arch) {
      parts.push(`Archetype: ${safeStr(arch)}`);
    }
    const ai = report?.ai_impact_section;
    if (ai) {
      const aiStr = typeof ai === "object" ? safeStr((ai as any).summary ?? ai) : safeStr(ai);
      if (aiStr) parts.push(`AI impact: ${aiStr}`);
    }
    return parts.join("\n");
  })();

  // Rich selected strands (ADR-007 Making Moves). reports.selected_strands carries
  // per-strand model + move_type + warmth_type + embedded option detail.
  const selectedStrands = Array.isArray(report?.selected_strands) ? (report!.selected_strands as any[]) : [];
  const strandStatus = (tracker?.strand_status ?? {}) as Record<string, any>;

  const modelRaw = (() => {
    // Prefer the rank-1 selected strand's embedded option; fall back to core_report options.
    const ranked = [...selectedStrands].sort((a, b) => Number(a.rank ?? 99) - Number(b.rank ?? 99));
    const top = ranked[0];
    const opt = top?.option ?? null;
    const parts: string[] = [];
    if (opt) {
      parts.push(`Recommended model: ${safeStr(opt.model_name ?? top.model_name)}`);
      if (opt.positioning) parts.push(`Positioning: ${safeStr(opt.positioning)}`);
      if (opt.target_buyer) parts.push(`Target buyer: ${safeStr(opt.target_buyer)}`);
      if (opt.day_rate_band) parts.push(`Day-rate band: ${safeStr(opt.day_rate_band)}`);
      if (opt.time_to_first_revenue) parts.push(`Time to first revenue: ${safeStr(opt.time_to_first_revenue)}`);
      if (opt.why_this_works_for_them) parts.push(`Why it works: ${safeStr(opt.why_this_works_for_them)}`);
    } else {
      const opts = Array.isArray(core.options) ? core.options : [];
      const rec = core.recommendation?.recommended_rank;
      const chosen = opts.find((o: any) => Number(o.rank) === Number(rec)) ?? opts[0];
      if (chosen) parts.push(`Recommended model: ${safeStr(chosen.model_name ?? chosen)}`);
    }
    const rc = (core.reality_check ?? {}) as Record<string, any>;
    if (rc.most_likely_failure_mode) parts.push(`Most likely failure mode: ${safeStr(rc.most_likely_failure_mode)}`);
    if (rc.honest_income_outlook) parts.push(`Honest income outlook: ${safeStr(rc.honest_income_outlook)}`);
    if (report?.hook_insight) parts.push(`Hook insight: ${safeStr(report.hook_insight)}`);
    return parts.join("\n");
  })();

  // active_strands: per-strand move type + warmth + live status. Drives the P9
  // system prompt's move-type-aware interpretation of "no traction".
  const strandItems = selectedStrands.map((s) => {
    const sid = s.strand_id ?? s.business_model_id ?? null;
    const status = (sid && strandStatus[sid]) ? strandStatus[sid] : {};
    const moveType = s.primary_move_type ?? s.option?.primary_move_type ?? "direct";
    const warmth = s.warmth_type ?? ((s.structural_warmth ?? s.option?.structural_warmth) ? "structural" : "relational");
    const st = status.status ?? status.strand_status ?? "active";
    const note = status.last_progress_note ? ` Last note: ${safeStr(status.last_progress_note)}.` : "";
    const buyer = s.option?.target_buyer ? ` Buyer: ${safeStr(s.option.target_buyer)}.` : "";
    return `- ${safeStr(s.model_name ?? s.option?.model_name)} (move: ${moveType}; warmth: ${warmth}; status: ${st}).${buyer}${note}`;
  });

  const moduleItems = modules.map((m) => {
    const out = m.output;
    let summary = "";
    if (out && typeof out === "object") {
      summary = safeStr((out as any).summary ?? (out as any).headline ?? out).slice(0, 400);
    } else {
      summary = safeStr(out).slice(0, 400);
    }
    return `- Module ${m.module_id} (${safeStr(m.module_name)}): ${summary}`;
  });

  const planRaw = (() => {
    const wp = tracker?.working_plan;
    const head = tracker
      ? `Day ${tracker.current_day ?? "?"} of 30. Tasks ${tracker.tasks_completed ?? 0}/${tracker.tasks_total ?? "?"} complete.${tracker.plan_state ? ` Plan state: ${safeStr(tracker.plan_state)}.` : ""}`
      : "No active plan.";
    return [head, wp ? `Working plan: ${safeStr(wp)}` : ""].filter(Boolean).join("\n");
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
  listSection("active_strands", strandItems);
  listSection("completed_modules", moduleItems);
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
    active_strands: out.active_strands,
    completed_modules: out.completed_modules,
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
