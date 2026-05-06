import { Lock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import LockedOverlay from "./LockedOverlay";
import ScrollReveal from "@/components/ui/ScrollReveal";

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
      <p className="text-sm text-muted-foreground">Based on your profile, Path 1 is the strongest fit. Your regulatory fluency combined with nine years of stakeholder management maps directly to the independent risk consulting model.</p>
      <p className="text-sm text-muted-foreground" style={{ filter: "blur(1px)" }}>
        The demand signal in Edinburgh's FinTech corridor is strong — three Series B companies raised in the last quarter alone.
      </p>
    </LockedCard>
  );
}

export function IncomeOutlookTeaser() {
  const data = [
    { name: "Consulting", month3: 2500, month6: 5500, month12: 8500 },
    { name: "Fractional CFO", month3: 4000, month6: 7500, month12: 12000 },
    { name: "Online Course", month3: 500, month6: 3000, month12: 9000 },
  ];

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
      <h2 className="mb-3 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>Reality Check &amp; Income Outlook</h2>
      <div style={{ filter: "blur(1.5px)" }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={2} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#7A7670" }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#FAF9F7",
                border: "1px solid #E5E2DC",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`£${value.toLocaleString()}`, ""]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, color: "#7A7670" }}
            />
            <Bar dataKey="month3" name="3 months" fill="#2ECDB0" radius={[4, 4, 0, 0]} />
            <Bar dataKey="month6" name="6 months" fill="#6EE7D3" radius={[4, 4, 0, 0]} />
            <Bar dataKey="month12" name="12 months" fill="#1A8A72" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LockedOverlay />
    </div>
  );
}

export function ActivationPlanTeaser() {
  const phases = [
    { label: "Foundation", width: "25%", opacity: 0.4 },
    { label: "Outreach", width: "25%", opacity: 0.6 },
    { label: "Delivery", width: "25%", opacity: 0.8 },
    { label: "Review", width: "25%", opacity: 1.0 },
  ];

  const tasks = [
    "Day 1: Update LinkedIn headline: 'Regulatory Risk Consultant | Helping FinTechs & Scale-ups Navigate Compliance'",
    "Day 2: Write your war story post — the audit finding that saved a client from a regulatory fine",
    "Day 3: Send 3 reconnect messages to former Big Four colleagues now in FinTech or consulting",
  ];

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>30-Day Activation Plan</h2>

      {/* Horizontal timeline */}
      <div className="mb-2 flex h-6 w-full overflow-hidden rounded-full bg-surface-inset">
        {phases.map((p, i) => (
          <div
            key={i}
            className="h-full"
            style={{
              width: p.width,
              backgroundColor: `rgba(46,205,176,${p.opacity})`,
              borderRight: i < phases.length - 1 ? "2px solid rgba(250,249,247,0.8)" : "none",
            }}
          />
        ))}
      </div>
      <div className="mb-5 flex">
        {phases.map((p, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] font-medium text-muted-foreground">Wk {i + 1}</span>
            <span className="block text-[9px] text-muted-foreground/70">{p.label}</span>
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
      <div style={{ filter: "blur(1px)" }} className="mt-2 flex flex-col gap-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Day 4: Draft your 60-second pitch for fractional regulatory risk consulting</div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Day 5: Join 3 communities: RegTech London/Edinburgh Slack, FinTech Scotland, and one compliance forum</div>
      </div>

      <p className="mt-3 text-[10px] italic text-muted-foreground">Includes ready-to-send outreach drafts for every contact task</p>

      <LockedOverlay />
    </div>
  );
}

export function FirstMoveTeaser() {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-mint-tint p-6">
      <h2 className="mb-2 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>Your First Move - Do This Within 24 Hours</h2>
      <p className="text-sm text-muted-foreground">Send this exact message to a former Big Four colleague now at a FinTech...</p>
      <p className="mt-1 text-sm text-muted-foreground" style={{ filter: "blur(1px)" }}>
        "Hi [Name], I'm moving into independent consulting focused on regulatory risk for growth-stage companies. Given your experience at [their FinTech/scale-up], I'd value 15 minutes of your perspective on the market."
      </p>
      <p className="mt-2 text-[10px] italic text-muted-foreground">Includes a complete ready-to-send draft personalised to your profile.</p>
      <LockedOverlay />
    </div>
  );
}

export function LocalMarketTeaser() {
  return (
    <LockedCard title="Local Market Feasibility - Edinburgh">
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li>• Day rate benchmarks for Risk Managers going independent in Edinburgh</li>
        <li>• Which sectors are actively hiring fractional risk expertise right now</li>
        <li>• Competitor landscape and positioning gaps</li>
      </ul>
    </LockedCard>
  );
}

export function AIImpactTeaser() {
  const radarData = [
    { subject: "Routine Tasks", score: 72 },
    { subject: "Analysis", score: 45 },
    { subject: "Client Relations", score: 20 },
    { subject: "Strategy", score: 15 },
    { subject: "Creative Work", score: 30 },
  ];

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-surface-card p-6">
      <h2 className="mb-3 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>AI Impact &amp; Adaptation Path</h2>
      <div className="flex flex-col gap-3">
        {["1. AI risk to your current role", "2. AI resilience of your Plan B", "3. Your adaptation path"].map((h) => (
          <div key={h}>
            <p className="text-sm font-medium text-foreground">{h}</p>
            <p className="mt-1 text-sm text-muted-foreground" style={{ filter: "blur(1px)" }}>Detailed analysis of how AI capabilities intersect with your specific skill profile and recommended positioning adjustments.</p>
          </div>
        ))}
      </div>

      {/* Radar chart */}
      <div className="mt-4" style={{ filter: "blur(1.5px)" }}>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#E5E2DC" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: "#7A7670" }}
            />
            <Radar
              dataKey="score"
              stroke="#2ECDB0"
              fill="rgba(46,205,176,0.2)"
              fillOpacity={1}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
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
        <p className="mt-3 text-xs text-primary-foreground/50">15-question questionnaire. No credit card required to start.</p>
      </div>
    </section>
  );
}
