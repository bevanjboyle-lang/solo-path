import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
// Footer import dropped 2026-05-18, App.tsx renders the Footer for this route.

/*
 * Pricing Pass 1 /pricing v1 (2026-05-18) fourth Phase 2 cycle (paired)
 *
 * Editorial reskin of the anonymous objection-handling pricing surface.
 * Inherits anonymous chrome (TopBar.anonymous + Footer), dense FT register,
 * editorial section vocabulary from /plan + /report + /library + /account.
 *
 * Locked decisions from admin/pass-1-subscribe-pricing-decisions.md:
 *   F1, Same PricingCard composite carries peer/peer here, peer/preferred
 *     on /subscribe. Here both render unelevated.
 *   F2, Comparison row uses editorial sentences (3 cells per row), NOT
 *     checkmark/X-mark grid. The brief explicitly forbids the SaaS grid.
 *   F3, "Take the test" CTA appears 4 times on this page (top bar + two
 *     cards + closing band). Same handler. Per spec §10 + home precedent.
 *   F4 Subscription card secondary microcopy: "Subscribe after the test
 *     only if you decide to" (calmer than CD's original "or never").
 *   32/3/29 module canonical (updated 2026-06-10; was 25/3/22 pre-Track-F) (subhead, cards, comparison).
 *
 * Cadence: single dark moment, the commercial honesty strip between the
 * comparison row and FAQ teaser. Frames the terms ("no auto-renewal · cancel
 * anytime") as the page's pivot from explanation to decision. Per v1.4 §8.
 *
 * Pass 1 scope: shell + chrome + sections + dark honesty strip + per-state
 * variant logic (authed buyer, subscriber). PricingCard rebuilt as local
 * editorial component with optional elevation + topTag props (shared
 * vocabulary with /subscribe even though instantiated separately).
 *
 * Drops framer-motion + ScrollReveal + GlassCard + lucide Check + the
 * old ComparisonTable. Replaces the per-card highlighted styling.
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
  ctaLabel: "Find what fits",
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
  ctaLabel: "Find what fits",
  secondaryMicrocopy: "Subscribe after the fit-check, only if you decide to",
};

/* ── Comparison rows, editorial sentences per cell, not binary ── */
const comparisonRows: { feat: string; oneTime: ReactNode; sub: ReactNode; faint?: boolean }[] = [
  {
    feat: "Report",
    oneTime: <>Yours forever</>,
    sub: <>Yours forever, plus a fresh fit-check when you need one</>,
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
        the rest of the modules, unlimited Ask Solo, fresh fit-checks when your situation changes.
      </>
    ),
  },
  {
    q: 'Why "Find what fits" and not "Buy now"?',
    a: (
      <>
        Because buying without your report is buying generic content. The fit-check takes 8 minutes
        and gives you a preview before you pay, so you know what you're paying for.
      </>
    ),
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);

  // TODO: derive isSubscriber from useSubscriptionStatus once wired here; for
  // Pass 1 the buyer-state variant is shown when user is authed.
  const isAuthedBuyer = !!user;

  const handleStartTest = () => startTest(navigate);
  const handleOpenPlan = () => navigateAuthed(navigate, "/plan");
  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main className="pt-[68px]">
        <div className="mx-auto max-w-screen-lg px-6 pt-6 pb-10 lg:pb-14">

          {/* ── Page header ── */}
          <section className="panel-ivory px-6 sm:px-10 lg:px-12 py-10 sm:py-12 mb-6">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-foreground">Pricing</span>
            </div>
            <h1 aria-label="One fit-check. Two ways to keep going." className="title-h1">
              One fit-check. Two ways to keep going.
            </h1>
            <p className="mt-4 font-display text-[17px] sm:text-[19px] text-muted-foreground leading-[1.4] max-w-[52ch]">
              £19.99 gets you a report and a 30-day plan. £19 a month keeps it rolling, with the 29
              modules and the library that doesn't expire.
            </p>
          </section>

          {/* ── Two PricingCards (peer/peer) ── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <PricingCard
              data={reportCard}
              isAuthedBuyer={isAuthedBuyer}
              onPrimary={isAuthedBuyer ? handleOpenPlan : handleStartTest}
              authedBuyerCtaLabel="Open my plan"
              authedBuyerVariant={isAuthedBuyer ? "owned" : undefined}
            />
            <PricingCard
              data={subscriptionCard}
              isAuthedBuyer={isAuthedBuyer}
              onPrimary={isAuthedBuyer ? handleSubscribe : handleStartTest}
              authedBuyerCtaLabel="Upgrade now"
              authedBuyerVariant={isAuthedBuyer ? "upgrade" : undefined}
            />
          </section>

          {/* ── Editorial comparison row (F2) ── */}
          <section className="panel-ivory px-6 sm:px-10 lg:px-12 py-8 sm:py-10 mb-6">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
              <span className="text-primary tabular-nums">03</span>
              <span>What you actually get</span>
            </div>

            <div className="grid grid-cols-3 gap-x-4 sm:gap-x-6 pb-3 border-b border-[#D5D0C8]">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Feature</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">One-time · £19.99</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">Subscription · £19/mo</div>
            </div>

            {comparisonRows.map((row, i) => (
              <div
                key={row.feat}
                className={`grid grid-cols-3 gap-x-4 sm:gap-x-6 py-3 text-[13px] leading-[1.5] ${
                  i > 0 ? "border-t border-[#EDEBE6]" : ""
                }`}
              >
                <div className="font-display font-semibold text-foreground tracking-tight">{row.feat}</div>
                <div className={row.faint ? "italic text-muted-foreground/70" : "text-foreground/85"}>
                  {row.oneTime}
                </div>
                <div className="text-foreground/85">{row.sub}</div>
              </div>
            ))}
          </section>

          {/* ── Dark commercial-honesty strip (the cadence moment) ── */}
          <section className="panel-dark px-6 sm:px-10 lg:px-12 py-7 mb-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-8 items-center">
            <div
              className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "rgba(250,249,247,0.65)" }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              <span style={{ color: "#FAF9F7" }}>The terms</span>
            </div>
            <p
              className="font-display text-[17px] sm:text-[18px] leading-[1.45]"
              style={{ color: "#FAF9F7", letterSpacing: "-0.012em" }}
            >
              <strong>One-time payment.</strong> No auto-renewal on the report.{" "}
              <strong>Cancel subscription anytime.</strong> Your report stays yours either way.
            </p>
          </section>

          {/* ── FAQ teaser ── */}
          <section className="panel-ivory px-6 sm:px-10 lg:px-12 py-8 sm:py-10 mb-6">
            <div className="flex items-baseline justify-between pb-4 mb-2 border-b border-[#E5E2DC]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="text-primary tabular-nums mr-3">04</span>
                <span>Three things people ask before paying</span>
              </div>
              <button
                onClick={() => navigate("/faq")}
                className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
              >
                See all on /faq →
              </button>
            </div>

            {faqs.map((faq, i) => {
              const open = openFaqIdx === i;
              return (
                <div key={faq.q} className={`py-5 ${i > 0 ? "border-t border-[#EDEBE6]" : ""}`}>
                  <button
                    onClick={() => setOpenFaqIdx(open ? -1 : i)}
                    aria-expanded={open}
                    className="w-full grid grid-cols-[1fr_auto] gap-6 items-start text-left"
                  >
                    <span className="font-display text-[16px] sm:text-[17px] font-semibold text-foreground leading-[1.35]" style={{ letterSpacing: "-0.018em" }}>
                      {faq.q}
                    </span>
                    <span className="text-[22px] text-muted-foreground font-light leading-none pt-0.5">
                      {open ? "–" : "+"}
                    </span>
                  </button>
                  {open && (
                    <p className="mt-2 text-[13.5px] text-foreground/80 leading-[1.6] max-w-[72ch]">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </section>

          {/* ── Closing CTA band ──
            * Fix 2026-05-18: wrapped in panel-ivory to match the page's
            * other sections. Previously sat directly on the office photo
            * background, making the body copy and microcopy unreadable. */}
          <section className="panel-ivory px-6 sm:px-10 lg:px-12 py-14 sm:py-16 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
              {isAuthedBuyer ? "Pick up where you left off" : "Decide when you're ready"}
            </div>
            <h3
              className="font-display text-[28px] sm:text-[34px] lg:text-[36px] font-extrabold tracking-tight leading-[1.1] text-foreground max-w-[22ch] mx-auto mb-4"
              style={{ letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}
            >
              {isAuthedBuyer ? "Your plan is waiting." : "See what fits."}
            </h3>
            {!isAuthedBuyer && (
              <p className="font-display text-[16px] sm:text-[17px] text-muted-foreground max-w-[56ch] mx-auto mb-7">
                You'll see your warmest strand for free before you decide between the one-time report
                and the subscription.
              </p>
            )}
            <button
              onClick={isAuthedBuyer ? handleOpenPlan : handleStartTest}
              className="inline-flex items-center justify-center rounded-md px-7 py-3.5 text-[15px] font-semibold text-[#1A1915] transition-opacity hover:opacity-90"
              style={{ background: "#2ECDB0" }}
            >
              {isAuthedBuyer ? "Open my plan" : "Find what fits"}
            </button>
            {!isAuthedBuyer && (
              <div className="mt-4 text-[11px] text-muted-foreground/70 tracking-[0.04em]">
                £19.99 one-time · or £19/mo with cancel any time
              </div>
            )}
          </section>

        </div>
      </main>

      {/* Footer removed from page render 2026-05-18: App.tsx already
        * renders <Footer /> for /pricing (it's not in FOOTERLESS_ROUTES).
        * The page-level render was producing a duplicate dark bar. */}

      {/* Mobile sticky bottom CTA, anon visitors only, hidden when authed (they have plan access via top bar). */}
      {!isAuthedBuyer && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#D8D4CC] sm:hidden" style={{ background: "rgba(250,249,247,0.97)", backdropFilter: "blur(8px)" }}>
          <div className="px-4 py-3">
            <button
              onClick={handleStartTest}
              className="w-full rounded-md px-6 py-3 text-[14px] font-semibold text-[#1A1915]"
              style={{ background: "#2ECDB0" }}
            >
              Find what fits
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
 * Local editorial composite per F1. Optional `elevated` prop (border-strong
 * outline) + `topTag` prop (hairline-bordered mint pill half-overlapping
 * the top border). Pass 1 /pricing renders both cards unelevated (peer/peer).
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
  return (
    <div className="relative panel-ivory p-8 sm:p-9 flex flex-col">
      {/* Card head */}
      <div className="pb-5 mb-5 border-b border-[#E5E2DC]">
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          <span>{data.pre}</span>
        </div>
        <h3 className="font-display text-[20px] sm:text-[22px] font-bold tracking-tight text-foreground leading-[1.2] mb-2" style={{ letterSpacing: "-0.02em" }}>
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
          <div className="mt-1.5 text-[13px] font-medium" style={{ color: "#15735F" }}>
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
              i > 0 ? "border-t border-[#EDEBE6]" : ""
            }`}
          >
            <span className="absolute left-0 top-[18px] w-2 h-[1.5px] bg-primary" />
            {bullet}
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="mt-6 pt-1">
        <button
          onClick={onPrimary}
          className={`w-full inline-flex items-center justify-center rounded-md px-5 py-3.5 text-[14px] font-semibold transition-opacity hover:opacity-90 ${
            isAuthedBuyer && authedBuyerVariant === "owned"
              ? ""
              : ""
          }`}
          style={
            isAuthedBuyer && authedBuyerVariant === "owned"
              ? { background: "#F3F1ED", color: "#1D2025", border: "1px solid #D5D0C8" }
              : { background: "#2ECDB0", color: "#1A1915" }
          }
        >
          {isAuthedBuyer && authedBuyerCtaLabel ? authedBuyerCtaLabel : data.ctaLabel}
        </button>
        {data.secondaryMicrocopy && !isAuthedBuyer && (
          <div className="mt-2.5 text-center text-[12px] text-muted-foreground underline underline-offset-[3px] decoration-[#D8D4CC]">
            {data.secondaryMicrocopy}
          </div>
        )}
      </div>
    </div>
  );
}
