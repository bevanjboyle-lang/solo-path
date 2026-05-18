import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerStripeCheckout } from "@/lib/handlers";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";
import SoloLogo from "@/components/SoloLogo";
import Banner from "@/components/Banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useActiveSection } from "@/hooks/useActiveSection";
import PlanSidebar, { type SidebarItem } from "@/components/plan/PlanSidebar";

// Existing canonical sample-report sections, kept untouched as a Pass 1
// scope decision (see admin/pass-1-teaser-decisions.md "Scope decision").
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
import { SAMPLE_CORE_REPORT } from "@/data/canonicalSampleReport";

/*
 * Teaser, Pass 1 /teaser v1 (2026-05-17)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Pass 1 scope
 * is shell + chrome + corrections (single panel-ivory containment, hero with
 * mint first name + spec sheet, dark gate band as the boundary, stone-area
 * locked treatment, new unlock callout, what-you-get strip with corrected
 * counts, trust strip, bottom CTA). The existing inner sample-report sections
 * (HookInsight, Archetype, TransferableValue, TransferableSkills,
 * BusinessPaths) are kept untouched, they reflect the actual core_report
 * payload shape and would require a content+component refactor to replace.
 * That sits in Phase 2. See admin/pass-1-teaser-decisions.md.
 *
 * Locked decisions from admin/pass-1-teaser-decisions.md:
 *   Canonical correction, 10 options (not 5), user picks up to 5 for the plan
 *   Canonical correction, 25 guidance modules total, 3 included with £19.99,
 *     22 more with £19/month subscription
 *   F1, Single continuous ivory panel with internal zone changes (ivory →
 *     dark gate band → stone locked area → ivory)
 *   F2 Mint first name in hero ("Your plan, Jane.") one-off precedent
 *   F3, Strand 2x2 substantiation grid kept (Phase 2 work)
 *   F4, First 3 locked strands with real titles + "and 5 more" rolled up
 *     (Phase 2 work; BusinessPaths handles current locked rendering)
 *   F5, 20-day calendar silhouette in locked area (Phase 2 work)
 *   F6, Drop "Drafted at" timestamp from spec sheet
 *   F7, Keep word count substantiation in dark gate band
 *
 * Dark-card cadence: one dark moment, the gate band. Bottom CTA stays ivory
 * (a dark closing band would read as SaaS conversion stack). Per
 * design-direction.md v1.4 §8.
 *
 * Rules of Hooks: every hook MUST run on every render. Do not move any of the
 * hooks below the early returns for loading / error / !reportId. React error
 * #310 ("Rendered more hooks than during the previous render") bit us twice
 * before with this page (F72, 0afec17). Hook block stays above all
 * conditional returns.
 */

export default function Teaser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reportId = searchParams.get("report_id");
  const cancelReturn = searchParams.get("canceled") === "true";

  // Drift D fix (2026-05-18, journey-trace audit): authed paid users
  // landing on /teaser with no report_id should bounce to /report (their
  // canonical post-payment surface), not to / (the marketing landing).
  // Used by both the no-report-id mount check and the "no data" branch
  // of the fetch path.
  const noReportFallback = useCallback(async () => {
    if (user) {
      const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
      const { data } = await supabase
        .from("reports")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", PAID_STATUSES)
        .limit(1)
        .maybeSingle();
      if (data) {
        navigate("/report", { replace: true });
        return;
      }
    }
    navigate("/", { replace: true });
  }, [user, navigate]);
  const recoveryToken = searchParams.get("token");

  const [loading, setLoading] = useState(!!reportId);
  const [payLoading, setPayLoading] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportRow["status"] | null>(null);
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showSticky, setShowSticky] = useState(false);

  /* ─── Effects (all above early returns per Rules of Hooks discipline) ─── */

  // No report_id → redirect to /report (authed paid users) or / (everyone
  // else), unless dev-bypass. Drift D fix routes paid users to their
  // canonical surface instead of dumping them on marketing.
  useEffect(() => {
    if (!reportId && !isDevBypass()) {
      noReportFallback();
    }
  }, [reportId, noReportFallback]);

  // Dev-bypass, render canonical sample fixture without going through Supabase.
  useEffect(() => {
    if (!reportId && isDevBypass()) {
      setCoreReport(SAMPLE_CORE_REPORT);
      setFirstName("Sarah");
      setReportStatus("teaser_ready");
      setLoading(false);
    }
  }, [reportId]);

  // Fetch report data with 8s timeout, abort on unmount, retry support.
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
      .then(
        ({ data, error: fetchError }: { data: Record<string, unknown> | null; error: unknown }) => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);

          if (fetchError) {
            setError(true);
            setLoading(false);
            return;
          }

          if (!data) {
            if (!isDevBypass()) {
              // Drift D fix: same fallback as the no-report-id branch.
              noReportFallback();
              return;
            }
            setLoading(false);
            return;
          }

          setReportStatus(data.status as ReportRow["status"]);

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
        },
        (fetchError: unknown) => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);
          console.error("Teaser: report fetch failed", fetchError);
          setError(true);
          setLoading(false);
        }
      );

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [reportId, navigate, retryNonce, loading]);

  // Sticky CTA visibility, shows once the user scrolls past the hero.
  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ─── Handlers ─── */

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

  /* ─── Derived (above conditional returns per Rules of Hooks) ─── */

  const hasCore = !!coreReport;

  const sidebarItems: SidebarItem[] = useMemo(() => {
    if (!hasCore || !coreReport) return [];
    const items: SidebarItem[] = [];
    if (coreReport.hook_insight) items.push({ id: "sect-hook", label: "Your edge", group: "report", available: true });
    if (coreReport.archetype) items.push({ id: "sect-archetype", label: "Your archetype", group: "report", available: true });
    if (coreReport.transferable_value) items.push({ id: "sect-transferable-value", label: "What you can sell", group: "report", available: true });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sidebarItems.map((i) => i.id).join("|")]
  );
  const activeSectionId = useActiveSection(sectionIds);

  /* ─── Early returns ─── */

  if (!reportId && !isDevBypass()) return null;

  if (loading) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar minimal />
        <main className="pt-[68px]">
          <section className="py-10 lg:py-14">
            <div className="mx-auto max-w-6xl px-6">
              <div className="panel-ivory">
                <div className="px-8 sm:px-12 lg:px-16 py-12 space-y-8">
                  <Skeleton className="h-12 w-3/4" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar minimal />
        <main className="pt-[68px]">
          <section className="py-10 lg:py-14">
            <div className="mx-auto max-w-6xl px-6">
              <div className="panel-ivory">
                <div className="px-8 sm:px-12 lg:px-16 py-12">
                  <Banner variant="error">
                    We couldn't load your plan right now. Please refresh.
                  </Banner>
                  <h1 className="mt-8 text-[34px] sm:text-[40px] font-extrabold tracking-tight text-foreground">
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
                    <a
                      href="/"
                      className="inline-flex items-center text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                    >
                      Return home
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ─── Render the editorial teaser ─── */

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal />

      <main className="pt-[68px]">
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            {/* Banners sit above the panel so they don't disrupt the internal rhythm */}
            {cancelReturn && (
              <div className="mb-6">
                <Banner variant="warning">
                  Your payment wasn't completed. Your report is still here, try again when you're ready.
                </Banner>
              </div>
            )}
            {recoveryToken && !cancelReturn && (
              <div className="mb-6">
                <Banner variant="info">Welcome back. Here's your report.</Banner>
              </div>
            )}
            {(reportStatus === "generating" || reportStatus === "pending") && (
              <div className="mb-6">
                <Banner variant="info">
                  Your report is still generating. This page will update when it's ready.
                </Banner>
              </div>
            )}

            {/* Mobile floating sidebar (chip + sheet). Hidden ≥ lg. */}
            {sidebarItems.length > 0 && (
              <PlanSidebar items={sidebarItems} activeId={activeSectionId} variant="mobile" />
            )}

            <div className="panel-ivory">
              {/* ─── Panel top row: section label + small Solo logo ─── */}
              <div className="px-8 sm:px-12 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="text-primary mr-3 tabular-nums">04</span>
                  Your report
                </div>
                <SoloLogo width={96} height={28} />
              </div>

              {/* ─── Hero strip: mint first name + spec sheet ─── */}
              <HeroStrip firstName={firstName} optionsCount={coreReport?.options?.length ?? 10} />

              {/* ─── Body: sidebar (desktop) + visible report sections ─── */}
              <div className="px-8 sm:px-12 lg:px-16 pb-10">
                <div className="flex gap-10">
                  {sidebarItems.length > 0 && (
                    <aside className="hidden lg:block w-48 shrink-0 pt-2">
                      <div className="sticky top-20">
                        <PlanSidebar items={sidebarItems} activeId={activeSectionId} variant="desktop" />
                      </div>
                    </aside>
                  )}

                  <div className="flex-1 min-w-0">
                    {hasCore ? (
                      <>
                        <div id="sect-hook" className="scroll-mt-24">
                          <HookInsight hook_insight={coreReport!.hook_insight} />
                        </div>

                        {coreReport!.archetype && (
                          <div id="sect-archetype" className="mt-12 scroll-mt-24">
                            <ArchetypeSection archetype={coreReport!.archetype} />
                          </div>
                        )}

                        {coreReport!.transferable_value && (
                          <div id="sect-transferable-value" className="mt-12 scroll-mt-24">
                            <TransferableValueSection transferable_value={coreReport!.transferable_value} />
                          </div>
                        )}

                        {coreReport!.transferable_skills && coreReport!.transferable_skills.length > 0 && (
                          <div id="sect-transferable-skills" className="mt-12 scroll-mt-24">
                            <TransferableSkillsSection transferable_skills={coreReport!.transferable_skills} />
                          </div>
                        )}

                        {coreReport!.options && coreReport!.options.length > 0 && (
                          <div id="sect-business-paths" className="mt-12 scroll-mt-24">
                            <BusinessPaths
                              options={coreReport!.options}
                              recommended_selection={coreReport!.recommended_selection ?? undefined}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-foreground">
                          We've drafted your report.
                        </h1>
                        <p className="mt-3 text-[15.5px] text-muted-foreground">
                          Get the full version below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Dark gate band, one earned dark moment per v1.4 §8 ─── */}
              <GateBand optionsCount={coreReport?.options?.length ?? 10} />

              {/* ─── Stone locked area, wraps the 3 existing Teaser composites ─── */}
              <LockedArea />

              {/* ─── Unlock callout ─── */}
              <UnlockCallout onUnlock={handleUnlock} payLoading={payLoading} />

              {/* ─── What you get ─── */}
              <WhatYouGet />

              {/* ─── Trust strip ─── */}
              <TrustStrip />

              {/* ─── Bottom CTA band (ivory, not dark) ─── */}
              <BottomCTA onUnlock={handleUnlock} payLoading={payLoading} optionsCount={coreReport?.options?.length ?? 10} />
            </div>
          </div>
        </section>
      </main>

      {/* Mobile sticky CTA */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D8D4CC] bg-[#FAF9F7] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={payLoading}
            className={`w-full rounded-md px-6 py-3 text-[14px] font-semibold transition-colors flex items-center justify-center gap-2 ${
              payLoading
                ? "bg-[#E5E2DC] text-muted-foreground/70"
                : "bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90"
            }`}
          >
            {payLoading && (
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {payLoading ? "Redirecting…" : "Get my full report, £19.99"}
          </button>
          <div className="mt-1.5 text-center text-[11px] text-muted-foreground">
            One-time · No subscription · Stripe checkout
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Hero strip ─────────────────────────── */

function HeroStrip({ firstName, optionsCount }: { firstName: string | null; optionsCount: number }) {
  return (
    <div className="px-8 sm:px-12 lg:px-16 pt-6 pb-10">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle mr-3" />
        <span className="align-middle">Your report</span>
        <span className="mx-2 text-muted-foreground/40">·</span>
        <span className="align-middle normal-case tracking-normal text-[12px] font-normal">
          {optionsCount} options drafted
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end">
        <div className="lg:col-span-7">
          <h1 className="text-[40px] sm:text-[52px] lg:text-[60px] font-extrabold tracking-tight leading-[1.05] text-foreground">
            Your plan,{" "}
            {firstName ? (
              <span className="text-primary">{firstName}.</span>
            ) : (
              <span>·</span>
            )}
          </h1>
          <p className="mt-4 text-[16px] sm:text-[17px] text-muted-foreground leading-relaxed max-w-2xl">
            We've drafted {optionsCount} options based on your answers. Here's
            the opening of your report, and then the gate. Below the gate
            sits the rest of the analysis, your 30-day plan, and your 3 starter
            guidance modules.
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-[12px]">
            {[
              { l: "Archetype", v: "From your answers" },
              { l: "Strands", v: `${optionsCount} scored` },
              { l: "Plan length", v: "30 days" },
            ].map((item) => (
              <div key={item.l}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  {item.l}
                </div>
                <div className="mt-1 text-[13.5px] font-semibold text-foreground">
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Dark gate band ─────────────────────────── */

function GateBand({ optionsCount }: { optionsCount: number }) {
  // panel-dark applied as an internal zone (no rounded corners, sits inside
  // the outer panel-ivory, full bleed). Per v1.4 §8 the cadence is at the
  // panel level; the gate band is the page's one earned dark moment.
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-8 sm:py-10 bg-[#1A1915] border-t border-b border-[#2A2924]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(250,249,247,0.65)] mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[#FAF9F7]">Get the full plan</span>
          </div>
          <p className="text-[18px] sm:text-[20px] font-semibold leading-snug text-[#FAF9F7]">
            The recommendation, the income outlook, and the AI-impact analysis
            are behind the gate. Your 30-day activation plan and 3 starter
            guidance modules come with them.
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
            {[
              { l: "Strands", v: `Top ${Math.min(optionsCount, 3)} read · ${optionsCount} total` },
              { l: "Plan days", v: "0 / 30 read" },
              { l: "Guidance", v: "3 / 25 included" },
              { l: "Subscription", v: "+ 22 more modules" },
            ].map((item) => (
              <div key={item.l}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(250,249,247,0.55)]">
                  {item.l}
                </div>
                <div className="mt-1 text-[13.5px] font-semibold text-[#FAF9F7] tabular-nums">
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Stone locked area ─────────────────────────── */

function LockedArea() {
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-10 bg-[#F3F0EA]">
      <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">
        <span className="text-primary tabular-nums">05</span>
        <span className="text-foreground">Behind the gate</span>
        <span className="flex-1 h-px bg-[#D8D4CC]" />
        <span>locked</span>
      </div>
      {/* Wraps the existing canonical teaser components. Phase 2 will replace
          these with the inline strand-card + calendar-silhouette design from
          CD's proposal. For now the existing chrome lands inside the editorial
          stone container, providing the visual gate without rewriting the
          content model. */}
      <div className="space-y-4">
        <RecommendationTeaser />
        <IncomeOutlookTeaser />
        <AIImpactTeaser />
      </div>
    </div>
  );
}

/* ─────────────────────────── Unlock callout ─────────────────────────── */

function UnlockCallout({ onUnlock, payLoading }: { onUnlock: () => void; payLoading: boolean }) {
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            <span>The offer</span>
          </div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight text-foreground">
            Ten options. One plan. One payment.
          </h2>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[48px] sm:text-[56px] font-extrabold tabular-nums text-foreground leading-none">
              £19.99
            </span>
            <span className="text-[13px] text-muted-foreground uppercase tracking-[0.18em]">
              paid once
            </span>
          </div>
          <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed max-w-md">
            <strong className="font-semibold text-foreground">
              One-time payment. No subscription. No auto-renewal.
            </strong>{" "}
            You keep the report after you've paid.
          </p>
        </div>
        <div className="lg:col-span-7 lg:pt-4">
          <button
            type="button"
            onClick={onUnlock}
            disabled={payLoading}
            className={`w-full rounded-md px-7 py-4 text-[16px] font-semibold transition-colors flex items-center justify-center gap-2 ${
              payLoading
                ? "bg-[#E5E2DC] text-muted-foreground/70 cursor-not-allowed"
                : "bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90"
            }`}
          >
            {payLoading && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {payLoading ? "Redirecting…" : "Get my full report, £19.99"}
          </button>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="uppercase tracking-[0.18em]">Pay with</span>
            <span>Card</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Apple Pay</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Google Pay</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="uppercase tracking-[0.18em]">via</span>
            <span>Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── What you get ─────────────────────────── */

const WHAT_YOU_GET = [
  {
    n: "01",
    t: "Your full report with all 10 options, ready to choose your five",
    d: "Eight more options like the ones you've seen, each scored, with the recommendation, income outlook, and AI-impact analysis unlocked.",
  },
  {
    n: "02",
    t: "A 30-day activation plan built around the strands you choose",
    d: "Daily moves across platforms, visibility, communities, and direct outreach. Specific to your archetype and chosen strands.",
  },
  {
    n: "03",
    t: "Daily check-ins to keep you honest",
    d: "Short prompts each morning. We regenerate the next day's move when something doesn't land.",
  },
  {
    n: "04",
    t: "3 starter guidance modules",
    d: "The harder parts of going independent: pricing your first proposal, scoping a discovery call, what to say when a buyer asks for credentials. The other 22 modules are part of the £19/month subscription, pitched separately when the 30-day plan ends.",
  },
];

function WhatYouGet() {
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-12 border-t border-[#E5E2DC]">
      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary tabular-nums">
          06
        </span>
        <span className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-foreground">
          What's in the full report
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {WHAT_YOU_GET.map((item) => (
          <div key={item.n} className="flex gap-4">
            <span className="shrink-0 text-primary text-[10px] font-semibold tabular-nums tracking-[0.1em] pt-1">
              {item.n}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15.5px] font-semibold text-foreground leading-snug">
                {item.t}
              </div>
              <div className="mt-1.5 text-[13.5px] text-muted-foreground leading-relaxed">
                {item.d}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Trust strip ─────────────────────────── */

function TrustStrip() {
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-5 bg-[#F3F0EA] border-t border-[#E5E2DC]">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
        {[
          { l: "Checkout", v: "Stripe hosted" },
          { l: "Refund", v: "14-day, no questions" },
          { l: "Data", v: "Encrypted · deletable from /account" },
          { l: "Email", v: "Already in checkout" },
        ].map((item, i, arr) => (
          <span key={item.l} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              {item.l}
            </span>
            <span className="text-foreground">{item.v}</span>
            {i < arr.length - 1 && <span className="text-muted-foreground/40 ml-4">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Bottom CTA band ─────────────────────────── */

function BottomCTA({
  onUnlock,
  payLoading,
  optionsCount,
}: {
  onUnlock: () => void;
  payLoading: boolean;
  optionsCount: number;
}) {
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-14 text-center border-t border-[#E5E2DC]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
        Decide when you're ready
      </div>
      <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-foreground leading-tight max-w-3xl mx-auto">
        {optionsCount} options. Choose up to five. One payment.
      </h2>
      <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
        You've read the opening of your report. The recommendation, income
        outlook, AI-impact analysis, 30-day plan, and 3 starter guidance
        modules are in the full report.
      </p>
      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onUnlock}
          disabled={payLoading}
          className={`rounded-md px-8 py-4 text-[16px] font-semibold transition-colors flex items-center justify-center gap-2 ${
            payLoading
              ? "bg-[#E5E2DC] text-muted-foreground/70 cursor-not-allowed"
              : "bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90"
          }`}
        >
          {payLoading && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {payLoading ? "Redirecting…" : "Get my full report, £19.99"}
        </button>
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          One-time payment · No subscription · No auto-renewal
        </div>
      </div>
    </div>
  );
}
