import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Feature {
  text: string;
  locked?: boolean;
}

interface PricingCard {
  badge: string;
  badgeClass: string;
  title: string;
  priceWhole: number;
  priceSuffix?: string;
  pricePrefix?: string;
  subtitle: string;
  features: Feature[];
  cta: string;
  ctaVariant: "filled" | "outline";
  href: string;
  highlighted?: boolean;
  recommended?: boolean;
  footnote?: string;
}

const cards: PricingCard[] = [
  {
    badge: "FREE",
    badgeClass: "bg-surface-inset text-muted-foreground",
    title: "See if Solo is for you",
    priceWhole: 0,
    pricePrefix: "£",
    subtitle: "No account needed to start",
    features: [
      { text: "Your professional archetype + profile interpretation" },
      { text: "One hook insight headline" },
      { text: "Your top-ranked business path headline" },
      { text: "Additional path names (locked)", locked: true },
      { text: "Recommendation", locked: true },
    ],
    cta: "Start the free preview →",
    ctaVariant: "outline",
    href: "/auth",
  },
  {
    badge: "MOST POPULAR",
    badgeClass: "bg-accent text-accent-foreground",
    title: "Your Plan B Report",
    priceWhole: 19,
    priceSuffix: ".99",
    pricePrefix: "£",
    subtitle: "One-time payment. Yours to keep.",
    highlighted: true,
    recommended: true,
    features: [
      { text: "First Move - your named post-payment action, ready immediately" },
      
      { text: "Up to 10 business paths scored and ranked for your profile - select up to 5 to explore in parallel" },
      { text: "Portfolio approach - pursue multiple paths at once instead of betting on one" },
      { text: "Reality check - what's likely to go wrong" },
      { text: "Income outlook calibrated to your seniority" },
      { text: "30-day Activation Plan with outreach drafts baked into every task" },
      { text: "Network Activation Toolkit - 4 personalised outreach templates" },
      { text: "Local Market Feasibility Snapshot" },
      { text: "AI Impact & Adaptation Section - how AI affects your archetype + how to adapt" },
      { text: "30-day Adaptive Tracker - daily check-ins, replan when you drift" },
      { text: "3 Guidance Modules included - Business Structure, Registration & Setup, and Professional Presence" },
    ],
    cta: "Get your Plan B Report, £19.99 →",
    ctaVariant: "filled",
    href: "/auth",
  },
  {
    badge: "ONGOING",
    badgeClass: "bg-surface-inset text-muted-foreground",
    title: "Solo Subscription",
    priceWhole: 19,
    priceSuffix: "/mo",
    pricePrefix: "£",
    subtitle: "Or £149/year. After your initial 30 days.",
    features: [
      { text: "Everything in the full report" },
      { text: "Ongoing Adaptive Tracker: daily check-ins that continue for as long as you are subscribed" },
      { text: "Full Guidance Library - 25 structured modules across 5 tracks (Modules 1–3 already included in your report)" },
      { text: "Ask Solo - on-demand career strategy conversations" },
      { text: "Replan engine if you go off track" },
      { text: "Progress tracking across all 4 phases" },
      { text: "Cancel any time" },
    ],
    cta: "Learn more →",
    ctaVariant: "outline",
    href: "/how-it-works",
    footnote: "Available after your initial 30-day plan completes.",
  },
];

const faqs = [
  { q: "Why isn't the full report free?", a: "Building a high-quality, personalised Plan B report requires serious computation and curated logic. The £19.99 covers that and ensures we can keep improving the product." },
  { q: "What if I'm not satisfied with my report?", a: "If your report genuinely doesn't feel relevant to your background, get in touch. We'll look at it and make it right." },
  { q: "Is this a subscription?", a: "The full report is a one-time payment. The Adaptive Tracker is optional and billed monthly. You can cancel any time." },
  { q: "Can I come back to my report later?", a: "Yes. Your report is saved to your account and accessible any time you return." },
  { q: "Do I need to create an account to start?", a: "No. You can complete the assessment and see your free preview without an account. You'll create one when you pay for the full report." },
  { q: "What's the Adaptive Tracker and do I need it?", a: "The Tracker is a 30-day guided activation system - daily AI check-ins, progress tracking, and a plan that adapts if you fall behind. It's optional. The full report stands alone as a useful product." },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-foreground">
      <MintTopBar />
      <Navbar />

      {/* HERO */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        <section className="flex flex-col items-center justify-center pb-4">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h1
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: "-0.02em" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Simple, honest pricing.
            </motion.h1>
            <motion.p
              className="mt-4 text-base text-muted-foreground sm:text-lg"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              One product. Two ways to engage. No plans you'll forget about.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      {/* PRICING CARDS */}
      <PanelLayout wide className="px-6 py-16 sm:px-10 relative overflow-hidden">
        {/* Mint radial glow behind cards */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, rgba(46,205,176,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="relative mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 items-start">
          {cards.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 0.12}>
              <GlassCard
                className={`relative flex flex-col p-6 transition-all duration-300 ${
                  card.highlighted
                    ? "lg:scale-[1.02] border-0"
                    : ""
                }`}
                style={card.highlighted ? {
                  background: "#e8faf6",
                  border: "1px solid #c5f0e8",
                } : undefined}
              >
                {/* Metallic top border for highlighted card */}
                {card.highlighted && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(46,205,176,0.4) 50%, transparent 100%)",
                    }}
                  />
                )}

                {/* Recommended badge */}
                {card.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-primary px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
                      Recommended
                    </span>
                  </div>
                )}

                <span className={`mb-4 inline-block w-fit rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${card.badgeClass}`}>
                  {card.badge}
                </span>

                <h3 className="font-display text-base font-semibold text-foreground">{card.title}</h3>

                {/* Animated price */}
                <div className="mt-3 flex items-baseline gap-0.5">
                  <span className="font-display text-4xl font-extrabold text-foreground" style={{ fontWeight: 800 }}>
                    {card.pricePrefix}<AnimatedCounter target={card.priceWhole} />
                  </span>
                  {card.priceSuffix && (
                    <span className="font-display text-lg font-bold text-foreground/70">{card.priceSuffix}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>

                {/* Annual savings badge for subscription card */}
                {card.title === "Solo Subscription" && (
                  <div className="mt-3">
                    <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-semibold text-accent-foreground animate-savings-glow">
                      Save £79 with annual
                    </span>
                  </div>
                )}

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {card.features.map((f) => (
                    <li
                      key={f.text}
                      className="flex items-start gap-2 text-sm rounded-md px-2 py-1 -mx-2 transition-colors duration-150 hover:bg-[rgba(46,205,176,0.04)]"
                    >
                      {f.locked ? (
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A09A92]" strokeWidth={2} />
                      ) : (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2ECDB0]" strokeWidth={2.5} />
                      )}
                      <span className={f.locked ? "text-muted-foreground/60" : "text-foreground/70"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`mt-6 w-full rounded-md text-sm font-medium transition-all hover:-translate-y-px ${
                    card.ctaVariant === "filled"
                      ? "bg-primary text-primary-foreground hover:bg-[#26B89D] hover:shadow-card-hover"
                      : "border-[1.5px] border-[#D5D0C8] bg-transparent text-foreground hover:border-primary"
                  }`}
                  onClick={() => navigate(card.href)}
                >
                  {card.cta}
                </Button>

                {card.footnote && (
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">{card.footnote}</p>
                )}
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </PanelLayout>

      {/* FAQ */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <h2
              className="font-display mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              Questions about pricing
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

      {/* CTA */}
      <PanelLayout className="overflow-hidden">
        <ScrollReveal>
          <section className="bg-primary py-24 rounded-2xl">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2
                className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Start with the free preview. Decide from there.
              </h2>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
                  onClick={() => navigate("/auth")}
                >
                  Take the test →
                </Button>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </PanelLayout>

    </div>
  );
}
