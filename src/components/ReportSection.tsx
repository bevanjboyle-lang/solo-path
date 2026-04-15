import { useState } from "react";
import { ChevronDown } from "lucide-react";
import StrandCard, { type StrandData } from "@/components/StrandCard";

interface ReportSectionProps {
  narrative?: string | null;
  strands?: StrandData[];
  locked?: boolean;
  initialExpanded?: boolean;
  mode?: "summary" | "full";
}

/**
 * ReportSection — renders report content on both /teaser and /plan.
 * Single component, shared between screens via props.
 * On /teaser: locked=false, summary mode, always expanded.
 * On /plan Day 0: initialExpanded=true, mode='full'.
 * On /plan Day 1+: initialExpanded=false (collapsed card with toggle).
 */
export default function ReportSection({
  narrative,
  strands = [],
  locked = false,
  initialExpanded = true,
  mode = "summary",
}: ReportSectionProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  if (locked) return null;

  // Collapsed card mode for Day 1+
  if (!initialExpanded && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-border bg-[hsl(var(--surface-panel))] p-6 text-left transition-colors hover:border-primary/30"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Your report</h2>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap to view your full report with all five options.
        </p>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collapse toggle for expanded non-initial state */}
      {!initialExpanded && expanded && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-[0.08em]">
            Your report
          </h2>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse
          </button>
        </div>
      )}

      {narrative && (
        <p className="text-[15px] leading-[1.7] text-muted-foreground">
          {narrative}
        </p>
      )}
      {strands.length > 0 && (
        <div className="space-y-4">
          {strands.map((strand, i) => (
            <StrandCard
              key={i}
              strand={strand}
              compact={mode === "full"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
