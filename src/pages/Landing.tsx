import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import SoloLogo from "@/components/SoloLogo";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─── Handler wiring ─── */
function useHomeHandlers() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return {
    handleStartTest: () => startTest(navigate),
    handleOpenPlan: () => navigateAuthed(navigate, "/plan"),
    isAuthed: !!user,
  };
}

/* ─── FAQ data (3 most-asked) ─── */
const faqItems = [
  {
    q: "What do I actually get for £19.99?",
    a: "A personalised report with up to 10 scored business options matched to your experience, a recommended first path, a 30-day activation plan with daily tasks, outreach email drafts, and a local market snapshot. Plus 30 days of adaptive tracking.",
  },
  {
    q: "How long does the questionnaire take?",
    a: "About 8 minutes. If you upload your CV first, some questions are pre-populated and it takes closer to 5.",
  },
  {
    q: "Is this just ChatGPT with a wrapper?",
    a: "No. Solo classifies your profile against 95 professional archetypes and 480 business models using a structured intelligence engine. The output is specific to your background, not generic advice.",
  },
];

/* ─── Persona statements ─── */
const personas = [
  "Mid-career professionals with 8+ years of experience who've never tested what their skills are worth outside an employer.",
  "Senior managers and directors who know their industry is shifting but haven't mapped a concrete alternative.",
];

/* ─── How it works steps ─── */
const steps = [
  { num: "01", title: "Answer the questionnaire", desc: "15 targeted questions about your role, experience, network, and situation. Upload your CV first to reduce it to around 8." },
  { num: "02", title: "Get your report", desc: "Solo scores your profile against 95 archetypes and 480 business models. You get up to 10 matched paths with pricing, buyers, and difficulty ratings." },
  { num: "03", title: "Work your 30-day plan", desc: "A day-by-day activation sequence tailored to your situation. Daily check-ins adapt if you fall behind or your circumstances change." },
];

/* ─── Domain tags for #who-its-for ─── */
const domains = [
  "Legal", "Finance", "Compliance", "Risk", "Marketing", "HR", "Strategy",
  "Operations", "Consulting", "Commercial", "Procurement", "Programme Management",
  "Communications", "Accounting", "Tax", "Data", "Technology", "Change Management",
  "Audit", "Business Development", "Policy", "Research", "Governance", "Investment",
  "Insurance", "Transformation", "Sales", "PMO", "Advisory", "Learning and Development",
];

/* ─── Report sections ─── */
const reportFeatures = [
  { title: "Profile interpretation", desc: "What you look like commercially, not just professionally." },
  { title: "Up to 10 business paths", desc: "Explored in parallel so you're not locked in before you know what has traction." },
  { title: "Clear recommendation", desc: "One answer on which path makes most sense for you." },
  { title: "Reality check", desc: "What's likely to go wrong and why that matters." },
  { title: "30-day activation plan", desc: "A day-by-day action sequence tailored to your situation." },
  { title: "Local market snapshot", desc: "Indicative demand and pricing data for your location." },
  { title: "Outreach drafts", desc: "Ready-to-send emails for your first target contacts." },
  { title: "Adaptive tracker", desc: "30 daily check-ins that adapt if you fall behind." },
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
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden">
          {/* Subtle mint radial */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(46,205,176,0.04) 0%, transparent 55%)" }}
          />

          <div className="mx-auto max-w-3xl px-6 pb-20 pt-24 sm:pt-32 lg:pt-40 text-center">
            <motion.h1
              className="font-display text-[2.5rem] font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]"
              style={{ letterSpacing: "-0.025em" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              Design the career you'd build if you had to start today.
            </motion.h1>

            <motion.p
              className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              A 30-day plan to open a professional Plan B. £19.99.
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
                  className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open my plan
                </button>
              ) : (
                <button
                  onClick={handleStartTest}
                  className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Take the test
                </button>
              )}
              {!isAuthed && (
                <button
                  onClick={handleStartTest}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  See your free preview
                </button>
              )}
            </motion.div>

            {/* Trust strip */}
            <motion.p
              className="mt-6 text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              Built for mid-career professionals · 30-day activation plan · £19.99
            </motion.p>
          </div>
        </section>

        {/* ═══ #how-it-works ═══ */}
        <section id="how-it-works" className="py-24 lg:py-32">
          <div className="mx-auto max-w-3xl px-6">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                From experience to income path in 8 minutes
              </h2>
            </ScrollReveal>

            <div className="mt-16 space-y-16">
              {steps.map((s, i) => (
                <ScrollReveal key={s.num} delay={i * 0.08}>
                  <div className="flex gap-6 lg:gap-10">
                    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {s.num}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold leading-snug">{s.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-md">{s.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.3}>
              <div className="mt-16 text-center">
                <button
                  onClick={handleStartTest}
                  className="rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start your test
                </button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ #why-solo — editorial split section ═══ */}
        <section id="why-solo" className="border-t border-border/50 py-24 lg:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
              {/* Left: sticky heading */}
              <ScrollReveal>
                <div className="lg:sticky lg:top-32">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why Solo</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                    Most professionals have no credible Plan B
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Not because they lack the skills. Because they've never had to translate what they know into something someone outside their employer would pay for.
                  </p>
                </div>
              </ScrollReveal>

              {/* Right: flowing content */}
              <div className="space-y-8">
                {[
                  {
                    title: "Your skills don't translate themselves",
                    body: "Most professionals can't describe what they'd sell, to whom, or for how much. They've never had to. Solo does that translation.",
                  },
                  {
                    title: "Generic advice doesn't help",
                    body: "ChatGPT gives you broad ideas. Career coaches give you confidence. Neither gives you a commercially realistic answer built from your actual experience.",
                  },
                  {
                    title: "Roles are becoming less predictable",
                    body: "Middle-management, analytical, and process roles are being restructured faster than most professionals expected. Not eliminated, but less stable and less guaranteed.",
                  },
                ].map((item, i) => (
                  <ScrollReveal key={item.title} delay={i * 0.1}>
                    <div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ #who-its-for ═══ */}
        <section id="who-its-for" className="py-24 lg:py-32">
          <div className="mx-auto max-w-3xl px-6">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Who it's for</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Solo isn't for everyone.
              </h2>
            </ScrollReveal>

            <div className="mt-8 space-y-4">
              {personas.map((p, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p}</p>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.2}>
              <p className="mt-10 text-sm font-medium text-foreground/90">
                If your background sits somewhere in here, it is.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <div className="mt-6 flex flex-wrap gap-2">
                {domains.map((d) => (
                  <span
                    key={d}
                    className="inline-block rounded-md border border-border bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <p className="mt-6 text-xs text-muted-foreground">
                95 professional archetypes · 14 domains · 480 business models
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ #sample-report — editorial preview ═══ */}
        <section id="sample-report" className="border-t border-border/50 py-24 lg:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
              {/* Left: report sections list */}
              <div>
                <ScrollReveal>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What's in your report</p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                    Eight sections. No fluff.
                  </h2>
                </ScrollReveal>

                <div className="mt-10 space-y-6">
                  {reportFeatures.map((f, i) => (
                    <ScrollReveal key={f.title} delay={i * 0.05}>
                      <div className="flex gap-4">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div>
                          <h3 className="text-sm font-semibold">{f.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>

              {/* Right: blurred locked preview + CTA */}
              <ScrollReveal delay={0.15}>
                <div className="lg:sticky lg:top-32 space-y-8">
                  {/* Simulated locked section */}
                  <div className="rounded-xl border border-border bg-surface-card p-6 relative overflow-hidden">
                    <div className="space-y-3" style={{ filter: "blur(4px)" }} aria-hidden="true">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-full rounded bg-muted" />
                      <div className="h-3 w-5/6 rounded bg-muted" />
                      <div className="h-3 w-2/3 rounded bg-muted" />
                      <div className="mt-4 h-4 w-1/2 rounded bg-muted" />
                      <div className="h-3 w-full rounded bg-muted" />
                      <div className="h-3 w-4/5 rounded bg-muted" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Your full report</p>
                        <p className="mt-1 text-xs text-muted-foreground">Unlock for £19.99</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartTest}
                    className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Take the test
                  </button>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══ Repeat CTA band ═══ */}
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <ScrollReveal>
              <button
                onClick={handleStartTest}
                className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start your test
              </button>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ Stat strip ═══ */}
        <section className="border-t border-border/50 py-16">
          <ScrollReveal>
            <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">
              {[
                { num: 95, label: "archetypes" },
                { num: 480, label: "business models" },
                { num: 2694, label: "combinations" },
              ].map((s) => (
                <div key={s.label} className="flex-1 text-center sm:px-6">
                  <span className="block font-display text-3xl font-bold text-foreground">
                    <AnimatedCounter target={s.num} />
                  </span>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-primary">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ═══ Pricing summary ═══ */}
        <section className="py-24 lg:py-32">
          <div className="mx-auto max-w-3xl px-6">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                Simple pricing. No commitment.
              </h2>
            </ScrollReveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <ScrollReveal delay={0.05}>
                <div className="rounded-xl border border-border p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">One-time</p>
                  <p className="mt-3 font-display text-3xl font-bold">£19.99</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Full report, 30-day activation plan, adaptive tracker, outreach drafts.
                  </p>
                  <Link to="/pricing" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    See details <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.12}>
                <div className="rounded-xl border border-border p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Support</p>
                  <p className="mt-3 font-display text-3xl font-bold">£19<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Ongoing tracking, guidance library, Ask Solo advisory, weekly cadence.
                  </p>
                  <Link to="/pricing" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    See details <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══ #about — Founder ═══ */}
        <section id="about" className="border-t border-border/50 py-24 lg:py-32">
          <div className="mx-auto max-w-2xl px-6">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">About Solo</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                Built by someone who's been there.
              </h2>
              <p className="mt-6 text-sm leading-[1.8] text-muted-foreground">
                Solo was built by a professional who spent 15 years in structured corporate roles before realising that the gap between "secure career" and "viable independent option" was wider than it needed to be. The tools existed. The intelligence existed. What didn't exist was a system that connected the two for people whose experience was their primary asset.
              </p>
              <p className="mt-4 text-sm leading-[1.8] text-muted-foreground">
                Solo is that system. It doesn't sell motivation or mindset. It maps the commercial reality of what your career has already built, and shows you what's possible with it.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ FAQ teaser ═══ */}
        <section className="py-24 lg:py-32">
          <div className="mx-auto max-w-2xl px-6">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
                Common questions
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <Accordion type="single" collapsible className="mt-8">
                {faqItems.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                    <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-4">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <Link to="/faq" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                All questions <ChevronRight className="h-3 w-3" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ Final CTA band ═══ */}
        <section className="bg-primary py-24">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <ScrollReveal>
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
                <button
                  onClick={handleStartTest}
                  className="rounded-lg bg-primary-foreground px-8 py-3.5 text-base font-semibold text-primary transition-colors hover:bg-primary-foreground/90"
                >
                  Take the test
                </button>
              </div>
            </ScrollReveal>
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
