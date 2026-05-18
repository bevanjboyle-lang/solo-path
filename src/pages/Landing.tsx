import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
// SoloLogo import dropped 2026-05-18 — hero mark removed per visual-audit (TopBar carries the brand).
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";

/*
 * Landing — Pass 1 facelift v3 (2026-05-18) — post-Phase-2 restructure
 *
 * Reorganises the landing page into a hero-dominant + accordion model
 * per Bevan's 2026-05-18 dispatch. Hero stays at full editorial weight;
 * the 12-section linear scroll becomes 8 stacked accordion rows (all
 * collapsed by default), with the dark closing CTA preserved as a fixed
 * closing band.
 *
 * Locked changes for this commit:
 *   1. CTA fix — "See your free preview" → "See a sample report",
 *      routes to /sample-report (was startTest()).
 *   2. Duplicate logo — drop "Solo" word from hero eyebrow; SoloLogo
 *      SVG stays prominent above. Eyebrow becomes "• A Plan B engine
 *      for mid-career professionals · Edition 04 · 2026."
 *   3. Accordion restructure — post-hero sections collapse to a stacked
 *      list. /faq vocabulary (mint numeral + display title + tease +
 *      +/– toggle; all collapsed by default).
 *   4. ChatGPT differentiator section gets proper numbered eyebrow
 *      (was unnumbered §4.5; now §04 The ChatGPT difference within
 *      the accordion).
 *   5. §6 Sample report preview DROPPED entirely. /sample-report page
 *      handles that job now.
 *   6. §7 Repeat CTA DROPPED (redundant in accordion layout).
 *   7. §03 Why Solo (formerly "What you get") — keep asymmetric 8/4
 *      → 6/6 → 4/8 mirror grid but TIGHTEN typographic hierarchy:
 *      big props (01, 06) get noticeably larger headings; small props
 *      (02, 05) get visibly smaller headings; medium props (03, 04)
 *      sit clearly between. Reads as deliberate ranking, not random.
 *
 * Cadence: 3 dark moments preserved.
 *   - §01 What Solo is (dark when expanded)
 *   - §04 The ChatGPT difference (dark when expanded, mint top stripe)
 *   - Final closing CTA band (fixed, always present)
 * Total within budget (≤25% per design-direction.md v1.4).
 *
 * Preserves: useHomeHandlers, ErrorBoundary self-check, report_id
 * recovery redirect, all section content + data arrays.
 *
 * Drops: SAMPLE_STRAND_DATA (sample preview removed), ScrollReveal
 * on accordion rows (animation conflicts with expand/collapse).
 */

/* ─── Handler wiring ─── */
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
    handleSampleReport: () => navigate("/sample-report"),
    isAuthed: !!user,
  };
}

/* ─── Section data (unchanged from v2 facelift) ─── */

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
 * §03 Why Solo — 6 propositions in mirror asymmetric grid (8/4 → 6/6
 * → 4/8) with TIGHTENED typographic hierarchy per 2026-05-18 dispatch:
 *   - Big props (01, 06): 8-col, heading 30-36px scale, generous body
 *   - Medium props (03, 04): 6-col, heading 22-26px scale, normal body
 *   - Small props (02, 05): 4-col, heading 17-19px scale, focused body
 * Size differences are now unmistakable — the asymmetry reads as
 * deliberate ranking ("this proposition matters more than that one")
 * rather than visual whim.
 */
const PROPS = [
  {
    num: "01",
    eyebrow: "Decision engine",
    title: "A stress-tested set of feasible options, not a brainstorm",
    body:
      "Solo classifies your profile against 95 professional archetypes and scores it across 480 business models. By the time you see your options, the weak ones are already gone. What's left is specific to your background, your network, and your financial reality.",
    titleClass: "text-[26px] sm:text-[30px] lg:text-[36px] leading-[1.1]",
    bodyClass: "text-[15px] leading-[1.7]",
    span: "lg:col-span-8",
    weight: "big" as const,
  },
  {
    num: "02",
    eyebrow: "Adaptive plan",
    title: "A plan that responds to real life",
    body:
      "The 30-day plan isn't a template. It's built from your profile and updated daily based on what actually happens. Fall behind in week two — the plan adjusts.",
    titleClass: "text-[17px] sm:text-[18px] lg:text-[19px] leading-[1.3]",
    bodyClass: "text-[13.5px] leading-[1.6]",
    span: "lg:col-span-4",
    leftRule: true,
    weight: "small" as const,
  },
  {
    num: "03",
    eyebrow: "Named outreach contacts",
    title: "Real names. Not \"try LinkedIn.\"",
    body:
      "For paths that involve direct contact, Solo finds actual people — by name, role, and company. When you're ready to send a message, Solo drafts it for you, in your voice, for that specific person. The first client is the hardest part. Solo gets you to the message.",
    titleClass: "text-[20px] sm:text-[22px] lg:text-[24px] leading-[1.2]",
    bodyClass: "text-[14.5px] leading-[1.65]",
    span: "lg:col-span-6",
    weight: "medium" as const,
  },
  {
    num: "04",
    eyebrow: "Contextual coaching",
    title: "The more you use it, the sharper it gets",
    body:
      "Ask Solo anything about your progress, your options, or your next move. Every answer draws on everything it has built about you — your archetype, your active paths, your check-in history, your blockers. Not generic advice. A specific answer to your specific situation, from a system that has been paying attention.",
    titleClass: "text-[20px] sm:text-[22px] lg:text-[24px] leading-[1.2]",
    bodyClass: "text-[14.5px] leading-[1.65]",
    span: "lg:col-span-6",
    leftRule: true,
    weight: "medium" as const,
  },
  {
    num: "05",
    eyebrow: "Guidance library",
    title: "Guidance for the hard parts",
    body:
      "Going independent involves challenges that are genuinely difficult — pricing your work, positioning yourself, handling rejection.",
    titleClass: "text-[17px] sm:text-[18px] lg:text-[19px] leading-[1.3]",
    bodyClass: "text-[13.5px] leading-[1.6]",
    span: "lg:col-span-4",
    weight: "small" as const,
  },
  {
    num: "06",
    eyebrow: "Four types of move",
    title: "Every move drafted. You decide whether to make it.",
    body:
      "Whether your path calls for a direct approach to a named contact, registering on a marketplace, writing a LinkedIn post, or joining the right community — Solo generates the move. You don't have to figure out what to do next. The next move is always ready.",
    titleClass: "text-[26px] sm:text-[30px] lg:text-[36px] leading-[1.1]",
    bodyClass: "text-[15px] leading-[1.7]",
    span: "lg:col-span-8",
    leftRule: true,
    weight: "big" as const,
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
  },
  {
    q: "What if my profile doesn't fit a clean archetype?",
    a: "Most don't fit cleanly. The classifier returns the closest match plus the two nearest alternatives. The report reflects the blend.",
  },
  {
    q: "Will my employer find out I've used this?",
    a: "No. Solo never publishes, never emails employers, never indexes your data. Your CV is processed and discarded.",
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
  onClick, children, className = "",
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
  onClick, children, className = "",
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
  const { handleStartTest, handleOpenPlan, handleSampleReport, isAuthed } = useHomeHandlers();
  const renderRegression = useMainContentSelfCheck();

  /* Accordion state — all collapsed by default per locked decision */
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection((p) => (p === id ? null : id));

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

        {/* ═══ HERO · "The Standfirst" (unchanged structure, two small fixes) ═══
          * Consistency-sweep 2026-05-18: pt-8/12 → pt-6 to match the
          * site-wide gap rule (TopBar → hero card = 24px = mb-6).
          */}
        <section className="pt-6 pb-10 lg:pb-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory p-8 sm:p-12 lg:p-16">
              {/*
               * Visual-audit 2026-05-18 fixes:
               *   1. Hero SoloLogo SVG dropped — the TopBar already renders
               *      the solo mark. Stacking a second larger mark inside
               *      the hero created a visible duplicate ("Landing duplicate
               *      solo brand mark" finding). The TopBar mark is now the
               *      sole brand cue at the top of the page.
               *   2. "Edition 04 · 2026" framing dropped — feels premature
               *      pre-launch (suggests it's the 4th edition of a shipped
               *      thing). Eyebrow reduced to the single framing line +
               *      mint dot. Cleaner, less version-y, doesn't need the
               *      hidden defence of explaining why we're on "Edition 4".
               */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span>A Plan B engine for mid-career professionals</span>
              </div>

              {/* Asymmetric 8/4 split */}
              <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-8">
                  <h1 className="title-h1">
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
                        Find what fits
                      </PrimaryButton>
                    )}
                    {/*
                     * CTA fix: label + handler swapped.
                     * Was: "See your free preview" → startTest() → /cv-upload
                     * Now: "See a sample report" → /sample-report
                     */}
                    <SecondaryButton onClick={handleSampleReport}>
                      See a sample report
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

                  <div className="mt-7 border-l border-border/70 pl-6 lg:pl-8">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Built for, briefly
                    </div>
                    <dl className="mt-5 space-y-2.5 text-[12px]">
                      {HERO_TRUST.map((row) => (
                        <div key={row.k} className="flex items-baseline justify-between gap-3">
                          <dt className="text-muted-foreground">{row.k}</dt>
                          <dd className="text-right text-foreground">{row.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ACCORDION SECTIONS · post-hero collapse ═══ */}
        <section className="pb-10 lg:pb-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory px-0 py-2 sm:py-3">

              <AccordionRow
                id="what-solo-is"
                num="01"
                title="What Solo is."
                tease="A transition engine for professionals who want to build an independent-income option before they're forced to."
                isOpen={openSection === "what-solo-is"}
                onToggle={() => toggle("what-solo-is")}
                isDark
              >
                <WhatSoloIsBody />
              </AccordionRow>

              <AccordionRow
                id="how-it-works"
                num="02"
                title="How it works."
                tease="From experience to income path in 8 minutes."
                isOpen={openSection === "how-it-works"}
                onToggle={() => toggle("how-it-works")}
              >
                <HowItWorksBody />
              </AccordionRow>

              <AccordionRow
                id="why-solo"
                num="03"
                title="Why Solo."
                tease="What Solo actually does for you — six structural propositions."
                isOpen={openSection === "why-solo"}
                onToggle={() => toggle("why-solo")}
              >
                <WhySoloBody />
              </AccordionRow>

              <AccordionRow
                id="chatgpt-difference"
                num="04"
                title="The ChatGPT difference."
                tease="General-purpose AI gives you a framework. Solo helps you actually get there."
                isOpen={openSection === "chatgpt-difference"}
                onToggle={() => toggle("chatgpt-difference")}
                isDark
              >
                <ChatGPTDifferenceBody onTake={handleStartTest} />
              </AccordionRow>

              <AccordionRow
                id="who-its-for"
                num="05"
                title="Who it's for."
                tease="Two professionals who recognise the question."
                isOpen={openSection === "who-its-for"}
                onToggle={() => toggle("who-its-for")}
              >
                <WhoItsForBody />
              </AccordionRow>

              <AccordionRow
                id="pricing"
                num="06"
                title="Pricing."
                tease="£19.99 one-time, or £19/month if you want the daily check-in loop."
                isOpen={openSection === "pricing"}
                onToggle={() => toggle("pricing")}
              >
                <PricingBody />
              </AccordionRow>

              <AccordionRow
                id="about"
                num="07"
                title="About Solo."
                tease="Plan B conversations are usually held too late, and usually with the wrong person."
                isOpen={openSection === "about"}
                onToggle={() => toggle("about")}
              >
                <AboutBody />
              </AccordionRow>

              <AccordionRow
                id="faq-teaser"
                num="08"
                title="Questions, answered."
                tease="Three things we get asked first."
                isOpen={openSection === "faq-teaser"}
                onToggle={() => toggle("faq-teaser")}
                isLast
              >
                <FAQTeaserBody />
              </AccordionRow>

            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA · DARK band, fixed closing (always present) ═══ */}
        <section className="pb-12 pt-8 lg:pb-20 lg:pt-12">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollReveal>
              {/* Drift B fix (2026-05-18): closing CTA is auth-aware. For an
                * anon visitor: "Find what fits" pitch. For an authed paid user
                * who's just scrolled the home page: "Open my plan" — they
                * don't need to be re-sold the report they've already bought.
                * Mirrors the hero CTAs which already handle this correctly. */}
              <div className="panel-dark px-8 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,247,0.65)" }}>
                    {isAuthed ? "— Pick up where you left off —" : "— Ready when you are —"}
                  </div>
                  <h2
                    className="mt-6 font-display text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[36px] lg:text-[44px]"
                    style={{ letterSpacing: "-0.025em", color: "#FAF9F7" }}
                  >
                    {isAuthed ? "Your plan is waiting." : "Your Plan B should already exist."}
                  </h2>
                  <p className="mt-5 text-[15px] leading-[1.65]" style={{ color: "rgba(250,249,247,0.80)" }}>
                    {isAuthed
                      ? "Your report, your 30-day plan, and your check-in history are right where you left them."
                      : "The fit-check takes 8 minutes. You'll see your archetype, your top income paths, and your first recommended move before you pay anything."}
                  </p>
                  <div className="mt-9">
                    {isAuthed ? (
                      <PrimaryButton onClick={handleOpenPlan}>
                        Open my plan
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={handleStartTest}>
                        Find what fits
                      </PrimaryButton>
                    )}
                  </div>
                  {!isAuthed && (
                    <div className="mt-5 text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(250,249,247,0.65)" }}>
                      £19.99 one-time · No subscription required
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

      </main>
    </div>
  );
}

/* ─────────────────────────── Accordion row ─────────────────────────── */

function AccordionRow({
  id, num, title, tease, isOpen, onToggle, isDark = false, isLast = false, children,
}: {
  id: string;
  num: string;
  title: string;
  tease: string;
  isOpen: boolean;
  onToggle: () => void;
  isDark?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`px-6 sm:px-10 lg:px-14 py-5 sm:py-6 ${
        !isLast ? "border-b border-[#E5E2DC]" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full grid grid-cols-[1fr_auto] gap-6 items-start text-left"
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-4">
            <span className="shrink-0 text-[11px] font-bold tabular-nums tracking-[0.08em]" style={{ color: "#2ECDB0" }}>
              {num}
            </span>
            <h2
              className={`font-display font-bold text-[19px] sm:text-[22px] tracking-tight leading-[1.2] ${
                isOpen ? "text-foreground" : "text-foreground"
              }`}
              style={{ letterSpacing: "-0.018em" }}
            >
              {title}
            </h2>
          </div>
          {!isOpen && (
            <p className="mt-2 ml-[28px] text-[14px] sm:text-[14.5px] text-muted-foreground leading-[1.45] max-w-[60ch]">
              {tease}
            </p>
          )}
        </div>
        <span className="text-[22px] text-muted-foreground/60 font-light leading-none pt-1 select-none">
          {isOpen ? "–" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-6 pt-2">
          {isDark ? (
            <div className="panel-dark px-6 py-8 sm:px-10 sm:py-12 -mx-3 sm:-mx-5">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Section body components ─────────────────────────── */

/* §01 What Solo is — dark when expanded (cadence moment) */
function WhatSoloIsBody() {
  return (
    <div>
      <h3
        className="font-display text-[22px] sm:text-[26px] lg:text-[30px] font-semibold leading-[1.2] tracking-tight"
        style={{ letterSpacing: "-0.02em", color: "#FAF9F7" }}
      >
        Solo is a transition engine for professionals who want to build an independent-income option before they are forced to. It turns career uncertainty into a practical plan, then drives the behaviour change needed to turn that plan into real income.
      </h3>

      <div className="mt-9 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <p className="text-[14.5px] leading-[1.75]" style={{ color: "rgba(250,249,247,0.80)" }}>
          Solo takes your career history, your skills, your working style, your risk appetite, and your financial reality — and produces a specific, ranked shortlist of income paths you can actually pursue. Not brainstorming. Not frameworks. Paths scored against 95 professional archetypes and 480 business models, with the weak ones already removed.
        </p>
        <p className="text-[14.5px] leading-[1.75]" style={{ color: "rgba(250,249,247,0.80)" }}>
          Then it builds a 30-day activation plan, finds you the right people to contact, drafts your first moves, and coaches you through the whole thing. The more you use it, the more specific it gets.
        </p>
      </div>

      <div className="mt-10 pt-8" style={{ borderTop: "1px solid rgba(250,249,247,0.15)" }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-5" style={{ color: "rgba(250,249,247,0.65)" }}>
          What Solo is not
        </div>
        <ul className="grid gap-3 text-[14px] leading-[1.7] sm:gap-4 lg:grid-cols-2 lg:gap-x-12" style={{ color: "rgba(250,249,247,0.80)" }}>
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
  );
}

/* §02 How it works */
function HowItWorksBody() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-0">
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
  );
}

/*
 * §03 Why Solo — TIGHTENED typographic hierarchy per 2026-05-18 dispatch.
 * Big props get unmistakably larger headings; small props get visibly
 * smaller; medium props sit clearly between. Per-prop title/body classes
 * defined in the PROPS data array.
 */
function WhySoloBody() {
  return (
    <div className="grid gap-x-10 gap-y-12 lg:grid-cols-12">
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
          <p className={`mt-4 ${p.bodyClass} text-muted-foreground`}>
            {p.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/* §04 The ChatGPT difference — dark when expanded, polemic interrupt */
function ChatGPTDifferenceBody({ onTake }: { onTake: () => void }) {
  return (
    <div className="text-center">
      <h3
        className="font-display text-[24px] font-semibold leading-[1.18] tracking-tight sm:text-[30px] lg:text-[36px]"
        style={{ letterSpacing: "-0.025em", color: "#FAF9F7" }}
      >
        ChatGPT can help you think about independence.
        <br />
        Solo will help you actually get there.
      </h3>

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
        You can spend ten hours prompting ChatGPT, still not have a plan, and still not know who to actually reach out to. Or take the Solo fit-check — and walk away with a real plan and a real list of people to contact.
      </p>
      <div className="mt-9">
        <PrimaryButton onClick={onTake}>Find what fits</PrimaryButton>
      </div>
    </div>
  );
}

/* §05 Who it's for — paired pull-quotes */
function WhoItsForBody() {
  return (
    <div className="space-y-12 lg:space-y-14">
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
  );
}

/* §06 Pricing */
function PricingBody() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-5">
        <h3
          className="font-display text-[22px] sm:text-[26px] lg:text-[28px] font-semibold leading-[1.2] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          One-time. Or monthly, if you want the check-in loop.
        </h3>
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
  );
}

/* §07 About */
function AboutBody() {
  return (
    <div className="mx-auto max-w-2xl">
      <h3
        className="font-display text-[22px] sm:text-[26px] lg:text-[28px] font-semibold leading-[1.2] tracking-tight"
        style={{ letterSpacing: "-0.02em" }}
      >
        Solo exists because Plan B conversations are usually held too late, and usually with the wrong person.
      </h3>
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
  );
}

/* §08 FAQ teaser */
function FAQTeaserBody() {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-4">
        <h3
          className="font-display text-[22px] sm:text-[26px] lg:text-[28px] font-semibold leading-[1.2] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Three things we get asked first.
        </h3>
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
            <details key={item.q} className="group py-5">
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
  );
}
