import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import SoloLogo from "@/components/SoloLogo";
import { Button } from "@/components/ui/button";
import {
  Upload,
  ClipboardList,
  Cpu,
  Eye,
  FileText,
  CalendarCheck,
  Infinity,
  Quote,
} from "lucide-react";

/* ── animation presets ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/* ── stage data ────────────────────────────────────── */

interface Stage {
  num: string;
  label: string;
  headline: string;
  body: string;
  bullets?: string[];
  statPills?: string[];
  cards2x2?: { label: string; value: string }[];
  callout: string;
  accent?: boolean;
  icon: React.ElementType;
}

const stages: Stage[] = [
  {
    num: "01",
    label: "The starting point",
    headline: "You've built a career. You want a credible fallback.",
    body: "You're capable, structured, and experienced — but you're not naturally entrepreneurial. You don't want generic 'go freelance' advice. You want to know: if your current role became unstable, what specific income path could you build from your actual experience, and how quickly could you get there?",
    callout: "Solo is built for professionals who want commercial realism, not inspiration.",
    icon: Eye,
  },
  {
    num: "02",
    label: "Optional first step",
    headline: "Upload your CV and skip most of the questions",
    body: "Upload your CV as a PDF or Word document. Solo reads your career history and pre-populates up to 7 of the 15 questions as confirmation cards. Questions a CV can't answer are always asked. The effective questionnaire reduces to around 8 questions.",
    callout: "Not a CV screener. Solo uses your CV to skip context-setting, not to assess your employability.",
    icon: Upload,
  },
  {
    num: "03",
    label: "15 targeted questions",
    headline: "Questions that surface what is commercially valuable about you",
    body: "Not a personality test. Each question extracts a specific commercial signal — your best piece of work, how peers perceive you, what type of organisation you work in. The most important question: Who exactly do you work for? Big 4 risk advisory practice or NHS acute trust or PE-backed mid-market manufacturer — that distinction shapes every recommendation.",
    bullets: [
      "Q6 asks for a specific achievement — this becomes the foundation of your outreach messages.",
      "Q7 surfaces informal advisory behaviour that signals commercial readiness.",
      "Q11 captures what you know about how your sector buys external help.",
    ],
    callout: "ChatGPT asks you nothing. Solo surfaces what you actually need to know about yourself as a commercial proposition.",
    icon: ClipboardList,
  },
  {
    num: "04",
    label: "The intelligence engine",
    headline: "95 archetypes. 480 business models. 2,694 scored combinations.",
    body: "Your answers are classified against a structured library of professional archetypes across 14 domains — Finance, HR, Tech, Legal, Marketing, Sales, Procurement, Healthcare, ESG, Property, Public Sector, Customer Experience and more. Each archetype is mapped to every relevant business model, scored across 6 dimensions: capability fit, credibility gap, speed to revenue, sales complexity, income potential, and recurrence. The weak paths are eliminated. The 3 strongest are surfaced.",
    statPills: [
      "95 archetypes",
      "480 business models",
      "2,694 scored paths",
      "14 professional domains",
      "6 scoring dimensions",
    ],
    callout: "Solo doesn't brainstorm business ideas. It runs your profile against a structured decision engine.",
    accent: true,
    icon: Cpu,
  },
  {
    num: "05",
    label: "Free — before you pay",
    headline: "See who you are commercially, before you commit",
    body: "Before any payment, you see your archetype classification, your transferable value, and the headline of your hook insight — an 8-to-12-word statement identifying the single most non-obvious thing you need to know about your recommended path. The full insight is behind the paywall.",
    callout: "The free teaser is specific to you — not generic.",
    icon: Eye,
  },
  {
    num: "06",
    label: "The paid report",
    headline: "Your 3 options in full — plus the message you need to send",
    body: "The full report opens with your hook insight. Then: all 3 business model options with positioning, target buyer, realistic pricing, and time to first revenue. A clear recommendation. A reality check on what's most likely to go wrong. Plus a ready-to-send outreach draft for every contact task in your 30-day plan.",
    bullets: [
      "Outreach drafts written from your profile and Q6 achievement — not a template with [Name] placeholders.",
      "Local Market Feasibility Snapshot: demand signal, pricing benchmark, and market entry insight.",
      "AI Impact section: how AI is affecting your current role, how resilient your Plan B is, and 3–5 specific adaptation actions.",
    ],
    callout: "ChatGPT can describe a business model. Solo tells you who to contact, why they'd respond, and gives you the message.",
    accent: true,
    icon: FileText,
  },
  {
    num: "07",
    label: "Included in £19.99",
    headline: "30 days of guided daily execution — built around your plan",
    body: "The Adaptive Tracker is included in your one-time payment. Every day at a time you choose, Solo sends a short email with that day's specific task and a link to a guided check-in conversation. If you fall behind, Solo adjusts the plan.",
    cards2x2: [
      { label: "On track", value: "Carries forward" },
      { label: "Drifting", value: "Adjusts plan" },
      { label: "Significantly behind", value: "Replans" },
      { label: "Day 30", value: "Progress summary" },
    ],
    callout: "Most products give you a plan and leave you with it. Solo checks in daily and adapts when you don't do it.",
    accent: true,
    icon: CalendarCheck,
  },
  {
    num: "08",
    label: "Long-term",
    headline: "An advisor that already knows you, and gets better the longer you use it",
    body: "The subscription keeps the Tracker running, unlocks the 9-module Practical Guidance suite (business structure, tax, IR35, contracts, insurance, professional presence), and gives you Ask Solo: a persistent advisory conversation that already knows your full history, plan, and context.",
    bullets: [
      "Ask Solo knows your archetype, plan, check-in history, and every guidance module output — you never explain your situation again.",
      "The longer you subscribe, the richer your context becomes.",
      "9 practical guidance modules covering every aspect of setting up an independent practice.",
    ],
    callout: "ChatGPT answers your question. Ask Solo answers your situation. The context compounds.",
    accent: true,
    icon: Infinity,
  },
];

/* ── divider component ─────────────────────────────── */

function PriceDivider({ text }: { text: string }) {
  return (
    <motion.div
      className="relative flex items-center justify-center py-12"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      custom={0}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/30" />
      <span className="relative z-10 rounded-full border border-primary/40 bg-background px-6 py-2 text-sm font-semibold tracking-wide text-primary">
        {text}
      </span>
    </motion.div>
  );
}

/* ── stage card component ──────────────────────────── */

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  const Icon = stage.icon;

  return (
    <motion.div
      className="group"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      custom={index}
    >
      <div className="flex gap-5 sm:gap-6">
        {/* number circle */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            stage.accent
              ? "bg-primary text-primary-foreground"
              : "border border-primary/30 bg-primary/10 text-primary"
          }`}
        >
          {stage.num}
        </div>

        <div className="min-w-0 flex-1">
          {/* label */}
          <span className="mb-1.5 inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {stage.label}
          </span>

          {/* headline */}
          <h3 className="font-display mb-3 text-lg font-semibold leading-snug sm:text-xl">
            {stage.headline}
          </h3>

          {/* body */}
          <p className="text-sm leading-[1.85] text-muted-foreground sm:text-[15px]">
            {stage.body}
          </p>

          {/* stat pills */}
          {stage.statPills && (
            <div className="mt-4 flex flex-wrap gap-2">
              {stage.statPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {pill}
                </span>
              ))}
            </div>
          )}

          {/* bullets */}
          {stage.bullets && (
            <ul className="mt-4 space-y-2">
              {stage.bullets.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" strokeWidth={2} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {/* 2×2 cards */}
          {stage.cards2x2 && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {stage.cards2x2.map((c) => (
                <div
                  key={c.label}
                  className="rounded-lg border border-border/60 bg-card p-3.5 text-center"
                >
                  <p className="text-xs font-semibold text-foreground">{c.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* callout */}
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex gap-2.5">
              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" strokeWidth={2} />
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm italic">
                {stage.callout}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── page ──────────────────────────────────────────── */

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            How It Works
          </motion.span>
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            From your career history to a working Plan&nbsp;B — in 8&nbsp;stages
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Solo isn't a chatbot. It's a structured decision engine that classifies, scores, recommends, and executes alongside you.
          </motion.p>
        </div>
      </section>

      {/* STAGES 1–5 (free) */}
      <section className="border-t border-border/50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-col gap-20">
            {stages.slice(0, 5).map((s, i) => (
              <StageCard key={s.num} stage={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* DIVIDER — £19.99 */}
      <div className="mx-auto max-w-3xl px-6">
        <PriceDivider text="£19.99 one-time unlock" />
      </div>

      {/* STAGE 6 */}
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-6">
          <StageCard stage={stages[5]} index={0} />
        </div>
      </section>

      {/* STAGE 7 */}
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-6">
          <StageCard stage={stages[6]} index={0} />
        </div>
      </section>

      {/* DIVIDER — subscription */}
      <div className="mx-auto max-w-3xl px-6">
        <PriceDivider text="£19/month or £149/year subscription" />
      </div>

      {/* STAGE 8 */}
      <section className="py-10 pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <StageCard stage={stages[7]} index={0} />
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-primary py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.p
            className="font-display text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl lg:text-4xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            Solo doesn't brainstorm. It classifies, scores, recommends, and does the hard work alongside&nbsp;you.
          </motion.p>
          <motion.p
            className="mt-4 text-base text-primary-foreground/70"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            Starting with the message you need to send.
          </motion.p>
          <motion.div
            className="mt-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={2}
          >
            <Button
              size="lg"
              className="rounded-lg bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate("/questionnaire")}
            >
              Get your Plan B →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <SoloLogo width={80} height={22} />
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="cursor-pointer transition-colors hover:text-foreground">Privacy</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
