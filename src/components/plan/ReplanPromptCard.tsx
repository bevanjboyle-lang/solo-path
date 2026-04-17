import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { confirmReplan, dismissReplan } from "@/lib/handlers";

interface ReplanContext {
  circumstance_type?: string;
  [key: string]: unknown;
}

interface ReplanPromptCardProps {
  trackerSessionId: string;
  userId: string;
  context: ReplanContext | null;
  onResolved: () => void; // refetch tracker_sessions + plan
}

const BODY_BY_TYPE: Record<string, string> = {
  busy_stretch:
    "You've got a busy stretch ahead. I can rebuild the next few days around that — same strands, adjusted pace.",
  stuck:
    "We've hit the same block twice. I can rework the plan to move around it — same strands, different angle.",
};

const FALLBACK_BODY =
  "Based on your recent check-ins, I can rebuild the plan to fit where you actually are. Same strands, adjusted pace.";

export default function ReplanPromptCard({
  trackerSessionId,
  userId,
  context,
  onResolved,
}: ReplanPromptCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const body = BODY_BY_TYPE[context?.circumstance_type ?? ""] || FALLBACK_BODY;

  const handleConfirm = async () => {
    setConfirming(true);
    const result = await confirmReplan(trackerSessionId, userId);
    setConfirming(false);
    if (result.error) {
      toast.error("Replan failed. Please try again.");
      return;
    }
    toast.success("Plan updated");
    onResolved();
  };

  const handleDismiss = async () => {
    setDismissing(true);
    const result = await dismissReplan(trackerSessionId, userId);
    setDismissing(false);
    if (result.error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    onResolved();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6 rounded-xl border border-primary/30 bg-[hsl(var(--surface-panel))] px-6 py-5"
    >
      <h3
        className="font-display text-lg font-semibold text-foreground"
        style={{ letterSpacing: "-0.01em" }}
      >
        Update your plan?
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleConfirm} disabled={confirming || dismissing}>
          {confirming ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Updating…
            </>
          ) : (
            "Update my plan"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={confirming || dismissing}
        >
          {dismissing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Not yet"}
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        You can always ask me to update later.
      </p>
    </motion.div>
  );
}
