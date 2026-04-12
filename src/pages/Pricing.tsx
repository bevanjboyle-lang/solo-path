import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import SoloLogo from "@/components/SoloLogo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

interface Feature {
  text: string;
  locked?: boolean;
}

interface PricingCard {
  badge: string;
  badgeClass: string;
  title: string;
  price: string;
  subtitle: string;
  features: Feature[];
  cta: string;
  ctaVariant: "filled" | "outline";
  href: string;
  highlighted?: boolean;
  footnote?: string;
}

const cards: PricingCard[] = [
  {
    badge: "FREE",
    badgeClass: "bg-surface-inset text-muted-foreground",
    title: "See if Solo is for you",
    price: "£0",
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
    price: "£19.99",
    subtitle: "One-time payment. Yours to keep.",
    highlighted: true,
    features: [
      { text: "First Move - your named post-payment action, ready immediately" },
      { text: "Hook insight - full paragraph" },
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
    price: "£19/mo",
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
    <div className="min-h-screen bg-background text-foreground">
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
      <PanelLayout wide className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              className={`relative flex flex-col rounded-[10px] border p-6 ${
                card.highlighted
                  ? "border-primary shadow-card-hover bg-surface-mint-tint"
                  : "border-border bg-surface-card"
              }`}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              custom={i}
            >
              <span className={`mb-4 inline-block w-fit rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${card.badgeClass}`}>
                {card.badge}
              </span>

              <h3 className="font-display text-base font-semibold text-foreground">{card.title}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-foreground">{card.price}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {card.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.locked ? (
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    ) : (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
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
            </motion.div>
          ))}
        </div>
      </PanelLayout>

      {/* FAQ */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <motion.h2
            className="font-display mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ letterSpacing: "-0.02em" }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            Questions about pricing
          </motion.h2>

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
        </div>
      </PanelLayout>

      {/* CTA */}
      <PanelLayout className="overflow-hidden">
        <section className="bg-primary py-24 rounded-2xl">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <motion.h2 className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl" style={{ letterSpacing: "-0.02em" }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              Start with the free preview. Decide from there.
            </motion.h2>
            <motion.div className="mt-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Button size="lg" className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90" onClick={() => navigate("/auth")}>
                Take the test →
              </Button>
            </motion.div>
          </div>
        </section>
      </PanelLayout>

      <Footer />
    </div>
  );
}
