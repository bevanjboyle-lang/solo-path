import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const skills = [
  { name: "Financial Model Architecture", evidence: "£18m Series B model was primary data room artefact" },
  { name: "Investor-Grade Narrative Construction", evidence: "Board pack rewrite reduced question rate by 40%" },
  { name: "Unit Economics Decomposition", evidence: "CAC/LTV framework adopted as company standard" },
  { name: "FP&A Process Design", evidence: "Built rolling forecast replacing quarterly cycle" },
  { name: "Stakeholder Translation", evidence: 'Described as "the person who makes finance make sense"' },
  { name: "Audit-to-Commercial Bridge", evidence: "3 years EY audit gives regulatory fluency" },
];

const expandedOptions = [
  {
    rank: 1, name: "Financial Modelling & Unit Economics Advisory", score: 34,
    positioning: "Your Series B financial model is the wedge. Founders and CFOs at Seed-to-Series B startups need someone who has built the exact model that closes a round — not a generalist consultant who has read about fundraising.",
    pricing: "£3,000–£8,000 per model / £2,500–£3,500/month retainer",
    buyer: "Seed-to-Series B fintech and SaaS founders preparing for fundraise",
    timeToRevenue: "4–6 weeks",
    difficulty: "Moderate",
  },
  {
    rank: 2, name: "Fintech Financial Advisory & Strategy", score: 31,
    positioning: "You've lived inside a fintech through its scaling phase. Most advisory firms send people who've read about it. You can advise on the specific operational finance problems that hit between Series A and C.",
    pricing: "£2,500–£5,000/month retainer",
    buyer: "Fintech founders and CFOs navigating growth-stage finance operations",
    timeToRevenue: "6–8 weeks",
    difficulty: "Moderate",
  },
  {
    rank: 3, name: "SaaS Financial Operations & CFO Advisory", score: 28,
    positioning: "SaaS companies between £5m–£50m ARR consistently underinvest in financial operations. You can step in as the person who builds the reporting, forecasting, and board pack infrastructure they're missing.",
    pricing: "£3,000–£6,000/month retainer",
    buyer: "SaaS CEOs and COOs at £5m–£50m ARR without a full-time CFO",
    timeToRevenue: "6–10 weeks",
    difficulty: "Moderate–High",
  },
];

const compactOptions = [
  { rank: 4, name: "Pricing Strategy & Customer Economics Consultant", score: 26, pricing: "£2,000–£5,000 per project" },
  { rank: 5, name: "Expert Content & Newsletter Business", score: 24, pricing: "£500–£3,000/month" },
  { rank: 6, name: "Workshop & Training Delivery", score: 23, pricing: "£1,500–£4,000 per workshop" },
  { rank: 7, name: "Fractional CFO Services", score: 21, pricing: "£3,000–£7,000/month" },
  { rank: 8, name: "Due Diligence & Transaction Advisory", score: 20, pricing: "£5,000–£15,000 per engagement" },
  { rank: 9, name: "Financial Systems & Tools Consulting", score: 19, pricing: "£2,000–£4,000 per project" },
  { rank: 10, name: "Board Advisory & NED Roles", score: 18, pricing: "£15,000–£30,000/year per board seat" },
];

const phases = [
  {
    name: "Phase 1: Shared Foundations",
    days: "Days 1–7",
    desc: "Portfolio setup, positioning draft, outreach list",
    tasks: [
      "Draft your one-line positioning statement for each strand",
      "Build a target list of 10 potential buyers across your network",
      "Set up a simple portfolio page or LinkedIn update reflecting your offer",
      "Write your first outreach email using the draft template provided",
      "Map your existing network contacts to your top 3 business options",
      "Schedule 2 informal calls with former colleagues in relevant sectors",
    ],
  },
  { name: "Phase 2: Strand Activation", days: "Days 8–18", desc: "Separate tasks per strand — outreach, pricing validation, first conversations" },
  { name: "Phase 3: Evidence & Review", days: "Days 19–25", desc: "Day 19 portfolio review — assess strand progress and adjust focus" },
  { name: "Phase 4: Focus & Accelerate", days: "Days 26–30", desc: "Day 26 review, double down on what's working" },
];

function SampleBadge() {
  return (
    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest">
      Sample Report
    </Badge>
  );
}

export default function SampleReport() {
  const navigate = useNavigate();
  const [phase1Open, setPhase1Open] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      {/* Sticky sample badge */}
      <div className="fixed top-14 right-4 z-50 hidden sm:block">
        <SampleBadge />
      </div>

      <PanelLayout className="mt-20 px-6 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-[720px] flex flex-col gap-8">

          {/* 1. HEADER */}
          <ScrollReveal>
            <GlassCard noHover className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                    Sarah Chen
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">Senior Financial Analyst at Fintec</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">8 years experience · MSc Finance, LSE · FP&A & Financial Modelling Specialist</p>
                </div>
                <div className="shrink-0 sm:hidden"><SampleBadge /></div>
                <div className="shrink-0 hidden sm:block"><SampleBadge /></div>
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* 2. EXECUTIVE SUMMARY */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Executive Summary</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your strongest commercial asset is the ability to build financial models that directly influence investment decisions. Your Series B fundraise case — where your model was the primary artefact in the data room — is not a transferable skill; it's a sellable product.
              </p>
            </GlassCard>
          </ScrollReveal>

          {/* 3. TRANSFERABLE VALUE */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Transferable Value</h2>
              <div className="space-y-4">
                {skills.map((s, i) => (
                  <div key={i}>
                    <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground italic">Evidence: {s.evidence}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* 4. BUSINESS OPTIONS */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Business Options</h2>

              {/* Expanded top 3 */}
              <div className="space-y-5">
                {expandedOptions.map((o) => (
                  <div key={o.rank} className="rounded-lg border border-border bg-background/50 p-5">
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground" style={{ backgroundColor: "#2ECDB0" }}>
                        {o.rank}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{o.name}</h3>
                      <span className="ml-auto text-xs font-bold text-primary">Score: {o.score}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground mb-3">{o.positioning}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div><span className="font-semibold text-foreground">Pricing:</span> <span className="text-muted-foreground">{o.pricing}</span></div>
                      <div><span className="font-semibold text-foreground">Target buyer:</span> <span className="text-muted-foreground">{o.buyer}</span></div>
                      <div><span className="font-semibold text-foreground">Time to revenue:</span> <span className="text-muted-foreground">{o.timeToRevenue}</span></div>
                      <div><span className="font-semibold text-foreground">Difficulty:</span> <span className="text-muted-foreground">{o.difficulty}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact 4-10 */}
              <div className="mt-4 space-y-2">
                {compactOptions.map((o) => (
                  <div key={o.rank} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-md border border-border/60 bg-background/30 px-4 py-2.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {o.rank}
                      </span>
                      <span className="text-xs font-medium text-foreground">{o.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground sm:whitespace-nowrap ml-8 sm:ml-0">{o.pricing}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* 5. RECOMMENDATION */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Solo's Recommendation</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Financial Modelling & Unit Economics Advisory</span> is the strongest path. Your Series B case is proof of capability that most independent consultants cannot match. The key condition: you need to identify 2–3 founders in your network who are 3–6 months from fundraise.
              </p>
            </GlassCard>
          </ScrollReveal>

          {/* 6. INCOME OUTLOOK */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Income Outlook</h2>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                {[
                  { label: "Year 1", range: "£28,000–£72,000", mid: "£48,000" },
                  { label: "Year 2", range: "£55,000–£95,000", mid: "£72,000" },
                  { label: "Year 3", range: "£75,000–£120,000", mid: "£95,000" },
                ].map((y) => (
                  <div key={y.label} className="rounded-lg border border-border bg-background/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{y.label}</p>
                    <p className="mt-1 text-sm font-bold text-foreground">{y.mid}</p>
                    <p className="text-[10px] text-muted-foreground">{y.range}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Salary replacement analysis:</span> Your current salary is unlikely to be matched in Year 1. The mid-case of £48,000 reflects 3–4 months of pipeline building before the first paying engagement.
              </p>
            </GlassCard>
          </ScrollReveal>

          {/* 7. FIRST MOVE */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">First Move</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Email 2–3 former colleagues who now work at startups approaching fundraise. Lead with your Series B case. The email draft is ready in your activation plan.
              </p>
            </GlassCard>
          </ScrollReveal>

          {/* 8. 30-DAY PLAN PREVIEW */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">30-Day Plan Preview</h2>

              {/* Phase 1 expanded */}
              <Collapsible open={phase1Open} onOpenChange={setPhase1Open}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{phases[0].name}</p>
                    <p className="text-[11px] text-muted-foreground">{phases[0].days} — {phases[0].desc}</p>
                  </div>
                  {phase1Open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 ml-4 space-y-1.5 border-l-2 border-primary/20 pl-4">
                    {phases[0].tasks!.map((t, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                        <span className="mr-2 text-primary font-bold">Day {i + 1}</span>{t}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>

              {/* Phases 2-4 collapsed */}
              <div className="mt-3 space-y-2">
                {phases.slice(1).map((p, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-background/30 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.days} — {p.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* 9. AI IMPACT */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">AI Impact Assessment</h2>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Current role displacement risk: Medium</span> (3–5 year horizon). Tools like Pigment, Anaplan AI, and Runway Financial are automating routine FP&A.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Your Plan B displacement risk: Low</span> — advisory is judgment-driven work that AI enhances but doesn't replace.
                </p>
              </div>
            </GlassCard>
          </ScrollReveal>

          {/* 10. MARKET SNAPSHOT */}
          <ScrollReveal delay={0.05}>
            <GlassCard noHover className="p-6 sm:p-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Market Snapshot — London Fintech</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Strong demand signal.</span> Series A–C fintechs in London are actively hiring fractional finance support. Pricing is viable at £3,000–£8,000 per model.
              </p>
            </GlassCard>
          </ScrollReveal>

          {/* 11. HOOK INSIGHT */}
          <ScrollReveal delay={0.05}>
            <div className="rounded-xl p-6 sm:p-8" style={{ backgroundColor: "rgba(46, 205, 176, 0.08)", border: "1px solid rgba(46, 205, 176, 0.25)" }}>
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                "Your £18m Series B case is the wedge; financial modelling is the lock-in."
              </p>
            </div>
          </ScrollReveal>

          {/* 12. FOOTER CTA */}
          <ScrollReveal delay={0.05}>
            <div className="rounded-2xl py-12 px-6 sm:px-10 text-center" style={{ backgroundColor: "#2ECDB0" }}>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                This is what a Solo report looks like.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">
                Yours will be built from your experience, your sector, your network.
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="rounded-md bg-white px-8 py-4 text-base font-medium hover:bg-white/90"
                  style={{ color: "#2ECDB0" }}
                  onClick={() => navigate("/auth")}
                >
                  Get your report — £19.99
                </Button>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </PanelLayout>

    </div>
  );
}
