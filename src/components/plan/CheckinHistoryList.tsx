import { cn } from "@/lib/utils";

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
}

const STATUS_LABEL: Record<CheckinTimelineEntryStatus, string> = {
  completed: "Completed",
  today: "Today",
  missed: "Missed",
  future: "Future",
};

function StatusPill({ status }: { status: CheckinTimelineEntryStatus }) {
  const cls =
    status === "completed"
      ? "bg-[hsl(var(--surface-mint-tint))] text-primary border-primary/30"
      : status === "today"
      ? "border-primary text-primary bg-transparent"
      : status === "missed"
      ? "border-border bg-[hsl(var(--surface-inset))] text-muted-foreground"
      : "border-dashed border-border bg-transparent text-muted-foreground/70";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        cls,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CheckinHistoryList({
  entries,
  onOpenEntry,
}: CheckinHistoryListProps) {
  return (
    <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-[hsl(var(--surface-panel))]/85 backdrop-blur-md">
      {entries.map((e) => {
        const interactive = e.status === "completed" && !!onOpenEntry;
        const inner = (
          <div className="flex items-start gap-4 px-5 py-4">
            <div className="w-24 shrink-0 text-[12px] text-muted-foreground">
              <div className="font-semibold text-foreground">Day {e.day}</div>
              <div>{fmtDate(e.date)}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5">
                <StatusPill status={e.status} />
              </div>
              {e.excerpt && (
                <p className="line-clamp-2 text-[13px] text-muted-foreground">
                  {e.excerpt}
                </p>
              )}
            </div>
          </div>
        );
        return (
          <li key={e.day}>
            {interactive ? (
              <button
                type="button"
                onClick={() => onOpenEntry?.(e)}
                className="w-full text-left transition-colors hover:bg-[hsl(var(--surface-inset))]/50"
              >
                {inner}
              </button>
            ) : (
              <div>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}