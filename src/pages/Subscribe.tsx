import { useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { triggerStripeCheckout, navigateAuthed, resumeSubscription } from "@/lib/handlers";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import TopBar from "@/components/TopBar";
import { useToast } from "@/hooks/use-toast";

/*
 * Subscribe Pass 1 /subscribe v1 (2026-05-18) fourth Phase 2 cycle (paired)
 *
 * Editorial reskin of the buyer-to-subscriber conversion surface. Authed-only;
 * inherits authed chrome (TopBar.authed) but no AreaSidebar, single-purpose
 * conversion surface, not a managed-section page. NO inline FAQ (links out
 * to /faq#subscription), NO comparison versus /pricing, NO objections —
 * those live elsewhere. This surface is the close.
 *
 * Locked decisions from admin/pass-1-subscribe-pricing-decisions.md:
 *   F1, Same PricingCard composite, here annual renders with `elevated`
 *     (1px border-strong outline + "Two months free" top tag pill).
 *     Monthly stays unelevated as a credible peer.
 *   F5, H1 "Keep your plan alive." renders with a code-comment-only
 *     placeholder marker. No inline warning tag ships to production.
 *   F6, Annual card carries "Equivalent to £12.42 / month" substantiation
 *     line beneath its price. Honest factual comparison.
 *   F7, "What stays the same" callout: stone-bg + 3px mint left-rule,
 *     two-column inline layout with mint-text label + display-weight
 *     sentence. NOT panel-dark (would over-weight reassurance).
 *   F8, Day-31 context pill conditional on ?from=day31 query param.
 *   25/3/22 module canonical applied throughout.
 *
 * Cadence: zero dark. Calm continuation surface. User arrived here from
 * /plan's Day-31 wall, they've already seen the dark moment. Dark on
 * top of dark would have stacked gravity unnecessarily.
 *
 * Pass 1 scope: shell + chrome + sections + state-variant rendering
 * (already-subscribed, cancel-pending, payment-failed banners). Preserves:
 * all handlers, useSubscriptionStatus hook, query-param parsing,
 * checkout-loading state machinery.
 */

interface PricingCardData {
  pre: string;
  title: string;
  oneLiner: string;
  price: string;
  priceQual: string;
  extraMeta?: string;
  bullets: ReactNode[];
  ctaLabel: string;
  ctaLoadingLabel: string;
  topTag?: string;
  elevated?: boolean;
}

const monthlyCard: PricingCardData = {
  pre: "Monthly",
  title: "£19 a month.",
  oneLiner: "Cancel any time. Access continues until the end of the paid month.",
  price: "£19",
  priceQual: "/ month",
  bullets: [
    <>Weekly check-ins · ongoing</>,
    <>22 more guidance modules (25 total)</>,
    <>Unlimited Ask Solo</>,
    <>Plan regenerates when your moves don't land</>,
    <>Fresh fit-check included when you need one</>,
  ],
  ctaLabel: "Subscribe, £19 / month",
  ctaLoadingLabel: "Opening checkout…",
};

const annualCard: PricingCardData = {
  pre: "Annual",
  title: "£149 a year.",
  oneLiner: "The same plan, paid annually. Works out at £12.42 a month.",
  price: "£149",
  priceQual: "/ year",
  extraMeta: "Equivalent to £12.42 / month",
  bullets: [
    <>Everything in monthly</>,
    <>Paid once, runs for 12 months</>,
    <>Two months free vs monthly billing</>,
    <>Cancel any time, refunded pro-rata in the first 14 days</>,
  ],
  ctaLabel: "Subscribe, £149 / year",
  ctaLoadingLabel: "Opening checkout…",
  topTag: "Two months free",
  elevated: true,
};

const WHAT_THE_SUB_DOES: { n: string; t: string; d: string }[] = [
  {
    n: "01",
    t: "Keeps the tracker running past day 30.",
    d: "Weekly check-ins instead of daily. Same regeneration logic when moves don't land.",
  },
  {
    n: "02",
    t: "Adds 22 more guidance modules.",
    d: "Discovery calls, proposal writing, recovering difficult engagements, second-engagement retainers. The harder lessons live here.",
  },
  {
    n: "03",
    t: "Unlimited Ask Solo, tuned to your strands.",
    d: "Quotas lift. Conversations stay context-aware to your report.",
  },
  {
    n: "04",
    t: "A fresh fit-check when your situation changes.",
    d: "Re-run the questionnaire without paying again. Included.",
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isActive: isSubscriber } = useSubscriptionStatus();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const fromDay31 = searchParams.get("from") === "day31";
  const paymentCancelled = searchParams.get("payment_cancelled") === "1";

  // Cancel-pending placeholder, derive from subscription state once wired.
  const isCancelPending = false;
  const cancelEndDate = "15 May 2026";

  const [checkingOut, setCheckingOut] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState(false);

  const handleCheckout = async (plan: "monthly" | "annual") => {
    setCheckingOut(plan);
    setError(false);
    try {
      const priceId = plan === "monthly" ? "price_sub_monthly" : "price_sub_annual";
      await triggerStripeCheckout(priceId, { email: user?.email });
    } catch {
      setError(true);
    }
    setCheckingOut(null);
  };

  const handleResume = async () => {
    await resumeSubscription();
    toast({ title: "Subscription resumed." });
  };

  const handleBackToPlan = () => navigateAuthed(navigate, "/plan");
  const handleFaqLink = () => navigate("/faq#subscription");

  // ── Already-subscribed state ── centred ivory card, no pricing cards.
  if (isSubscriber && !isCancelPending) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main>
          <section className="py-20 lg:py-28 px-6">
            <div className="mx-auto max-w-[600px]">
              <div className="border-t-[3px] border-foreground pt-6">
                <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] mb-5" style={{ color: "#15735F" }}>
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold" style={{ background: "#2ECDB0", color: "#1A1915" }}>
                    ✓
                  </span>
                  <span>Subscribed · active</span>
                </div>
                <h1 className="title-h1">
                  You're already subscribed.
                </h1>
                <p className="standfirst mt-3.5 max-w-[38ch]">
                  Your subscription is active. Head back to your plan.
                </p>
                <div className="mt-8 pt-6 border-t border-border">
                  <button onClick={handleBackToPlan} className="cta-block">
                    Back to plan
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ── Default buyer view ──
  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main>
        <div className="mx-auto max-w-screen-lg px-6 pt-6 pb-10 lg:pb-14">

          {/* Payment-cancelled info banner */}
          {paymentCancelled && (
            <div
              className="mb-6 px-5 py-3.5 grid grid-cols-[auto_1fr] gap-x-4 items-center"
              style={{ background: "#D6F5EE", borderLeft: "3px solid #2ECDB0" }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#2ECDB0" }} />
              <div className="text-[13.5px] leading-[1.5] text-foreground">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] mr-2" style={{ color: "#15735F" }}>
                  No charge made
                </span>
                You cancelled checkout. <strong>Nothing was charged.</strong> You can try again whenever you're ready.
              </div>
            </div>
          )}

          {/* Checkout error banner */}
          {error && (
            <div
              className="mb-6 px-5 py-3.5 grid grid-cols-[auto_1fr] gap-x-4 items-center"
              style={{ background: "#FDF0F0", borderLeft: "3px solid #D94F4F" }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#D94F4F" }} />
              <div className="text-[13.5px] leading-[1.5] text-foreground">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] mr-2" style={{ color: "#D94F4F" }}>
                  Checkout failed
                </span>
                We couldn't open checkout. Please try again.
              </div>
            </div>
          )}

          {/* Cancel-pending info banner */}
          {isCancelPending && (
            <div
              className="mb-6 px-5 py-3.5 grid grid-cols-[auto_1fr_auto] gap-x-4 items-center"
              style={{ background: "#D6F5EE", borderLeft: "3px solid #2ECDB0" }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#2ECDB0" }} />
              <div className="text-[13.5px] leading-[1.5] text-foreground">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] mr-2" style={{ color: "#15735F" }}>
                  Cancellation scheduled
                </span>
                Your subscription is set to end on <strong>{cancelEndDate}</strong>. Resume it instead.
              </div>
              <button
                onClick={handleResume}
                className="text-[12px] font-semibold text-foreground underline underline-offset-[3px] decoration-[#D8D4CC] hover:decoration-foreground whitespace-nowrap"
              >
                Resume →
              </button>
            </div>
          )}

          {/* ── Hero ── */}
          <section className="pt-2 pb-9">
            {/* Day-31 context pill, only when ?from=day31 (F8). */}
            {fromDay31 && (
              <div className="inline-flex items-center gap-2.5 mb-5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground" style={{ background: "#F3F1ED" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Your 30 days are complete</span>
              </div>
            )}

            {/* H1, placeholder copy per F5 (production should not ship inline placeholder tag). */}
            <h1 className="title-h1">
              {/* F5: H1 copy is placeholder pending positioning-strategy review. */}
              Keep your plan alive.
            </h1>
            <p className="standfirst mt-4 max-w-[60ch]">
              Your 30-day report is yours forever. The subscription is what keeps the tracker moving
              after day 30, weekly check-ins, the 22 modules you haven't opened yet, and unlimited
              Ask Solo.
            </p>
          </section>

          {/* ── Two pricing columns (peer/preferred), hairline divide, 3px ink rule atop each ── */}
          <section className="border-t border-border pt-8 pb-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-0">
              <div className="lg:pr-10">
                <PricingCard
                  data={monthlyCard}
                  onSubscribe={() => handleCheckout("monthly")}
                  loading={checkingOut === "monthly"}
                  disabled={checkingOut !== null}
                />
              </div>
              <div className="lg:border-l lg:border-border lg:pl-10">
                <PricingCard
                  data={annualCard}
                  onSubscribe={() => handleCheckout("annual")}
                  loading={checkingOut === "annual"}
                  disabled={checkingOut !== null}
                />
              </div>
            </div>
          </section>

          {/* ── What the subscription does, 2×2 grid ── */}
          <section className="border-t border-border pt-8 pb-8">
            <h4 className="rule-head mb-1">
              <span className="mr-3 text-[#15735F] tabular-nums">02</span>
              <span>What the subscription does</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {WHAT_THE_SUB_DOES.map((item, i) => {
                const isLeft = i % 2 === 0;
                const isTopRow = i < 2;
                return (
                  <div
                    key={item.n}
                    className={`py-5 grid grid-cols-[36px_1fr] gap-x-3 items-baseline ${
                      isLeft ? "sm:pr-6 sm:border-r border-border" : "sm:pl-6"
                    } ${!isTopRow ? "border-t border-border sm:border-t" : ""} ${
                      isTopRow && !isLeft ? "sm:border-t-0" : ""
                    }`}
                  >
                    <span className="font-display font-bold text-[11px] tabular-nums tracking-[0.06em] text-[#15735F]">
                      {item.n}
                    </span>
                    <div>
                      <div className="font-display font-bold text-[15px] text-foreground tracking-tight mb-1" style={{ letterSpacing: "-0.012em" }}>
                        {item.t}
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-[1.5]">{item.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── What stays the same, stone callout with mint left rule (F7) ── */}
          <section
            className="px-6 sm:px-8 py-5 mb-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 sm:gap-5 items-baseline"
            style={{ background: "#F3F1ED", borderLeft: "3px solid #2ECDB0" }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#15735F" }}>
              What stays
            </span>
            <p className="font-display text-[15px] sm:text-[15.5px] text-foreground leading-[1.45]" style={{ letterSpacing: "-0.012em" }}>
              <strong>Your report stays yours whether you subscribe or not.</strong> The 30-day report
              and tracker history don't go anywhere if you don't continue.
            </p>
          </section>

          {/* ── Tertiary row ──
            * ADR-026 Phase 4: the office-photo background is gone, so the
            * card-stone wrapper is no longer needed for legibility. Flat
            * hairline-ruled row keeps these quieter than the columns above.
            */}
          <section className="border-t border-border pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleBackToPlan}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-[4px] decoration-[#D8D4CC]"
            >
              Not right now
            </button>
            <button
              onClick={handleFaqLink}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-[4px] decoration-[#D8D4CC]"
            >
              See full subscription FAQ →
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────── PricingCard sub-component ─────────────────────────── */

/* ── PricingCard ──
 *
 * Local editorial composite. ADR-026 Phase 4: no longer a card — a column
 * opening on a 3px ink rule (the Pricing.tsx / Landing pricing-band pattern).
 * `topTag` ("Two months free") renders as a square mint-bordered tag in the
 * column head, keeping its animate-savings-glow; `elevated` no longer draws
 * a shadow (flat system), the tag + divider carry the preference instead.
 *
 * Future component-inventory work will lift this into a shared composite with
 * Pricing.tsx's version. Pass 1 keeps them inline per page to avoid premature
 * abstraction.
 */
function PricingCard({
  data, onSubscribe, loading, disabled,
}: {
  data: PricingCardData;
  onSubscribe: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col border-t-[3px] border-foreground pt-5">
      {/* Card head */}
      <div className="pb-5 mb-5 border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="eyebrow--muted text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {data.pre}
          </span>
          {/* Optional top tag ("Two months free"), square editorial badge, keeps its glow. */}
          {data.topTag && (
            <span
              className="animate-savings-glow inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ background: "#FAF9F7", border: "1px solid #2ECDB0", color: "#15735F" }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{data.topTag}</span>
            </span>
          )}
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
        {data.extraMeta && (
          <div className="mt-1.5 text-[13px] font-medium text-[#15735F]">
            {data.extraMeta}
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

      {/* Action */}
      <div className="mt-6 pt-1">
        <button
          onClick={onSubscribe}
          disabled={disabled}
          className="cta-block w-full inline-flex items-center justify-center text-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {data.ctaLoadingLabel}
            </>
          ) : (
            data.ctaLabel
          )}
        </button>
      </div>
    </div>
  );
}
