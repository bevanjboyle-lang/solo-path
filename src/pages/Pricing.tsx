import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import PanelLayout from "@/components/PanelLayout";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";

/* ── Card data ── */
interface PricingCardData {
  badge: string;
  title: string;
  price: string;
  priceNote: string;
  features: string[];
  highlighted?: boolean;
}

const reportCard: PricingCardData = {
  badge: "ONE-TIME",
  title: "Your report + 30-day plan",
  price: "£19.99",
  priceNote: "once",
  features: [
    "Professional archetype and profile interpretation",
    "Up to 10 business paths scored and ranked",
    "Portfolio approach — pursue multiple paths at once",
    "Reality check — what's likely to go wrong",
    "Income outlook calibrated to your seniority",
    "30-day Activation Plan with outreach drafts",
    "Network Activation Toolkit — 4 outreach templates",
    "Local Market Feasibility Snapshot",
    "AI Impact and Adaptation Section",
    "30-day Adaptive Tracker with daily check-ins",
    "3 Guidance Modules included",
  ],
  highlighted: true,
};

const subscriptionCard: PricingCardData = {
  badge: "ONGOING",
  title: "Ongoing plan",
  price: "£19/month",
  priceNote: "or £149/year",
  features: [
    "Everything in the report",
    "Ongoing Adaptive Tracker beyond Day 30",
    "Full Guidance Library — 25 modules across 5 tracks",
    "Ask Solo — on-demand career strategy conversations",
    "Replan engine if you go off track",
    "Progress tracking across all 4 phases",
    "Cancel any time",
  ],
};

/* ── Comparison data ── */
const comparisonRows = [
  { label: "Professional archetype + profile", report: true, sub: true },
  { label: "Up to 10 business paths scored", report: true, sub: true },
  { label: "30-day Activation Plan", report: true, sub: true },
  { label: "Network Activation Toolkit", report: true, sub: true },
  { label: "AI Impact Section", report: true, sub: true },
  { label: "Adaptive Tracker (30 days)", report: true, sub: true },
  { label: "3 Guidance Modules", report: true, sub: true },
  { label: "Ongoing Tracker beyond Day 30", report: false, sub: true },
  { label: "Full Guidance Library (25 modules)", report: false, sub: true },
  { label: "Ask Solo conversations", report: false, sub: true },
  { label: "Replan engine", report: false, sub: true },
];

const faqs = [
  {
    q: "Why isn't the full report free?",
    a: "[Placeholder] Building a high-quality, personalised report requires serious computation and curated logic. The £19.99 covers that.",
  },
  {
    q: "Is the subscription required?",
    a: "[Placeholder] No. The report and 30-day plan are a one-time purchase. The subscription is optional, available after your initial 30 days.",
  },
  {
    q: "Can I cancel the subscription?",
    a: "[Placeholder] Yes. Cancel any time. Access continues to the end of your billing period.",
  },
];

/* ── Component ── */
export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const handleStartTest = () => startTest(navigate);
  const handleOpenPlan = () => navigateAuthed(navigate, "/plan");
  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />

      {/* HERO */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <section className="mx-auto max-w-2xl text-center">
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            style={{ letterSpacing: "-0.02em" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            One test. Two ways to keep going.
          </motion.h1>
          <motion.p
            className="mt-4 text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            £19.99 gets you a report and a 30-day plan. £19 a month keeps it rolling.
          </motion.p>
        </section>
      </PanelLayout>

      {/* PRICING CARDS */}
      <PanelLayout wide className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2 items-start">
          {[reportCard, subscriptionCard].map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 0.12}>
              <PricingCard
                card={card}
                isAuthed={!!user}
                isSubscription={i === 1}
                onStartTest={handleStartTest}
                onOpenPlan={handleOpenPlan}
                onSubscribe={handleSubscribe}
              />
            </ScrollReveal>
          ))}
        </div>
      </PanelLayout>

      {/* COMPARISON */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <h2
              className="font-display text-center text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              What each includes
            </h2>
          </ScrollReveal>

          {/* Desktop table */}
          <ScrollReveal delay={0.1}>
            <div className="mt-8 hidden sm:block">
              <ComparisonTable />
            </div>
          </ScrollReveal>

          {/* Mobile collapsible */}
          <div className="mt-8 sm:hidden">
            <GlassCard className="p-4">
              <button
                onClick={() => setComparisonOpen(!comparisonOpen)}
                className="flex w-full items-center justify-between text-sm font-medium text-foreground"
              >
                <span>View comparison</span>
                <span className="text-muted-foreground">{comparisonOpen ? "−" : "+"}</span>
              </button>
              {comparisonOpen && (
                <div className="mt-4">
                  <ComparisonTable />
                </div>
              )}
            </GlassCard>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            One-time payment. No auto-renewal on the report. Cancel subscription anytime.
          </p>
        </div>
      </PanelLayout>

      {/* FAQ */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <h2
              className="font-display mb-8 text-center text-2xl font-semibold tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Pricing questions
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </PanelLayout>

      {/* CLOSING CTA */}
      <PanelLayout className="overflow-hidden">
        <ScrollReveal>
          <section className="bg-primary py-20 rounded-2xl">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2
                className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {user ? "Pick up where you left off." : "See what your Plan B looks like."}
              </h2>
              <div className="mt-8">
                <button
                  onClick={user ? handleOpenPlan : handleStartTest}
                  className="rounded-md bg-primary-foreground px-8 py-3 text-sm font-medium text-primary transition-all hover:bg-primary-foreground/90"
                >
                  {user ? "Open my plan" : "Take the test"}
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </PanelLayout>

      {/* Mobile sticky CTA — visible after scroll */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[hsl(var(--surface-panel))] p-3 sm:hidden">
        <button
          onClick={user ? handleOpenPlan : handleStartTest}
          className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          {user ? "Open my plan" : "Take the test"}
        </button>
      </div>
    </div>
  );
}

/* ── PricingCard sub-component ── */
function PricingCard({
  card,
  isAuthed,
  isSubscription,
  onStartTest,
  onOpenPlan,
  onSubscribe,
}: {
  card: PricingCardData;
  isAuthed: boolean;
  isSubscription: boolean;
  onStartTest: () => void;
  onOpenPlan: () => void;
  onSubscribe: () => void;
}) {
  // Determine CTA
  let ctaLabel = "Take the test";
  let ctaAction = onStartTest;
  let secondaryAction: { label: string; action: () => void } | null = null;

  if (isAuthed && !isSubscription) {
    ctaLabel = "Take the test";
    ctaAction = onStartTest;
  }
  if (isAuthed && isSubscription) {
    secondaryAction = { label: "Upgrade", action: onSubscribe };
  }

  return (
    <GlassCard
      className={`relative flex flex-col p-6 ${card.highlighted ? "lg:scale-[1.02]" : ""}`}
      style={
        card.highlighted
          ? { background: "#e8faf6", border: "1px solid #c5f0e8" }
          : undefined
      }
    >
      {card.highlighted && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(46,205,176,0.4) 50%, transparent 100%)",
          }}
        />
      )}

      <span className="mb-3 inline-block w-fit rounded-md bg-[hsl(var(--surface-inset))] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {card.badge}
      </span>

      <h3 className="font-display text-lg font-semibold text-foreground">{card.title}</h3>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-extrabold text-foreground">{card.price}</span>
        <span className="text-sm text-muted-foreground">{card.priceNote}</span>
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-2">
        {card.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2ECDB0]" strokeWidth={2.5} />
            <span className="text-foreground/70">{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={ctaAction}
        className={`mt-6 w-full rounded-md px-6 py-2.5 text-sm font-medium transition-all hover:-translate-y-px ${
          card.highlighted
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border bg-transparent text-foreground hover:border-primary"
        }`}
      >
        {ctaLabel}
      </button>

      {secondaryAction && (
        <button
          onClick={secondaryAction.action}
          className="mt-2 w-full text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {secondaryAction.label}
        </button>
      )}
    </GlassCard>
  );
}

/* ── Comparison Table ── */
function ComparisonTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="pb-3 text-left font-medium text-muted-foreground">Feature</th>
          <th className="pb-3 text-center font-medium text-muted-foreground">Report</th>
          <th className="pb-3 text-center font-medium text-muted-foreground">Subscription</th>
        </tr>
      </thead>
      <tbody>
        {comparisonRows.map((row) => (
          <tr key={row.label} className="border-b border-border/50">
            <td className="py-2.5 text-foreground/70">{row.label}</td>
            <td className="py-2.5 text-center">
              {row.report ? (
                <Check className="mx-auto h-4 w-4 text-[#2ECDB0]" strokeWidth={2.5} />
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </td>
            <td className="py-2.5 text-center">
              {row.sub ? (
                <Check className="mx-auto h-4 w-4 text-[#2ECDB0]" strokeWidth={2.5} />
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
