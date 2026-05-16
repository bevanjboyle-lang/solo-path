import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import SoloLogo from "@/components/SoloLogo";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";

/*
 * Landing — Pass 1 facelift v2 (2026-05-16, evening)
 *
 * v2 fixes shipped after the live sense-check surfaced issues:
 *   1. ScrollReveal was wrapping each grid item, eating col-spans —
 *      §3 and §4 columns rendered crammed into a narrow strip. Fixed by
 *      moving ScrollReveal to wrap the grid container, not each item.
 *   2. Production marketing copy got replaced with placeholders during v1.
 *      Restored from the original Landing.tsx wherever it existed; new
 *      sections (Who it's for, Sample report, About, FAQ) keep placeholders
 *      until copy review.
 *   3. Two production sections brought back per Bevan's decision:
 *      "What Solo is" (now §2.5, between hero and §3 How it works)
 *      "ChatGPT differentiator" dark section (now §4.5, between §4 and §5)
 *   4. §4 expanded from 4 propositions to 6 to accommodate the production
 *      "What you get" content. Asymmetric grid varies widths across rows.
 *   5. SoloLogo restored prominently in the hero (centered, above eyebrow).
 *
 * Structural composition vocabulary unchanged from v1: editorial register,
 * panel-ivory containment, eyebrow rules, asymmetric grids, no card chrome
 * on logical content blocks, surface-only warmth. CTAs remain spec-locked
 * at "Take the test" / "See your free preview" routing through startTest().
 *
 * Decisions captured in admin/pass-1-home-decisions.md.
 */

/* ─── Handler wiring (named handlers only) ─── */
function useHomeHandlers() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && /(?:^|[#&])error=/.test(hash)) {
      navigate(`/auth${hash}`, { replace: true });
    }
  }, [navigate]);

  return {
    handleStartTest: () => startTest(navigate),
    handleOpenPlan: () => navigateAuthed(navigate, "/plan"),
    isAuthed: !!user,
  };
}

/* ─── Section data ─── */

const HERO_SPEC = [
  { num: "95", label: "Professional archetypes" },
  { num: "14", label: "Domains" },
  { num: "480", label: "Business models" },
  { num: "2,694", label: "Scored combinations" },
] as const;

const HERO_TRUST = [
  { k: "Built for", v: "Mid-career professionals" },
  { k: "Plan", v: "30-day activation" },
  { k: "Price", v: "£19.99 one-time" },
  { k: "Commitment", v: "No subscription required" },
] as const;

const WHAT_SOLO_IS_NOT = [
  { strong: true, text: "Not a generic business plan generator or startup-advice chatbot." },
  { strong: true, text: "Not a side-hustle tool, course funnel, or passive-income pitch." },
  { strong: false, text: "It's a structured process for taking the niche skills you've already built into the market — to real, paying customers in your sector." },
  { strong: false, text: "Built for mid-career professionals with a decade of expertise — not first-time founders chasing a generic startup playbook." },
] as const;

const STEPS = [
  {
    num: "01",
    title: "Tell Solo about your career",
    body:
      "13 targeted questions covering your role, experience, network, working style, and financial situation. Upload your CV first and it cuts to around 4 questions. Takes 8 minutes.",
    meta: "≈ 8 min · 13 questions",
  },
  {
    num: "02",
    title: "Get your report",
    body:
      "Solo classifies you against 95 professional archetypes and scores your profile across 480 business models. You receive a ranked shortlist of your top paths — each with a difficulty rating, a speed-to-revenue estimate, and an explanation of why it fits your profile.",
    meta: "Delivered in < 8 min",
  },
  {
    num: "03",
    title: "Start making moves",
    body:
      "A 30-day activation plan starts immediately. Daily check-ins track your progress. Named contacts are ready when you are. Ask Solo anything at any point — it knows your situation.",
    meta: "30 days · ~15 min / day",
  },
] as const;

/*
 * §4 Why Solo — 6 propositions from the production "What you get" content,
 * laid out as a 3-row asymmetric editorial spread:
 *   Row 1: prop 01 (8-col, large heading) + prop 02 (4-col, smaller)
 *   Row 2: prop 03 (6-col, medium) + prop 04 (6-col, medium, inner rule)
 *   Row 3: prop 05 (4-col, smaller) + prop 06 (8-col, large)
 * No icons, no boxes. Hierarchy via heading scale + column weight only.
 */
const PROPS = [
  {
    num: "01",
    eyebrow: "Decision engine",
    title: "A stress-tested set of feasible options, not a brainstorm",
    body:
      "Solo classifies your profile against 95 professional archetypes and scores it across 480 business models. By the time you see your options, the weak ones are already gone. What's left is specific to your background, your network, and your financial reality.",
    titleClass: "text-[24px] sm:text-[28px] lg:text-[32px] leading-[1.15]",
    span: "lg:col-span-8",
  },
  {
    num: "02",
    eyebrow: "Adaptive plan",
    title: "A plan that responds to real life",
    body:
      "The 30-day plan isn't a template. It's built from your profile and updated daily based on what actually happens. Fall behind in week two — the plan adjusts. Things accelerate — it moves with you. It tracks where you are, not where you were supposed to be.",
    titleClass: "text-[19px] sm:text-[20px] lg:text-[22px] leading-[1.25]",
    span: "lg:col-span-4",
    leftRule: true,
  },
  {
    num: "03",
    eyebrow: "Named outreach contacts",
    title: "Real names. Not \"try LinkedIn.\"",
    body:
      "For paths that involve direct contact, Solo finds actual people — by name, role, and company. When you're ready to send a message, Solo drafts it for you, in your voice, for that specific person. The first client is the hardest part. Solo gets you to the message.",
    titleClass: "text-[20px] sm:text-[22px] lg:text-[26px] leading-[1.2]",
    span: "lg:col-span-6",
  },
  {
    num: "04",
    eyebrow: "Contextual coaching",
    title: "The more you use it, the sharper it gets",
    body:
      "Ask Solo anything about your progress, your options, or your next move. Every answer draws on everything it has built about you — your archetype, your active paths, your check-in history, your blockers. Not generic advice. A specific answer to your specific situation, from a system that has been paying attention.",
    titleClass: "text-[20px] sm:text-[22px] lg:text-[26px] leading-[1.2]",
    span: "lg:col-span-6",
    leftRule: true,
  },
  {
    num: "05",
    eyebrow: "Guidance library",
    title: "Guidance for the hard parts",
    body:
      "Going independent involves challenges that are genuinely difficult — pricing your work, positioning yourself, handling rejection, building a pipeline from scratch. Solo includes a structured guidance library covering nine of these areas in depth. Available when you need them, not pushed at you when you don't.",
    titleClass: "text-[19px] sm:text-[20px] lg:text-[22px] leading-[1.25]",
    span: "lg:col-span-4",
  },
  {
    num: "06",
    eyebrow: "Four types of move",
    title: "Every move drafted. You decide whether to make it.",
    body:
      "Whether your path calls for a direct approach to a named contact, registering on a marketplace, writing a LinkedIn post, or joining the right community — Solo generates the move. You don't have to figure out what to do next. The next move is always ready.",
    titleClass: "text-[24px] sm:text-[28px] lg:text-[32px] leading-[1.15]",
    span: "lg:col-span-8",
    leftRule: true,
  },
] as const;

const PERSONAS = [
  {
    tag: "01 The Director, 11 years in",
    quote:
      "Finance director, two restructures behind me, third one on the horizon. I'm not looking for inspiration. I'm looking for the three things I could actually go and sell next Monday.",
    attribution: "Composite, FP&A / Big Four / FTSE 250",
    align: "left" as const,
  },
  {
    tag: "02 The Operator, 9 years in",
    quote:
      "Programme director in a regulated business. The exit isn't tomorrow but it isn't five years either. I want the plan in the drawer.",
    attribution: "Composite, Risk / Operations / Regulated industries",
    align: "right" as const,
  },
] as const;

const SAMPLE_STRAND_DATA = [
  { dt: "Day rate", dd: "£800 – £1,200" },
  { dt: "Time to 1st revenue", dd: "6 – 10 weeks" },
  { dt: "Clients for utilisation", dd: "3 – 5" },
  { dt: "Credibility gap", dd: "Low" },
] as const;

const PRICING = [
  {
    type: "One-time",
    pill: "Most start here",
    pillMuted: false,
    amount: "£19.99",
    qualifier: "once",
    features: [
      "Full report — five scored strands",
      "30-day activation plan",
      "Lifetime access to your report",
    ],
    primary: true,
  },
  {
    type: "Monthly",
    pill: "Optional",
    pillMuted: true,
    amount: "£19",
    qualifier: "/month, cancel any time",
    features: [
      "Everything in one-time",
      "Daily check-in loop",
      "Move regeneration when something doesn't land",
    ],
    primary: false,
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Is this AI?",
    a:
      "AI runs the classifier and drafts the moves. The scoring model, the archetype taxonomy, and the move templates are built by humans. We don't lead with \"AI\" because the user is buying the conclusions, not the technology.",
    defaultOpen: true,
  },
  {
    q: "What if my profile doesn't fit a clean archetype?",
    a: "Most don't fit cleanly. The classifier returns the closest match plus the two nearest alternatives. The report reflects the blend.",
    defaultOpen: false,
  },
  {
    q: "Will my employer find out I've used this?",
    a: "No. Solo never publishes, never emails employers, never indexes your data. Your CV is processed and discarded.",
    defaultOpen: false,
  },
] as const;

/* ─── Small composable bits ─── */

function SectionLabel({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-primary mr-3 tabular-nums">{num}</span>
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md bg-primary px-7 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5 transition-colors hover:bg-primary/90 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border border-foreground/20 bg-transparent px-7 py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-foreground/5 ${className}`}
    >
      {children}
    </button>
  );
}

/* ─── Page ─── */

export default function Landing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleStartTest, handleOpenPlan, isAuthed } = useHomeHandlers();
  const renderRegression = useMainContentSelfCheck();

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

      {renderRegression && (
        <Banner variant="error">
          Something went wrong rendering this page. Please refresh.
        </Banner>
      )}

      <main className="pt-[68px]">
        {/* ═══ §2 — HERO · "The Standfirst" (Option A) ═══ */}
        <section className="pb-10 pt-8 lg:pb-14 lg:pt-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              {/* Solo logo — restored prominently above the eyebrow */}
              <div className="flex justify-center lg:justify-start">
                <SoloLogo width={140} height={40} />
              </div>

              {/* Eyebrow */}
              <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-semibold text-foreground">Solo</span>
                <span aria-hidden className="text-muted-foreground/60">/</span>
                <span>A Plan B engine for mid-career professionals</span>
                <span aria-hidden className="text-muted-foreground/60">/</span>
                <span className="text-muted-foreground/80">Edition 04 · 2026</span>
              </div>

              {/* Asymmetric 8/4 split */}
              <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-8">
                  <h1
                    className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-tight sm:text-[3rem] lg:text-[3.5rem]"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    If you needed to earn an independent income fast, what would you do?
                  </h1>
                  <p className="mt-6 max-w-xl text-[17px] leading-[1.55] text-muted-foreground">
                    Most professionals don't have a credible answer to that. Solo builds one — from your actual career, not a template.
                  </p>
                  <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {isAuthed ? (
                      <PrimaryButton onClick={handleOpenPlan}>
                        Open my plan
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={handleStartTest}>
                        Take the test
                      </PrimaryButton>
                    )}
                    <SecondaryButton onClick={handleStartTest}>
                      See your free preview
                    </SecondaryButton>
                  </div>
                </div>

                <aside className="lg:col-span-4">
                  <div className="border-l border-border/70 pl-6 lg:border-l lg:pl-8">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      What Solo scores you against
                    </div>
                    <dl className="mt-5 space-y-3">
                      {HERO_SPEC.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-3 last:border-b-0 last:pb-0"
                        >
                          <dt className="font-display text-[22px] font-semibold tabular-nums">
                            {row.num}
                          </dt>
                          <dd className="text-right text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                            {row.label}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </aside>
              </div>

              {/* Trust strip — colophon */}
              <div className="mt-12 border-t border-border pt-5">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.12em]">
                  {HERO_TRUST.map((t, i) => (
                    <div key={t.k} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t.k}</span>
                      <span className="font-semibold text-foreground">{t.v}</span>
                      {i < HERO_TRUST.length - 1 && (
                        <span aria-hidden className="ml-4 text-muted-foreground/40">
                          ·
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ §2.5 — WHAT SOLO IS · DARK card variant (per 25% cadence) ═══ */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-dark p-8 sm:p-12 lg:p-16">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,247,0.65)" }}>
                  <span className="text-primary mr-3 tabular-nums">02</span>What Solo is
                </div>
                <h2
                  className="mt-4 font-display text-[24px] font-semibold leading-[1.25] tracking-tight sm:text-[28px] lg:text-[32px]"
                  style={{ letterSpacing: "-0.02em", color: "#FAF9F7" }}
                >
                  Solo is a transition engine for professionals who want to build an independent-income option before they are forced to. It turns career uncertainty into a practical plan, then drives the behaviour change needed to turn that plan into real income.
                </h2>

                <div className="mt-9 grid gap-8 lg:grid-cols-2 lg:gap-12">
                  <p className="text-[15px] leading-[1.75]" style={{ color: "rgba(250,249,247,0.80)" }}>
                    Solo takes your career history, your skills, your working style, your risk appetite, and your financial reality — and produces a specific, ranked shortlist of income paths you can actually pursue. Not brainstorming. Not frameworks. Paths scored against 95 professional archetypes and 480 business models, with the weak ones already removed.
                  </p>
                  <p className="text-[15px] leading-[1.75]" style={{ color: "rgba(250,249,247,0.80)" }}>
                    Then it builds a 30-day activation plan, finds you the right people to contact, drafts your first moves, and coaches you through the whole thing. The more you use it, the more specific it gets.
                  </p>
                </div>

                <div className="mt-10 pt-8" style={{ borderTop: "1px solid rgba(250,249,247,0.15)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,247,0.65)" }}>
                    <span className="text-primary mr-3 tabular-nums">02</span>What Solo is not
                  </div>
                  <ul className="mt-5 grid gap-3 text-[14.5px] leading-[1.7] sm:gap-4 lg:grid-cols-2 lg:gap-x-12" style={{ color: "rgba(250,249,247,0.80)" }}>
                    {WHAT_SOLO_IS_NOT.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                        <span style={item.strong ? { fontWeight: 600, color: "#FAF9F7" } : undefined}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §3 — HOW IT WORKS · asymmetric numbered strip (no card chrome) ═══ */}
        <section id="how-it-works" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory p-8 sm:p-12 lg:p-16">
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-3">
                    <SectionLabel num="03">How it works</SectionLabel>
                  </div>
                  <div className="lg:col-span-9">
                    <h2
                      className="font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[34px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      From experience to income path in 8 minutes.
                    </h2>
                  </div>
                </div>

                {/* Asymmetric 5/3/4 grid — NO card chrome. Direct grid children. */}
                <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-0">
                  {STEPS.map((step, i) => {
                    const span =
                      i === 0
                        ? "lg:col-span-5 lg:pr-10"
                        : i === 1
                        ? "lg:col-span-3 lg:px-8 lg:border-l lg:border-border/60"
                        : "lg:col-span-4 lg:pl-10 lg:border-l lg:border-border/60";
                    return (
                      <div key={step.num} className={span}>
                        <div className="font-display text-[3rem] font-semibold leading-none text-primary/80 tabular-nums">
                          {step.num}
                        </div>
                        <h3
                          className="mt-5 font-display text-[19px] font-semibold leading-[1.25] sm:text-[20px]"
                          style={{ letterSpacing: "-0.01em" }}
                        >
                          {step.title}
                        </h3>
                        <p className="mt-3 text-[14.5px] leading-[1.65] text-muted-foreground">
                          {step.body}
                        </p>
                        <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                          {step.meta}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §4 — WHY SOLO · 6-prop editorial spread (no boxes, no icons) ═══ */}
        <section id="why-solo" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory p-8 sm:p-12 lg:p-16">
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-3">
                    <SectionLabel num="04">What you get</SectionLabel>
                  </div>
                  <div className="lg:col-span-9">
                    <h2
                      className="font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[34px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      What Solo actually does for you.
                    </h2>
                  </div>
                </div>

                {/* 6 props laid out as a 3-row asymmetric editorial spread. NO boxes. NO icons. */}
                <div className="mt-14 grid gap-x-10 gap-y-14 lg:grid-cols-12">
                  {PROPS.map((p) => (
                    <div
                      key={p.num}
                      className={`${p.span} ${
                        p.leftRule ? "lg:border-l lg:border-border/60 lg:pl-10" : ""
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <span className="text-primary mr-2 tabular-nums">{p.num}</span>
                        {p.eyebrow}
                      </div>
                      <h3
                        className={`mt-3 font-display font-semibold ${p.titleClass}`}
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {p.title}
                      </h3>
                      <p className="mt-4 text-[14.5px] leading-[1.7] text-muted-foreground">
                        {p.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §4.5 — CHATGPT DIFFERENTIATOR · DARK (polemic variant: mint top stripe) ═══ */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div
                className="panel-dark px-8 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24 text-center"
                style={{ borderTop: "4px solid #2ECDB0" }}
              >
                <h2
                  className="font-display text-[26px] font-semibold leading-[1.18] tracking-tight sm:text-[32px] lg:text-[38px]"
                  style={{ letterSpacing: "-0.025em", color: "#FAF9F7" }}
                >
                  ChatGPT can help you think about independence.
                  <br />
                  Solo will help you actually get there.
                </h2>

                <div className="mx-auto mt-10 grid max-w-4xl gap-6 text-left md:grid-cols-2 md:gap-10">
                  <p className="text-[14.5px] leading-[1.75]" style={{ color: "rgba(250,249,247,0.85)" }}>
                    General-purpose AI will give you a framework. A list of options. Advice to "build a personal brand" and "network with people in your target sector." It does not know who you are. Every session starts from scratch.
                  </p>
                  <p className="text-[14.5px] leading-[1.75]" style={{ color: "rgba(250,249,247,0.85)" }}>
                    Solo runs your profile against a decision engine built from 95 archetypes, 480 business models, and 2,694 scored match combinations. It builds a personalised activation system around the paths that fit you. The context it builds over time — your history, your progress, your blockers, your check-ins — is something no general-purpose AI can replicate, because it was never designed to track a specific person through a specific goal.
                  </p>
                </div>

                <p
                  className="mx-auto mt-10 max-w-3xl text-[14.5px] font-medium leading-[1.6]"
                  style={{ color: "#FAF9F7" }}
                >
                  You can spend ten hours prompting ChatGPT, still not have a plan, and still not know who to actually reach out to. Or take the Solo test — and walk away with a real plan and a real list of people to contact.
                </p>
                <div className="mt-9">
                  <PrimaryButton onClick={handleStartTest}>
                    Take the test
                  </PrimaryButton>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §5 — WHO IT'S FOR · paired editorial pull-quotes (composite) ═══ */}
        <section id="who-its-for" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory p-8 sm:p-12 lg:p-16">
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-3">
                    <SectionLabel num="05">Who it's for</SectionLabel>
                  </div>
                  <div className="lg:col-span-9">
                    <h2
                      className="font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[34px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Two professionals who recognise the question.
                    </h2>
                  </div>
                </div>

                <div className="mt-12 space-y-12 lg:space-y-14">
                  {PERSONAS.map((p, i) => (
                    <div
                      key={p.tag}
                      className={`grid gap-6 lg:grid-cols-12 lg:gap-10 ${
                        p.align === "right" ? "lg:[&>*:first-child]:order-2" : ""
                      } ${i > 0 ? "border-t border-border/50 pt-12 lg:pt-14" : ""}`}
                    >
                      <div className="lg:col-span-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <span className="text-primary mr-2 tabular-nums">
                            {p.tag.split(" ")[0]}
                          </span>
                          {p.tag.split(" ").slice(1).join(" ")}
                        </div>
                      </div>
                      <div className="lg:col-span-9">
                        <blockquote
                          className="font-display text-[22px] font-medium leading-[1.4] tracking-tight text-foreground sm:text-[26px] lg:text-[28px]"
                          style={{ letterSpacing: "-0.015em" }}
                        >
                          &ldquo;{p.quote}&rdquo;
                        </blockquote>
                        <div className="mt-4 text-[12px] italic text-muted-foreground">
                          — {p.attribution}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §6 — SAMPLE REPORT · the moment (the page exhales) ═══ */}
        <section id="sample-report" className="py-10 lg:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory px-8 py-14 sm:px-12 sm:py-20 lg:px-20 lg:py-24">
                <div className="mx-auto max-w-2xl text-center">
                  <SectionLabel num="06">Sample report</SectionLabel>
                  <h2
                    className="mt-5 font-display text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[34px] lg:text-[38px]"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    What the report actually looks like.
                  </h2>
                  <p className="mt-4 text-[14.5px] leading-[1.65] text-muted-foreground">
                    One strand from a finance director's report. Not a mockup of features — a section of the artefact.
                  </p>
                </div>

                <div className="mx-auto mt-12 max-w-4xl">
                  <div className="card-stone p-7 sm:p-9 lg:p-11">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <div>
                        Report ·{" "}
                        <span className="text-primary font-semibold">Sample</span> ·
                        FP&amp;A Director, 12 yrs
                      </div>
                      <div>Strand 1 of 5</div>
                    </div>

                    <div className="mt-6">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Warmest strand
                      </div>
                      <h3
                        className="mt-2 font-display text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]"
                        style={{ letterSpacing: "-0.015em" }}
                      >
                        Fractional FP&amp;A Director
                      </h3>
                    </div>

                    <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:gap-10">
                      <div className="lg:col-span-7">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                          Rank 01 · High confidence
                        </div>
                        <h4
                          className="mt-3 font-display text-[18px] font-semibold leading-[1.3] sm:text-[19px]"
                          style={{ letterSpacing: "-0.01em" }}
                        >
                          Month-end close and board-pack services to three to five SMEs.
                        </h4>
                        <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
                          Highest credibility-to-effort ratio for your profile. Buyers are CFOs and CEOs of £5–25m revenue businesses who can't justify a full-time hire. The credibility gap is small — the work is recognisably what you already do.
                        </p>
                      </div>
                      <div className="lg:col-span-5 lg:border-l lg:border-border/50 lg:pl-8">
                        <dl className="space-y-3">
                          {SAMPLE_STRAND_DATA.map((row) => (
                            <div
                              key={row.dt}
                              className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2.5 last:border-b-0 last:pb-0"
                            >
                              <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                                {row.dt}
                              </dt>
                              <dd className="text-[13.5px] font-semibold tabular-nums text-foreground">
                                {row.dd}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>

                    <div className="relative mt-9 overflow-hidden rounded-md border border-border/40 bg-surface-panel/60 px-6 py-8">
                      <div className="select-none" style={{ filter: "blur(5px)" }} aria-hidden>
                        <div className="text-[15px] font-semibold">Strand 2 — Finance Transformation</div>
                        <div className="mt-3 h-2 w-4/5 rounded bg-foreground/15" />
                        <div className="mt-2 h-2 w-3/5 rounded bg-foreground/15" />
                        <div className="mt-2 h-2 w-2/3 rounded bg-foreground/15" />
                        <div className="mt-2 h-2 w-3/5 rounded bg-foreground/15" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-panel px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm">
                          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                          Free preview shows 1 of 5 strands
                        </span>
                      </div>
                    </div>

                    <p className="mt-6 text-center text-[11px] italic text-muted-foreground">
                      Sample only. Your report is built from your own questionnaire and CV.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §7 — REPEAT CTA · quiet one-line band (same button as hero) ═══ */}
        <section className="py-6 lg:py-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory px-8 py-7 sm:px-12 sm:py-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <p className="max-w-2xl text-[15px] leading-[1.55] text-foreground">
                  The questionnaire takes about eight minutes.{" "}
                  <span className="text-muted-foreground">
                    You'll see your warmest strand inside ten.
                  </span>
                </p>
                <PrimaryButton onClick={handleStartTest}>
                  Start your test
                </PrimaryButton>
              </div>
            </div>
          </div>
        </section>

        {/*
         * §8 — Social proof reserved. Hidden until real testimonials exist
         * per tone-of-voice "Honest caveats, not false reassurance."
         */}

        {/* ═══ §9 — PRICING SUMMARY · 4/8 split, EQUAL-WIDTH tiles ═══ */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory p-8 sm:p-12 lg:p-16">
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-5">
                    <SectionLabel num="09">Pricing</SectionLabel>
                    <h2
                      className="mt-5 font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[32px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      One-time. Or monthly, if you want the check-in loop.
                    </h2>
                    <p className="mt-4 text-[14.5px] leading-[1.65] text-muted-foreground">
                      Most users buy the one-time. The subscription exists because some users want the daily tracker running for the full thirty days.
                    </p>
                    <a
                      href="/pricing"
                      className="mt-5 inline-block text-[13px] font-semibold text-primary hover:underline"
                    >
                      See full pricing →
                    </a>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                      {PRICING.map((p) => (
                        <div
                          key={p.type}
                          className={`card-stone flex flex-col p-6 sm:p-7 ${
                            p.primary ? "ring-1 ring-primary/30" : ""
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <h4 className="font-display text-[18px] font-semibold tracking-tight">
                              {p.type}
                            </h4>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                p.pillMuted
                                  ? "bg-foreground/5 text-muted-foreground"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {p.pill}
                            </span>
                          </div>
                          <div className="mt-5 flex items-baseline gap-2">
                            <span className="font-display text-[32px] font-semibold tabular-nums leading-none">
                              {p.amount}
                            </span>
                            <span className="text-[12px] text-muted-foreground">
                              {p.qualifier}
                            </span>
                          </div>
                          <ul className="mt-5 space-y-2 text-[13px] leading-[1.55] text-muted-foreground">
                            {p.features.map((f) => (
                              <li key={f} className="flex gap-2.5">
                                <span aria-hidden className="mt-[0.65em] h-1 w-1 flex-none rounded-full bg-primary" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                          <a
                            href="/pricing"
                            className="mt-6 inline-block text-[12px] font-semibold text-primary hover:underline"
                          >
                            {p.primary ? "See what's included →" : "Compare on /pricing →"}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §10 — ABOUT · narrow editorial column with drop cap ═══ */}
        <section id="about" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory p-8 sm:p-12 lg:p-16">
                <div className="mx-auto max-w-2xl">
                  <SectionLabel num="10">About Solo</SectionLabel>
                  <h2
                    className="mt-5 font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[32px]"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    Solo exists because Plan B conversations are usually held too late, and usually with the wrong person.
                  </h2>
                  <p className="mt-7 text-[16px] leading-[1.75] text-foreground/90">
                    <span
                      aria-hidden
                      className="font-display float-left mr-2 mt-1 text-[64px] font-semibold leading-[0.85] text-primary"
                      style={{ letterSpacing: "-0.04em" }}
                    >
                      S
                    </span>
                    olo was built by someone who has worked through three of these conversations themselves and has run them with several hundred mid-career professionals. The product is the artefact of those conversations — the spreadsheets, the scoring system, the move templates, the questions you ask when someone walks into the room not yet ready to say "I might leave."
                  </p>
                  <p className="mt-4 text-[14.5px] leading-[1.7] text-muted-foreground">
                    Placeholder paragraph for composition. The founder paragraph will run to about 140 words. The founder is deliberately not named in this slot until the marketing copy is reviewed.
                  </p>
                  <a
                    href="#"
                    className="mt-6 inline-block text-[13px] font-semibold text-primary hover:underline"
                  >
                    Read the full background →
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §11 — FAQ TEASER · typographic accordion (no row chrome) ═══ */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-ivory p-8 sm:p-12 lg:p-16">
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-4">
                    <SectionLabel num="11">Questions</SectionLabel>
                    <h2
                      className="mt-5 font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[32px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Three things we get asked first.
                    </h2>
                    <a
                      href="/faq"
                      className="mt-5 inline-block text-[13px] font-semibold text-primary hover:underline"
                    >
                      See all on /faq →
                    </a>
                  </div>
                  <div className="lg:col-span-8">
                    <div className="divide-y divide-border/60 border-y border-border/60">
                      {FAQ_ITEMS.map((item) => (
                        <details
                          key={item.q}
                          open={item.defaultOpen}
                          className="group py-5"
                        >
                          <summary className="flex cursor-pointer items-start justify-between gap-6 list-none [&::-webkit-details-marker]:hidden">
                            <span className="font-display text-[17px] font-semibold leading-snug tracking-tight">
                              {item.q}
                            </span>
                            <span
                              aria-hidden
                              className="text-[20px] leading-none text-muted-foreground transition-transform group-open:rotate-45"
                            >
                              +
                            </span>
                          </summary>
                          <div className="mt-4 text-[14px] leading-[1.7] text-muted-foreground">
                            {item.a}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ §12 — FINAL CTA · DARK card variant (per 25% cadence) ═══ */}
        <section className="pb-12 pt-8 lg:pb-20 lg:pt-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              <div className="panel-dark px-8 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,247,0.65)" }}>
                    — End of preview —
                  </div>
                  <h2
                    className="mt-6 font-display text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[36px] lg:text-[44px]"
                    style={{ letterSpacing: "-0.025em", color: "#FAF9F7" }}
                  >
                    Your Plan B should already exist.
                  </h2>
                  <p className="mt-5 text-[15px] leading-[1.65]" style={{ color: "rgba(250,249,247,0.80)" }}>
                    The test takes 8 minutes. You'll see your archetype, your top income paths, and your first recommended move before you pay anything.
                  </p>
                  <div className="mt-9">
                    <PrimaryButton onClick={handleStartTest}>
                      Take the test
                    </PrimaryButton>
                  </div>
                  <div className="mt-5 text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(250,249,247,0.65)" }}>
                    £19.99 one-time · No subscription required
                  </div>
                </div>
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
        className="w-full rounded-md bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Take the test
      </button>
    </div>
  );
}
