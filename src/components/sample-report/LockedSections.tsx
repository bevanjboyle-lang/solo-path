import { Lock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LockedOverlay from "./LockedOverlay";

function LockedCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
      <h2 className="mb-3 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>{title}</h2>
      {children}
      <LockedOverlay />
    </div>
  );
}

export function RecommendationTeaser() {
  return (
    <LockedCard title="Solo's Recommendation">
      <p className="text-sm text-muted-foreground">Based on your profile, Path 1 is the strongest fit because—</p>
      <p className="text-sm text-muted-foreground" style={{ filter: "blur(4px)" }}>
        your regulatory fluency combined with stakeholder management experience maps directly to the fractional risk consulting model. The demand signal in Edinburgh's FinTech corridor is strong enough to support a pipeline within 8 weeks.
      </p>
    </LockedCard>
  );
}

export function IncomeOutlookTeaser() {
  const bars = [
    { label: "Month 3", h: "40%" },
    { label: "Month 6", h: "65%" },
    { label: "Month 12", h: "90%" },
  ];
  return (
    <LockedCard title="Reality Check & Income Outlook">
      <div className="flex items-end justify-center gap-6 py-4" style={{ filter: "blur(5px)" }}>
        {bars.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-1">
            <div className="w-12 rounded-t-md bg-primary" style={{ height: b.h, minHeight: 30 }} />
            <span className="text-[10px] text-muted-foreground">{b.label}</span>
          </div>
        ))}
      </div>
    </LockedCard>
  );
}

export function ActivationPlanTeaser() {
  const phases = [
    { label: "Week 1–2: Foundations", color: "bg-primary" },
    { label: "Week 3–4: First Outreach", color: "bg-primary/70" },
    { label: "Week 5–8: Pipeline Building", color: "bg-primary/50" },
    { label: "Week 9–12: First Revenue", color: "bg-primary/30" },
  ];
  const tasks = [
    "Day 1: Update LinkedIn headline to signal consulting availability",
    "Day 2: Write your war story post from your Big Four achievement",
    "Day 3: Send 3 reconnect messages to former colleagues",
  ];

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>30-Day Activation Plan</h2>

      {/* Gantt-style phases */}
      <div className="mb-4 flex flex-col gap-1.5">
        {phases.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`h-3 rounded-sm ${p.color}`} style={{ width: `${70 - i * 10}%` }} />
            <span className="shrink-0 text-[10px] text-muted-foreground">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Visible tasks */}
      <div className="flex flex-col gap-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {t}
          </div>
        ))}
      </div>

      {/* Blurred rest */}
      <div style={{ filter: "blur(4px)" }} className="mt-2 flex flex-col gap-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Day 4: Draft your 60-second consulting pitch</div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Day 5: Identify and join 3 relevant Slack communities</div>
      </div>

      <p className="mt-3 text-[10px] italic text-muted-foreground">Includes ready-to-send outreach drafts for every contact task</p>

      <LockedOverlay />
    </div>
  );
}

export function FirstMoveTeaser() {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-mint-tint p-6">
      <h2 className="mb-2 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>Your First Move — Do This Within 24 Hours</h2>
      <p className="text-sm text-muted-foreground">Send this exact message to [specific contact type]...</p>
      <p className="mt-1 text-sm text-muted-foreground" style={{ filter: "blur(4px)" }}>
        "Hi [Name], I'm moving into independent consulting focused on regulatory risk for growth-stage companies. Given your experience at [Company], I'd value 15 minutes of your perspective on the market."
      </p>
      <p className="mt-2 text-[10px] italic text-muted-foreground">Includes a complete ready-to-send draft personalised to your profile.</p>
      <LockedOverlay />
    </div>
  );
}

export function LocalMarketTeaser() {
  return (
    <LockedCard title="Local Market Feasibility — Edinburgh">
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li>• Day rate benchmarks for Risk Managers going independent in Edinburgh</li>
        <li>• Which sectors are actively hiring fractional risk expertise right now</li>
        <li>• Competitor landscape and positioning gaps</li>
      </ul>
    </LockedCard>
  );
}

export function AIImpactTeaser() {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
      <h2 className="mb-3 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>AI Impact &amp; Adaptation Path</h2>
      <div className="flex flex-col gap-3">
        {["1. AI risk to your current role", "2. AI resilience of your Plan B", "3. Your adaptation path"].map((h) => (
          <div key={h}>
            <p className="text-sm font-medium text-foreground">{h}</p>
            <p className="mt-1 text-sm text-muted-foreground" style={{ filter: "blur(4px)" }}>Detailed analysis of how AI capabilities intersect with your specific skill profile and recommended positioning adjustments.</p>
          </div>
        ))}
      </div>
      <LockedOverlay />
    </div>
  );
}

export function FullReportGrid() {
  const items = [
    "Profile & Archetype Analysis",
    "Up to 5 Parallel Opportunities",
    "Personalised Recommendation",
    "Reality Check & Income Outlook",
    "Hook Insight",
    "First Move (24-hour action)",
    "30-Day Activation Plan",
    "Ready-to-Send Outreach Drafts",
    "Network Activation Toolkit (4 templates)",
    "Local Market Feasibility Snapshot",
    "AI Impact & Adaptation Path",
    "30 Days of Adaptive Tracker Access",
  ];

  return (
    <div>
      <h2 className="mb-5 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>Everything in your £19.99 report</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-md border border-border bg-surface-card p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
            <span className="text-xs text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BottomCTA() {
  const navigate = useNavigate();
  return (
    <section className="rounded-md bg-primary py-16">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Ready for your own report?
        </h2>
        <p className="mt-3 text-sm text-primary-foreground/70">
          Takes 8 minutes. Costs £19.99. Changes how you think about your options.
        </p>
        <Button
          size="lg"
          className="mt-6 rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
          onClick={() => navigate("/auth")}
        >
          Take the test →
        </Button>
        <p className="mt-3 text-xs text-primary-foreground/50">12-question questionnaire. No credit card required to start.</p>
      </div>
    </section>
  );
}
