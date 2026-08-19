import { Lock, AlertTriangle, Scale } from "lucide-react";
import LockedOverlay from "./LockedOverlay";
import Reveal from "@/components/Reveal";
import type { SoloCoreReport } from "@/types/canonical";

type Option = SoloCoreReport["options"][number];
type EvidenceItem = NonNullable<Option["evidence"]>[number];

interface Props {
  options: SoloCoreReport["options"];
  recommended_selection?: SoloCoreReport["recommended_selection"];
  /**
   * When true (default), render the teaser variant: rank 1 full,
   * ranks 2-3 blurred behind LockedOverlay, ranks 4-10 as locked stubs.
   * When false, render every option in full detail (post-payment / /plan).
   */
  locked?: boolean;
  /**
   * Phase D (weekly-heartbeat): this week's refreshed evidence, keyed by
   * option rank. When present it replaces each option's generation-time
   * evidence, the panel label carries the refresh week, and rows the
   * heartbeat marked is_new get a NEW chip. Also lets pre-v46 reports
   * (no tier, no baked evidence) show live evidence for the first time.
   */
  refreshedEvidence?: Record<string, EvidenceItem[]>;
  refreshWeekStart?: string | null;
}

/*
 * Sprint 2 (2026-08-18): the unlocked report renders the Phase C honest
 * tiers when the report carries them (generate-report v46+): front runners
 * expanded with their live evidence, credible paths beneath, stretch
 * options clearly framed by their condition. Tie notes render where two
 * options are genuinely level. Reports generated before v46 have no
 * tier/evidence fields and fall back to the previous flat ranked list, so
 * nothing old breaks.
 */

function formatPriceRange(opt: Option): string {
  const p = opt.pricing;
  return `£${p.range_low_gbp.toLocaleString()}–£${p.range_high_gbp.toLocaleString()}`;
}

function formatWeek(weekStart?: string | null): string | null {
  if (!weekStart) return null;
  try {
    const d = new Date(`${weekStart}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

function formatDeadline(deadline?: string | null): string | null {
  if (!deadline) return null;
  try {
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

const TIER_LABEL: Record<string, string> = {
  front_runner: "Front runner",
  credible: "Credible path",
  stretch: "Stretch",
};

/** Sprint 2: semantic difficulty meter. One filled dot for easy, two for
 *  moderate, three for hard, coloured by weight, replacing the old
 *  identical mint dot that said nothing. */
function DifficultyMeter({ rating }: { rating: Option["difficulty_rating"] }) {
  const level = rating === "easy" ? 1 : rating === "moderate" ? 2 : 3;
  const colour = rating === "easy" ? "#15735F" : rating === "moderate" ? "#B45309" : "#1A1915";
  return (
    <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
      <span className="flex items-center gap-[3px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: i <= level ? colour : "#D1CEC7" }}
          />
        ))}
      </span>
      <span className="capitalize">{rating}</span>
    </p>
  );
}

function TierChip({ tier }: { tier: NonNullable<Option["tier"]> }) {
  if (tier === "front_runner") {
    return (
      <span className="bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
        {TIER_LABEL[tier]}
      </span>
    );
  }
  if (tier === "stretch") {
    return (
      <span className="border border-amber-600/40 bg-amber-50/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
        {TIER_LABEL[tier]}
      </span>
    );
  }
  return (
    <span className="bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {TIER_LABEL[tier]}
    </span>
  );
}

/** Small honest-fit numeral. Only rendered on tiered (v46+) reports, where
 *  composite_score is the computed capability match rather than a rank
 *  ordinal. */
function FitChip({ score }: { score: number }) {
  if (typeof score !== "number" || score <= 0 || score > 1) return null;
  return (
    <span className="bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground tabular-nums">
      Fit {score.toFixed(2)}
    </span>
  );
}

/** "Held level" line for genuinely tied options. */
function TieNote({ note }: { note: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 border-l-2 border-[#D1CEC7] pl-3">
      <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

function RadarEvidenceRow({ item }: { item: EvidenceItem }) {
  const week = formatWeek(item.week_start);
  const deadline = formatDeadline(item.deadline);
  const meta = [
    item.source_name || item.source_type || null,
    week ? `week of ${week}` : null,
    item.value_text || null,
    deadline ? `closes ${deadline}` : null,
  ].filter(Boolean);
  const title = item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className="border-b border-[#D1CEC7] font-medium text-foreground transition-colors hover:border-[#15735F] hover:text-[#15735F]"
    >
      {item.title}
    </a>
  ) : (
    <span className="font-medium text-foreground">{item.title}</span>
  );
  return (
    <div className="flex items-start gap-3">
      <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0">
        <p className="text-[13.5px] leading-snug">
          {title}
          {item.is_new && (
            <span className="ml-2 inline-block bg-surface-mint-tint px-1.5 py-px align-[2px] text-[9px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--mint-text))]">
              New
            </span>
          )}
        </p>
        {meta.length > 0 && (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{meta.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

/** Phase C evidence block: live Radar signals, the rate calibration, or an
 *  honest coverage note. Deterministic data attached server-side. */
function EvidencePanel({
  evidence,
  refreshWeek,
}: {
  evidence: EvidenceItem[];
  refreshWeek?: string | null;
}) {
  if (!evidence || evidence.length === 0) return null;
  const radar = evidence.filter((e) => e.kind === "radar" && e.title);
  const rate = evidence.find((e) => e.kind === "rate" && e.text);
  const coverage = evidence.find((e) => e.kind === "coverage" && e.text);
  if (radar.length === 0 && !rate && !coverage) return null;
  const weekLabel = refreshWeek ? formatWeek(refreshWeek) : null;
  return (
    <div className="mt-3 border border-border bg-white p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Live evidence <span className="text-muted-foreground/40">·</span>{" "}
        <span className="text-[#15735F]">
          {weekLabel ? `refreshed week of ${weekLabel}` : "this fortnight"}
        </span>
      </p>
      <div className="space-y-2.5">
        {radar.map((item, i) => (
          <RadarEvidenceRow key={i} item={item} />
        ))}
        {coverage && radar.length === 0 && (
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">{coverage.text}</p>
        )}
      </div>
      {rate && (
        <p className="mt-3 border-t border-border pt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {rate.text}
        </p>
      )}
    </div>
  );
}

/** Band heading between tiers, in the report's editorial register. */
function TierBand({ label, explainer }: { label: string; explainer: string }) {
  return (
    <div className="mb-4 mt-8 border-t border-border pt-4 first:mt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {label}
        </h3>
        <p className="text-[12.5px] text-muted-foreground">{explainer}</p>
      </div>
    </div>
  );
}

function FullOptionCard({
  option,
  isRecommended,
  tiered,
  compact = false,
  refreshedEvidence,
  refreshWeekStart,
}: {
  option: Option;
  isRecommended: boolean;
  tiered: boolean;
  compact?: boolean;
  refreshedEvidence?: EvidenceItem[];
  refreshWeekStart?: string | null;
}) {
  const isStretch = option.tier === "stretch";
  // Phase D: this week's refresh wins over generation-time evidence, and
  // gives pre-v46 reports (untiered, no baked evidence) a live panel too.
  const evidence = refreshedEvidence ?? option.evidence;
  const evidenceWeek = refreshedEvidence ? refreshWeekStart ?? null : null;
  return (
    <div
      className={`mb-4 border bg-surface-card ${compact ? "p-5" : "p-6"} ${
        isStretch ? "border-amber-600/30" : "border-border"
      }`}
      style={
        isRecommended ? { borderTop: "3px solid hsl(var(--mint))" } : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isRecommended && (
              <span className="bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
                Recommended
              </span>
            )}
            {tiered && option.tier ? (
              <TierChip tier={option.tier} />
            ) : (
              <span className="bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Rank {option.rank}
              </span>
            )}
            {tiered && <FitChip score={option.composite_score} />}
            {option.primary_move_type && (
              <span className="bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {option.primary_move_type}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold text-foreground">{option.model_name}</h3>
          {tiered && option.tie_note && <TieNote note={option.tie_note} />}
        </div>
      </div>

      {option.fit_tags && option.fit_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {option.fit_tags.map((tag, i) => (
            <span
              key={i}
              className="border border-border px-2.5 py-0.5 text-[11px] font-medium text-[#15735F]"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">Target buyer</span>
          <p className="mt-0.5 text-sm text-foreground">{option.target_buyer}</p>
        </div>
        <div className="bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">
            {option.pricing.cadence}
            {option.pricing.model && (
              <span className="text-muted-foreground/70"> · {option.pricing.model}</span>
            )}
          </span>
          <p className="mt-0.5 text-sm font-medium text-primary">{formatPriceRange(option)}</p>
        </div>
        <div className="bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
          <p className="mt-0.5 text-sm text-foreground">{option.time_to_first_revenue}</p>
        </div>
        <div className="bg-surface-panel p-3">
          <span className="text-[10px] text-muted-foreground">Difficulty</span>
          <DifficultyMeter rating={option.difficulty_rating} />
        </div>
      </div>

      <div className="mt-5 bg-surface-panel p-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
          Why it fits
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {option.why_this_works_for_them}
        </p>
      </div>

      {!compact && (
        <div className="mt-3 bg-surface-panel p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
            Positioning
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{option.positioning}</p>
        </div>
      )}

      {!compact && option.what_they_are_buying && (
        <div className="mt-3 bg-surface-panel p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
            What they're buying
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {option.what_they_are_buying}
          </p>
        </div>
      )}

      {option.caution_note && (
        <div className="mt-3 flex items-start gap-2 border-l-[3px] border-amber-500 bg-amber-50/50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
              {isStretch ? "What would have to be true" : "Caution"}
            </p>
            <p className="text-sm leading-relaxed text-amber-900">{option.caution_note}</p>
          </div>
        </div>
      )}

      {(tiered || refreshedEvidence) && evidence && (
        <EvidencePanel evidence={evidence} refreshWeek={evidenceWeek} />
      )}
    </div>
  );
}

export default function BusinessPaths({
  options,
  recommended_selection,
  locked = true,
  refreshedEvidence,
  refreshWeekStart,
}: Props) {
  const sorted = [...(options ?? [])].sort((a, b) => a.rank - b.rank);
  const selectedRanks = new Set(recommended_selection?.selected_ranks ?? []);
  const tiered = sorted.some((o) => !!o.tier);
  const refreshFor = (opt: Option): EvidenceItem[] | undefined =>
    refreshedEvidence?.[String(opt.rank)];

  // ────────────────────────────────────────────────────────────────────────
  // Unlocked render — /plan / post-payment / dev-bypass.
  // v46+ reports: tier bands. Older reports: the previous flat ranked list.
  // ────────────────────────────────────────────────────────────────────────
  if (!locked) {
    if (!tiered) {
      return (
        <div>
          <h2 className="report-h2 mb-5">Your 10 Most Viable Paths</h2>
          {sorted.map((opt, i) => (
            <Reveal key={opt.rank} hero={i === 0} delay={i === 0 ? 80 : 0}>
              <FullOptionCard
                option={opt}
                isRecommended={selectedRanks.has(opt.rank)}
                tiered={false}
                refreshedEvidence={refreshFor(opt)}
                refreshWeekStart={refreshWeekStart}
              />
            </Reveal>
          ))}
        </div>
      );
    }

    const front = sorted.filter((o) => o.tier === "front_runner");
    const credible = sorted.filter((o) => o.tier === "credible");
    const stretch = sorted.filter((o) => o.tier === "stretch");
    const untiered = sorted.filter((o) => !o.tier);

    return (
      <div>
        <h2 className="report-h2">The paths that fit</h2>
        <p className="mb-5 mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {sorted.length} routes matched against your capability profile, in three honest bands.
          Where two are level, we say so and explain the ordering.
        </p>

        {front.length > 0 && (
          <>
            <TierBand
              label="Front runners"
              explainer="The options we would pursue first. Each carries its live evidence."
            />
            {front.map((opt, i) => (
              <Reveal key={opt.rank} hero={i === 0} delay={i === 0 ? 80 : 0}>
                <FullOptionCard
                  option={opt}
                  isRecommended={selectedRanks.has(opt.rank)}
                  tiered
                  refreshedEvidence={refreshFor(opt)}
                  refreshWeekStart={refreshWeekStart}
                />
              </Reveal>
            ))}
          </>
        )}

        {credible.length > 0 && (
          <>
            <TierBand
              label="Credible paths"
              explainer="Real routes that take more effort or a slower ramp."
            />
            {credible.map((opt) => (
              <FullOptionCard
                key={opt.rank}
                option={opt}
                isRecommended={selectedRanks.has(opt.rank)}
                tiered
                compact
                refreshedEvidence={refreshFor(opt)}
                refreshWeekStart={refreshWeekStart}
              />
            ))}
          </>
        )}

        {stretch.length > 0 && (
          <>
            <TierBand
              label="Stretch options"
              explainer="Named because the reward justifies it. Each states what would have to be true."
            />
            {stretch.map((opt) => (
              <FullOptionCard
                key={opt.rank}
                option={opt}
                isRecommended={selectedRanks.has(opt.rank)}
                tiered
                compact
                refreshedEvidence={refreshFor(opt)}
                refreshWeekStart={refreshWeekStart}
              />
            ))}
          </>
        )}

        {untiered.map((opt) => (
          <FullOptionCard
            key={opt.rank}
            option={opt}
            isRecommended={selectedRanks.has(opt.rank)}
            tiered={false}
            refreshedEvidence={refreshFor(opt)}
            refreshWeekStart={refreshWeekStart}
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
      <h2 className="report-h2 mb-5">Your 10 Most Viable Paths</h2>

      {/* Path 1 — full. Sprint 3: the rank-1 entrance, the page's one
        * considered arrival. */}
      {featured && (
        <Reveal hero delay={80}>
        <div
          className="mb-4 border border-border bg-surface-card p-6"
          style={{ borderTop: "3px solid hsl(var(--mint))" }}
        >
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {(selectedRanks.has(featured.rank) || featured.rank === 1) && (
              <span className="inline-block bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">
                Best Fit
              </span>
            )}
            {featured.primary_move_type && (
              <span className="bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {featured.primary_move_type}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {featured.model_name}
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Target buyer</span>
              <p className="mt-0.5 text-sm text-foreground">{featured.target_buyer}</p>
            </div>
            <div className="bg-surface-panel p-3">
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
            <div className="bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
              <p className="mt-0.5 text-sm text-foreground">{featured.time_to_first_revenue}</p>
            </div>
            <div className="bg-surface-panel p-3">
              <span className="text-[10px] text-muted-foreground">Difficulty</span>
              <DifficultyMeter rating={featured.difficulty_rating} />
            </div>
          </div>

          <div className="mt-5 bg-surface-panel p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Why it fits
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {featured.why_this_works_for_them}
            </p>
          </div>

          <div className="mt-5 bg-surface-panel p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Positioning
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{featured.positioning}</p>
          </div>
        </div>
        </Reveal>
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
            className="relative mb-4 overflow-hidden border border-border bg-surface-card p-6"
          >
            {opt.primary_move_type && (
              <span className="mb-2 inline-block bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {opt.primary_move_type}
              </span>
            )}
            <h3 className="text-base font-semibold text-foreground">{opt.model_name}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-surface-panel p-3">
                <span className="text-[10px] text-muted-foreground">
                  {opt.pricing.cadence}
                  {opt.pricing.model && (
                    <span className="text-muted-foreground/70"> · {opt.pricing.model}</span>
                  )}
                </span>
                <p className="mt-0.5 text-sm text-foreground">{formatPriceRange(opt)}</p>
              </div>
              <div className="bg-surface-panel p-3">
                <span className="text-[10px] text-muted-foreground">Time to first revenue</span>
                <p className="mt-0.5 text-sm text-foreground">{opt.time_to_first_revenue}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{visible}</p>
            <p className="text-sm text-muted-foreground" style={{ filter: "blur(1px)" }}>
              {blurred}
            </p>
            <LockedOverlay label="Get the full path - £19.99" />
          </div>
        );
      })}

      {/* Paths 4-10 — greyed-out stubs */}
      {stubs.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {stubs.map((p) => (
            <div
              key={p.rank}
              className="flex items-center gap-3 border border-border/60 bg-surface-card/50 px-4 py-3 opacity-50"
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
