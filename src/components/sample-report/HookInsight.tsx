import { Lock } from "lucide-react";
import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  hook_insight: SoloCoreReport["hook_insight"];
}

/**
 * Locked-teaser variant of the hook insight. Renders the headline in full and
 * blurs the paragraph behind a "Full insight in your report" overlay.
 * Used in the pre-purchase teaser; for the unlocked report, use HookInsightSection.
 */
export default function HookInsight({ hook_insight }: Props) {
  const { headline, paragraph } = hook_insight;
  return (
    <div className="rounded-md border border-border bg-surface-card p-6" style={{ borderLeft: "4px solid hsl(var(--mint))" }}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Your Key Insight</span>
      <p className="mt-3 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>
        {headline}
      </p>
      <div className="relative mt-3">
        <p className="text-sm leading-relaxed text-muted-foreground" style={{ filter: "blur(1px)" }}>
          {paragraph}
        </p>
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-xs font-medium text-muted-foreground">Full insight in your report</span>
        </div>
      </div>
    </div>
  );
}
