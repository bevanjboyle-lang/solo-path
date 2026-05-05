import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { triggerStripeCheckout } from "@/lib/handlers";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveSection } from "@/hooks/useActiveSection";
import PlanSidebar, { type SidebarItem } from "@/components/plan/PlanSidebar";

// Sample-report sections (Phase 3a refactor — all prop-driven, canonical typed)
import HookInsight from "@/components/sample-report/HookInsight";
import ArchetypeSection from "@/components/sample-report/ArchetypeSection";
import TransferableValueSection from "@/components/sample-report/TransferableValueSection";
import TransferableSkillsSection from "@/components/sample-report/TransferableSkillsSection";
import BusinessPaths from "@/components/sample-report/BusinessPaths";
import {
  RecommendationTeaser,
  IncomeOutlookTeaser,
  AIImpactTeaser,
} from "@/components/sample-report/LockedSections";

import type { SoloCoreReport, ReportRow } from "@/types/canonical";
import {
  SAMPLE_CORE_REPORT,
} from "@/data/canonicalSampleReport";

/**
 * /teaser — pre-payment anonymous view.
 *
 * Anon-tolerant: query is by report id only and works for users whose row is
 * scoped to their client_session_id under the `reports` RLS policies. No JWT
 * required. The Stripe checkout CTA is preserved verbatim.
 *
 * Section composition (Phase 3c — canonical):
 *   1. HookInsight (headline visible, paragraph locked-blur)
 *   2. ArchetypeSection (visible)
 *   3. TransferableValueSection (visible)
 *   4. TransferableSkillsSection (visible)
 *   5. BusinessPaths (rank 1 fully visible, ranks 2-3 blurred, ranks 4-10 stubs — chrome handled by component)
 *   6. RecommendationTeaser (locked)
 *   7. IncomeOutlookTeaser (locked, includes reality-check chart)
 *   8. AIImpactTeaser (locked)
 *   9. CTA — "Unlock my full report — £19.99"
 *
 * activation_plan and market_snapshots are typically null at teaser stage and
 * are not rendered here. Only core_report sections are surfaced.
 */
export default function Teaser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportId = searchParams.get("report_id");
  const cancelReturn = searchParams.get("canceled") === "true";
  const recoveryToken = searchParams.get("token");

  // F39: if no report_id and not in dev-bypass, redirect synchronously.
  const [loading, setLoading] = useState(!!reportId);
  const [payLoading, setPayLoading] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportRow["status"] | null>(null);
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showSticky, setShowSticky] = useState(false);

  // No report_id → redirect synchronously on mount unless dev-bypass.
  useEffect(() => {
    if (!reportId && !isDevBypass()) navigate("/", { replace: true });
  }, [reportId, navigate]);

  // Dev-bypass: render the canonical sample fixture without going through Supabase.
  useEffect(() => {
    if (!reportId && isDevBypass()) {
      setCoreReport(SAMPLE_CORE_REPORT);
      setFirstName("Sarah");
      setReportStatus("teaser_ready");
      setLoading(false);
    }
  }, [reportId]);

  // Fetch report data with hard 8s timeout, abort on unmount, retry support.
  // Anon-tolerant query: uses the report id only. RLS lets unauthenticated
  // callers SELECT rows scoped to their client_session_id.
  useEffect(() => {
    if (!reportId) return;
    localStorage.setItem("solo_report_id", reportId);

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled && loading) {
        setError(true);
        setLoading(false);
      }
    }, 8000);

    (supabase as any)
      .from("reports")
      .select(
        "id, status, hook_insight, core_report, activation_plan, market_snapshots, recommended_selection, ai_impact_section, selected_strands, selected_option_rank, answers"
      )
      .eq("id", reportId)
      .maybeSingle()
      .then(({ data, error: fetchError }: { data: Record<string, unknown> | null; error: unknown }) => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);

        if (fetchError) {
          setError(true);
          setLoading(false);
          return;
        }

        if (!data) {
          // No matching row — bounce home unless dev-bypass.
          if (!isDevBypass()) {
            navigate("/", { replace: true });
            return;
          }
          setLoading(false);
          return;
        }

        setReportStatus(data.status as ReportRow["status"]);

        // Still generating — redirect to processing.
        if (data.status === "generating" || data.status === "pending") {
          if (!isDevBypass()) {
            navigate(`/processing?report_id=${reportId}`, { replace: true });
            return;
          }
        }

        const answers = data.answers as Record<string, unknown> | null;
        setFirstName((answers?.first_name as string) || null);
        setCoreReport((data.core_report as SoloCoreReport | null) ?? null);

        setLoading(false);
      }, (fetchError: unknown) => {
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

  // THE canonical checkout handler — both CTAs call this. Preserved from prior version.
  const handleUnlock = useCallback(async () => {
    setPayLoading(true);
    try {
      await triggerStripeCheckout("price_report_oneoff", {
        report_id: reportId ?? undefined,
      });
    } catch (err) {
      console.error("Checkout error:", err);
      setPayLoading(false);
    }
  }, [reportId]);

  // No report_id and not dev-bypass — already redirected above.
  if (!reportId && !isDevBypass()) return null;

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

  // Fallback header when core_report is missing (e.g. row exists but generation
  // didn't materialise core_report). Render the generic "Your plan" framing
  // and the locked teaser stack so the CTA is still reachable.
  const hasCore = !!coreReport;

  // Sidebar — only the visible sections are listed (locked teasers below
  // are conversion bait, not navigable content). Built only when core_report
  // is present so the sidebar doesn't render against the generic fallback.
  const sidebarItems: SidebarItem[] = useMemo(() => {
    if (!hasCore || !coreReport) return [];
    const items: SidebarItem[] = [];
    if (coreReport.hook_insight) {
      items.push({ id: "sect-hook", label: "Your edge", group: "report", available: true });
    }
    if (coreReport.archetype) {
      items.push({ id: "sect-archetype", label: "Your archetype", group: "report", available: true });
    }
    if (coreReport.transferable_value) {
      items.push({ id: "sect-transferable-value", label: "What you can sell", group: "report", available: true });
    }
    if (coreReport.transferable_skills && coreReport.transferable_skills.length > 0) {
      items.push({ id: "sect-transferable-skills", label: "Your transferable skills", group: "report", available: true });
    }
    if (coreReport.options && coreReport.options.length > 0) {
      items.push({ id: "sect-business-paths", label: "Your 10 paths", group: "report", available: true });
    }
    return items;
  }, [hasCore, coreReport]);

  const sectionIds = useMemo(
    () => sidebarItems.map((i) => i.id),
    // Stable string-key dep avoids re-running when the array identity changes
    // but the underlying ids don't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sidebarItems.map((i) => i.id).join("|")],
  );
  const activeSectionId = useActiveSection(sectionIds);

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
      {reportStatus === "generating" || reportStatus === "pending" ? (
        <Banner variant="info">Your report is still generating. This page will update when it's ready.</Banner>
      ) : null}

      {/* Mobile sidebar (sticky chip + sheet). Hidden on lg via component. */}
      {sidebarItems.length > 0 && (
        <PlanSidebar items={sidebarItems} activeId={activeSectionId} variant="mobile" />
      )}

      {/* Content */}
      <div className="mx-auto w-full max-w-screen-xl px-6">
        <div className="flex gap-10">
          {/* Desktop sidebar — sticky left rail. */}
          {sidebarItems.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0 pt-12">
              <div className="sticky top-20">
                <PlanSidebar items={sidebarItems} activeId={activeSectionId} variant="desktop" />
              </div>
            </aside>
          )}

          <main className="flex-1 min-w-0 mx-auto w-full max-w-2xl pt-12 pb-32 sm:pt-16">
        {hasCore ? (
          <>
            {/* §1 HookInsight — locked-teaser variant (headline visible, paragraph blurred) */}
            <motion.div
              id="sect-hook"
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <HookInsight hook_insight={coreReport!.hook_insight} />
            </motion.div>

            {/* §2 Archetype — visible */}
            {coreReport!.archetype && (
              <motion.div
                id="sect-archetype"
                className="mt-10 scroll-mt-24"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.4 }}
              >
                <ArchetypeSection archetype={coreReport!.archetype} />
              </motion.div>
            )}

            {/* §3 Transferable value — visible */}
            {coreReport!.transferable_value && (
              <motion.div
                id="sect-transferable-value"
                className="mt-10 scroll-mt-24"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.4 }}
              >
                <TransferableValueSection transferable_value={coreReport!.transferable_value} />
              </motion.div>
            )}

            {/* §4 Transferable skills — visible (shows analysis depth) */}
            {coreReport!.transferable_skills && coreReport!.transferable_skills.length > 0 && (
              <motion.div
                id="sect-transferable-skills"
                className="mt-10 scroll-mt-24"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.4 }}
              >
                <TransferableSkillsSection transferable_skills={coreReport!.transferable_skills} />
              </motion.div>
            )}

            {/* §5 Business paths — rank 1 fully visible, ranks 2-3 blurred, ranks 4-10 greyed stubs.
                BusinessPaths handles the locked chrome internally. */}
            {coreReport!.options && coreReport!.options.length > 0 && (
              <motion.div
                id="sect-business-paths"
                className="mt-10 scroll-mt-24"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <BusinessPaths
                  options={coreReport!.options}
                  recommended_selection={coreReport!.recommended_selection ?? undefined}
                />
              </motion.div>
            )}

            {/* §6–8 Locked teasers for the remaining sections */}
            <motion.div
              className="mt-10 space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.4 }}
            >
              <RecommendationTeaser />
              <IncomeOutlookTeaser />
              <AIImpactTeaser />
            </motion.div>
          </>
        ) : (
          // Generic fallback when core_report is missing — keep CTA reachable.
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              {heroName}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              We've drafted your report. Unlock the full version below.
            </p>
            <div className="mt-10 space-y-4">
              <RecommendationTeaser />
              <IncomeOutlookTeaser />
              <AIImpactTeaser />
            </div>
          </motion.div>
        )}

        {/* §9 What you get strip */}
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

        {/* §10 Trust strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Secure payment via Stripe
          </span>
          <span>30-day refund policy</span>
          <span>Your data stays private</span>
        </div>

        {/* §11 Bottom CTA band */}
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
            {payLoading ? "Redirecting..." : "Unlock my full report — £19.99"}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            One-time payment. No subscription. No auto-renewal.
          </p>
        </motion.div>
          </main>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[hsl(var(--surface-panel))] p-4 md:hidden">
          <Button
            size="lg"
            onClick={handleUnlock}
            disabled={payLoading}
            className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {payLoading ? "Redirecting..." : "Unlock my full report — £19.99"}
          </Button>
        </div>
      )}
    </div>
  );
}
