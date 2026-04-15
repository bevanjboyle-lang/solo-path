import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigateAuthed } from "@/lib/handlers";
import { useNavigate } from "react-router-dom";

export type PlanState =
  | "day0"
  | "active"        // Day 1-30, not checked in today
  | "done_today"    // Day 1-30, checked in
  | "day31_nosub"   // Day 31+, no subscription
  | "sub_active"    // Subscriber, not checked in this week
  | "sub_done"      // Subscriber, checked in this week
  | "loading";

interface TodayCardProps {
  state: PlanState;
  dayNumber?: number;
  weekNumber?: number;
  sessionId?: string;
  onScrollToReport?: () => void;
  onOpenCheckin?: () => void;
}

const stateConfig: Record<Exclude<PlanState, "loading">, {
  body: (props: TodayCardProps) => string;
  cta: (props: TodayCardProps) => { label: string; variant: "primary" | "secondary"; action: string };
}> = {
  day0: {
    body: () => "Your report is ready. Read it first — then we'll start your 30-day plan tomorrow.",
    cta: () => ({ label: "Read your report", variant: "primary", action: "scrollToReport" }),
  },
  active: {
    body: (p) => `Day ${p.dayNumber || 1} of 30. Today's check-in takes two minutes.`,
    cta: () => ({ label: "Do today's check-in", variant: "primary", action: "openCheckin" }),
  },
  done_today: {
    body: () => "You're done for today. See you tomorrow.",
    cta: () => ({ label: "Open guidance", variant: "secondary", action: "navigateLibrary" }),
  },
  day31_nosub: {
    body: () => "Your 30 days are complete. Your report and history stay here. To keep running your plan, open a subscription.",
    cta: () => ({ label: "Keep going \u2192", variant: "primary", action: "navigateSubscribe" }),
  },
  sub_active: {
    body: (p) => `Week ${p.weekNumber || 1}. This week's check-in takes two minutes.`,
    cta: () => ({ label: "Do this week's check-in", variant: "primary", action: "openCheckin" }),
  },
  sub_done: {
    body: () => "You're done for this week.",
    cta: () => ({ label: "Browse library", variant: "secondary", action: "navigateLibrary" }),
  },
};

export default function TodayCard({
  state,
  dayNumber,
  weekNumber,
  sessionId,
  onScrollToReport,
  onOpenCheckin,
}: TodayCardProps) {
  const navigate = useNavigate();

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-border bg-[hsl(var(--surface-panel))] p-8 animate-pulse">
        <div className="h-5 w-3/4 rounded bg-[hsl(var(--surface-inset))]" />
        <div className="mt-4 h-4 w-full rounded bg-[hsl(var(--surface-inset))]" />
        <div className="mt-6 h-10 w-48 rounded-lg bg-[hsl(var(--surface-inset))]" />
      </div>
    );
  }

  const config = stateConfig[state];
  const props = { state, dayNumber, weekNumber, sessionId, onScrollToReport, onOpenCheckin };
  const body = config.body(props);
  const cta = config.cta(props);

  const handleCTA = useCallback(() => {
    switch (cta.action) {
      case "scrollToReport":
        onScrollToReport?.();
        break;
      case "openCheckin":
        onOpenCheckin?.();
        break;
      case "navigateLibrary":
        navigateAuthed(navigate, "/library");
        break;
      case "navigateSubscribe":
        navigateAuthed(navigate, "/subscribe");
        break;
    }
  }, [cta.action, onScrollToReport, onOpenCheckin, navigate]);

  return (
    <motion.div
      className="rounded-xl border border-border bg-[hsl(var(--surface-panel))] p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {state === "done_today" && (
        <div className="mb-4 flex items-center gap-2 text-primary">
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.1em]">Done for today</span>
        </div>
      )}

      <p className="text-[15px] leading-relaxed text-muted-foreground">{body}</p>

      <div className="mt-6">
        <Button
          variant={cta.variant === "primary" ? "default" : "secondary"}
          size="lg"
          onClick={handleCTA}
          className={
            cta.variant === "primary"
              ? "rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
              : "rounded-lg px-6 text-[15px] font-medium"
          }
        >
          {cta.label}
        </Button>
      </div>
    </motion.div>
  );
}
