import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Public sample viewer. Anonymous access — no auth, no devBypass.
 * Toggles between the static Plan B report and 30-day activation plan iframes.
 */
export default function SampleReport() {
  const [view, setView] = useState<"report" | "plan">("report");

  const src = view === "report" ? "/samples/sample-report.html" : "/samples/sample-plan.html";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to home
        </Link>

        <header className="mt-8 mb-6">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
            See what you get
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            A real Sarah Okafor sample. Toggle between the Plan B report and the 30-day activation plan.
          </p>
        </header>

        {/* Pill segmented toggle */}
        <div
          role="tablist"
          aria-label="Sample selector"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1"
        >
          {([
            { key: "report", label: "Report" },
            { key: "plan", label: "Plan" },
          ] as const).map((opt) => {
            const selected = view === opt.key;
            return (
              <button
                key={opt.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setView(opt.key)}
                className="rounded-full px-5 py-1.5 text-sm font-medium transition-colors"
                style={
                  selected
                    ? { background: "#2ECDB0", color: "#0F1714" }
                    : { background: "transparent", color: "hsl(var(--muted-foreground))" }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl overflow-hidden border border-border bg-background">
          <iframe
            key={view}
            src={src}
            title={view === "report" ? "Sample Plan B report" : "Sample 30-day activation plan"}
            style={{ width: "100%", minHeight: "calc(100vh - 240px)", border: "none" }}
          />
        </div>
      </div>
    </main>
  );
}