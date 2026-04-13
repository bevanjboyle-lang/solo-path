import { useNavigate, Link } from "react-router-dom";
import officeBg from "@/assets/office-bg.png";
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
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
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
    title: "Professional roles are becoming less predictable",
    desc: "Middle-management, analytical, and process roles are being restructured faster than most professionals expected. Not eliminated - but less stable, less numerous, and less guaranteed than a decade ago.",
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
    desc: "A full report with up to 5 business paths explored in parallel, a clear recommendation, realistic income projections, a 30-day activation plan, and a local market snapshot.",
  },
];

const reportSections = [
  { icon: Search, title: "Profile interpretation", desc: "What you look like commercially, not just professionally" },
  { icon: FileText, title: "Up to 5 business paths", desc: "Explored in parallel so you're not locked in before you know what has traction" },
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
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      {/* Background image with warm overlay */}
      <div className="fixed inset-0 -z-10">
        <img src={officeBg} alt="" className="h-full w-full object-cover" style={{ filter: "blur(2px)" }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, hsla(30, 8%, 88%, 0.78), hsla(30, 8%, 88%, 0.84))",
        }} />
      </div>
      <MintTopBar />
      <Navbar />

      {/* ── 1. HERO ── */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10 relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 30%, rgba(46,205,176,0.06) 0%, transparent 60%)",
          }}
        />

        <section className="relative flex min-h-[70vh] flex-col items-center justify-center">
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
                style={{ letterSpacing: "-0.02em" }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                Build your Plan B before you need one.
              </motion.h1>

              <motion.p
                className="mx-auto mt-6 max-w-[540px] text-lg leading-relaxed text-muted-foreground sm:text-xl"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                Solo takes what you've built over your career and turns it into a realistic, executable path to independent income: the paths, the clients, the first 30 days, based on your actual experience. <span className="font-bold text-foreground">So whatever changes - whether it's AI, restructuring, or simply wanting more options - you already know what you're doing next.</span>
              </motion.p>

              {/* Three statement cards */}
              <motion.div
                className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 }}
              >
                {[
                  "Most managers couldn't name a single person who'd pay them outside an employer.",
                  "The average professional spends 18 months thinking before acting.",
                  "Generic AI gives you ideas. Solo gives you your answer.",
                ].map((text, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-surface-card px-4 py-3"
                  >
                    <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="mt-10 max-w-xl mx-auto text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Solo specialises in helping structured, experienced professionals establish a credible independent income stream, whether you're ready to make the move, or simply want to know what your options are.
                </p>
              </motion.div>

              {/* CTA with mint glow */}
              <motion.div
                className="mt-10 flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="relative">
                  <div
                    className="pointer-events-none absolute inset-0 -m-8 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(46,205,176,0.12) 0%, transparent 60%)",
                    }}
                  />
                  <Button
                    size="lg"
                    className="relative rounded-md bg-primary px-8 py-4 text-base font-medium text-primary-foreground hover:bg-[#26B89D] transition-all hover:-translate-y-px hover:shadow-card-hover"
                    onClick={() => navigate("/auth")}
                  >
                    See your free preview. 8 minutes →
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  Full report + 30-day activation plan: £19.99. No account needed to start.
                </span>
              </motion.div>
            </div>
        </section>
      </PanelLayout>

      {/* ── TESTIMONIAL STRIP (after hero) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          {/* Desktop: 3-column staggered grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                quote: "I spent an entire Sunday feeding ChatGPT my CV and trying to get it to suggest a realistic Plan B. After six hours I had a generic list. Solo took eight minutes and told me things I hadn't considered.",
                name: "James W.",
                role: "Head of Operations, 14 years in logistics",
              },
              {
                quote: "I'd been copying prompt templates off LinkedIn for weeks. The output was always vague. Solo gave me pricing benchmarks, a named buyer type, and a 30-day plan before I'd finished my coffee.",
                name: "Rachel M.",
                role: "Senior Product Manager, 11 years in SaaS",
              },
              {
                quote: "The difference isn't the AI — it's the context. Solo already knows which business models work for someone with my background. I couldn't teach ChatGPT that in a hundred prompts.",
                name: "David K.",
                role: "Finance Director, 16 years in professional services",
              },
              {
                quote: "I asked ChatGPT to write me a plan. It gave me motivational fluff. Solo told me my most likely failure mode and what my first email to a prospective client should actually say.",
                name: "Priya S.",
                role: "Strategy Consultant, 9 years in advisory",
              },
              {
                quote: "Eight minutes. That's how long it took to get a report I'd been trying to build myself for three months. And it was more honest than anything I'd written.",
                name: "Tom H.",
                role: "Engineering Manager, 12 years in tech",
              },
            ].map((t, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div
                  className="rounded-lg bg-muted/50 p-6 h-full"
                  style={{ borderLeft: "4px solid #2ECDB0" }}
                >
                  <p className="text-[15px] leading-relaxed text-foreground/90 italic">
                    "{t.quote}"
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    — {t.name}, {t.role}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Mobile: horizontal scroll with snap */}
          <div className="flex sm:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {[
              {
                quote: "I spent an entire Sunday feeding ChatGPT my CV and trying to get it to suggest a realistic Plan B. After six hours I had a generic list. Solo took eight minutes and told me things I hadn't considered.",
                name: "James W.",
                role: "Head of Operations, 14 years in logistics",
              },
              {
                quote: "I'd been copying prompt templates off LinkedIn for weeks. The output was always vague. Solo gave me pricing benchmarks, a named buyer type, and a 30-day plan before I'd finished my coffee.",
                name: "Rachel M.",
                role: "Senior Product Manager, 11 years in SaaS",
              },
              {
                quote: "The difference isn't the AI — it's the context. Solo already knows which business models work for someone with my background. I couldn't teach ChatGPT that in a hundred prompts.",
                name: "David K.",
                role: "Finance Director, 16 years in professional services",
              },
              {
                quote: "I asked ChatGPT to write me a plan. It gave me motivational fluff. Solo told me my most likely failure mode and what my first email to a prospective client should actually say.",
                name: "Priya S.",
                role: "Strategy Consultant, 9 years in advisory",
              },
              {
                quote: "Eight minutes. That's how long it took to get a report I'd been trying to build myself for three months. And it was more honest than anything I'd written.",
                name: "Tom H.",
                role: "Engineering Manager, 12 years in tech",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="min-w-[85vw] snap-center rounded-lg bg-muted/50 p-6 shrink-0"
                style={{ borderLeft: "4px solid #2ECDB0" }}
              >
                <p className="text-[15px] leading-relaxed text-foreground/90 italic">
                  "{t.quote}"
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  — {t.name}, {t.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </PanelLayout>

      {/* ── 2. THE PROBLEM ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                The Problem
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Most professionals have no credible Plan B
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-8 sm:grid-cols-3">
            {problems.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <div className="rounded-[10px] border border-border bg-surface-card p-6 transition-all hover:border-primary hover:shadow-card-hover h-full">
                  <p.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="mb-2 text-sm font-semibold">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </PanelLayout>

      {/* ── 3. HOW IT WORKS (numbered 3-step) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                How It Works
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                From experience to income path in 8 minutes
              </h2>
            </div>
          </ScrollReveal>

          <div className="flex flex-col gap-12">
            {steps.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 0.1}>
                <div className="flex gap-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-sm font-bold text-accent-foreground">
                    {s.num}
                  </span>
                  <div>
                    <h3 className="mb-1 text-base font-semibold">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.1}>
            <div className="mt-14 text-center relative">
              <div
                className="pointer-events-none absolute inset-0 -m-8 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(46,205,176,0.12) 0%, transparent 60%)",
                }}
              />
              <Button
                size="lg"
                className="relative rounded-md bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-[#26B89D] transition-all hover:-translate-y-px hover:shadow-card-hover"
                onClick={() => navigate("/auth")}
              >
                Take the test →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </PanelLayout>

      {/* ── 4. WHAT'S IN YOUR REPORT ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                What's In Your Report
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Eight sections. No fluff.
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reportSections.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 0.06}>
                <div className="rounded-[10px] border border-border bg-surface-card p-5 transition-all hover:border-primary hover:shadow-card-hover h-full">
                  <s.icon className="mb-3 h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="mb-1 text-sm font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your report is saved. Return to it any time.
          </p>
        </div>
      </PanelLayout>

      {/* ── 5. SAMPLE REPORT TEASER ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl">
            <GlassCard noHover className="p-8 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                See For Yourself
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                See what a Solo report looks like
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Every Solo report is built around your specific experience, skills, and professional profile. Here's what Sarah Chen's report revealed.
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="rounded-md bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-[#26B89D] transition-all hover:-translate-y-px hover:shadow-card-hover"
                  onClick={() => navigate("/sample-report")}
                >
                  View sample report →
                </Button>
              </div>
            </GlassCard>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── 6. WHO SOLO IS FOR ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="mb-6 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Who Solo Is For
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Solo isn't for everyone.
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="mx-auto mb-6 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
              It's built for professionals with enough experience to have genuine commercial value outside an employer, but who've never needed to articulate what that is. If you're early-career, still finding your specialism, or completely happy with your job security, this probably isn't for you.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <p className="mx-auto mb-12 max-w-xl text-center text-base font-medium text-foreground/90">
              If your background sits somewhere in here, it is.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="mx-auto mb-10 flex max-w-2xl flex-wrap justify-center gap-2.5">
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
                  className={`inline-block rounded-md border px-4 py-1.5 font-medium ${
                    tag.size === "lg" ? "text-sm" : tag.size === "md" ? "text-xs" : "text-[11px]"
                  } ${
                    tag.accent
                      ? "border-primary/30 bg-accent text-accent-foreground"
                      : "border-border bg-surface-card text-muted-foreground"
                  }`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.25}>
            <p className="text-center text-xs text-muted-foreground">
              95 professional archetypes. 14 domains. 480 business models.
            </p>
          </ScrollReveal>
        </div>
      </PanelLayout>

      {/* ── 7. TESTIMONIALS ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <TestimonialsSection />
        </ScrollReveal>
      </PanelLayout>

      {/* ── 8. STAT STRIP ── */}
      <PanelLayout className="px-6 py-12 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-xl flex flex-col gap-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">
            {[
              { num: 95, label: "archetypes", desc: "professional profiles mapped" },
              { num: 480, label: "models", desc: "business models scored" },
              { num: 2694, label: "combinations", desc: "unique path combinations" },
            ].map((stat, i) => (
              <div key={i} className="flex-1 text-center sm:px-4 sm:first:pl-0 sm:last:pr-0">
                <span className="block font-display text-2xl font-bold text-foreground">
                  <AnimatedCounter target={stat.num} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {stat.label}
                </span>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── WHAT YOU GET (feature card) ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl">
            <GlassCard noHover className="p-8 sm:p-10">
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                What you get
              </h2>
              <p className="mt-3 text-2xl font-bold text-foreground">
                £19.99 — <span className="font-normal text-muted-foreground text-lg">one-time</span>
              </p>

              <div className="mt-8 space-y-6">
                {[
                  {
                    title: "Your personalised report",
                    desc: "10 scored business options matched to your experience, sector, seniority, and professional network. Each option includes target buyers, pricing benchmarks, and a difficulty rating.",
                  },
                  {
                    title: "Ready-to-send outreach",
                    desc: "A 30-day activation plan with specific daily tasks, a first-move email draft you can send immediately, and a network toolkit calibrated to the strength of your professional connections.",
                  },
                  {
                    title: "Refine until it's right",
                    desc: "Up to 3 rounds of AI-powered refinement. Tell us what doesn't feel realistic and we'll adjust the analysis. Your report gets sharper each time.",
                  },
                  {
                    title: "Download anytime",
                    desc: "Export your complete plan as a presentation-ready PDF. Your report, your options, your plan — all in one document you own.",
                  },
                  {
                    title: "Built to evolve",
                    desc: "Your plan adapts as your situation changes. Track your progress, check in daily, and get re-planned guidance when circumstances shift.",
                  },
                ].map((f, i) => (
                  <div key={i}>
                    <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        <p className="mt-6 text-center">
          <Link to="/sample-report" className="text-sm font-medium text-primary hover:underline">
            See a sample report →
          </Link>
        </p>
      </ScrollReveal>
      </PanelLayout>

      {/* ── 9. FINAL CTA ── */}
      <PanelLayout className="overflow-hidden">
        <ScrollReveal>
          <section className="bg-primary py-24 rounded-2xl">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2
                className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Know your Plan B before you need it.
              </h2>
              <p className="mt-4 text-base text-primary-foreground/70">
                8 minutes. £19.99. A report built from your actual experience.
              </p>
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

      {/* 10. FOOTER */}
      <Footer />
    </div>
  );
}
