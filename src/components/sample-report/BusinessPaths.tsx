import { Lock } from "lucide-react";
import LockedOverlay from "./LockedOverlay";
import type { SoloCoreReport } from "@/types/canonical";

type Option = SoloCoreReport["options"][number];

interface Props {
  options: SoloCoreReport["options"];
  recommended_selection?: SoloCoreReport["recommended_selection"];
}

function formatDayRate(opt: Option): string {
  const p = opt.pricing;
  return `£${p.range_low_gbp.toLocaleString()}–£${p.range_high_gbp.toLocaleString()}`;
}

export default function BusinessPaths({ options, recommended_selection }: Props) {
  const sorted = [...(options ?? [])].sort((a, b) => a.rank - b.rank);
  const featured = sorted[0];
  const lockedPreviews = sorted.slice(1, 3);
  const stubs = sorted.slice(3);
  const selectedRanks = new Set(recommended_selection?.selected_ranks ?? []);

  return (
    <div>
      <h2 className="mb-5 text-lg font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Your 10 Most Viable Paths</h2>

      {/* Path 1 - Full */}
      {featured && (
        <div
          className="mb-4 rounded-md border border-border bg-surface-card p-6"
          style={{ borderTop: "3px solid hsl(var(--mint))" }}
        >
          {(selectedRanks.has(featured.rank) || featured.rank === 1) && (
            <span className="mb-3 inline-block rounded-md bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
              Best Fit
            </span>
          )}
          <h3 className="mt-1 text-base font-semibold text-foreground">{featured.model_name}</h3>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Target buyer</span>
              <p className="mt-0.5 text-sm text-foreground">{featured.target_buyer}</p>
            </div>
            <div className="rounded-md bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">{featured.pricing.cadence}</span>
              <p className="mt-0.5 text-sm font-medium text-primary">{formatDayRate(featured)}</p>
            </div>
            <div className="rounded-md bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
              <p className="mt-0.5 text-sm text-foreground">{featured.time_to_first_revenue}</p>
            </div>
            <div className="rounded-md bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Difficulty</span>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="capitalize">{featured.difficulty_rating}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-md bg-surface-panel p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Why it fits</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {featured.why_this_works_for_them}
            </p>
          </div>

          <div className="mt-5 rounded-md bg-surface-panel p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Positioning</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{featured.positioning}</p>
          </div>
        </div>
      )}

      {/* Paths 2-3 - Locked previews */}
      {lockedPreviews.map((opt) => {
        const teaserText = (opt.positioning ?? "").trim();
        const splitAt = Math.min(120, Math.floor(teaserText.length / 2));
        const visible = teaserText.slice(0, splitAt);
        const blurred = teaserText.slice(splitAt);
        return (
          <div key={opt.rank} className="relative mb-4 overflow-hidden rounded-md border border-border bg-surface-card p-6">
            <h3 className="text-base font-semibold text-foreground">{opt.model_name}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-panel p-3">
                <span className="text-[10px] text-muted-foreground">{opt.pricing.cadence}</span>
                <p className="mt-0.5 text-sm text-foreground">{formatDayRate(opt)}</p>
              </div>
              <div className="rounded-md bg-surface-panel p-3">
                <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
                <p className="mt-0.5 text-sm text-foreground">{opt.time_to_first_revenue}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{visible}</p>
            <p className="text-sm text-muted-foreground" style={{ filter: "blur(1px)" }}>{blurred}</p>
            <LockedOverlay label="Unlock full path - £19.99" />
          </div>
        );
      })}

      {/* Paths 4–10 - Greyed out stubs */}
      {stubs.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {stubs.map((p) => (
            <div key={p.rank} className="flex items-center gap-3 rounded-md border border-border/60 bg-surface-card/50 px-4 py-3 opacity-50">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{p.rank}</span>
              <span className="text-sm text-muted-foreground">{p.model_name}</span>
              <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
