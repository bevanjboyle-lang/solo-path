import { useNavigate, Link } from "react-router-dom";

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
import WaitingRoomSection from "@/components/landing/WaitingRoomSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ExpertSaysSection from "@/components/landing/ExpertSaysSection";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

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

const howSoloWorksSteps = [
  {
    icon: FileText,
    title: "Upload your CV or answer 15 questions",
    number: 15,
    suffix: " questions",
    desc: "We ask about your role, experience depth, network, and location.",
  },
  {
    icon: Brain,
    title: "Get matched against archetypes and business models",
    number: 480,
    suffix: " models",
    desc: "Your profile is scored across 95 archetypes and 480 business models.",
  },
  {
    icon: CalendarCheck,
    title: "Receive your 30-day activation plan",
    number: 30,
    suffix: "-day plan",
    desc: "A tailored day-by-day action sequence built from your actual experience.",
  },
];


export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-foreground" style={{
      backgroundColor: "rgba(46, 205, 176, 0.04)",
      backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    }}>
      <MintTopBar />
      <Navbar />

      {/* ── SECTION 1: HERO ── */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10 relative overflow-hidden">
        {/* Subtle mint radial glow behind hero */}
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

      {/* ── THREE STATEMENTS ── */}
      <PanelLayout className="px-6 py-12 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-xl flex flex-col gap-4 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">
            {[
              "Most managers couldn't name a single person who'd pay them outside an employer.",
              "The average professional spends 18 months thinking before acting.",
              "Generic AI gives you ideas. Solo gives you your answer.",
            ].map((stat, i) => (
              <div
                key={i}
                className="metallic-border relative rounded-lg border border-border bg-surface-card px-4 py-4 sm:border-0 sm:rounded-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover cursor-default"
              >
                <p className="text-xs leading-relaxed text-muted-foreground">{stat}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ── STAT STRIP ── */}
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

      {/* 2. INDUSTRY TILES */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Market Opportunity
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Where independent operators are growing fastest
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { badge: "STRONG DEMAND", badgeStyle: "bg-accent text-accent-foreground border-primary/30", title: "Financial Services", body: "Fractional CFOs, FP&A directors, and finance business partners are among the most sought-after independent hires, particularly in PE-backed and growth businesses." },
                { badge: "STRONG DEMAND", badgeStyle: "bg-accent text-accent-foreground border-primary/30", title: "Legal", body: "Experienced lawyers and compliance specialists are building highly profitable advisory and fractional in-house practices, often at day rates that exceed employment." },
                { badge: "HIGH GROWTH", badgeStyle: "bg-[#FDF8E8] text-[#D4940A] border-[#D4940A]/30", title: "Strategy and Consulting", body: "Former Big Four and strategy professionals are establishing independent advisory practices at rates significantly above their salaried packages." },
                { badge: "HIGH GROWTH", badgeStyle: "bg-[#FDF8E8] text-[#D4940A] border-[#D4940A]/30", title: "Marketing and Communications", body: "Fractional CMO and senior brand roles are multiplying as companies seek senior expertise without full-time headcount cost." },
                { badge: "GROWING", badgeStyle: "bg-surface-card text-muted-foreground border-border", title: "HR and People", body: "Fractional HR directors and L&D specialists are finding strong demand from mid-market businesses that need senior people expertise by the day." },
                { badge: "STRONG DEMAND", badgeStyle: "bg-accent text-accent-foreground border-primary/30", title: "Technology and Change", body: "Technical and programme leaders are increasingly in demand as fractional CTOs, digital transformation advisors, and delivery leads." },
              ].map((tile, i) => (
                <ScrollReveal key={tile.title} delay={i * 0.08}>
                  <div className="rounded-[10px] border border-border bg-surface-card p-5 transition-all hover:border-primary hover:shadow-card-hover h-full">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{tile.title}</h3>
                      <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold rounded-md ${tile.badgeStyle}`}>
                        {tile.badge}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{tile.body}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <p className="mt-8 text-center text-xs italic text-muted-foreground">
              Sources: Solo knowledge bank, 480 business models across 16 professional domains.
            </p>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* 3. EXPERT SAYS / NEWS ARTICLES */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <ExpertSaysSection />
        </ScrollReveal>
      </PanelLayout>

      {/* 4. THE OPTIONALITY GAP */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <WaitingRoomSection />
        </ScrollReveal>
      </PanelLayout>

      {/* 5. PROBLEM STATEMENT */}
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

      {/* 6. HOW IT WORKS */}
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

      {/* ── NEW: HOW SOLO WORKS – 3 column GlassCard section ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Three Steps
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                How Solo works
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-3">
            {howSoloWorksSteps.map((step, i) => (
              <ScrollReveal key={step.title} delay={i * 0.15}>
                <GlassCard className="p-6 h-full flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                    <step.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="mb-2 block font-display text-3xl font-bold text-foreground">
                    <AnimatedCounter target={step.number} suffix={step.suffix} />
                  </span>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </PanelLayout>

      {/* 7. WHAT'S IN YOUR REPORT */}
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

      {/* 8. TESTIMONIALS */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <TestimonialsSection />
        </ScrollReveal>
      </PanelLayout>

      {/* 9. WHO IT'S FOR */}
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

      {/* 10. EARLY USERS QUOTE */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Early Users Say
              </span>
            </div>

            <blockquote className="relative rounded-[10px] border border-border bg-surface-card p-8 text-center">
              <Quote className="mx-auto mb-4 h-6 w-6 text-primary/40" strokeWidth={1.5} />
              <p className="font-display text-base leading-relaxed text-foreground/90 sm:text-lg">
                "I'd been meaning to think through my options for two years. Solo gave me a concrete answer in under 10 minutes. The activation plan alone was worth £19.99."
              </p>
              <footer className="mt-4 text-xs text-muted-foreground">
                Risk Manager, Financial Services, London
              </footer>
            </blockquote>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* 11. FINAL CTA */}
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

      <Footer />
    </div>
  );
}
