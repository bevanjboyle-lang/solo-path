import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, RotateCw, ArrowRight, Circle, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Task {
  day: number;
  description: string;
  status: "completed" | "missed" | "rescheduled" | "today" | "upcoming";
  moved_to?: number;
}

interface Phase {
  name: string;
  days: string;
  tasks: Task[];
}

interface Props {
  workingPlan: { phases: Phase[] };
  currentDay: number;
  sessionId: string;
  lastCheckinDate: string | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <Check className="h-4 w-4 text-emerald-400" />,
  missed: <X className="h-4 w-4 text-red-400/60" />,
  rescheduled: <RotateCw className="h-3.5 w-3.5 text-amber-400/70" />,
  today: <ArrowRight className="h-4 w-4 text-primary" />,
  upcoming: <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />,
};

export default function TrackerProgress({ workingPlan, currentDay, sessionId, lastCheckinDate }: Props) {
  const navigate = useNavigate();
  const phases = workingPlan?.phases || [];

  // Calculate total progress
  const allTasks = phases.flatMap((p) => p.tasks || []);
  const completedCount = allTasks.filter((t) => t.status === "completed").length;
  const totalTasks = allTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Determine current phase index
  const currentPhaseIdx = phases.findIndex((p) =>
    p.tasks?.some((t) => t.status === "today" || t.status === "upcoming")
  );

  // Check if already checked in today
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = lastCheckinDate === today;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Day {currentDay} of 30</span>
          <span className="text-sm font-semibold text-primary">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {completedCount} of {totalTasks} tasks completed
        </p>
      </div>

      {/* Check-in CTA */}
      {!checkedInToday && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(`/checkin/${sessionId}`)}
          className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors flex items-center gap-3"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Check in for today →</p>
            <p className="text-xs text-muted-foreground">Log progress and get your next steps</p>
          </div>
        </motion.button>
      )}

      {/* Phase task list */}
      <div className="space-y-3">
        {phases.map((phase, pi) => {
          const phaseTasks = phase.tasks || [];
          const phaseCompleted = phaseTasks.filter((t) => t.status === "completed" || t.status === "missed").length;
          const phaseTotal = phaseTasks.length;
          const allDone = phaseTotal > 0 && phaseTasks.every((t) => t.status === "completed" || t.status === "missed");
          const isCurrent = pi === currentPhaseIdx;
          const isFuture = pi > currentPhaseIdx && currentPhaseIdx >= 0;
          const isFirst = pi === 0;

          // Phase 1 and current phase are expanded by default
          const defaultOpen = isFirst || isCurrent;

          return (
            <PhaseSection
              key={pi}
              phase={phase}
              phaseIndex={pi}
              isCurrent={isCurrent}
              isFuture={isFuture}
              allDone={allDone}
              defaultOpen={defaultOpen}
            />
          );
        })}
      </div>
    </div>
  );
}

function PhaseSection({
  phase,
  phaseIndex,
  isCurrent,
  isFuture,
  allDone,
  defaultOpen,
}: {
  phase: Phase;
  phaseIndex: number;
  isCurrent: boolean;
  isFuture: boolean;
  allDone: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left hover:bg-card/80 transition-colors group shadow-card">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {allDone && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
          <div className="min-w-0">
            <span className={`text-sm font-medium truncate block ${isCurrent ? "text-foreground font-bold" : isFuture ? "text-muted-foreground" : "text-foreground"}`}>
              {phase.name}
            </span>
            <span className="text-xs text-muted-foreground">{phase.days}</span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground ml-3 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-1.5 pl-2">
        {(phase.tasks || []).map((task, ti) => (
          <div
            key={ti}
            className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
              task.status === "today"
                ? "border-l-2 border-primary bg-primary/5"
                : ""
            }`}
          >
            <span className="mt-0.5 shrink-0">{STATUS_ICON[task.status]}</span>
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm leading-snug block ${
                  task.status === "completed"
                    ? "text-foreground"
                    : task.status === "missed"
                    ? "text-muted-foreground line-through"
                    : task.status === "rescheduled"
                    ? "text-muted-foreground"
                    : task.status === "today"
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {task.description}
              </span>
              {task.status === "rescheduled" && task.moved_to && (
                <span className="text-[10px] text-amber-400/60 mt-0.5 block">
                  (moved to Day {task.moved_to})
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/30 shrink-0 mt-1">
              Day {task.day}
            </span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
