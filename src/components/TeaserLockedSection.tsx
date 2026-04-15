import { Lock, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeaserLockedSectionProps {
  onUnlock: () => void;
  loading?: boolean;
}

/**
 * TeaserLockedSection — hard visual boundary between free preview and locked content.
 * NOT a subtle fade. Clear, unambiguous divider with blur overlay below.
 */
export default function TeaserLockedSection({ onUnlock, loading = false }: TeaserLockedSectionProps) {
  return (
    <div className="relative mt-10">
      {/* Hard boundary line */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2 rounded-full border border-border bg-[hsl(var(--surface-panel))] px-4 py-1.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Unlock the full plan
          </span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Blurred/masked locked content representation */}
      <div className="relative overflow-hidden rounded-xl" aria-hidden="true">
        <div
          className="pointer-events-none select-none space-y-4 p-6"
          style={{
            filter: "blur(6px)",
            WebkitFilter: "blur(6px)",
            opacity: 0.5,
          }}
        >
          {/* Fake locked content blocks */}
          <div className="h-5 w-3/4 rounded bg-[hsl(var(--surface-inset))]" />
          <div className="h-5 w-full rounded bg-[hsl(var(--surface-inset))]" />
          <div className="h-5 w-5/6 rounded bg-[hsl(var(--surface-inset))]" />
          <div className="mt-6 h-24 w-full rounded-lg border border-border bg-[hsl(var(--surface-card))]" />
          <div className="h-24 w-full rounded-lg border border-border bg-[hsl(var(--surface-card))]" />
          <div className="h-24 w-full rounded-lg border border-border bg-[hsl(var(--surface-card))]" />
          <div className="mt-6 h-5 w-2/3 rounded bg-[hsl(var(--surface-inset))]" />
          <div className="h-5 w-full rounded bg-[hsl(var(--surface-inset))]" />
        </div>
      </div>

      {/* Unlock callout card */}
      <div className="mt-8 flex flex-col items-center text-center">
        <Button
          size="lg"
          onClick={onUnlock}
          disabled={loading}
          className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Redirecting..." : "Unlock my full report \u2014 \u00A319.99"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          One-time payment. No subscription. No auto-renewal.
        </p>
      </div>
    </div>
  );
}
