import { Lock, AlertTriangle } from "lucide-react";
import LockedOverlay from "./LockedOverlay";
import type { SoloCoreReport } from "@/types/canonical";

type Option = SoloCoreReport["options"][number];

interface Props {
  options: SoloCoreReport["options"];
  recommended_selection?: SoloCoreReport["recommended_selection"];
  /**
   * When true (default), render the teaser variant: rank 1 full,
   * ranks 2-3 blurred behind LockedOverlay, ranks 4-10 as locked stubs.
   * When false, render all 10 options in full detail (post-payment / /plan).
   */
  locked?: boolean;
}

function formatPriceRange(opt: Option): string {
  const p = opt.pricing;
  return `£${p.range_low_gbp.toLocaleString()}–£${p.range_high_gbp.toLocaleString()}`;
}

function FullOptionCard({
  option,
  isRecommended,
}: {
  option: Option;
  isRecommended: boolean;
}) {
  return (
    <div
      className="mb-4 rounded-md border border-border bg-surface-card p-6"
      style={
        isRecommended ? { borderTop: "3px solid hsl(var(--mint))" } : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isRecommended && (
              <span className="rounded-md bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
                Recommended
              </span>
            )}
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Rank {option.rank}
            </span>
            {option.primary_move_type && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {option.primary_move_type}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold text-foreground">{option.model_name}</h3>
        </div>
      </div>

      {option.fit_tags && option.fit_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {option.fit_tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">Target buyer</span>
          <p className="mt-0.5 text-sm text-foreground">{option.target_buyer}</p>
        </div>
        <div className="rounded-md bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">
            {option.pricing.cadence}
            {option.pricing.model && (
              <span className="text-muted-foreground/70"> · {option.pricing.model}</span>
            )}
          </span>
          <p className="mt-0.5 text-sm font-medium text-primary">{formatPriceRange(option)}</p>
        </div>
        <div className="rounded-md bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
          <p className="mt-0.5 text-sm text-foreground">{option.time_to_first_revenue}</p>
        </div>
        <div className="rounded-md bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">Difficulty</span>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="capitalize">{option.difficulty_rating}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-surface-panel p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
          Why it fits
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {option.why_this_works_for_them}
        </p>
      </div>

      <div className="mt-3 rounded-md bg-surface-panel p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
          Positioning
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{option.positioning}</p>
      </div>

      {option.what_they_are_buying && (
        <div className="mt-3 rounded-md bg-surface-panel p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
            What they're buying
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {option.what_they_are_buying}
          </p>
        </div>
      )}

      {option.caution_note && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50/50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
              Caution
            </p>
            <p className="text-sm leading-relaxed text-amber-900">{option.caution_note}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessPaths({
  options,
  recommended_selection,
  locked = true,
}: Props) {
  const sorted = [...(options ?? [])].sort((a, b) => a.rank - b.rank);
  const selectedRanks = new Set(recommended_selection?.selected_ranks ?? []);

  // ────────────────────────────────────────────────────────────────────────
  // Unlocked render — /plan / post-payment / dev-bypass: show all 10 in full
  // ────────────────────────────────────────────────────────────────────────
  if (!locked) {
    return (
      <div>
        <h2
          className="mb-5 text-lg font-semibold text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          Your 10 Most Viable Paths
        </h2>
        {sorted.map((opt) => (
          <FullOptionCard
            key={opt.rank}
            option={opt}
            isRecommended={selectedRanks.has(opt.rank)}
          />
        ))}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Locked render — /teaser / pre-payment: rank 1 full, ranks 2-3 blurred,
  // ranks 4-10 as greyed-out stubs.
  // ────────────────────────────────────────────────────────────────────────
  const featured = sorted[0];
  const lockedPreviews = sorted.slice(1, 3);
  const stubs = sorted.slice(3);

  return (
    <div>
      <h2
        className="mb-5 text-lg font-semibold text-foreground"
        style={{ letterSpacing: "-0.02em" }}
      >
        Your 10 Most Viable Paths
      </h2>

      {/* Path 1 — full */}
      {featured && (
        <div
          className="mb-4 rounded-md border border-border bg-surface-card p-6"
          style={{ borderTop: "3px solid hsl(var(--mint))" }}
        >
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {(selectedRanks.has(featured.rank) || featured.rank === 1) && (
              <span className="inline-block rounded-md bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
                Best Fit
              </span>
            )}
            {featured.primary_move_type && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {featured.primary_move_type}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {featured.model_name}
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Target buyer</span>
              <p className="mt-0.5 text-sm text-foreground">{featured.target_buyer}</p>
            </div>
            <div className="rounded-md bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">
                {featured.pricing.cadence}
                {featured.pricing.model && (
                  <span className="text-muted-foreground/70"> · {featured.pricing.model}</span>
                )}
              </span>
              <p className="mt-0.5 text-sm font-medium text-primary">
                {formatPriceRange(featured)}
              </p>
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
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Why it fits
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {featured.why_this_works_for_them}
            </p>
          </div>

          <div className="mt-5 rounded-md bg-surface-panel p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Positioning
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{featured.positioning}</p>
          </div>
        </div>
      )}

      {/* Paths 2-3 — locked previews */}
      {lockedPreviews.map((opt) => {
        const teaserText = (opt.positioning ?? "").trim();
        const splitAt = Math.min(120, Math.floor(teaserText.length / 2));
        const visible = teaserText.slice(0, splitAt);
        const blurred = teaserText.slice(splitAt);
        return (
          <div
            key={opt.rank}
            className="relative mb-4 overflow-hidden rounded-md border border-border bg-surface-card p-6"
          >
            {opt.primary_move_type && (
              <span className="mb-2 inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {opt.primary_move_type}
              </span>
            )}
            <h3 className="text-base font-semibold text-foreground">{opt.model_name}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-panel p-3">
                <span className="text-[10px] text-muted-foreground">
                  {opt.pricing.cadence}
                  {opt.pricing.model && (
                    <span className="text-muted-foreground/70"> · {opt.pricing.model}</span>
                  )}
                </span>
                <p className="mt-0.5 text-sm text-foreground">{formatPriceRange(opt)}</p>
              </div>
              <div className="rounded-md bg-surface-panel p-3">
                <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
                <p className="mt-0.5 text-sm text-foreground">{opt.time_to_first_revenue}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{visible}</p>
            <p className="text-sm text-muted-foreground" style={{ filter: "blur(1px)" }}>
              {blurred}
            </p>
            <LockedOverlay label="Unlock full path - £19.99" />
          </div>
        );
      })}

      {/* Paths 4-10 — greyed-out stubs */}
      {stubs.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {stubs.map((p) => (
            <div
              key={p.rank}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-surface-card/50 px-4 py-3 opacity-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {p.rank}
              </span>
              <span className="text-sm text-muted-foreground">{p.model_name}</span>
              <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
