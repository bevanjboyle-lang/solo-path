import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const lockedSections = [
  "Full business model options",
  "Your recommendation",
  "Reality check",
  "14-Day Activation Plan",
  "Network Toolkit",
  "Market Snapshot",
];

export default function Results() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <span className="text-base font-semibold tracking-tight">Solo</span>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your Solo Plan B Report
          </h1>

          {/* Free preview */}
          <div className="mt-10 rounded-xl border border-border bg-card p-8 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Free Preview
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Based on your profile, you fit the <span className="font-medium text-foreground">Strategic Advisor</span> archetype — a professional whose experience in governance, risk, and senior stakeholder engagement positions them well for high-value independent work.
              </p>
              <p>
                Your background suggests strong potential in fractional advisory roles and structured consulting engagements. The full report explores three specific paths tailored to your experience, with pricing guidance and a step-by-step activation plan.
              </p>
            </div>
          </div>

          {/* Paywall */}
          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-4 w-4" />
              Full Report
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {lockedSections.map((s) => (
                <div
                  key={s}
                  className="rounded-lg bg-surface p-3 text-xs text-muted-foreground"
                >
                  {s}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/50 pt-8 text-center">
              <p className="text-lg font-semibold">
                Unlock your full report for £9.99
              </p>
              <p className="text-sm text-muted-foreground">
                One-time payment. No subscription.
              </p>
              <button
                className="mt-2 inline-flex items-center rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                style={{ background: "var(--gradient-cta)" }}
              >
                Get full report →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
