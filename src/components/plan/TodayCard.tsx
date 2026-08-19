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
  /** F78 — opens the activation dialog from day0 state. */
  onOpenActivation?: () => void;
}

const stateConfig: Record<Exclude<PlanState, "loading">, {
  body: (props: TodayCardProps) => string;
  cta: (props: TodayCardProps) => { label: string; variant: "primary" | "secondary"; action: string };
}> = {
  day0: {
    body: () =>
      "Your report is ready. Read it through, then start your 30-day plan when you're ready.",
    cta: () => ({ label: "Start my 30-day plan", variant: "primary", action: "openActivation" }),
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
  onOpenActivation,
}: TodayCardProps) {
  const navigate = useNavigate();

  const handleCTA = useCallback((action: string) => {
    switch (action) {
      case "scrollToReport":
        onScrollToReport?.();
        break;
      case "openCheckin":
        onOpenCheckin?.();
        break;
      case "openActivation":
        onOpenActivation?.();
        break;
      case "navigateLibrary":
        navigateAuthed(navigate, "/library");
        break;
      case "navigateSubscribe":
        navigateAuthed(navigate, "/subscribe");
        break;
    }
  }, [onScrollToReport, onOpenCheckin, onOpenActivation, navigate]);

  if (state === "loading") {
    return (
      <div className="border-t border-border pt-6 animate-pulse">
        <div className="h-5 w-3/4 bg-[hsl(var(--surface-inset))]" />
        <div className="mt-4 h-4 w-full bg-[hsl(var(--surface-inset))]" />
        <div className="mt-6 h-10 w-48 bg-[hsl(var(--surface-inset))]" />
      </div>
    );
  }

  const config = stateConfig[state];
  const props = { state, dayNumber, weekNumber, sessionId, onScrollToReport, onOpenCheckin };
  const body = config.body(props);
  const cta = config.cta(props);

  return (
    <motion.div
      className=""
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {state === "done_today" && (
        /* Sprint 3: the quiet acknowledgement. The chip arrives with the
         * product's one motion verb rather than simply being there. */
        <div className="ack-reveal mb-4 flex items-center gap-2 text-primary">
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.1em]">Done for today</span>
        </div>
      )}

      <p className="text-[15px] leading-relaxed text-muted-foreground">{body}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant={cta.variant === "primary" ? "default" : "secondary"}
          size="lg"
          onClick={() => handleCTA(cta.action)}
          className={
            cta.variant === "primary"
              ? "bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
              : "px-6 text-[15px] font-medium"
          }
        >
          {cta.label}
        </Button>
        {state === "day0" && onScrollToReport && (
          <button
            type="button"
            onClick={onScrollToReport}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
          >
            Read it first →
          </button>
        )}
      </div>
    </motion.div>
  );
}
