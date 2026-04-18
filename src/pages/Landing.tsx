import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SoloLogo from "@/components/SoloLogo";

/* ─── Handler wiring (named handlers only) ─── */
function useHomeHandlers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return {
    handleStartTest: () => startTest(navigate),
    handleOpenPlan: () => navigateAuthed(navigate, "/plan"),
    isAuthed: !!user,
  };
}

/* ─── Section 3: What you get ─── */
const featureCards = [
  {
    eyebrow: "Decision engine",
    title: "A stress-tested set of feasible options, not a brainstorm",
    body: "Solo classifies your profile against 95 professional archetypes and scores it across 480 business models. By the time you see your options, the weak ones are already gone. What's left is specific to your background, your network, and your financial reality.",
  },
  {
    eyebrow: "Adaptive plan",
    title: "A plan that responds to real life",
    body: "The 30-day plan isn't a template. It's built from your profile and updated daily based on what actually happens. Fall behind in week two — the plan adjusts. Things accelerate — it moves with you. It tracks where you are, not where you were supposed to be.",
  },
  {
    eyebrow: "Named outreach contacts",
    title: "Real names. Not \"try LinkedIn.\"",
    body: "For paths that involve direct contact, Solo finds actual people — by name, role, and company. When you're ready to send a message, Solo drafts it for you, in your voice, for that specific person. The first client is the hardest part. Solo gets you to the message.",
  },
  {
    eyebrow: "Contextual coaching",
    title: "The more you use it, the sharper it gets",
    body: "Ask Solo anything about your progress, your options, or your next move. Every answer draws on everything it has built about you — your archetype, your active paths, your check-in history, your blockers. Not generic advice. A specific answer to your specific situation, from a system that has been paying attention.",
  },
  {
    eyebrow: "Guidance library",
    title: "Guidance for the hard parts",
    body: "Going independent involves challenges that are genuinely difficult — pricing your work, positioning yourself, handling rejection, building a pipeline from scratch. Solo includes a structured guidance library covering nine of these areas in depth. Available when you need them, not pushed at you when you don't.",
  },
  {
    eyebrow: "Four types of move",
    title: "Every move drafted. You decide whether to make it.",
    body: "Whether your path calls for a direct approach to a named contact, registering on a marketplace, writing a LinkedIn post, or joining the right community — Solo generates the move. You don't have to figure out what to do next. The next move is always ready.",
  },
];

/* ─── Section 5: Testimonials ─── */
const testimonials = [
  {
    quote: "I'd spent two weeks going back and forth with ChatGPT trying to figure out my options. I kept getting the same advice — build a personal brand, network in my sector. Solo gave me a shortlist, told me which two paths fit my background best, and produced a list of named people to contact in week one. I sent the first message within two days. I'd never have moved that quickly on my own.",
    name: "Sarah M.",
    descriptor: "Finance Director, 14 years in financial services",
  },
  {
    quote: "The contact suggestions were what surprised me most. Not 'search LinkedIn for people in your sector' — actual named people, with enough context that I knew immediately who to approach first. I made three approaches in the first fortnight. One of them is now a real conversation. I've been trying to get to this point for a year.",
    name: "Marcus D.",
    descriptor: "Strategy Manager, 9 years in-house, now independent",
  },
  {
    quote: "What got me was how accurate the archetype description was. It described how I work, what I'm actually good at, and what buyers would want from me more precisely than anything I'd written about myself. The paths it flagged weren't the obvious ones — they were the ones I'd been too uncertain to take seriously. The plan made them feel achievable.",
    name: "James K.",
    descriptor: "Senior Programme Director, public sector background",
  },
];

/* ─── Section 6: How it works ─── */
const steps = [
  {
    num: "01",
    title: "Tell Solo about your career",
    desc: "13 targeted questions covering your role, experience, network, working style, and financial situation. Upload your CV first and it cuts to around 4 questions. Takes 8 minutes.",
  },
  {
    num: "02",
    title: "Get your report",
    desc: "Solo classifies you against 95 professional archetypes and scores your profile across 480 business models. You receive a ranked shortlist of your top paths — each with a difficulty rating, a speed-to-revenue estimate, and an explanation of why it fits your profile.",
  },
  {
    num: "03",
    title: "Start making moves",
    desc: "A 30-day activation plan starts immediately. Daily check-ins track your progress. Named contacts are ready when you are. Ask Solo anything at any point — it knows your situation.",
  },
];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleStartTest, handleOpenPlan, isAuthed } = useHomeHandlers();

  // report_id recovery redirect — never renders the page
  useEffect(() => {
    const reportId = searchParams.get("report_id");
    if (reportId) {
      navigate(`/teaser?report_id=${reportId}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main className="pt-[68px]">
        {/* ═══ SECTION 1 — HERO ═══ */}
        <section className="relative overflow-hidden">
          {/* Solid black band over the photo background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "#1A1915" }}
          />
          {/* Dark overlay for text readability */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
          />

          <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-24 sm:pt-32 lg:pt-40 text-center">
            <motion.div
              className="mb-14 sm:mb-20 flex justify-center"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ color: "#FAF9F7" }}
            >
              <SoloLogo width={240} height={68} />
            </motion.div>
            <motion.h1
              className="font-display text-[2.5rem] font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]"
              style={{ letterSpacing: "-0.025em", color: "#FAF9F7" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              If you needed to earn an independent income fast, what would you do?
            </motion.h1>

            <motion.p
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl"
              style={{ color: "rgba(250,249,247,0.9)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Most professionals don't have a credible answer to that. Solo builds one — from your actual career, not a template.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {isAuthed ? (
                <button
                  onClick={handleOpenPlan}
                  className="rounded-lg bg-[#2ECDB0] px-8 py-3.5 text-base font-semibold text-white shadow-md ring-1 ring-black/10 transition-colors hover:bg-[#26B89D]"
                >
                  Open my plan
                </button>
              ) : (
                <button
                  onClick={handleStartTest}
                  className="rounded-lg bg-[#2ECDB0] px-8 py-3.5 text-base font-semibold text-white shadow-md ring-1 ring-black/10 transition-colors hover:bg-[#26B89D]"
                >
                  Take the test
                </button>
              )}
              <a
                href="/prototypical-report-review.html"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/80 bg-transparent px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white hover:text-[#1A8A72]"
              >
                See a sample report
              </a>
            </motion.div>
          </div>
        </section>

        {/* ═══ SECTION 2 — What Solo is ═══ */}
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  What Solo is
                </p>
                <h2
                  className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2.25rem] lg:leading-[1.2]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  A decision and coaching engine for mid-career professionals who want independent income.
                </h2>
              </ScrollReveal>

              <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-12">
                <ScrollReveal delay={0.05}>
                  <p className="text-base leading-[1.75] text-muted-foreground">
                    Solo takes your career history, your skills, your working style, your risk appetite, and your financial reality — and produces a specific, ranked shortlist of income paths you can actually pursue. Not brainstorming. Not frameworks. Paths scored against 95 professional archetypes and 480 business models, with the weak ones already removed.
                  </p>
                </ScrollReveal>
                <ScrollReveal delay={0.12}>
                  <p className="text-base leading-[1.75] text-muted-foreground">
                    Then it builds a 30-day activation plan, finds you the right people to contact, drafts your first moves, and coaches you through the whole thing. The more you use it, the more specific it gets.
                  </p>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 3 — What you get ═══ */}
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  What you get
                </p>
                <h2
                  className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  What Solo actually does for you
                </h2>
              </ScrollReveal>

              <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
                {featureCards.map((c, i) => (
                  <ScrollReveal key={c.eyebrow} delay={i * 0.06}>
                    <div className="card-stone h-full p-6 sm:p-7">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        {c.eyebrow}
                      </p>
                      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
                        {c.title}
                      </h3>
                      <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">
                        {c.body}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 4 — Differentiator callout (DARK) ═══ */}
        <section
          className="relative py-20 lg:py-24"
          style={{ background: "#1A1915", borderTop: "4px solid #2ECDB0" }}
        >
          <div className="mx-auto max-w-5xl px-6 text-center">
            <ScrollReveal>
              <h2
                className="font-display text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl"
                style={{ letterSpacing: "-0.025em", color: "#FAF9F7" }}
              >
                ChatGPT can help you think about independence.
                <br />
                Solo will help you actually get there.
              </h2>
            </ScrollReveal>

            <div className="mt-10 grid gap-6 text-left md:grid-cols-2 md:gap-10">
              <ScrollReveal delay={0.08}>
                <p className="text-base leading-[1.8]" style={{ color: "rgba(250,249,247,0.85)" }}>
                  General-purpose AI will give you a framework. A list of options. Advice to "build a personal brand" and "network with people in your target sector." It does not know who you are. Every session starts from scratch.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.16}>
                <p className="text-base leading-[1.8]" style={{ color: "rgba(250,249,247,0.85)" }}>
                  Solo runs your profile against a decision engine built from 95 archetypes, 480 business models, and 2,694 scored match combinations. It builds a personalised activation system around the paths that fit you. The context it builds over time — your history, your progress, your blockers, your check-ins — is something no general-purpose AI can replicate, because it was never designed to track a specific person through a specific goal.
                </p>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.24}>
              <p
                className="mt-10 text-base font-medium"
                style={{ color: "#FAF9F7" }}
              >
                You can spend ten hours prompting ChatGPT and still have no plan. Or take the Solo test.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleStartTest}
                  className="rounded-lg bg-[#2ECDB0] px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-[#26B89D]"
                >
                  Take the test
                </button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ SECTION 5 — Testimonials ═══ */}
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Testimonials
                </p>
                <h2
                  className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  What people say after they see their report
                </h2>
              </ScrollReveal>

              <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
                {testimonials.map((t, i) => (
                  <ScrollReveal key={t.name} delay={i * 0.08}>
                    <div className="card-stone flex h-full flex-col p-6 sm:p-7">
                      <p className="font-display text-[15px] italic leading-[1.7] text-foreground/90">
                        "{t.quote}"
                      </p>
                      <div className="mt-6 border-t border-border pt-4">
                        <p className="text-sm font-semibold" style={{ color: "#3D4048" }}>
                          {t.name}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "#6B6860" }}>
                          {t.descriptor}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 6 — How it works ═══ */}
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  How it works
                </p>
                <h2
                  className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  From experience to income path in 8 minutes
                </h2>
              </ScrollReveal>

              <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
                {steps.map((s, i) => (
                  <ScrollReveal key={s.num} delay={i * 0.08}>
                    <div className="card-stone flex h-full flex-col p-6 sm:p-7">
                      <span className="font-display text-3xl font-bold text-primary">
                        {s.num}
                      </span>
                      <h3 className="mt-4 font-display text-lg font-semibold leading-snug">
                        {s.title}
                      </h3>
                      <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 7 — Final CTA ═══ */}
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-5xl px-6">
            <div
              className="panel-ivory p-10 sm:p-14 lg:p-20 text-center"
              style={{ borderTop: "4px solid #2ECDB0" }}
            >
              <ScrollReveal>
                <h2
                  className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Your Plan B should already exist.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-[1.75] text-muted-foreground">
                  The test takes 8 minutes. You'll see your archetype, your top income paths, and your first recommended move before you pay anything.
                </p>
                <div className="mt-9">
                  <button
                    onClick={handleStartTest}
                    className="rounded-lg bg-[#2ECDB0] px-9 py-4 text-base font-semibold text-white shadow-md transition-colors hover:bg-[#26B89D]"
                  >
                    Take the test — free preview
                  </button>
                </div>
                <div className="mt-5">
                  <a
                    href="/prototypical-report-review.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    See a sample report first
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ Mobile sticky CTA ═══ */}
      <MobileStickyBar onStartTest={handleStartTest} />
    </div>
  );
}

/* ─── Mobile sticky CTA bar ─── */
function MobileStickyBar({ onStartTest }: { onStartTest: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface-panel p-3 sm:hidden">
      <button
        onClick={onStartTest}
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Take the test
      </button>
    </div>
  );
}
