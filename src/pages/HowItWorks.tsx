import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SoloLogo from "@/components/SoloLogo";
import {
  Search,
  FileText,
  Star,
  AlertTriangle,
  CalendarCheck,
  MapPin,
  Check,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const steps = [
  {
    num: "01",
    title: "You answer 13 structured questions",
    desc: "The questionnaire covers your professional background, depth of experience, network quality, current employment situation, and location. These aren't vague questions. They're designed to extract the specific inputs the engine needs to classify you accurately and produce a useful output. It takes about 8 minutes.",
    detail: "Q1–Q10 cover your role, sector, experience depth, seniority, and skills. Q11–Q13 cover your network, employment status, and location — these feed your activation plan and market snapshot specifically.",
  },
  {
    num: "02",
    title: "Solo classifies your commercial profile",
    desc: "Your answers are mapped against a curated library of 5 professional archetypes and 20 solo business models, using a structured scoring system that weights capability fit, credibility gap, speed to revenue, income potential, and sales complexity. This is not open-ended generation. The constraints are what make the output useful.",
    detail: "The engine selects 3 matching business paths, scores them, applies diversity constraints so you don't get 3 versions of the same idea, and selects a primary recommendation with clear reasoning.",
  },
  {
    num: "03",
    title: "You get a full Plan B report",
    desc: "Your report includes six sections: your commercial profile interpretation, three ranked business options, a clear recommendation, a reality check, a 30-day activation plan tailored to your situation, and a local market snapshot for your location. It's saved to your account. You can return to it any time.",
    detail: "The activation plan is paced to your employment status — different if you're currently employed vs. available full-time. The market snapshot is location-specific. Neither is generic.",
  },
];

const comparisonRows = [
  { label: "Built from your specific background", llm: false, coach: "varies", solo: true },
  { label: "Commercial realism on pricing/income", llm: false, coach: "rarely", solo: true },
  { label: "Structured business model matching", llm: false, coach: false, solo: true },
  { label: "Specific first-client path", llm: false, coach: "sometimes", solo: true },
  { label: "Activation plan tailored to your situation", llm: false, coach: false, solo: true },
  { label: "Available at 11pm when you're anxious about your job", llm: true, coach: false, solo: true },
  { label: "Under £20", llm: true, coach: false, solo: true },
];

const reportSections = [
  {
    icon: Search,
    title: "Profile interpretation",
    desc: "How your professional background translates commercially. Not your CV summary — a candid read on what you look like to potential clients, and where your credibility is strongest.",
  },
  {
    icon: FileText,
    title: "Three business options",
    desc: "Three distinct, ranked paths matched to your background. Each includes what you'd sell, who'd buy it, realistic pricing, sales complexity, and estimated time to first revenue.",
  },
  {
    icon: Star,
    title: "Our recommendation",
    desc: "One clear answer on which path makes the most sense for you right now, with reasoning you can pressure-test. Not three equal options — a specific call.",
  },
  {
    icon: AlertTriangle,
    title: "Reality check",
    desc: "What's likely to go wrong, what the genuine risks are, and why they matter. Every path has friction. We tell you where yours will be.",
  },
  {
    icon: CalendarCheck,
    title: "30-day activation plan",
    desc: "A day-by-day action sequence tailored to your employment status and availability. Paced differently if you're employed full-time vs. available immediately.",
  },
  {
    icon: MapPin,
    title: "Local market snapshot",
    desc: "Indicative demand signals, competitor density, and pricing benchmarks for your location. Not a full market study — enough to ground-truth the opportunity.",
  },
];

function CellIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-xs capitalize text-muted-foreground">{value}</span>;
}

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            The Process
          </motion.span>
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            Structured. Specific. Built from your actual background.
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-[580px] text-base leading-relaxed text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Solo isn't a chatbot. It's a structured decision engine that classifies your professional profile and maps it to realistic solo business paths. Here's how.
          </motion.p>
        </div>
      </section>

      {/* THE 3 STEPS */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-col gap-20">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <div className="flex gap-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {s.num}
                  </span>
                  <div>
                    <h3 className="font-display mb-2 text-lg font-semibold">{s.title}</h3>
                    <p className="text-sm leading-[1.8] text-muted-foreground sm:text-base">{s.desc}</p>
                  </div>
                </div>
                <div className="mt-5 ml-16 rounded-xl border border-border/60 bg-card p-5">
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{s.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            className="font-display mb-12 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            Better than the alternatives
          </motion.h2>

          <motion.div
            className="overflow-hidden rounded-xl border border-border/60"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-card">
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground" />
                  <th className="p-4 text-center text-xs font-medium text-muted-foreground">Generic&nbsp;LLM</th>
                  <th className="p-4 text-center text-xs font-medium text-muted-foreground">Career&nbsp;Coach</th>
                  <th className="p-4 text-center text-xs font-semibold text-primary">Solo</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="p-4 text-xs text-muted-foreground sm:text-sm">{row.label}</td>
                    <td className="p-4 text-center"><CellIcon value={row.llm} /></td>
                    <td className="p-4 text-center"><CellIcon value={row.coach} /></td>
                    <td className="p-4 text-center"><CellIcon value={row.solo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* WHAT'S IN THE REPORT */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            className="font-display mb-14 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            Six sections. No filler.
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reportSections.map((s, i) => (
              <motion.div
                key={s.title}
                className="rounded-xl border border-border/60 bg-card p-6"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <s.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mb-2 text-sm font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
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
            Ready to know your Plan B?
          </motion.h2>
          <motion.div
            className="mt-8 flex flex-col items-center gap-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            <Button
              size="lg"
              className="rounded-lg bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate("/auth")}
            >
              Take the test — £19.99 →
            </Button>
            <span className="text-xs text-primary-foreground/60">
              Free preview included. Full report unlocked on payment. Saved to your account.
            </span>
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
