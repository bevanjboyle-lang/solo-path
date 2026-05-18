import { motion } from "framer-motion";

interface TrackerDay {
  day: number;
  completed: boolean;
  isToday: boolean;
}

interface TrackerGridProps {
  days: TrackerDay[];
  variant?: "thirty-day" | "rolling-weekly";
  onDayClick?: (day: number) => void;
}

export default function TrackerGrid({ days, variant = "thirty-day", onDayClick }: TrackerGridProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-[0.08em]">
          {variant === "thirty-day" ? "30-day tracker" : "Weekly tracker"}
        </h2>
        <span className="text-xs text-muted-foreground">
          {days.filter((d) => d.completed).length} of {days.length} days
        </span>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid grid-cols-10 gap-2">
        {days.map((day) => (
          <button
            key={day.day}
            onClick={() => day.completed && onDayClick?.(day.day)}
            disabled={!day.completed && !day.isToday}
            className={`
              relative flex h-10 w-full items-center justify-center rounded-md text-xs font-medium transition-colors
              ${day.completed
                ? "bg-primary/15 text-primary border border-primary/20 cursor-pointer hover:bg-primary/25"
                : day.isToday
                  ? "bg-[hsl(var(--surface-panel))] text-foreground border-2 border-primary"
                  : "bg-[hsl(var(--surface-inset))] text-muted-foreground/50 border border-transparent cursor-default"
              }
            `}
            aria-label={`Day ${day.day}${day.completed ? " completed" : day.isToday ? " today" : ""}`}
          >
            {day.day}
          </button>
        ))}
      </div>

      {/* Mobile: horizontal scroll strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden">
        {days.map((day) => (
          <button
            key={day.day}
            onClick={() => day.completed && onDayClick?.(day.day)}
            disabled={!day.completed && !day.isToday}
            className={`
              flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors
              ${day.completed
                ? "bg-primary/15 text-primary border border-primary/20"
                : day.isToday
                  ? "bg-[hsl(var(--surface-panel))] text-foreground border-2 border-primary"
                  : "bg-[hsl(var(--surface-inset))] text-muted-foreground/50 border border-transparent"
              }
            `}
          >
            {day.day}
          </button>
        ))}
      </div>
    </div>
  );
}
