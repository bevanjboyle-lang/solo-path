/*
 * CheckinHistoryList, Pass 1 v1 (2026-05-18)
 *
 * Editorial timeline list for /checkin-history. Renders 30 day rows with
 * weekly separator headers, four discrete status pills, serif excerpts
 * on completed rows, mint-tint today row, faded future rows.
 *
 * Locked decisions from admin/pass-1-checkin-history-decisions.md:
 *   F1, Week separators inline ("W1 Week 1 · 03-09 May · 7 of 7 done").
 *     Computed from entries.
 *   F3, Move-tag column dropped for Pass 1 (data flow not yet wired).
 *   Status pills distinguished by fill + shape + glyph, not colour alone:
 *     Completed: filled mint bg + white text + white tick glyph
 *     Today: mint-outline + pulsing inner dot
 *     Missed: stone bg + muted text + faint solid dot
 *     Future: transparent + faint text + faint outlined dot ring
 *   Completed rows: serif excerpt + chevron, clickable, hover bg.
 *   Today row: mint-tint gradient bleed background + prompt + Open-in-Today CTA.
 *   Missed row: italic "No check-in" in excerpt slot, no interactivity.
 *   Future row: compressed padding, faded text, empty excerpt slot.
 */

export type CheckinTimelineEntryStatus =
  | "completed"
  | "today"
  | "missed"
  | "future";

export interface CheckinTimelineEntry {
  day: number;
  date: Date;
  status: CheckinTimelineEntryStatus;
  excerpt?: string | null;
  checkinId?: string;
}

interface CheckinHistoryListProps {
  entries: CheckinTimelineEntry[];
  onOpenEntry?: (entry: CheckinTimelineEntry) => void;
  /** Optional today-row CTA, when present, today row shows "Open in Today →" link routed via this handler. */
  onOpenToday?: () => void;
}

interface WeekBucket {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  entries: CheckinTimelineEntry[];
}

/* ── Group entries into 7-day weeks starting from the first entry's date. ── */
function bucketByWeek(entries: CheckinTimelineEntry[]): WeekBucket[] {
  if (entries.length === 0) return [];
  const buckets: WeekBucket[] = [];
  for (let i = 0; i < entries.length; i += 7) {
    const slice = entries.slice(i, i + 7);
    buckets.push({
      weekNumber: Math.floor(i / 7) + 1,
      startDate: slice[0].date,
      endDate: slice[slice.length - 1].date,
      entries: slice,
    });
  }
  return buckets;
}

function fmtDayMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtFullDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDayOfWeek(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

/* ── Status pill, four discrete treatments distinguished by fill + shape + glyph. ── */
function StatusPill({ status }: { status: CheckinTimelineEntryStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] text-white" style={{ background: "#2ECDB0" }}>
        <span className="inline-flex items-center justify-center w-2 h-2 rounded-full text-[7px] font-bold" style={{ background: "rgba(255,255,255,0.9)", color: "#2ECDB0" }}>
          ✓
        </span>
        Completed
      </span>
    );
  }
  if (status === "today") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: "transparent", border: "1.5px solid #2ECDB0", color: "#1A8A72" }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#2ECDB0" }} />
        Today
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground" style={{ background: "#F3F1ED", border: "1px solid #D5D0C8" }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#A09A92" }} />
        Missed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ border: "1px solid #A09A92" }} />
      Future
    </span>
  );
}

/* ── Week separator row ── */
function WeekSeparator({ bucket }: { bucket: WeekBucket }) {
  const completed = bucket.entries.filter((e) => e.status === "completed").length;
  const missed = bucket.entries.filter((e) => e.status === "missed").length;
  const todayInBucket = bucket.entries.some((e) => e.status === "today");
  const futureCount = bucket.entries.filter((e) => e.status === "future").length;

  let summary: string;
  if (missed > 0) {
    summary = `${completed} of ${bucket.entries.length} done · ${missed} missed`;
  } else if (todayInBucket && completed === 0) {
    summary = "starts today";
  } else if (futureCount === bucket.entries.length) {
    summary = `${bucket.entries.length} days · plan continues`;
  } else if (completed === bucket.entries.length) {
    summary = `${completed} of ${completed} done`;
  } else {
    summary = `${completed} of ${bucket.entries.length} done`;
  }

  const dateRange = `${fmtDayMonth(bucket.startDate)} – ${fmtDayMonth(bucket.endDate)}`;
  const isAhead = futureCount === bucket.entries.length;

  return (
    <div className="px-6 sm:px-8 py-3 flex items-baseline gap-3 border-t border-[#E5E2DC]">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
        <span className="text-primary tabular-nums mr-2">W{bucket.weekNumber}</span>
        Week {bucket.weekNumber} · {dateRange}{isAhead ? " · ahead" : ""}
      </span>
      <span className="flex-1 h-px bg-[#EDEBE6] mb-[1px]" />
      <span className="text-[10px] text-muted-foreground/60 tabular-nums tracking-[0.04em]">
        {summary}
      </span>
    </div>
  );
}

/* ── Single timeline row ── */
function TimelineRow({
  entry, onOpen, onOpenToday,
}: {
  entry: CheckinTimelineEntry;
  onOpen?: (e: CheckinTimelineEntry) => void;
  onOpenToday?: () => void;
}) {
  const isCompleted = entry.status === "completed";
  const isToday = entry.status === "today";
  const isMissed = entry.status === "missed";
  const isFuture = entry.status === "future";

  const handleClick = () => {
    if (isCompleted && onOpen) onOpen(entry);
  };

  const rowPadding = isFuture ? "py-3" : "py-4 sm:py-4.5";
  const rowBg = isToday
    ? { background: "linear-gradient(to right, rgba(46,205,176,0.06), transparent 70%)" }
    : undefined;

  return (
    <div
      className={`grid grid-cols-[72px_auto_1fr_auto] sm:grid-cols-[88px_120px_auto_1fr_auto] gap-x-4 sm:gap-x-5 items-start px-6 sm:px-8 ${rowPadding} border-t border-[#EDEBE6] ${
        isCompleted ? "cursor-pointer hover:bg-[#F3F1ED]/40 transition-colors" : ""
      }`}
      style={rowBg}
      onClick={handleClick}
      role={isCompleted ? "button" : undefined}
      tabIndex={isCompleted ? 0 : undefined}
      onKeyDown={(e) => {
        if (isCompleted && onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(entry);
        }
      }}
    >
      {/* Day numeral + day-of-week */}
      <span
        className={`font-display font-bold text-[13px] tabular-nums tracking-[0.04em] pt-0.5 ${
          isFuture || isMissed ? "text-muted-foreground/70" : "text-foreground"
        }`}
      >
        <span
          className={`mr-1.5 ${
            isToday || isCompleted ? "text-primary" : "text-muted-foreground/50"
          }`}
        >
          {String(entry.day).padStart(2, "0")}
        </span>
        {fmtDayOfWeek(entry.date)}
      </span>

      {/* Date (full), hidden on mobile (collapses into day col on narrow viewports) */}
      <span
        className={`hidden sm:block text-[12px] pt-1 tracking-[0.02em] ${
          isFuture || isMissed ? "text-muted-foreground/60" : "text-muted-foreground"
        }`}
      >
        {fmtFullDate(entry.date)}
      </span>

      {/* Status pill */}
      <span className="self-start mt-0.5">
        <StatusPill status={entry.status} />
      </span>

      {/* Excerpt slot, varies by status */}
      <div className="min-w-0">
        {isCompleted && entry.excerpt && (
          <p
            className="text-[14px] text-foreground/85 leading-[1.55] max-w-[64ch] line-clamp-2 pt-0.5"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            {entry.excerpt}
          </p>
        )}
        {isMissed && (
          <p className="text-[13px] italic text-muted-foreground/60 pt-1">
            No check-in
          </p>
        )}
        {isToday && (
          <p className="font-display font-semibold text-[14px] text-foreground pt-1" style={{ letterSpacing: "-0.01em" }}>
            {entry.day === 1
              ? "Your first check-in is open, about two minutes."
              : "Today's check-in is open, about two minutes."}
          </p>
        )}
      </div>

      {/* Chevron (completed) or Today CTA */}
      <div className="self-center">
        {isCompleted && (
          <span className="text-[18px] text-muted-foreground/50">→</span>
        )}
        {isToday && onOpenToday && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenToday();
            }}
            className="text-[12px] font-semibold whitespace-nowrap underline underline-offset-[3px]"
            style={{ color: "#1A8A72", textDecorationColor: "#2ECDB0" }}
          >
            Open in Today →
          </button>
        )}
      </div>
    </div>
  );
}

export default function CheckinHistoryList({
  entries, onOpenEntry, onOpenToday,
}: CheckinHistoryListProps) {
  const buckets = bucketByWeek(entries);

  return (
    <div className="panel-ivory py-2">
      {buckets.map((bucket, i) => (
        <div key={bucket.weekNumber}>
          {/* Suppress top border on the very first separator */}
          <div className={i === 0 ? "[&>div]:border-t-0" : ""}>
            <WeekSeparator bucket={bucket} />
          </div>
          {bucket.entries.map((entry) => (
            <TimelineRow
              key={entry.day}
              entry={entry}
              onOpen={onOpenEntry}
              onOpenToday={onOpenToday}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
