import { useState } from "react";
import { ChevronDown } from "lucide-react";
import MoveTypeBadge from "@/components/MoveTypeBadge";

export interface StrandData {
  title: string;
  pitch: string;
  primary_move_type?: string | null;
  structural_warmth?: string | null;
}

interface StrandCardProps {
  strand: StrandData;
  compact?: boolean;
  onToggle?: () => void;
}

/**
 * StrandCard — used on /teaser (summary) and /plan (compact with expand).
 * primary_move_type and structural_warmth come from report payload — never computed here.
 */
export default function StrandCard({ strand, compact = false, onToggle }: StrandCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  return (
    <div className="rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-foreground leading-snug">
              {strand.title}
            </h3>
            <MoveTypeBadge moveType={strand.primary_move_type} />
          </div>
          {strand.structural_warmth && (
            <span className="mt-1 inline-block text-[11px] text-muted-foreground">
              {strand.structural_warmth}
            </span>
          )}
        </div>
        {compact && (
          <button
            onClick={toggle}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {strand.pitch}
      </p>
      {compact && expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Full strand details will render from report data.
          </p>
        </div>
      )}
    </div>
  );
}
