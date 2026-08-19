import { ArrowLeft } from "lucide-react";

/*
 * ProgressHeader — Pass 1 /cv-upload v1 (2026-05-16)
 *
 * Editorial header for any funnel step that uses one. Currently /cv-upload
 * and every step of /questionnaire. The visual language matches the
 * SectionLabel + eyebrow vocabulary established on the home page in Pass 1.
 *
 * v1 changes from the pre-facelift version:
 *   1. Small-caps step numerals with mint accent prefix, hairline rules
 *      between steps. Drops the chunky filled-bar feel for an editorial
 *      colophon.
 *   2. New optional `timeEstimate` prop renders a right-aligned chip
 *      ("≈ 1 min", "≈ 40 min"). Locked as a funnel-wide ProgressHeader
 *      pattern per Pass 1 /cv-upload F3 resolution 2026-05-16 — see
 *      admin/screen-specs/06-cv-upload.md and the ProgressHeader entry in
 *      admin/component-inventory.md v1.2.
 *   3. When `labels` exceeds 5 items (e.g. /questionnaire's per-step view),
 *      collapses to a compact "Step N / M" + thin progress segment for
 *      narrow layouts.
 *
 * The header sits inside the page's ivory panel rather than acting as a
 * separate banner — see CVUpload.tsx for how it's composed inside the
 * panel.
 */

interface ProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  onBack?: () => void;
  /**
   * Optional time-effort chip rendered right-aligned in muted small-caps
   * (e.g. "≈ 1 min" on /cv-upload, "≈ 40 min" on /questionnaire). The chip
   * is editorial wayfinding, not a SaaS time-to-completion widget.
   */
  timeEstimate?: string;
}

export default function ProgressHeader({
  currentStep,
  totalSteps,
  labels,
  onBack,
  timeEstimate,
}: ProgressHeaderProps) {
  const showLabels = labels.length <= 5;
  const stepNumLabel = String(currentStep).padStart(2, "0");

  return (
    <div className="border-b border-border pb-5 mb-8">
      <div className="flex items-center gap-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}

        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0">
          <span className="text-[#15735F] mr-2 tabular-nums">{stepNumLabel}</span>
          Step {currentStep} of {totalSteps}
        </div>

        {showLabels ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {labels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;
              return (
                <div key={`${label}-${i}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {i > 0 && (
                    <div
                      className={`h-px flex-1 transition-colors ${
                        isCompleted ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold tabular-nums tracking-[0.1em] ${
                        isActive || isCompleted
                          ? "text-[#15735F]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {String(stepNum).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap transition-colors ${
                        isActive
                          ? "text-foreground border-b-[1.5px] border-primary pb-0.5"
                          : isCompleted
                          ? "text-muted-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-0.5 bg-border overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground tabular-nums shrink-0">
              {labels[currentStep - 1] ?? `Step ${currentStep}`}
            </span>
          </div>
        )}

        {timeEstimate && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground tabular-nums shrink-0">
            {timeEstimate}
          </div>
        )}
      </div>
    </div>
  );
}
