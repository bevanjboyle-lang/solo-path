interface ProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export default function ProgressHeader({ currentStep, totalSteps, labels }: ProgressHeaderProps) {
  return (
    <div className="w-full border-b border-border bg-[hsl(var(--surface-panel))]">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
        <span className="text-sm font-medium text-[hsl(var(--text-muted))]">
          Step {currentStep} of {totalSteps}
        </span>
        <div className="flex items-center gap-1.5 flex-1">
          {labels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            return (
              <div key={label} className="flex items-center gap-1.5 flex-1">
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
      </div>
    </div>
  );
}
