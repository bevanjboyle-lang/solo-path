import { useNavigate } from "react-router-dom";

import SoloLogo from "@/components/SoloLogo";
import { motion } from "framer-motion";
import {
  Briefcase,
  User,
  Lightbulb,
  ClipboardList,
  Search,
  FileText,
  ShieldCheck,
  CalendarCheck,
  MapPin,
  AlertTriangle,
  Star,
  Quote,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import IndustryRiskSection from "@/components/landing/IndustryRiskSection";
import ExpertSaysSection from "@/components/landing/ExpertSaysSection";
import WaitingRoomSection from "@/components/landing/WaitingRoomSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const problems = [
  {
    icon: Briefcase,
    title: "AI is compressing white-collar work",
    desc: "Middle-management coordination, compliance process-following, and structured analytical work are becoming more automatable. Not gone, but compressed.",
  },
  {
    icon: User,
    title: "Your skills don't translate themselves",
    desc: "Most professionals can't describe what they'd sell, to whom, or for how much. They've never had to.",
  },
  {
    icon: Lightbulb,
    title: "Generic advice doesn't help",
    desc: "Asking ChatGPT gives you broad ideas. Career coaches give you confidence. Neither gives you a commercially realistic answer built from your actual experience.",
  },
];

const steps = [
  {
    num: "01",
    title: "Answer 15 targeted questions, or around 8 if you upload your CV first",
    desc: "We ask about your role, experience depth, network, situation, and location. Specific questions produce specific answers.",
  },
  {
    num: "02",
    title: "We classify your commercial profile",
    desc: "Solo scores your background against 95 archetypes, 480 business models, and 2,694 scored combinations across 14 professional domains. Not generic ideas. Paths that match what you've actually done.",
  },
  {
    num: "03",
    title: "Get your tailored Plan B report",
    desc: "A full report with 3 business options, a clear recommendation, realistic income projections, a 30-day activation plan, and a local market snapshot.",
  },
];

const reportSections = [
  { icon: Search, title: "Profile interpretation", desc: "What you look like commercially, not just professionally" },
  { icon: FileText, title: "Three business options", desc: "Ranked, realistic paths built from your background" },
  { icon: Star, title: "Our recommendation", desc: "One clear answer on which path makes most sense for you" },
  { icon: AlertTriangle, title: "Reality check", desc: "What's likely to go wrong, and why that matters" },
  { icon: CalendarCheck, title: "30-day activation plan", desc: "A day-by-day action sequence tailored to your situation" },
  { icon: MapPin, title: "Local market snapshot", desc: "Indicative demand and pricing data for your location" },
  { icon: CalendarCheck, title: "Adaptive Tracker", desc: "Included in your £19.99 payment. 30 daily check-ins that adapt if you fall behind or your situation changes." },
  { icon: ClipboardList, title: "Outreach drafts", desc: "Ready-to-send email templates for your first 3 target contacts, written from your profile." },
];


export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── SECTION 1: HERO ── */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <SoloLogo width={220} height={63} />
          </motion.div>

          <motion.span
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Your Plan B Engine
          </motion.span>

          <motion.h1
            className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Could AI be coming for your role? "I'll update my LinkedIn" isn't a Plan&nbsp;B.
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-[540px] text-lg leading-relaxed text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Solo builds you a specific plan for independent income: the paths, the clients, the first 30 days, based on your actual career. So if AI does come for your role, you already know what you're doing next.
          </motion.p>

          {/* ── Stat strip ── */}
          <motion.div
            className="mx-auto mt-8 flex max-w-xl flex-col gap-4 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            {[
              "Most managers couldn't name a single person who'd pay them outside an employer.",
              "The average professional spends 18 months thinking before acting.",
              "Generic AI gives you ideas. Solo gives you your answer.",
            ].map((stat, i) => (
              <p
                key={i}
                className="border-l-2 border-primary/20 pl-4 text-xs leading-relaxed text-muted-foreground sm:border-l-0 sm:px-4 sm:first:pl-0 sm:last:pr-0"
              >
                {stat}
              </p>
            ))}
          </motion.div>

          {/* ── Worked Example Panel ── */}
          <motion.div
            className="mt-12 w-full max-w-xl mx-auto rounded-xl border border-primary/30 bg-card p-6 text-left space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground">Here's what a Finance Business Partner received</h3>
              <p className="mt-1 text-xs text-muted-foreground">FTSE 250 manufacturing business · 8 years' experience · Session completed April 2026</p>
            </div>

            <div className="space-y-4">
              {/* Sub-panel 1: Hook Insight */}
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary mb-2">Hook Insight</p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  Your sector's finance directors actively use interim networks rather than agencies for FP&A capability. Your window is a direct approach to two interim providers before registering anywhere, not the other way round.
                </p>
              </div>

              {/* Sub-panel 2: First Move */}
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary mb-2">Your First Move: Do This Within 24 Hours</p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  Email [Interim provider name]. Not to ask about work, but to introduce yourself as someone building an independent FP&A practice. Subject: FP&A. Independent Capacity from Q3. One paragraph. We've written it for you.
                </p>
                <div className="relative mt-3 rounded-md bg-muted/30 p-3 overflow-hidden">
                  <p className="text-xs text-muted-foreground leading-relaxed" style={{ filter: "blur(3px)", opacity: 0.7 }}>
                    Hi [Name], I'm reaching out because I'm building an independent FP&A practice focused on manufacturing businesses going through operational transformation. I've spent the last eight years as a Finance Business Partner in FTSE 250 manufacturing, most recently leading planning and analysis across three divisions during a major restructure. I'd welcome a conversation about how your network places independent FP&A capability.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-card/90 border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground">Full draft included in your report</span>
                  </div>
                </div>
              </div>

              {/* Sub-panel 3: Day 3 */}
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary mb-2">From Your 30-Day Plan: Day 3</p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  Send your positioning statement to three former colleagues at buyer level. Not a pitch. A brief update on what you're building and who you're looking to work with. We've drafted this for you too.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Every output is built from your specific answers: your archetype, your sector, your seniority, and your experience. Not a template.
            </p>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              size="lg"
              className="rounded-lg bg-primary px-8 py-4 text-base font-medium text-primary-foreground hover:bg-[#1FAF97]"
              onClick={() => navigate("/auth")}
            >
              See your free preview. 8 minutes →
            </Button>
            <span className="text-xs text-muted-foreground">
              Full report + 30-day activation plan: £19.99. No account needed to start.
            </span>
          </motion.div>
        </div>
      </section>

      <IndustryRiskSection />
      <ExpertSaysSection />
      <WaitingRoomSection />
      <TestimonialsSection />

      {/* ── SECTION 2: THE PROBLEM ── */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              The Problem
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Most professionals have no credible Plan B
            </h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-3">
            {problems.map((p, i) => (
              <motion.div
                key={p.title}
                className="rounded-xl border border-border/60 bg-card p-6"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <p.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mb-2 text-sm font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW IT WORKS ── */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              How It Works
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              From experience to income path in 8 minutes
            </h2>
          </motion.div>

          <div className="flex flex-col gap-12">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="flex gap-6"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {s.num}
                </span>
                <div>
                  <h3 className="mb-1 text-base font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-14 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <Button
              size="lg"
              className="rounded-lg bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-[#1FAF97]"
              onClick={() => navigate("/auth")}
            >
              Take the test →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 4: WHAT YOU GET ── */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              What's In Your Report
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Eight sections. No fluff.
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reportSections.map((s, i) => (
              <motion.div
                key={s.title}
                className="rounded-xl border border-border/60 bg-card p-5"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <s.icon className="mb-3 h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mb-1 text-sm font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your report is saved. Return to it any time.
          </p>
        </div>
      </section>

      {/* ── SECTION 5: WHO IT'S FOR ── */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            className="mb-6 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Who Solo Is For
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Solo isn't for everyone.
            </h2>
          </motion.div>

          <motion.p
            className="mx-auto mb-6 max-w-xl text-center text-sm leading-relaxed text-muted-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            It's built for professionals with enough experience to have genuine commercial value outside an employer, but who've never needed to articulate what that is. If you're early-career, still finding your specialism, or completely happy with your job security, this probably isn't for you.
          </motion.p>

          <motion.p
            className="mx-auto mb-12 max-w-xl text-center text-base font-medium text-foreground/90"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={2}
          >
            If your background sits somewhere in here, it is.
          </motion.p>

          <motion.div
            className="mx-auto mb-10 flex max-w-2xl flex-wrap justify-center gap-2.5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={3}
          >
            {[
              { label: "Legal", accent: true, size: "lg" },
              { label: "Finance", accent: false, size: "md" },
              { label: "Compliance", accent: true, size: "md" },
              { label: "Risk", accent: false, size: "lg" },
              { label: "Marketing", accent: true, size: "md" },
              { label: "HR", accent: false, size: "sm" },
              { label: "Strategy", accent: true, size: "lg" },
              { label: "Operations", accent: false, size: "md" },
              { label: "Consulting", accent: true, size: "md" },
              { label: "Commercial", accent: false, size: "sm" },
              { label: "Procurement", accent: false, size: "md" },
              { label: "Programme Management", accent: true, size: "lg" },
              { label: "Communications", accent: false, size: "md" },
              { label: "Accounting", accent: true, size: "sm" },
              { label: "Tax", accent: false, size: "sm" },
              { label: "Data", accent: true, size: "sm" },
              { label: "Technology", accent: false, size: "md" },
              { label: "Change Management", accent: true, size: "lg" },
              { label: "Audit", accent: false, size: "sm" },
              { label: "Business Development", accent: true, size: "md" },
              { label: "Policy", accent: false, size: "sm" },
              { label: "Research", accent: true, size: "sm" },
              { label: "Governance", accent: false, size: "md" },
              { label: "Investment", accent: true, size: "md" },
              { label: "Insurance", accent: false, size: "sm" },
              { label: "Transformation", accent: true, size: "lg" },
              { label: "Sales", accent: false, size: "sm" },
              { label: "PMO", accent: true, size: "sm" },
              { label: "Advisory", accent: false, size: "md" },
              { label: "Learning and Development", accent: true, size: "lg" },
              { label: "Public Affairs", accent: false, size: "md" },
              { label: "Corporate Affairs", accent: true, size: "md" },
            ].map((tag) => (
              <span
                key={tag.label}
                className={`inline-block rounded-full border px-4 py-1.5 font-medium ${
                  tag.size === "lg" ? "text-sm" : tag.size === "md" ? "text-xs" : "text-[11px]"
                } ${
                  tag.accent
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                {tag.label}
              </span>
            ))}
          </motion.div>

          <motion.p
            className="text-center text-xs text-muted-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={4}
          >
            95 professional archetypes. 14 domains. 480 business models.
          </motion.p>
        </div>
      </section>

      {/* ── SECTION 6: SOCIAL PROOF ── */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            className="mb-12 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Early Users Say
            </span>
          </motion.div>

          <motion.blockquote
            className="relative rounded-xl border border-border/60 bg-card p-8 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <Quote className="mx-auto mb-4 h-6 w-6 text-primary/40" strokeWidth={1.5} />
            <p className="font-display text-base leading-relaxed text-foreground/90 sm:text-lg">
              "I'd been meaning to think through my options for two years. Solo gave me a concrete answer in under 10 minutes. The activation plan alone was worth £19.99."
            </p>
            <footer className="mt-4 text-xs text-muted-foreground">
              Risk Manager, Financial Services, London
            </footer>
          </motion.blockquote>
        </div>
      </section>

      {/* ── SECTION 7: FINAL CTA ── */}
      <section className="bg-primary py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.h2
            className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            Know your Plan B before you need it.
          </motion.h2>
          <motion.p
            className="mt-4 text-base text-primary-foreground/70"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            8 minutes. £19.99. A report built from your actual experience.
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
              onClick={() => navigate("/auth")}
            >
              Take the test →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
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
