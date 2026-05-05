import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SoloCoreReport } from "@/types/canonical";

type Option = SoloCoreReport["options"][number];

interface StrandSelectorProps {
  /** All 10 options as produced by P1 (generate-report). */
  options: SoloCoreReport["options"];
  /** Backend's recommended pre-selection. Used as the initial checked set. */
  recommended_selection: SoloCoreReport["recommended_selection"] | null;
  /**
   * Fired when the user confirms their picks. Called with the chosen ranks
   * (sorted ascending). Plan.tsx wires this to generate-plan and flips status.
   */
  onSubmit: (selected_ranks: number[]) => Promise<void>;
  /** True while generate-plan is being invoked / pre-poll. Disables the UI. */
  submitting: boolean;
}

const MIN_SELECTED = 1;
const MAX_SELECTED = 5;

function formatPriceRange(opt: Option): string {
  const p = opt.pricing;
  return `£${p.range_low_gbp.toLocaleString()}–£${p.range_high_gbp.toLocaleString()}`;
}

interface OptionRowProps {
  option: Option;
  checked: boolean;
  isRecommended: boolean;
  disabled: boolean;
  onToggle: (rank: number) => void;
}

function OptionRow({
  option,
  checked,
  isRecommended,
  disabled,
  onToggle,
}: OptionRowProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    onToggle(option.rank);
  }, [disabled, onToggle, option.rank]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      // Space and Enter both toggle. Default button behaviour fires onClick on
      // Enter; intercept Space to prevent page scroll and toggle explicitly.
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        onToggle(option.rank);
      }
    },
    [disabled, onToggle, option.rank],
  );

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${option.model_name}, rank ${option.rank}`}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        "mb-3 w-full rounded-md border p-5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-primary bg-surface-mint-tint/40"
          : "border-border bg-surface-card hover:border-primary/40 hover:bg-surface-panel",
      ].join(" ")}
      style={
        checked
          ? { borderTop: "3px solid hsl(var(--mint))" }
          : undefined
      }
    >
      <div className="flex items-start gap-4">
        {/* Visual checkbox — driven by `checked`, the whole row is the hit target */}
        <span
          aria-hidden="true"
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
          ].join(" ")}
        >
          {checked && (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 8 6.5 11.5 13 5" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Rank {option.rank}
            </span>
            {isRecommended && (
              <span className="rounded-md bg-surface-mint-tint px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
                Recommended
              </span>
            )}
            {option.primary_move_type && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {option.primary_move_type}
              </span>
            )}
          </div>

          <h3 className="mt-2 text-base font-semibold text-foreground">
            {option.model_name}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-surface-panel p-2.5">
              <span className="text-[10px] text-muted-foreground">Target buyer</span>
              <p className="mt-0.5 text-sm text-foreground">{option.target_buyer}</p>
            </div>
            <div className="rounded-md bg-surface-panel p-2.5">
              <span className="text-[10px] text-muted-foreground">
                {option.pricing.cadence}
              </span>
              <p className="mt-0.5 text-sm font-medium text-primary">
                {formatPriceRange(option)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            <span>{option.time_to_first_revenue}</span>
            <span className="mx-2 text-muted-foreground/50">·</span>
            <span className="capitalize">{option.difficulty_rating}</span>
          </p>

          {option.fit_tags && option.fit_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {option.fit_tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function StrandSelector({
  options,
  recommended_selection,
  onSubmit,
  submitting,
}: StrandSelectorProps) {
  const sorted = useMemo(
    () => [...(options ?? [])].sort((a, b) => a.rank - b.rank),
    [options],
  );

  const recommendedRanks = useMemo<number[]>(() => {
    const fromRec = recommended_selection?.selected_ranks;
    if (Array.isArray(fromRec) && fromRec.length > 0) return fromRec;
    // Fallback: pre-select top 2 by rank if backend gave us nothing.
    return sorted.slice(0, 2).map((o) => o.rank);
  }, [recommended_selection, sorted]);

  const recommendedSet = useMemo(
    () => new Set(recommendedRanks),
    [recommendedRanks],
  );

  // Initialised once from recommendedRanks; user edits drive it after that.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(recommendedRanks),
  );

  // Recommendation rationale is collapsed by default — tone-of-voice principle
  // is to lead with action, not justification. User can expand on demand.
  const [rationaleOpen, setRationaleOpen] = useState(false);

  const toggleRank = useCallback(
    (rank: number) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(rank)) {
          next.delete(rank);
        } else {
          next.add(rank);
        }
        return next;
      });
    },
    [],
  );

  const count = selected.size;
  const tooFew = count < MIN_SELECTED;
  const tooMany = count > MAX_SELECTED;
  const canSubmit = !tooFew && !tooMany && !submitting;

  // Stable disabled-reason for screen readers on the submit button.
  const submitAriaLabel = (() => {
    if (submitting) return "Building your plan, please wait";
    if (tooFew) return "Pick at least 1 path to continue";
    if (tooMany)
      return `Too many selected. Deselect at least ${count - MAX_SELECTED} to continue`;
    return `Build my plan with ${count} selected ${count === 1 ? "path" : "paths"}`;
  })();

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const ranks = Array.from(selected).sort((a, b) => a - b);
    try {
      await onSubmit(ranks);
    } catch {
      // Errors are surfaced by the parent via toast; nothing to do here.
    }
  }, [canSubmit, onSubmit, selected]);

  const rationale = recommended_selection?.rationale ?? null;

  return (
    <motion.section
      aria-labelledby="strand-selector-heading"
      className="rounded-xl border border-border bg-[hsl(var(--surface-panel))] p-6 sm:p-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <header className="mb-6">
        <h2
          id="strand-selector-heading"
          className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          Pick the paths you want to take forward
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pick up to 5 from your 10 options. We've pre-selected the ones we
          recommend — you can swap any.
        </p>

        {rationale && rationale.trim().length > 0 && (
          <Collapsible
            open={rationaleOpen}
            onOpenChange={setRationaleOpen}
            className="mt-4"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {rationaleOpen ? (
                  <>
                    Hide reasoning
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Why these?
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-md bg-surface-card p-4 text-sm leading-relaxed text-muted-foreground">
              {rationale}
            </CollapsibleContent>
          </Collapsible>
        )}
      </header>

      <div role="group" aria-label="Path selection">
        {sorted.map((opt) => (
          <OptionRow
            key={opt.rank}
            option={opt}
            checked={selected.has(opt.rank)}
            isRecommended={recommendedSet.has(opt.rank)}
            disabled={submitting}
            onToggle={toggleRank}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span
            className={[
              "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              tooMany
                ? "bg-red-500/10 text-red-600"
                : tooFew
                  ? "bg-muted text-muted-foreground"
                  : "bg-surface-mint-tint text-[hsl(var(--mint-text))]",
            ].join(" ")}
            aria-live="polite"
          >
            {count} of up to {MAX_SELECTED} selected
          </span>
          {tooFew && (
            <p className="text-xs text-red-600">Pick at least 1 to continue.</p>
          )}
          {tooMany && (
            <p className="text-xs text-red-600">
              You can pick up to {MAX_SELECTED} — deselect at least{" "}
              {count - MAX_SELECTED}.
            </p>
          )}
        </div>

        <Button
          variant="default"
          size="lg"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label={submitAriaLabel}
          className="rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your plan…
            </span>
          ) : (
            "Build my plan"
          )}
        </Button>
      </div>
    </motion.section>
  );
}
