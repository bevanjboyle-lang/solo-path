// CohortPulse — Cohort Pulse, surfaced (ADR-025 Peers layer, 2026-06-11;
// coaching-layer-design.md §4.5).
//
// A quiet editorial block locating the user in their cohort: up to three
// stats read from cohort_aggregations for the caller's archetype
// (scope_type 'archetype', scope_key = archetype name), REAL rows only.
// The canonical design sanctions synthetic values with a transparent
// footnote, but that pattern needs Bevan's sign-off, so v1 never fabricates:
// where no real rows exist the block renders one honest serif line instead.
//
// Below the stats: 'Asked this week' — curated, fully anonymised Ask Solo
// themes from the asked_this_week table (current or last week). Renders
// nothing when that table has no recent rows (no empty state needed).
//
// Reads both tables directly via the supabase client under RLS
// (authenticated SELECT on both). No edge function on the read path.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Both tables postdate the generated Database types; same untyped-table
// pattern as Pipeline.tsx / Forge.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string) => (supabase as any).from(name);

interface CohortMetrics {
  activations?: number;
  median_first_reply_day?: number;
  most_common_first_move?: string;
}

interface AskedTheme {
  id: string;
  week_start: string;
  question_theme: string;
  answer_summary: string;
}

interface Stat {
  label: string;
  value: string;
}

function statsFromMetrics(m: CohortMetrics): Stat[] {
  const stats: Stat[] = [];
  if (typeof m.activations === "number" && m.activations > 0) {
    stats.push({ label: "Activations in your cohort", value: String(m.activations) });
  }
  if (typeof m.median_first_reply_day === "number" && m.median_first_reply_day > 0) {
    stats.push({ label: "Median first-reply day", value: `Day ${m.median_first_reply_day}` });
  }
  if (typeof m.most_common_first_move === "string" && m.most_common_first_move.trim()) {
    stats.push({ label: "Most common first move", value: m.most_common_first_move.trim() });
  }
  return stats.slice(0, 3);
}

export default function CohortPulse({ archetype }: { archetype: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [asked, setAsked] = useState<AskedTheme[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Real cohort rows for this archetype, newest period first.
        // source='real' is the honesty gate: synthetic rows never render here.
        const cohortQuery = archetype
          ? table("cohort_aggregations")
              .select("metrics, period_start, period_end")
              .eq("scope_type", "archetype")
              .eq("scope_key", archetype)
              .eq("source", "real")
              .order("period_end", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

        // 'Asked this week' rows for the current or previous week.
        const since = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
        const askedQuery = table("asked_this_week")
          .select("id, week_start, question_theme, answer_summary")
          .gte("week_start", since)
          .order("week_start", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(3);

        const [cohortRes, askedRes] = await Promise.all([cohortQuery, askedQuery]);
        if (cancelled) return;
        if (cohortRes.error || askedRes.error) {
          setError(true);
        } else {
          setStats(cohortRes.data ? statsFromMetrics((cohortRes.data.metrics ?? {}) as CohortMetrics) : []);
          setAsked((askedRes.data ?? []) as AskedTheme[]);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [archetype]);

  // A quiet bottom-of-page surface: say nothing while loading or on error.
  if (loading || error) return null;

  return (
    <section className="mt-12">
      <h2 className="rule-head">People like you, this week</h2>

      {stats.length > 0 ? (
        <dl className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="text-[22px] font-semibold leading-none tracking-tight text-foreground">
                {s.value}
              </dd>
              <dt className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      ) : (
        <p className="standfirst mt-5">
          Cohort numbers appear once enough people like you are moving. Early days.
        </p>
      )}

      {asked.length > 0 && (
        <div className="mt-8 border-t border-stone-200 pt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Asked this week</p>
          <div className="mt-4">
            {asked.map((a) => (
              <article key={a.id} className="border-t border-stone-200 py-4 first:border-t-0 first:pt-0">
                <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {a.question_theme}
                </h3>
                <p className="mt-1.5 text-sm leading-snug text-foreground/85">{a.answer_summary}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
            Themes are drawn from what people asked Solo this week, fully anonymised. Never quotes, never names.
          </p>
        </div>
      )}
    </section>
  );
}
