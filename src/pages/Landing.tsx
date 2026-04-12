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
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
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
    title: "Professional roles are becoming less predictable",
    desc: "Middle-management, analytical, and process roles are being restructured faster than most professionals expected. Not eliminated — but less stable, less numerous, and less guaranteed than a decade ago.",
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
            Build your Plan B before you need one.
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-[540px] text-lg leading-relaxed text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Solo takes what you've built over your career and turns it into a realistic, executable path to independent income: the paths, the clients, the first 30 days, based on your actual experience. <span className="font-bold text-foreground">So whatever changes — whether it's AI, restructuring, or simply wanting more options — you already know what you're doing next.</span>
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

          <motion.div
            className="mt-10 max-w-xl mx-auto text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              Solo specialises in helping structured, experienced professionals establish a credible independent income stream, whether you're ready to make the move, or simply want to know what your options are.
            </p>
            <Button
              size="lg"
              className="mt-6 rounded-lg bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-[#1FAF97]"
              onClick={() => navigate("/questionnaire")}
            >
              Take the test, it's free to see your profile →
            </Button>
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

      <WaitingRoomSection />
      <TestimonialsSection />

      {/* ── INDUSTRY TILES ── */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp} custom={0}
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Market Opportunity
            </span>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Where independent operators are growing fastest
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { badge: "STRONG DEMAND", badgeStyle: "bg-primary/20 text-primary border-primary/30", title: "Financial Services", body: "Fractional CFOs, FP&A directors, and finance business partners are among the most sought-after independent hires, particularly in PE-backed and growth businesses." },
              { badge: "STRONG DEMAND", badgeStyle: "bg-primary/20 text-primary border-primary/30", title: "Legal", body: "Experienced lawyers and compliance specialists are building highly profitable advisory and fractional in-house practices, often at day rates that exceed employment." },
              { badge: "HIGH GROWTH", badgeStyle: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", title: "Strategy and Consulting", body: "Former Big Four and strategy professionals are establishing independent advisory practices at rates significantly above their salaried packages." },
              { badge: "HIGH GROWTH", badgeStyle: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", title: "Marketing and Communications", body: "Fractional CMO and senior brand roles are multiplying as companies seek senior expertise without full-time headcount cost." },
              { badge: "GROWING", badgeStyle: "bg-muted text-muted-foreground border-border", title: "HR and People", body: "Fractional HR directors and L&D specialists are finding strong demand from mid-market businesses that need senior people expertise by the day." },
              { badge: "STRONG DEMAND", badgeStyle: "bg-primary/20 text-primary border-primary/30", title: "Technology and Change", body: "Technical and programme leaders are increasingly in demand as fractional CTOs, digital transformation advisors, and delivery leads." },
            ].map((tile, i) => (
              <motion.div
                key={tile.title}
                className="rounded-xl border border-border/60 bg-card p-5"
                variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: "-60px" }} custom={i}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{tile.title}</h3>
                  <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold ${tile.badgeStyle}`}>
                    {tile.badge}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{tile.body}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs italic text-muted-foreground">
            Sources: Solo knowledge bank, 480 business models across 16 professional domains.
          </p>
        </div>
      </section>


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
