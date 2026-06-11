import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
// Footer import dropped 2026-05-18, App.tsx renders the Footer for this route.

/*
 * Pricing — FT-register editorial pass (ADR-026 Phase 2, 2026-06-10).
 *
 * Recomposed from the card-era stacked panel sections to full-width
 * editorial sections separated by hairline rules. The two PricingCards
 * are now two columns divided by a hairline vertical rule, each opening
 * on a 3px ink rule (the Landing pricing-band pattern). The dark "terms"
 * strip stays as a full-bleed panel-dark band; the FAQ teaser renders
 * its three answers open (no toggles); the closing CTA is the flat ink
 * band pattern. All handlers, state variants, and copy unchanged.
 *
 * Original Pass 1 decisions (admin/pass-1-subscribe-pricing-decisions.md)
 * carried over:
 *   F1, Same PricingCard composite carries peer/peer here, peer/preferred
 *     on /subscribe. Here both render unelevated.
 *   F2, Comparison row uses editorial sentences (3 cells per row), NOT
 *     checkmark/X-mark grid. The brief explicitly forbids the SaaS grid.
 *   F3, "Take the test" CTA appears 4 times on this page (top bar + two
 *     cards + closing band). Same handler. Per spec §10 + home precedent.
 *   F4 Subscription card secondary microcopy: "Subscribe after the test
 *     only if you decide to" (calmer than CD's original "or never").
 *   32/3/29 module canonical (updated 2026-06-10; was 25/3/22 pre-Track-F) (subhead, cards, comparison).
 */

/* ── PricingCard data shape ── */
interface PricingCardData {
  pre: string;
  title: string;
  oneLiner: string;
  price: string;
  priceQual: string;
  annualLine?: string;
  bullets: ReactNode[];
  ctaLabel: string;
  secondaryMicrocopy?: string;
}

const reportCard: PricingCardData = {
  pre: "One-time",
  title: "Your report + 30-day plan",
  oneLiner: "A diagnostic report and a structured 30-day activation plan. Yours forever.",
  price: "£19.99",
  priceQual: "paid once",
  bullets: [
    // Drift 5 fix (2026-05-18, journey-trace): canonical is 10 paths scored
    // + user picks 2-5 for the plan. Was '5 scored business paths' which
    // under-described what the buyer actually gets.
    <>Your full report, <strong>10 scored business paths</strong> with our top 2–5 recommended, archetype, income outlook, AI defensibility.</>,
    <>A <strong>30-day activation plan</strong> built around your warmest strand.</>,
    <>Daily tracker for the 30 days.</>,
    <>3 of the 32 guidance modules.</>,
    <>Permanent access to your report.</>,
  ],
  ctaLabel: "Find what works",
  secondaryMicrocopy: "8 minutes · pay after you see the preview",
};

const subscriptionCard: PricingCardData = {
  pre: "Subscription",
  title: "Ongoing plan",
  oneLiner: "Everything above, plus weekly check-ins past day 30 and the rest of the library.",
  price: "£19",
  priceQual: "/ month",
  annualLine: "or £149 / year · two months free",
  bullets: [
    <>Everything in the one-time, <strong>continued past day 30</strong>.</>,
    <><strong>All 32 guidance modules</strong>, 29 more than the report includes.</>,
    <>Weekly check-ins after your first 30 days.</>,
    <>Unlimited Ask Solo, context-aware to your plan.</>,
    <>Plan regenerates when your moves don't land. Cancel any time.</>,
  ],
  ctaLabel: "Find what works",
  secondaryMicrocopy: "Subscribe after the test, only if you decide to",
};

/* ── Comparison rows, editorial sentences per cell, not binary ── */
const comparisonRows: { feat: string; oneTime: ReactNode; sub: ReactNode; faint?: boolean }[] = [
  {
    feat: "Report",
    oneTime: <>Yours forever</>,
    sub: <>Yours forever, plus a fresh test when you need one</>,
  },
  {
    feat: "30-day plan",
    oneTime: <>Daily tracker, 30 days</>,
    sub: <>Weekly check-ins past day 30, ongoing</>,
  },
  {
    feat: "Guidance modules",
    oneTime: <><strong>3 of 32</strong></>,
    sub: <><strong>All 32</strong>, 29 more than the report</>,
  },
  {
    feat: "Ask Solo",
    oneTime: <>Capped to your 30-day window</>,
    sub: <>Unlimited</>,
  },
  {
    feat: "Commitment",
    oneTime: <><strong>None</strong>, pay once, never again</>,
    sub: <>Monthly or annual · cancel any time</>,
  },
];

/* ── FAQ items, three pricing-specific questions per F3 / spec §4 ── */
const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "Will the £19/month renew automatically?",
    a: (
      <>
        Yes, that's what a subscription is. You can cancel any time from your account, and you keep
        access until the end of the paid month. The £19.99 one-time payment does <strong>not</strong>{" "}
        renew; you pay once and that's the end of it.
      </>
    ),
  },
  {
    q: "What's the difference between the report and the subscription?",
    a: (
      <>
        The report is a one-shot diagnostic, your archetype, your ten scored paths (we recommend
        two to five), your 30-day plan. You
        can use it forever. The subscription keeps the loop running past day 30: weekly check-ins,
        the rest of the modules, unlimited Ask Solo, fresh tests when your situation changes.
      </>
    ),
  },
  {
    q: 'Why "Find what works" and not "Buy now"?',
    a: (
      <>
        Because buying without your report is buying generic content. The test takes 8 minutes
        and gives you a preview before you pay, so you know what you're paying for.
      </>
    ),
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // TODO: derive isSubscriber from useSubscriptionStatus once wired here; for
  // Pass 1 the buyer-state variant is shown when user is authed.
  const isAuthedBuyer = !!user;

  const handleStartTest = () => startTest(navigate);
  const handleOpenPlan = () => navigateAuthed(navigate, "/plan");
  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main>
        {/* ── Page header ── */}
        <section className="mx-auto max-w-6xl px-6 pt-8 pb-9">
          <div className="eyebrow">Pricing</div>
          <h1 aria-label="One test. Two ways to keep going." className="title-h1 mt-3.5">
            One test. Two ways to keep going.
          </h1>
          <p className="standfirst mt-4 max-w-[52ch]">
            £19.99 gets you a report and a 30-day plan. £19 a month keeps it rolling, with the 29
            modules and the library that doesn't expire.
          </p>
        </section>

        {/* ── Two pricing columns, hairline divide, 3px ink rule atop each ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-0">
              <div className="lg:pr-10">
                <PricingCard
                  data={reportCard}
                  isAuthedBuyer={isAuthedBuyer}
                  onPrimary={isAuthedBuyer ? handleOpenPlan : handleStartTest}
                  authedBuyerCtaLabel="Open my plan"
                  authedBuyerVariant={isAuthedBuyer ? "owned" : undefined}
                />
              </div>
              <div className="lg:border-l lg:border-border lg:pl-10">
                <PricingCard
                  data={subscriptionCard}
                  isAuthedBuyer={isAuthedBuyer}
                  onPrimary={isAuthedBuyer ? handleSubscribe : handleStartTest}
                  authedBuyerCtaLabel="Upgrade now"
                  authedBuyerVariant={isAuthedBuyer ? "upgrade" : undefined}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Editorial comparison row (F2), FT table on rules ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <h4 className="rule-head mb-0">
              <span className="mr-3 text-[#15735F] tabular-nums">03</span>
              <span>What you actually get</span>
            </h4>

            <div className="grid grid-cols-3 gap-x-4 sm:gap-x-6 py-3 border-b border-border">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Feature</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">One-time · £19.99</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">Subscription · £19/mo</div>
            </div>

            {comparisonRows.map((row, i) => (
              <div
                key={row.feat}
                className={`grid grid-cols-3 gap-x-4 sm:gap-x-6 py-3 text-[13px] leading-[1.5] ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="font-display font-semibold text-foreground tracking-tight">{row.feat}</div>
                <div className={row.faint ? "italic text-muted-foreground/70" : "text-foreground/85"}>
                  {row.oneTime}
                </div>
                <div className="text-foreground/85">{row.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dark commercial-honesty strip (the cadence moment), full bleed ── */}
        <section className="panel-dark">
          <div className="mx-auto max-w-6xl px-6 py-7 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-8 items-center">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#FAF9F7" }}
            >
              The terms
            </div>
            <p
              className="font-display text-[17px] sm:text-[18px] leading-[1.45]"
              style={{ color: "#FAF9F7", letterSpacing: "-0.012em" }}
            >
              <strong>One-time payment.</strong> No auto-renewal on the report.{" "}
              <strong>Cancel subscription anytime.</strong> Your report stays yours either way.
            </p>
          </div>
        </section>

        {/* ── FAQ teaser, open Q + serif answer rows ── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="flex items-baseline justify-between pb-4 mb-1 border-b border-border">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="text-[#15735F] tabular-nums mr-3">04</span>
                <span>Three things people ask before paying</span>
              </div>
              <button onClick={() => navigate("/faq")} className="link-edit">
                See all on /faq →
              </button>
            </div>

            {faqs.map((faq, i) => (
              <div key={faq.q} className={`py-5 ${i > 0 ? "border-t border-border" : ""}`}>
                <h5 className="font-display text-[16px] sm:text-[17px] font-bold leading-[1.35] tracking-tight">
                  {faq.q}
                </h5>
                <p className="standfirst mt-2 text-[14px] max-w-[72ch]">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Closing CTA, flat ink band ── */}
        <section className="panel-dark">
          <div className="mx-auto max-w-6xl px-6 py-14 text-center sm:py-16">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(250,249,247,.6)" }}>
              {isAuthedBuyer ? "Pick up where you left off" : "Decide when you're ready"}
            </div>
            <h3
              className="mt-4 font-display text-[28px] sm:text-[34px] lg:text-[36px] font-extrabold tracking-tight leading-[1.1] max-w-[22ch] mx-auto"
              style={{ color: "#FAF9F7", letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}
            >
              {isAuthedBuyer ? "Your plan is waiting." : "See what works."}
            </h3>
            {!isAuthedBuyer && (
              <p className="standfirst mx-auto mt-3 max-w-[56ch]" style={{ color: "rgba(250,249,247,.8)" }}>
                You'll see your warmest strand for free before you decide between the one-time report
                and the subscription.
              </p>
            )}
            <div className="mt-7">
              <button onClick={isAuthedBuyer ? handleOpenPlan : handleStartTest} className="cta-block">
                {isAuthedBuyer ? "Open my plan" : "Find what works"}
              </button>
            </div>
            {!isAuthedBuyer && (
              <div className="mt-4 text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(250,249,247,.65)" }}>
                £19.99 one-time · or £19/mo with cancel any time
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer removed from page render 2026-05-18: App.tsx already
        * renders <Footer /> for /pricing (it's not in FOOTERLESS_ROUTES).
        * The page-level render was producing a duplicate dark bar. */}

      {/* Mobile sticky bottom CTA, anon visitors only, hidden when authed (they have plan access via top bar). */}
      {!isAuthedBuyer && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border sm:hidden" style={{ background: "rgba(250,249,247,0.97)", backdropFilter: "blur(8px)" }}>
          <div className="px-4 py-3">
            <button onClick={handleStartTest} className="cta-block w-full text-center">
              Find what works
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── PricingCard sub-component ─────────────────────────── */

/* ── PricingCard ──
 *
 * Local editorial composite per F1. ADR-026 Phase 2: no longer a card,
 * a column opening on a 3px ink rule (Landing pricing-band pattern).
 *
 * For authed-buyer state: `authedBuyerVariant` flips the card content:
 *   - "owned", one-time card reframes to "Already yours", CTA flips to
 *     "Open my plan" as a stone secondary button.
 *   - "upgrade", subscription card primary CTA changes to "Upgrade now"
 *     routing to /subscribe.
 */
function PricingCard({
  data, isAuthedBuyer, onPrimary, authedBuyerCtaLabel, authedBuyerVariant,
}: {
  data: PricingCardData;
  isAuthedBuyer: boolean;
  onPrimary: () => void;
  authedBuyerCtaLabel?: string;
  authedBuyerVariant?: "owned" | "upgrade";
}) {
  const isOwned = isAuthedBuyer && authedBuyerVariant === "owned";
  return (
    <div className="flex h-full flex-col border-t-[3px] border-foreground pt-5">
      {/* Column head */}
      <div className="pb-5 mb-5 border-b border-border">
        <div className="eyebrow">{data.pre}</div>
        <h3 className="mt-3 mb-2 font-display text-[20px] sm:text-[22px] font-bold tracking-tight text-foreground leading-[1.2]">
          {data.title}
        </h3>
        <p className="text-[14px] text-muted-foreground leading-[1.5] max-w-[42ch]">
          {data.oneLiner}
        </p>
        <div className="mt-3 flex items-baseline gap-2.5">
          <span className="font-display text-[44px] sm:text-[48px] font-extrabold text-foreground tabular-nums leading-none" style={{ letterSpacing: "-0.035em" }}>
            {data.price}
          </span>
          <span className="text-[14px] text-muted-foreground">{data.priceQual}</span>
        </div>
        {data.annualLine && (
          <div className="mt-1.5 text-[13px] font-medium text-[#15735F]">
            {data.annualLine}
          </div>
        )}
      </div>

      {/* Bullet list */}
      <ul className="flex-1">
        {data.bullets.map((bullet, i) => (
          <li
            key={i}
            className={`relative pl-4 py-2 text-[14px] text-foreground/85 leading-[1.5] ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="absolute left-0 top-[18px] w-2 h-[1.5px] bg-primary" />
            {bullet}
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="mt-6 pt-1">
        {isOwned ? (
          <button
            onClick={onPrimary}
            className="w-full px-5 py-[9px] text-[13px] font-semibold text-foreground bg-[#F3F1ED] border border-border transition-opacity hover:opacity-90"
          >
            {isAuthedBuyer && authedBuyerCtaLabel ? authedBuyerCtaLabel : data.ctaLabel}
          </button>
        ) : (
          <button onClick={onPrimary} className="cta-block w-full text-center">
            {isAuthedBuyer && authedBuyerCtaLabel ? authedBuyerCtaLabel : data.ctaLabel}
          </button>
        )}
        {data.secondaryMicrocopy && !isAuthedBuyer && (
          <div className="mt-2.5 text-center text-[12px] text-muted-foreground">
            {data.secondaryMicrocopy}
          </div>
        )}
      </div>
    </div>
  );
}
