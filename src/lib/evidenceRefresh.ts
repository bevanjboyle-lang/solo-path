/*
 * evidenceRefresh — Phase D (blueprint Move 4), 2026-08-18.
 *
 * Client access to report_evidence_refresh, the weekly-heartbeat function's
 * append-only Monday overlay. One row per (report, week): fresh radar
 * evidence per option, plus the per-user heartbeat (strand matches and a
 * market note) when the user has an active tracker.
 *
 * RLS lets an authed user select rows for reports they own; the fetch
 * never throws (a dossier without a refresh row simply renders as it did
 * before Phase D).
 */
import { supabase } from "@/integrations/supabase/client";
import type { SoloCoreReport } from "@/types/canonical";

export type OptionEvidenceItem = NonNullable<
  SoloCoreReport["options"][number]["evidence"]
>[number];

export interface HeartbeatMatch {
  id?: string;
  is_new?: boolean;
  title?: string;
  summary?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  buyer?: string | null;
  value_text?: string | null;
  deadline?: string | null;
  week_start?: string | null;
  url?: string | null;
  category?: string | null;
}

export interface Heartbeat {
  tracker_session_id?: string;
  strand_names?: string[];
  strand_matches?: HeartbeatMatch[];
  market_note?: string;
  market_note_source?: "model" | "deterministic";
  generated_at?: string;
}

export interface EvidenceRefresh {
  weekStart: string;
  createdAt: string | null;
  /** Evidence rows keyed by option rank (as a string). */
  byOption: Record<string, OptionEvidenceItem[]>;
  heartbeat: Heartbeat | null;
}

interface RawRefreshRow {
  week_start: string;
  created_at: string | null;
  evidence_by_option: Record<
    string,
    { business_model_id?: string | null; evidence?: OptionEvidenceItem[] }
  > | null;
  heartbeat: Heartbeat | null;
}

/** Latest refresh row for a report, flattened for rendering. Null when no
 *  refresh exists, on error, or when the shape is unusable. */
export async function fetchLatestEvidenceRefresh(
  reportId: string,
): Promise<EvidenceRefresh | null> {
  try {
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (supabase as any)
      .from("report_evidence_refresh")
      .select("week_start, created_at, evidence_by_option, heartbeat")
      .eq("report_id", reportId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as RawRefreshRow;
    if (!row.week_start || !row.evidence_by_option) return null;
    const byOption: Record<string, OptionEvidenceItem[]> = {};
    for (const [rank, group] of Object.entries(row.evidence_by_option)) {
      if (group && Array.isArray(group.evidence) && group.evidence.length > 0) {
        byOption[rank] = group.evidence;
      }
    }
    if (Object.keys(byOption).length === 0 && !row.heartbeat) return null;
    return {
      weekStart: row.week_start,
      createdAt: row.created_at ?? null,
      byOption,
      heartbeat: row.heartbeat ?? null,
    };
  } catch (err) {
    console.error("fetchLatestEvidenceRefresh threw:", err);
    return null;
  }
}

/** "18 August" style formatting for recency stamps. */
export function formatRefreshDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  } catch {
    return null;
  }
}

/** Dev-bypass fixture: pretend this week's heartbeat ran against the sample
 *  report, so /report renders the recency stamp and NEW markers without a
 *  database. Built from the options' own hand-written evidence. */
export function buildDevRefresh(core: SoloCoreReport): EvidenceRefresh {
  const monday = (() => {
    const d = new Date();
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
    return d.toISOString().slice(0, 10);
  })();
  const byOption: Record<string, OptionEvidenceItem[]> = {};
  for (const o of core.options ?? []) {
    if (Array.isArray(o.evidence) && o.evidence.length > 0) {
      byOption[String(o.rank)] = o.evidence.map((e, i) => ({
        ...e,
        is_new: e.kind === "radar" && i === 0,
      }));
    }
  }
  return { weekStart: monday, createdAt: null, byOption, heartbeat: null };
}
