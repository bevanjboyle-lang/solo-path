import { ArrowLeft } from "lucide-react";

interface ProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  onBack?: () => void;
}

export default function ProgressHeader({
  currentStep,
  totalSteps,
  labels,
  onBack,
}: ProgressHeaderProps) {
  const showLabels = labels.length <= 5;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full border-b border-border bg-[hsl(var(--surface-panel))]">
      <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-heading))] transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <span className="text-sm font-medium text-[hsl(var(--text-muted))] shrink-0">
          Step {currentStep} of {totalSteps}
        </span>

        {showLabels ? (
          <div className="flex items-center gap-1.5 flex-1">
            {labels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;
              return (
                <div key={`${label}-${i}`} className="flex items-center gap-1.5 flex-1">
                  {i > 0 && (
                    <div
                      className={`h-px flex-1 transition-colors ${
                        isCompleted ? "bg-[hsl(var(--mint))]" : "bg-border"
                      }`}
                    />
                  )}
                  <span
                    className={`text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "text-[hsl(var(--text-heading))]"
                        : isCompleted
                        ? "text-[hsl(var(--mint-text))]"
                        : "text-[hsl(var(--text-muted))]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[hsl(var(--mint))] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
