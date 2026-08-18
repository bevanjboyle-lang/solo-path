import { useEffect, useState } from "react";
import { isDevBypass } from "@/lib/devBypass";
import {
  fetchLatestEvidenceRefresh,
  formatRefreshDate,
  type Heartbeat,
  type HeartbeatMatch,
} from "@/lib/evidenceRefresh";

/*
 * RadarHeartbeatCard — Phase D (blueprint Move 4), 2026-08-18.
 *
 * The radar half of the Monday heartbeat on /plan: live signals matched to
 * the user's focus strands plus one market-movement sentence, written by
 * weekly-heartbeat into report_evidence_refresh. Sits directly above the
 * WeeklyFrictionReviewCard, which owns the other half of the heartbeat
 * (the week reviewed, next week's focus). Together they are the "your
 * dossier stays live" surface.
 *
 * Self-contained like the friction card: own fetch, own loading state,
 * renders nothing when there is no current heartbeat. Only heartbeats
 * from the last 8 days count; a stale row stays hidden rather than
 * pretending the dossier is fresher than it is.
 */

interface Props {
  reportId: string | null;
}

const DEV_FIXTURE: { weekStart: string; heartbeat: Heartbeat } = {
  weekStart: (() => {
    const d = new Date();
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
    return d.toISOString().slice(0, 10);
  })(),
  heartbeat: {
    strand_names: ["Fractional FD", "Board-ready business cases"],
    market_note:
      "Budget season is pulling board-level financial casework forward, and this week's tenders show mid-sized buyers paying for exactly the modelling and scrutiny work your Fractional FD strand sells.",
    market_note_source: "model",
    strand_matches: [
      {
        title: "Financial modelling support for capital programme review",
        source_name: "Contracts Finder",
        value_text: "£48,000",
        deadline: "2026-09-05T00:00:00Z",
        week_start: undefined,
        is_new: true,
      },
      {
        title: "Board-ready business case support pulled forward by budget season",
        source_name: "Solo analysis",
        is_new: true,
      },
      {
        title: "Interim FD cover, PE-backed services group",
        source_name: "Market listing",
        value_text: "£700/day",
        is_new: false,
      },
    ],
  },
};

function MatchRow({ item }: { item: HeartbeatMatch }) {
  const deadline = (() => {
    if (!item.deadline) return null;
    try {
      const d = new Date(item.deadline);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch {
      return null;
    }
  })();
  const meta = [
    item.source_name || item.source_type || null,
    item.value_text || null,
    deadline ? `closes ${deadline}` : null,
  ].filter(Boolean);
  const title = item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className="border-b border-[#D1CEC7] font-medium text-foreground transition-colors hover:border-[#15735F] hover:text-[#15735F]"
    >
      {item.title}
    </a>
  ) : (
    <span className="font-medium text-foreground">{item.title}</span>
  );
  return (
    <div className="flex items-start gap-3">
      <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0">
        <p className="text-[13.5px] leading-snug">
          {title}
          {item.is_new && (
            <span className="ml-2 inline-block bg-surface-mint-tint px-1.5 py-px align-[2px] text-[9px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--mint-text))]">
              New
            </span>
          )}
        </p>
        {meta.length > 0 && (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{meta.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

export default function RadarHeartbeatCard({ reportId }: Props) {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null);

  useEffect(() => {
    if (isDevBypass()) {
      setWeekStart(DEV_FIXTURE.weekStart);
      setHeartbeat(DEV_FIXTURE.heartbeat);
      return;
    }
    if (!reportId) return;
    let cancelled = false;
    (async () => {
      const r = await fetchLatestEvidenceRefresh(reportId);
      if (cancelled || !r?.heartbeat) return;
      // Freshness gate: heartbeats older than 8 days stay hidden.
      const age = Date.now() - new Date(`${r.weekStart}T00:00:00Z`).getTime();
      if (age > 8 * 24 * 3600 * 1000) return;
      setWeekStart(r.weekStart);
      setHeartbeat(r.heartbeat);
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (!heartbeat) return null;

  const matches = (heartbeat.strand_matches ?? []).filter((m) => m.title);
  const note = heartbeat.market_note?.trim();
  if (!note && matches.length === 0) return null;

  const updated = formatRefreshDate(weekStart);

  return (
    <section className="border-t border-border pt-6 pb-8 mb-6">
      {/* Eyebrow — mint dot + label + recency stamp */}
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5 flex-wrap">
        <span className="inline-block w-1.5 h-1.5 bg-primary" />
        <span className="text-foreground">This week</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/70">On your Radar</span>
        {updated && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[#15735F]">Updated {updated}</span>
          </>
        )}
      </div>

      {/* Market note — the single sentence, display weight */}
      {note && (
        <p
          className="font-display text-[17px] sm:text-[19px] font-medium text-foreground leading-[1.45] max-w-[58ch]"
          style={{ letterSpacing: "-0.012em" }}
        >
          {note}
        </p>
      )}

      {/* Strand matches — live signals for what they're building */}
      {matches.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="inline-block w-1.5 h-1.5 bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#15735F]">
              Matched to your strands
            </span>
            {heartbeat.strand_names && heartbeat.strand_names.length > 0 && (
              <span className="text-[10.5px] normal-case tracking-normal font-normal text-muted-foreground">
                {heartbeat.strand_names.join(" · ")}
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {matches.map((m, i) => (
              <MatchRow key={m.id ?? i} item={m} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
