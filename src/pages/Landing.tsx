import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";

/*
 * Landing — Pass 1 facelift (2026-05-16)
 *
 * Implements the Claude Design Pass 1 proposal under the editorial DNA locked in
 * design-direction.md v1.2 (FT/Economist register, surface-only warmth, no 960px
 * lock, twice-per-page bare-on-photo licence). Decisions captured in
 * admin/pass-1-home-decisions.md. Spec acceptance criteria in screen-specs/01-home.md.
 *
 * Bevan overrides applied: no mint stat strip on the home page; pricing summary
 * tiles render at equal width.
 *
 * 12 sections in order per the spec: Hero / How it works / Why Solo /
 * Who it's for / Sample report (the moment) / Repeat CTA / Social proof
 * (reserved) / Pricing summary / About / FAQ teaser / Final CTA / Footer.
 *
 * Every "Take the test" CTA routes through startTest(). No inline auth logic.
 * Authed visitor sees "Open my plan" in hero; rest of page renders unchanged.
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

const STEPS = [
  {
    num: "01",
    title: "Answer the questionnaire",
    body:
      "About forty minutes. We classify you against 95 professional archetypes across 14 domains. Specific, not motivational — we ask what you've actually done, not what you're passionate about.",
    meta: "≈ 40 min · 18 questions",
  },
  {
    num: "02",
    title: "Get your report",
    body:
      "Five active strands, scored. One warmest. Each named, each costed, each with a credibility gap and a time-to-first-revenue.",
    meta: "Delivered in < 8 min",
  },
  {
    num: "03",
    title: "Work your 30-day plan",
    body:
      "Daily moves. Platform, visibility, community, and direct. Tracked in the check-in loop, regenerated when you tell us a move didn't land.",
    meta: "30 days · ~15 min / day",
  },
] as const;

const PROPS = [
  {
    num: "01",
    title: "Built for people who want a Plan B, not a motivational poster.",
    body:
      "Solo informs. It does not motivate. If you've been in a structured profession for five to twelve years, the question is rarely \"what would I love to do\" — it's \"what would actually pay, given what I already know, if the call came tomorrow.\" Solo answers the second question and refuses the first.",
    titleClass: "text-[26px] sm:text-[30px] lg:text-[34px] leading-[1.15]",
    span: "lg:col-span-7",
  },
  {
    num: "02",
    title: "Eliminates the weak paths before you see them.",
    body:
      "Most of the 480 business models we score are wrong for you. The report only shows you the ones that aren't.",
    titleClass: "text-[19px] sm:text-[20px] lg:text-[22px] leading-[1.25]",
    span: "lg:col-span-5",
  },
  {
    num: "03",
    title: "Commercial realism, costed.",
    body:
      "Each strand carries a credibility gap, an estimated time to first revenue, and a daily-rate range grounded in the market for your domain. Not a vision board.",
    titleClass: "text-[22px] sm:text-[24px] lg:text-[26px] leading-[1.2]",
    span: "lg:col-span-6",
  },
  {
    num: "04",
    title: "Built around the move, not the dream.",
    body:
      "Your 30-day plan is a sequence of specific moves — platform registrations, one post, one community, one message to one person. The product tracks each one and adapts when something doesn't land.",
    titleClass: "text-[22px] sm:text-[24px] lg:text-[26px] leading-[1.2]",
    span: "lg:col-span-6",
    offsetLeftRule: true,
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
              {/* Eyebrow */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-semibold text-foreground">Solo</span>
                <span aria-hidden className="text-muted-foreground/60">/</span>
                <span>A Plan B engine for mid-career professionals</span>
                <span aria-hidden className="text-muted-foreground/60">/</span>
                <span className="text-muted-foreground/80">Edition 04 · 2026</span>
              </div>

              {/* Asymmetric 8/4 split */}
              <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
                {/* Left — headline + subhead + CTAs */}
                <div className="lg:col-span-8">
                  <h1
                    className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-tight sm:text-[3rem] lg:text-[3.5rem]"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    Design the career you'd build if you had to start today.
                  </h1>
                  <p className="mt-6 max-w-xl text-[17px] leading-[1.55] text-muted-foreground">
                    A 30-day plan to open a professional Plan B. £19.99.
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

                {/* Right — quiet tabular spec sheet (NOT mint stat strip — Bevan override) */}
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

        {/* ═══ §3 — HOW IT WORKS · asymmetric numbered strip (no card chrome) ═══ */}
        <section id="how-it-works" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-3">
                    <SectionLabel num="03">How it works</SectionLabel>
                  </div>
                  <div className="lg:col-span-9">
                    <h2
                      className="font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[34px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Three steps. About an hour of your time. A plan you can work the next morning.
                    </h2>
                  </div>
                </div>
              </ScrollReveal>

              {/* Asymmetric 5/3/4 grid — NO card chrome. Hairline rules between. */}
              <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-0">
                {STEPS.map((step, i) => {
                  const span =
                    i === 0 ? "lg:col-span-5" : i === 1 ? "lg:col-span-3" : "lg:col-span-4";
                  const padding =
                    i === 0
                      ? "lg:pr-10"
                      : i === 1
                      ? "lg:px-8 lg:border-l lg:border-border/60"
                      : "lg:pl-10 lg:border-l lg:border-border/60";
                  return (
                    <ScrollReveal key={step.num} delay={i * 0.06}>
                      <div className={`${span} ${padding}`}>
                        <div className="font-display text-[3rem] font-semibold leading-none text-primary/80 tabular-nums">
                          {step.num}
                        </div>
                        <h3
                          className="mt-5 font-display text-[19px] font-semibold leading-[1.25] sm:text-[20px]"
                          style={{ letterSpacing: "-0.01em" }}
                        >
                          {step.title}
                        </h3>
                        <p className="mt-3 text-[14px] leading-[1.65] text-muted-foreground">
                          {step.body}
                        </p>
                        <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                          {step.meta}
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ §4 — WHY SOLO · editorial spread (no boxes, no icons, varied scales) ═══ */}
        <section id="why-solo" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-3">
                    <SectionLabel num="04">Why Solo</SectionLabel>
                  </div>
                  <div className="lg:col-span-9">
                    <h2
                      className="font-display text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[30px] lg:text-[34px]"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Independence as optionality, not as escape.
                    </h2>
                  </div>
                </div>
              </ScrollReveal>

              {/* 7/5 + 6/6 asymmetric grid. NO boxes. NO icons. Headings scale per prop. */}
              <div className="mt-14 grid gap-x-10 gap-y-12 lg:grid-cols-12">
                {PROPS.map((p, i) => (
                  <ScrollReveal key={p.num} delay={i * 0.05}>
                    <div
                      className={`${p.span} ${
                        p.offsetLeftRule ? "lg:border-l lg:border-border/60 lg:pl-10" : ""
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <span className="text-primary mr-2 tabular-nums">{p.num}</span>
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
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ §5 — WHO IT'S FOR · paired editorial pull-quotes (composite) ═══ */}
        <section id="who-its-for" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <ScrollReveal>
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
              </ScrollReveal>

              <div className="mt-12 space-y-12 lg:space-y-14">
                {PERSONAS.map((p, i) => (
                  <ScrollReveal key={p.tag} delay={i * 0.08}>
                    <div
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
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ §6 — SAMPLE REPORT · the moment (the page exhales) ═══ */}
        <section id="sample-report" className="py-10 lg:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory px-8 py-14 sm:px-12 sm:py-20 lg:px-20 lg:py-24">
              <ScrollReveal>
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
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <div className="mx-auto mt-12 max-w-4xl">
                  <div className="card-stone p-7 sm:p-9 lg:p-11">
                    {/* Report eyebrow row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <div>
                        Report ·{" "}
                        <span className="text-primary font-semibold">Sample</span> ·
                        FP&amp;A Director, 12 yrs
                      </div>
                      <div>Strand 1 of 5</div>
                    </div>

                    {/* Title */}
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

                    {/* Strand card — 7/5 split (the literal card exception per §3) */}
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

                    {/* Locked / blurred strands 2–5 */}
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
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══ §7 — REPEAT CTA · quiet one-line band (same button as hero) ═══ */}
        <section className="py-6 lg:py-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory px-8 py-7 sm:px-12 sm:py-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <p className="max-w-2xl text-[15px] leading-[1.55] text-foreground">
                  The questionnaire takes about forty minutes.{" "}
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
         * ═══ §8 — SOCIAL PROOF · reserved (hidden until real testimonials exist) ═══
         * Per spec + tone-of-voice. When real testimonials land, treatment mirrors §5
         * (paired editorial pull-quotes, attributed, no logo strips on this surface).
         */}

        {/* ═══ §9 — PRICING SUMMARY · 4/8 split, EQUAL-WIDTH tiles (Bevan override) ═══ */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                {/* Left intro */}
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

                {/* Right — two summaries at EQUAL width (per Bevan override on F1) */}
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
          </div>
        </section>

        {/* ═══ §10 — ABOUT · narrow editorial column with drop cap (F5: kept for v1) ═══ */}
        <section id="about" className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
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
          </div>
        </section>

        {/* ═══ §11 — FAQ TEASER · typographic accordion (no row chrome) ═══ */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-6">
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
          </div>
        </section>

        {/* ═══ §12 — FINAL CTA · centered editorial closer ═══ */}
        <section className="pb-12 pt-8 lg:pb-20 lg:pt-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory px-8 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  — End of preview —
                </div>
                <h2
                  className="mt-6 font-display text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[36px] lg:text-[42px]"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Forty minutes. Five strands. One plan.
                </h2>
                <p className="mt-5 text-[15px] leading-[1.65] text-muted-foreground">
                  Take the test now or save the page and come back to it. The questionnaire saves your progress.
                </p>
                <div className="mt-9">
                  <PrimaryButton onClick={handleStartTest}>
                    Take the test
                  </PrimaryButton>
                </div>
                <div className="mt-5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  £19.99 one-time · No subscription required
                </div>
              </div>
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
        className="w-full rounded-md bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Take the test
      </button>
    </div>
  );
}
