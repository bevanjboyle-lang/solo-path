import { Lock } from "lucide-react";
import LockedOverlay from "./LockedOverlay";

export default function BusinessPaths() {
  return (
    <div>
      <h2 className="mb-5 text-lg font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Your 10 Most Viable Paths</h2>

      {/* Path 1 - Full */}
      <div className="mb-4 rounded-md border border-border bg-surface-card p-6" style={{ borderTop: "3px solid hsl(var(--mint))" }}>
        <span className="mb-3 inline-block rounded-md bg-surface-mint-tint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--mint-text))]">Best Fit</span>
        <h3 className="mt-1 text-base font-semibold text-foreground">Independent Risk Consultant</h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Target clients</span>
            <p className="mt-0.5 text-sm text-foreground">FinTechs, scale-ups, RegTech firms</p>
          </div>
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Day rate</span>
            <p className="mt-0.5 text-sm font-medium text-primary">£600–£850</p>
          </div>
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Time to first client</span>
            <p className="mt-0.5 text-sm text-foreground">6–10 weeks</p>
          </div>
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Confidence</span>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> High
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md bg-surface-panel p-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Why it fits</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your Big Four brand plus deep FS regulatory knowledge is exactly what a Series B FinTech needs when hiring their first Head of Risk but can't afford a full-time person yet.
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Your first three moves</p>
          <div className="flex flex-col gap-2">
            {[
              "Identify 15 FinTechs in Edinburgh that have raised Series A/B in the last 18 months.",
              "Write one LinkedIn post about a regulatory challenge you navigated at the Big Four — no jargon, just the story.",
              "DM three Edinburgh FinTech founders directly. Skip recruiters at this stage.",
            ].map((text, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                <p className="text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Path 2 - Locked */}
      <div className="relative mb-4 overflow-hidden rounded-md border border-border bg-surface-card p-6">
        <h3 className="text-base font-semibold text-foreground">Risk &amp; Compliance Trainer / Course Creator</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Day rate</span>
            <p className="mt-0.5 text-sm text-foreground">£400–£650</p>
          </div>
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Time to first client</span>
            <p className="mt-0.5 text-sm text-foreground">8–12 weeks</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Create structured training programmes for mid-market firms that need regulatory upskilling but</p>
        <p className="text-sm text-muted-foreground" style={{ filter: "blur(2px)" }}>can't justify hiring a full-time compliance lead. Your ability to translate complex frameworks into plain language is the differentiator.</p>
        <LockedOverlay label="Unlock full path - £19.99" />
      </div>

      {/* Path 3 - Locked */}
      <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
        <h3 className="text-base font-semibold text-foreground">Embedded Ops Lead (Scale-up)</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Day rate</span>
            <p className="mt-0.5 text-sm text-foreground">£500–£750</p>
          </div>
          <div className="rounded-md bg-surface-panel p-3">
            <span className="text-[10px] text-muted-foreground">Time to first client</span>
            <p className="mt-0.5 text-sm text-foreground">6–10 weeks</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Join a fast-growing company part-time as an embedded operational leader bringing</p>
        <p className="text-sm text-muted-foreground" style={{ filter: "blur(2px)" }}>structured process and governance to teams that have outgrown their startup ways of working. Your audit background makes you unusually effective at this.</p>
        <LockedOverlay label="Unlock full path - £19.99" />
      </div>

      {/* Paths 4–10 - Greyed out stubs */}
      <div className="mt-4 flex flex-col gap-2">
        {[
          { rank: 4, title: "Fractional Chief Risk Officer" },
          { rank: 5, title: "RegTech Product Advisor" },
          { rank: 6, title: "Compliance Programme Builder" },
          { rank: 7, title: "Due Diligence Consultant (M&A)" },
          { rank: 8, title: "Board-Level Risk Advisor (SME)" },
          { rank: 9, title: "Operational Resilience Specialist" },
          { rank: 10, title: "Risk Training Content Creator (Digital)" },
        ].map((p) => (
          <div key={p.rank} className="flex items-center gap-3 rounded-md border border-border/60 bg-surface-card/50 px-4 py-3 opacity-50">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{p.rank}</span>
            <span className="text-sm text-muted-foreground">{p.title}</span>
            <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
