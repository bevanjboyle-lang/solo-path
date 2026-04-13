import { useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import SoloLogo from "@/components/SoloLogo";
import { Button } from "@/components/ui/button";
import { Check, Circle, CheckCircle2, FileText, HelpCircle, Brain, FileCheck, CreditCard, Calendar, BarChart3, Lock } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import GlassCard from "@/components/ui/GlassCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const STEP_ICONS: Record<number, React.ElementType> = {
  1: FileText,
  2: HelpCircle,
  3: CreditCard,
  4: Brain,
  5: Calendar,
  6: Lock,
};

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(0,0,0,0.02) 40px, rgba(0,0,0,0.02) 41px)",
      }}
    >
      <MintTopBar />
      <Navbar />

      {/* ─── HERO ─── */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        <section className="flex min-h-[46vh] flex-col items-center justify-center">
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              className="mb-5 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              How it works
            </motion.span>
            <motion.h1
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: "-0.02em" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
            >
              Translating Your Career Into a Credible Plan&nbsp;B
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted-foreground sm:text-lg"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              Solo takes what you've built over your career and turns it into a realistic, executable path to independent income, with the first action ready before you close the tab.
            </motion.p>
            <motion.p
              className="mt-4 text-sm" style={{ color: "#A09A92" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Most people are done in under 10 minutes. The plan runs for 30 days.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      {/* ─── CHATGPT COMPARISON ─── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="mb-10 text-center">
              <h2 className="font-display text-2xl font-bold sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>Why not just ask ChatGPT?</h2>
              <p className="mt-3 text-muted-foreground">Fair question. Here is what changes when the model is built specifically for your situation.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[10px] border border-border bg-surface-card p-6">
                <h3 className="mb-5 text-sm font-semibold text-muted-foreground">A general AI assistant</h3>
                <ul className="space-y-4">
                  {[
                    "Suggests consulting or fractional work without scoring whether that fits your specific experience, seniority, or sector",
                    "Cannot tell you realistic pricing for someone of your seniority, or how long it actually takes to land a first client",
                    "Gives you a list of ideas. Does not help you do the awkward bit, actually contacting the first person",
                    "The output lives in a chat window. Nothing is structured, tracked, or there when you need to pick it back up",
                  ].map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[10px] border border-primary/30 bg-surface-mint-tint p-6">
                <h3 className="mb-5 text-sm font-semibold text-primary">Solo</h3>
                <ul className="space-y-4">
                  {[
                    "Solo classifies your career against 95 professional profiles and scores 480 business models to find which ones are a genuine fit for your background",
                    "Day rates, project fees, and time-to-first-revenue are calibrated to your level, not taken from generic market data",
                    "For every outreach task in your plan, Solo writes the actual message, ready to send, personalised to your situation and the specific person you are reaching",
                    "Your plan is saved, tracked, and adapts as you go. Solo checks in daily and adjusts the plan if things slip, it does not just sit in a history window",
                  ].map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                      </div>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </PanelLayout>


      {/* ─── 6 STEPS (TIMELINE) ─── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="mb-14 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">The process</span>
              <h2 className="font-display text-2xl font-bold sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>Six steps from your current career to an active Plan&nbsp;B</h2>
            </div>
          </ScrollReveal>

          <div className="relative">
            {/* vertical timeline line */}
            <div className="absolute left-[21px] top-6 bottom-6 w-[2px] sm:left-[23px]" style={{ background: "rgba(46,205,176,0.3)" }} />

            <div className="flex flex-col gap-16">
              <Step num={1} tag="Step one" heading="Tell Solo about your career" badge="Around 8-10 minutes" index={0}>
                <p className="text-sm leading-[1.85] text-muted-foreground">
                  Solo asks you 15 targeted questions, or fewer if you upload your CV first, which lets Solo pre-fill the straightforward ones. The questions that matter most are the ones a CV cannot answer: a specific piece of work you are proud of, who informally turns to you for advice, what you know about how your sector actually buys external help.
                </p>
                <p className="mt-3 text-sm leading-[1.85] text-muted-foreground">
                  This is what separates what Solo produces from a generic AI output. The more specific you are, the more specific the plan.
                </p>
                <DetailCard bullets={[
                  "Upload your CV to pre-fill most questions, or answer them directly, your choice",
                  "15 questions total, but typically 8 if you upload a CV",
                  "No right or wrong answers. Solo is not looking for entrepreneurial ambition, it is looking for commercial reality",
                  "Your answers are saved. You can return and pick up where you left off",
                ]} />
              </Step>

              <Step num={2} tag="Step two, free" heading="See what Solo finds about you, before you pay anything" index={1}>
                <p className="text-sm leading-[1.85] text-muted-foreground">
                  Before any payment, Solo shows you a free preview of what it has found. This is not a teaser trailer, it is a genuine read of how Solo sees your commercial position.
                </p>
                <div className="mt-5 rounded-[10px] border border-primary/30 bg-surface-mint-tint p-5">
                  <ul className="space-y-3">
                    {[
                      "Your professional profile, how Solo has classified your career and what makes your experience commercially distinctive",
                      "Your transferable value, the capabilities and credibility signals that make you a credible independent, described in terms of what clients would actually pay for",
                      "One specific insight, a single non-obvious observation about your situation that shapes which path you pursue and how fast you can move",
                      "Your top options, named, the paths that score highest for your profile. The reasoning and detail are behind the paywall but the options themselves are visible",
                    ].map((t, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Step>

              <Step num={3} tag="Step three" heading="Unlock your full plan" priceBadge="£19.99, one-time payment" index={2}>
                <p className="text-sm leading-[1.85] text-muted-foreground">
                  One payment. No plan continuation required at this stage. Everything you need to understand your options clearly and start executing is included.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: "Full report", desc: "Up to 5 paths, explored in parallel - realistic pricing, time-to-first-income, and what makes each one work or fail for your profile" },
                    { title: "30-day plan", desc: "A day-by-day action sequence built around your situation: where you are starting from, who your first contacts should be, what to say" },
                    { title: "Outreach messages", desc: "For every outreach task in your plan, a ready-to-send message. You edit, you send, Solo writes the first draft" },
                    { title: "Market snapshot", desc: "Demand, pricing benchmarks, and competitive landscape for your chosen path, calibrated to your geography and sector" },
                    { title: "AI impact read", desc: "Honest assessment of AI risk to your current role, AI resilience of your Plan B, and specific tools that strengthen it" },
                    { title: "30-day tracker", desc: "Included at no extra cost. Guided daily execution for the length of your plan, not just a document you file away" },
                  ].map((tile, i) => (
                    <GlassCard key={i} className="p-4">
                      <p className="text-xs font-semibold text-primary">{tile.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{tile.desc}</p>
                    </GlassCard>
                  ))}
                </div>
                <div className="mt-5 rounded-[10px] border-l-4 border-primary bg-surface-mint-tint p-5">
                  <p className="text-sm font-semibold">The portfolio approach</p>
                  <p className="mt-2 text-sm leading-[1.85] text-muted-foreground">
                    Solo doesn't make you choose one path before you know what has traction. You select up to 5 options and run them alongside each other. Don't put all your eggs in one basket - the 30-day plan is built around all of your chosen paths. By day 30, you know which one is worth going further - because you've already started.
                  </p>
                </div>
              </Step>

              <Step num={4} tag="Step four, the bit most products skip" heading="Your first action, ready to go" index={3}>
                <p className="text-sm leading-[1.85] text-muted-foreground">
                  The hardest part of any Plan B is not knowing what to do. It is doing the first uncomfortable thing. Solo picks that thing for you, a specific named outreach action, and has the message written before you have read the rest of the report.
                </p>
                <p className="mt-3 text-sm leading-[1.85] text-muted-foreground">
                  The window is 24 hours. Not because of artificial urgency. Because that is how long the momentum from reading a plan actually lasts.
                </p>
                <div className="mt-5 rounded-[10px] border-l-4 border-primary bg-surface-card p-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Your first action</span>
                  <h4 className="mt-2 text-sm font-semibold">Reconnect with a former colleague at a mid-market PE-backed firm</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    You mentioned you have worked closely with three PE-backed businesses. One former colleague is now a CFO at a relevant firm. This is the highest-probability first conversation for someone with your profile.
                  </p>
                  <div className="mt-4 rounded-lg bg-surface-inset p-4">
                    <p className="text-xs" style={{ color: "#A09A92" }}>Message, ready to send</p>
                    <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">
                      Hi [Name], hope things are well. I have been thinking about stepping out on my own, doing what I do now but independently. I would love 20 minutes to pick your brain, not a pitch, genuinely curious about how businesses like yours think about bringing in external finance support. Would you be up for a call?
                    </p>
                  </div>
                </div>
              </Step>

              <Step num={5} tag="Step five, included with your plan" heading="30 days of guided execution" index={4}>
                <p className="text-sm leading-[1.85] text-muted-foreground">
                  Your plan does not sit in a PDF. Solo checks in with you every day, by email, then with a short guided conversation in the app. It tracks what has happened, adjusts what is next, and replans around you if things go off track.
                </p>
                <p className="mt-3 text-sm leading-[1.85] text-muted-foreground">
                  If you go quiet for a few days, Solo does not pretend that did not happen. It acknowledges it and recalibrates the remaining time.
                </p>
                <div className="mt-5 rounded-[10px] border border-border bg-surface-card p-5">
                  <p className="text-sm font-semibold">Your plan, Day 11 of 30</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Week 2, Building visibility</p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                    <div className="h-full rounded-full bg-primary" style={{ width: "37%" }} />
                  </div>
                  <ul className="mt-4 space-y-3">
                    {[
                      { done: true, text: "Sent reconnect message to former CFO contact", badge: "Done" },
                      { done: true, text: "Updated LinkedIn headline to reflect independent positioning", badge: "Done" },
                      { today: true, text: "Follow up on the CFO reconnect, it has been 5 days. One short note is appropriate.", badge: "Today" },
                      { text: "Draft your positioning one-liner for when people ask what you do" },
                    ].map((row, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {row.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                        ) : (row as any).today ? (
                          <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-primary" />
                        ) : (
                          <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className="flex-1 text-sm text-muted-foreground">{row.text}</span>
                        {row.badge && (
                          <span className={`shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-medium ${row.done ? "bg-surface-inset text-muted-foreground" : "bg-accent text-accent-foreground"}`}>
                            {row.badge}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </Step>

              <Step num={6} tag="Step six, optional, at day 30" heading="Keep the momentum going" priceBadge="£19/month or £149/year, cancel any time" index={5}>
                <p className="text-sm leading-[1.85] text-muted-foreground">
                  At day 30, Solo asks whether you want to continue. No pressure. If you have found your first client by then, you may not need it. If you are still working through it, the plan continues, with three additional capabilities that are unavailable in the one-time plan.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {[
                    { emoji: "📋", title: "Practical guides", desc: "25 practical guides covering the mechanics of working independently: structure, tax, contracts, VAT, IR35, insurance, in plain language" },
                    { emoji: "💬", title: "Ask Solo", desc: "A persistent advisory conversation that knows your full plan and history. Not a generic chatbot, an advisor who knows your situation" },
                    { emoji: "📈", title: "Extended tracker", desc: "Continued daily check-ins, plan adaptation, and progress tracking beyond day 30, for as long as you need it" },
                  ].map((c, i) => (
                    <GlassCard key={i} className="p-5 text-center">
                      <span className="text-2xl">{c.emoji}</span>
                      <p className="mt-2 text-sm font-semibold">{c.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
                    </GlassCard>
                  ))}
                </div>
              </Step>
            </div>
          </div>
        </div>
      </PanelLayout>

      {/* ── CHART: Time to First Revenue ── */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Solo Difference</span>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                From experience to income in 30 days, not 18 months
              </h2>
            </div>
            <GlassCard noHover className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  layout="vertical"
                  data={[
                    { method: 'Unstructured (no plan)', months: 18, fill: '#E5E2DC' },
                    { method: 'Online course', months: 12, fill: '#9B9B9B' },
                    { method: 'Career coach', months: 9, fill: '#B8B5B0' },
                    { method: 'With Solo', months: 1, fill: '#2ECDB0' },
                  ]}
                  margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 11, fill: '#5A5650' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`} />
                  <YAxis type="category" dataKey="method" tick={{ fontSize: 12, fill: '#1D2025', fontWeight: 500 }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip contentStyle={{ background: '#FAF9F7', border: '1px solid #E5E2DC', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value} month${value !== 1 ? 's' : ''}`, 'Time to revenue']} />
                  <Bar dataKey="months" radius={[0, 4, 4, 0]} barSize={28}>
                    {[
                      { fill: '#E5E2DC' },
                      { fill: '#9B9B9B' },
                      { fill: '#B8B5B0' },
                      { fill: '#2ECDB0' },
                    ].map((entry, index) => (
                      <Cell key={index} fill={entry.fill} style={index === 3 ? { filter: 'drop-shadow(0 0 6px rgba(46,205,176,0.5))' } : undefined} />
                    ))}
                    <LabelList dataKey="months" position="right" formatter={(v: number) => `${v} month${v !== 1 ? 's' : ''}`} style={{ fontSize: 11, fill: '#5A5650', fontWeight: 500 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Based on industry average timelines for career transition to independent income generation
            </p>
          </div>
        </ScrollReveal>
      </PanelLayout>

      {/* ─── BOTTOM CTA ─── */}
      <PanelLayout className="overflow-hidden">
        <section className="bg-primary py-24 rounded-2xl">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <motion.h2
              className="font-display text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl lg:text-4xl"
              style={{ letterSpacing: "-0.02em" }}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            >
              See what Solo finds about your career
            </motion.h2>
            <motion.p
              className="mt-4 text-base text-primary-foreground/70"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            >
              The first look is free. You will see your professional profile, transferable value, and one specific insight about your situation, before you decide anything.
            </motion.p>
            <motion.div className="mt-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <Button
                size="lg"
                className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
                onClick={() => navigate("/questionnaire")}
              >
                Get started, it is free to see your profile
              </Button>
            </motion.div>
            <motion.p
              className="mt-4 text-sm text-primary-foreground/50"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={3}
            >
              £19.99 to unlock the full plan. No plan continuation required.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      <Footer />
    </div>
  );
}

/* ─── Step wrapper component with timeline ─── */
function Step({
  num,
  tag,
  heading,
  badge,
  priceBadge,
  index,
  children,
}: {
  num: number;
  tag: string;
  heading: string;
  badge?: string;
  priceBadge?: string;
  index: number;
  children: React.ReactNode;
}) {
  const Icon = STEP_ICONS[num] || FileText;

  return (
    <ScrollReveal delay={index * 0.1}>
      <div className="relative flex gap-5 sm:gap-6">
        {/* Timeline node */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Mint filled circle node */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-surface-panel sm:h-12 sm:w-12"
            style={{ boxShadow: "0 0 0 4px rgba(46,205,176,0.1)" }}
          >
            <Icon className="h-5 w-5" style={{ color: "#2ECDB0" }} />
          </div>
        </div>

        <div className="min-w-0 flex-1 pb-2">
          {priceBadge && (
            <span className="mb-2 inline-block rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {priceBadge}
            </span>
          )}
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {tag}
          </span>
          <h3 className="font-display mb-3 text-lg font-semibold leading-snug sm:text-xl">
            {heading}
            {badge && (
              <span className="ml-3 inline-block rounded-md bg-surface-inset px-3 py-1 align-middle text-xs font-medium text-muted-foreground">
                {badge}
              </span>
            )}
          </h3>
          {children}
        </div>
      </div>
    </ScrollReveal>
  );
}

/* ─── Detail card with bullets ─── */
function DetailCard({ bullets }: { bullets: string[] }) {
  return (
    <GlassCard className="mt-5 p-5">
      <ul className="space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
