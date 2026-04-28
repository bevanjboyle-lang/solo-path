import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { triggerStripeCheckout } from "@/lib/handlers";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import ReportSection from "@/components/ReportSection";
import TeaserLockedSection from "@/components/TeaserLockedSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StrandData } from "@/components/StrandCard";

export default function Teaser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportId = searchParams.get("report_id");
  const cancelReturn = searchParams.get("canceled") === "true";
  const recoveryToken = searchParams.get("token");

  // F39: if no report_id, do not even mount loading state — redirect synchronously.
  // This prevents the "Loading your plan…" hang and the empty-shell home regression.
  const [loading, setLoading] = useState(!!reportId);
  const [payLoading, setPayLoading] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [strands, setStrands] = useState<StrandData[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showSticky, setShowSticky] = useState(false);

  // Personalised above-fold data (null → silent fallback to existing generic teaser)
  const [personalised, setPersonalised] = useState<{
    archetype: string;
    headline: string;
    paragraph: string;
    firstStrand: { title: string; pitch: string; moveType: string | null };
    secondStrand: { title: string; pitch: string; moveType: string | null } | null;
  } | null>(null);

  // No report_id → redirect to / synchronously on mount. Don't render anything.
  useEffect(() => {
    if (!reportId && !isDevBypass()) navigate("/", { replace: true });
  }, [reportId, navigate]);

  // Fetch report data with hard 8s timeout, abort on unmount, retry support.
  useEffect(() => {
    if (!reportId) return;
    localStorage.setItem("solo_report_id", reportId);

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled && loading) {
        setTimedOut(true);
        setError(true);
        setLoading(false);
      }
    }, 8000);

    supabase
      .from("reports")
      .select("status, answers, hook_insight, core_report")
      .eq("id", reportId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);

        if (fetchError) {
          setError(true);
          setLoading(false);
          return;
        }

        if (!data) {
          // No report row matches this id — bounce to home, don't render empty teaser.
          if (!isDevBypass()) {
            navigate("/", { replace: true });
            return;
          }
          setLoading(false);
          return;
        }

        setReportStatus(data.status);

        // If still generating, redirect to processing
        if (data.status === "generating" || data.status === "pending") {
          if (!isDevBypass()) {
            navigate(`/processing?report_id=${reportId}`, { replace: true });
            return;
          }
        }

        const answers = data.answers as Record<string, unknown> | null;
        setFirstName((answers?.first_name as string) || null);
        setNarrative(data.hook_insight || null);

        // Extract first two strands from core_report
        const coreReport = data.core_report as Record<string, unknown> | null;
        const options = (coreReport?.options as Array<Record<string, unknown>>) || [];
        const previewStrands: StrandData[] = options.slice(0, 2).map((opt) => ({
          title: (opt.model_name as string) || (opt.title as string) || "Untitled option",
          pitch:
            (opt.positioning as string) ||
            (opt.one_line_pitch as string) ||
            (opt.one_liner as string) ||
            (opt.pitch as string) ||
            "",
          primary_move_type: (opt.primary_move_type as string) || null,
        }));
        setStrands(previewStrands);

        // ── Build personalised above-fold view (silent fallback if any field missing) ──
        try {
          const archetypeObj = coreReport?.archetype as Record<string, unknown> | undefined;
          const archetypeName =
            (archetypeObj?.name as string) || (archetypeObj?.primary as string) || "";

          const hookObj = coreReport?.hook_insight as Record<string, unknown> | undefined;
          const hookHeadline = (hookObj?.headline as string) || "";
          const hookParagraph = (hookObj?.paragraph as string) || "";

          const optionsArr =
            (coreReport?.options as Array<Record<string, unknown>>) ||
            (coreReport?.strands as Array<Record<string, unknown>>) ||
            [];
          const o0 = optionsArr[0] as Record<string, unknown> | undefined;
          const o1 = optionsArr[1] as Record<string, unknown> | undefined;

          const o0Title = (o0?.model_name as string) || (o0?.title as string) || "";
          const o0Pitch =
            (o0?.positioning as string) ||
            (o0?.one_line_pitch as string) ||
            (o0?.one_liner as string) ||
            (o0?.pitch as string) ||
            "";
          const o0Move =
            (o0?.primary_move_type as string) || (o0?.move_type as string) || null;

          if (
            archetypeName &&
            hookHeadline &&
            hookParagraph &&
            o0 &&
            o0Title &&
            o0Pitch
          ) {
            setPersonalised({
              archetype: archetypeName,
              headline: hookHeadline,
              paragraph: hookParagraph,
              firstStrand: { title: o0Title, pitch: o0Pitch, moveType: o0Move },
              secondStrand: o1
                ? {
                    title: (o1.model_name as string) || (o1.title as string) || "",
                    pitch:
                      (o1.positioning as string) ||
                      (o1.one_line_pitch as string) ||
                      (o1.one_liner as string) ||
                      (o1.pitch as string) ||
                      "",
                    moveType:
                      (o1.primary_move_type as string) ||
                      (o1.move_type as string) ||
                      null,
                  }
                : null,
            });
          }
        } catch {
          // Silent — fall back to existing generic teaser
        }

        setLoading(false);
      }, (fetchError) => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        console.error("Teaser: report fetch failed", fetchError);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [reportId, navigate, retryNonce]);

  // Sticky CTA on scroll past hero
  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // THE canonical checkout handler — both CTAs call this
  const handleUnlock = useCallback(async () => {
    setPayLoading(true);
    try {
      await triggerStripeCheckout("price_report_oneoff", {
        report_id: reportId,
      });
    } catch (err) {
      console.error("Checkout error:", err);
      setPayLoading(false);
    }
  }, [reportId]);

  // No report_id guard already handled above
  if (!reportId) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar minimal />
        <div className="mx-auto w-full max-w-2xl space-y-8 px-6 pt-20 pb-16">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Error: fetch failed or timed out — banner with retry
  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar minimal />
        <Banner variant="error">
          We couldn't load your plan right now. Please refresh.
        </Banner>
        <main className="mx-auto w-full max-w-2xl px-6 pt-12 pb-24">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Your plan
          </h1>
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => {
                setError(false);
                setTimedOut(false);
                setLoading(true);
                setRetryNonce((n) => n + 1);
              }}
            >
              Retry
            </Button>
            <a href="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              Return home
            </a>
          </div>
        </main>
      </div>
    );
  }

  const heroName = firstName ? `Your plan, ${firstName}.` : "Your plan.";

  const whatYouGet = [
    "Your full report with all five options",
    "A 30-day activation plan built around the one you choose",
    "Daily check-ins to keep you honest",
    "Guidance library when you get stuck",
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar minimal />

      {/* Banners */}
      {cancelReturn && (
        <Banner variant="warning">
          Your payment wasn't completed. Your report is still here — try again when you're ready.
        </Banner>
      )}
      {recoveryToken && !cancelReturn && (
        <Banner variant="info">Welcome back. Here's your report.</Banner>
      )}

      {/* Content */}
      <main className="mx-auto w-full max-w-2xl px-6 pt-12 pb-32 sm:pt-16">
        {personalised ? (
          <>
            {/* ── Personalised above-fold view ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Archetype label (small caps, mint) */}
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Your archetype: {personalised.archetype}
              </p>

              {/* H1 — hook headline */}
              <h1
                className="font-display mt-3 text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {personalised.headline}
              </h1>

              {/* Subtext — hook paragraph */}
              <p
                className="mt-4 text-base leading-[1.7] sm:text-lg"
                style={{ color: "#6B6860" }}
              >
                {personalised.paragraph}
              </p>
            </motion.div>

            {/* First strand card (unlocked) */}
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4 }}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Your first recommended path
              </p>
              <div className="card-stone p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold leading-snug text-foreground">
                    {personalised.firstStrand.title}
                  </h2>
                  {personalised.firstStrand.moveType && (
                    <MoveTypePill value={personalised.firstStrand.moveType} />
                  )}
                </div>
                <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">
                  {personalised.firstStrand.pitch}
                </p>
              </div>
            </motion.div>

            {/* Second strand — blurred teaser */}
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
            >
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="card-stone p-6"
                  style={{
                    filter: "blur(6px)",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold leading-snug text-foreground">
                      {personalised.secondStrand?.title ||
                        "A second path matched to your profile"}
                    </h2>
                    <MoveTypePill
                      value={personalised.secondStrand?.moveType || "direct"}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">
                    {personalised.secondStrand?.pitch ||
                      "A second income path scored against your archetype, with a one-line pitch describing the buyer and the offer."}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-md bg-[hsl(var(--surface-panel))]/90 px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border">
                    Unlock to see all your paths
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* §2 Hero strip — generic fallback */}
              <h1
                className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {heroName}
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                We've drafted five options. Here's the first one for free.
              </p>
            </motion.div>

            {/* §3 Free preview — generic fallback */}
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <ReportSection narrative={narrative} strands={strands} locked={false} />
            </motion.div>
          </>
        )}

        {/* §4 + §5 Locked boundary + unlock callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <TeaserLockedSection onUnlock={handleUnlock} loading={payLoading} />
        </motion.div>

        {/* §6 What you get strip */}
        <motion.div
          className="mt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-foreground">What you get</h2>
          <div className="mt-5 space-y-3">
            {whatYouGet.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* §7 Trust strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Secure payment via Stripe
          </span>
          <span>30-day refund policy</span>
          <span>Your data stays private</span>
        </div>

        {/* §8 Bottom CTA band */}
        <motion.div
          className="mt-14 flex flex-col items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <Button
            size="lg"
            onClick={handleUnlock}
            disabled={payLoading}
            className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {payLoading ? "Redirecting..." : "Unlock my full report \u2014 \u00A319.99"}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            One-time payment. No subscription. No auto-renewal.
          </p>
        </motion.div>
      </main>

      {/* Mobile sticky CTA */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[hsl(var(--surface-panel))] p-4 md:hidden">
          <Button
            size="lg"
            onClick={handleUnlock}
            disabled={payLoading}
            className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {payLoading ? "Redirecting..." : "Unlock my full report \u2014 \u00A319.99"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Move type pill (mint outline) ── */
function MoveTypePill({ value }: { value: string }) {
  const label =
    value && value.length > 0
      ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      : "Direct";
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-primary/40 bg-[hsl(var(--surface-mint-tint))] px-2.5 py-0.5 text-[11px] font-semibold text-[hsl(var(--mint-text))]">
      {label}
    </span>
  );
}
