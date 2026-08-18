import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
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

import type { SoloCoreReport, ReportRow } from "@/types/canonical";
import { SAMPLE_CORE_REPORT } from "@/data/canonicalSampleReport";

/* ── Blueprint Move 5 (2026-08-18): the locked area now renders the user's
   REAL analysis, redacted server-side by get-teaser-preview. The fictional
   sample components (RecommendationTeaser etc.) stay on /sample-report where
   fiction is the point, and are no longer imported here. Nothing sensitive
   reaches this page: openings + masked word-counts + income fractions only. */

interface RedactedField {
  opening: string;
  masked_words: number;
}

export interface LockedPreview {
  recommendation: {
    lead_option_name: string | null;
    rationale: RedactedField;
    key_condition: RedactedField;
  } | null;
  reality_check: {
    most_likely_failure_mode: RedactedField;
    honest_income_outlook: RedactedField;
  } | null;
  income_outlook: {
    primary_option_name: string | null;
    years: Array<{ label: string; low_frac: number; mid_frac: number; high_frac: number }>;
    sensitivity: RedactedField;
  } | null;
  ai_impact: {
    displacement_risk: "low" | "medium" | "high" | null;
    part_1: RedactedField;
    part_2: RedactedField;
    adaptation_steps: number;
  } | null;
  first_move: {
    has_named_target: boolean;
    action: RedactedField;
    window: string;
    draft_ready: boolean;
  } | null;
}

interface TeaserPreviewResponse {
  version: string;
  status: string;
  first_name: string | null;
  free_core: Partial<SoloCoreReport> | null;
  locked_preview: LockedPreview | null;
  error?: string;
}

/** Client-side mirror of the server redaction, used only for dev-bypass on the sample fixture. */
function redactLocal(s: string | undefined | null, showWords: number): RedactedField {
  const words = (s ?? "").trim().split(/\s+/).filter(Boolean);
  return { opening: words.slice(0, showWords).join(" "), masked_words: Math.max(0, words.length - showWords) };
}

function sampleToPreview(core: SoloCoreReport): LockedPreview {
  const lead = core.options?.find((o) => o.rank === core.recommendation?.recommended_rank) ?? core.options?.[0];
  const years = (["year_1", "year_2", "year_3"] as const).map((k, i) => {
    const y = core.income_outlook?.[k];
    return { label: `Year ${i + 1}`, low: y?.low_gbp ?? 0, mid: y?.mid_gbp ?? 0, high: y?.high_gbp ?? 0 };
  });
  const maxHigh = Math.max(1, ...years.map((y) => y.high));
  return {
    recommendation: core.recommendation
      ? { lead_option_name: lead?.model_name ?? null, rationale: redactLocal(core.recommendation.rationale, 9), key_condition: redactLocal(core.recommendation.key_condition, 5) }
      : null,
    reality_check: core.reality_check
      ? { most_likely_failure_mode: redactLocal(core.reality_check.most_likely_failure_mode, 7), honest_income_outlook: redactLocal(core.reality_check.honest_income_outlook, 6) }
      : null,
    income_outlook: core.income_outlook
      ? { primary_option_name: lead?.model_name ?? null, years: years.map((y) => ({ label: y.label, low_frac: y.low / maxHigh, mid_frac: y.mid / maxHigh, high_frac: y.high / maxHigh })), sensitivity: redactLocal(core.income_outlook.sensitivity_factors, 6) }
      : null,
    ai_impact: core.ai_impact
      ? { displacement_risk: core.ai_impact.part_1?.displacement_risk ?? null, part_1: redactLocal(core.ai_impact.part_1?.content, 8), part_2: redactLocal(core.ai_impact.part_2?.content, 0), adaptation_steps: core.ai_impact.part_3?.steps?.length ?? 0 }
      : null,
    first_move: core.hook_insight?.first_move
      ? { has_named_target: Boolean(core.hook_insight.first_move.target), action: redactLocal(core.hook_insight.first_move.action, 4), window: "24 hours", draft_ready: Boolean(core.hook_insight.first_move.draft_body) }
      : null,
  };
}

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
 *   Canonical correction, 32 guidance modules total, 3 included with £19.99,
 *     29 more with £19/month subscription
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
  const [payError, setPayError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [lockedPreview, setLockedPreview] = useState<LockedPreview | null>(null);
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
      setLockedPreview(sampleToPreview(SAMPLE_CORE_REPORT));
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

    // Move 5 (2026-08-18): the teaser no longer selects the full core_report
    // into an unpaid browser. get-teaser-preview returns the sanitised free
    // zone plus a server-redacted preview of the user's real locked sections.
    // The paired migration revokes anon SELECT on the sensitive columns, so
    // this is also the page's only viable data path.
    supabase.functions
      .invoke("get-teaser-preview", { body: { report_id: reportId } })
      .then(
        ({ data, error: fetchError }: { data: TeaserPreviewResponse | null; error: unknown }) => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);

          if (fetchError) {
            // A 404 means no such report: same fallback as the no-report-id
            // branch (Drift D). Anything else is a real error state.
            const status = (fetchError as { context?: { status?: number } })?.context?.status;
            if (status === 404 && !isDevBypass()) {
              noReportFallback();
              return;
            }
            setError(true);
            setLoading(false);
            return;
          }

          if (!data || data.error) {
            if (!isDevBypass()) {
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

          setFirstName(data.first_name || null);
          const free = (data.free_core ?? null) as SoloCoreReport | null;
          if (free?.hook_insight?.paragraph && (data.free_core as { hook_insight?: { paragraph_masked_words?: number } })?.hook_insight?.paragraph_masked_words) {
            // The paragraph arrives as its opening words only (bible §7d:
            // headline free, paragraph paid); make the cut read as intended.
            free.hook_insight.paragraph = `${free.hook_insight.paragraph} …`;
          }
          setCoreReport(free);
          setLockedPreview(data.locked_preview ?? null);
          setLoading(false);
        },
        (fetchError: unknown) => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);
          console.error("Teaser: preview fetch failed", fetchError);
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
    setPayError(null);
    try {
      await triggerStripeCheckout("price_report_oneoff", {
        report_id: reportId ?? undefined,
      });
    } catch (err) {
      // P1-f (full-e2e-review-2026-06-10): surface the failure instead of
      // silently resetting the spinner. response_text is carried through by
      // triggerStripeCheckout. This is the single conversion point.
      console.error("Checkout error:", err);
      setPayError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong starting checkout. Please try again, or email hello@solo-plan.com if it keeps happening."
      );
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
        <main className="pt-6">
          <section className="py-6 lg:py-8">
            <div className="mx-auto max-w-6xl px-6">
              <div className="py-12 space-y-8">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
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
        <main className="pt-6">
          <section className="py-6 lg:py-8">
            <div className="mx-auto max-w-6xl px-6">
              <div>
                <div className="py-12">
                  <Banner variant="error">
                    We couldn't load your plan right now. Please refresh.
                  </Banner>
                  <h1 className="title-h1 title-h1--hero mt-8">
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

      <main className="pt-6">
        <section className="py-6 lg:py-8">
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

            <div>
              {/* ─── Top row: section label + small Solo logo (flat page, ADR-026 Phase 3) ─── */}
              <div className="flex items-center justify-between gap-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="text-[#15735F] mr-3 tabular-nums">04</span>
                  Your report
                </div>
                <SoloLogo width={96} height={28} />
              </div>

              {/* ─── Hero strip: mint first name + spec sheet ─── */}
              <HeroStrip firstName={firstName} optionsCount={coreReport?.options?.length ?? 10} />

              {/* ─── Body: sidebar (desktop) + visible report sections ─── */}
              <div className="pb-10">
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
                        <h1 className="title-h1">
                          We've drafted your report.
                        </h1>
                        <p className="standfirst mt-3">
                          Get the full version below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Dark gate band, one earned dark moment per v1.4 §8 ─── */}
              <GateBand optionsCount={coreReport?.options?.length ?? 10} />

              {/* ─── Stone locked area: the user's REAL analysis, redacted ─── */}
              <LockedArea preview={lockedPreview} />

              {/* ─── Checkout error (P1-f) — surfaced at the conversion point ─── */}
              {payError && (
                <div className="mt-6">
                  <Banner variant="error">{payError}</Banner>
                </div>
              )}

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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#FAF9F7] p-4 md:hidden">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={payLoading}
            className="cta-block w-full px-6 py-3 text-[14px] transition-colors flex items-center justify-center gap-2"
          >
            {payLoading && (
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {payLoading ? "Redirecting…" : "Get my 30-day plan, £19.99"}
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
    <div className="pt-6 pb-10">
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
          <h1 className="title-h1 title-h1--hero">
            Your plan,{" "}
            {firstName ? (
              <span className="text-[#15735F]">{firstName}.</span>
            ) : (
              <span>·</span>
            )}
          </h1>
          <p className="standfirst mt-4 max-w-2xl">
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
              { l: "Guidance", v: "3 / 32 included" }, // Sprint 1: 32-module canon
              { l: "Subscription", v: "+ 29 more modules" },
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

/* Redaction rendering: real opening words, then ink mask bars whose count is
   driven by the true hidden word-count. Deterministic widths (no Math.random,
   stable across renders), styled to the editorial register rather than a blur:
   the blur said "content withheld"; the bars say "your sentences are here". */

const MASK_WIDTHS = [64, 88, 44, 72, 56, 96, 38, 80];

function MaskBars({ words, seed = 0 }: { words: number; seed?: number }) {
  const bars = Math.max(3, Math.min(26, Math.round(words / 2.4)));
  return (
    <span className="inline" aria-label="locked content" role="img">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="inline-block h-[11px] bg-[#1A1915]/[0.13] rounded-[1px] mr-[6px] align-baseline"
          style={{ width: `${MASK_WIDTHS[(seed + i) % MASK_WIDTHS.length]}px` }}
        />
      ))}
    </span>
  );
}

function RedactedText({ field, seed = 0 }: { field: RedactedField | undefined | null; seed?: number }) {
  if (!field) return null;
  return (
    <span className="text-[14px] leading-[1.9] text-foreground">
      {field.opening}{field.opening ? " " : ""}
      <MaskBars words={field.masked_words} seed={seed} />
    </span>
  );
}

function LockedCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E2DC] px-6 py-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</span>
        <span className="flex-1 h-px bg-[#EBE8E2]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#15735F]">yours · locked</span>
      </div>
      {children}
    </div>
  );
}

const RISK_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

function LockedArea({ preview }: { preview: LockedPreview | null }) {
  return (
    <div className="px-8 sm:px-12 lg:px-16 py-10 bg-[#F3F0EA]">
      <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
        <span className="text-[#15735F] tabular-nums">05</span>
        <span className="text-foreground">Behind the gate</span>
        <span className="flex-1 h-px bg-[#D8D4CC]" />
        <span>locked</span>
      </div>
      <p className="text-[13px] text-muted-foreground mb-6 max-w-xl">
        This is not a sample. It is your analysis, already written, shown here with the
        specifics masked. The full report lifts every bar.
      </p>
      <div className="space-y-4">
        {preview?.recommendation && (
          <LockedCard title="Solo's recommendation">
            <p className="text-[14px] leading-[1.9] text-foreground">
              {preview.recommendation.lead_option_name && (
                <>Our recommendation runs through{" "}
                  <strong className="font-semibold">{preview.recommendation.lead_option_name}</strong>.{" "}
                </>
              )}
              <RedactedText field={preview.recommendation.rationale} seed={1} />
            </p>
            <p className="mt-3 text-[14px] leading-[1.9]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mr-2">The condition</span>
              <RedactedText field={preview.recommendation.key_condition} seed={4} />
            </p>
          </LockedCard>
        )}

        {preview?.income_outlook && preview.income_outlook.years.length > 0 && (
          <LockedCard title="Reality check and income outlook">
            <div className="flex items-end gap-6 h-[120px] mb-3 max-w-md" aria-label="Income outlook, values locked">
              {preview.income_outlook.years.map((y) => (
                <div key={y.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center gap-1.5 h-[96px]">
                    <div className="w-3 bg-[#1A1915]/[0.14]" style={{ height: `${Math.max(4, y.low_frac * 96)}px` }} />
                    <div className="w-3 bg-[#15735F]/70" style={{ height: `${Math.max(4, y.mid_frac * 96)}px` }} />
                    <div className="w-3 bg-[#1A1915]/[0.28]" style={{ height: `${Math.max(4, y.high_frac * 96)}px` }} />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{y.label}</span>
                </div>
              ))}
              <div className="flex flex-col justify-between h-[96px] text-[10px] tabular-nums text-muted-foreground/70 select-none">
                <span>£██,███</span>
                <span>£██,███</span>
                <span>£█,███</span>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground mb-2">
              Your real year-one to year-three shape{preview.income_outlook.primary_option_name ? (
                <> for <span className="text-foreground font-medium">{preview.income_outlook.primary_option_name}</span></>
              ) : null}. The numbers unlock.
            </p>
            <p className="text-[14px] leading-[1.9]">
              <RedactedText field={preview.reality_check?.honest_income_outlook} seed={2} />
            </p>
            <p className="mt-3 text-[14px] leading-[1.9]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mr-2">Most likely failure mode</span>
              <RedactedText field={preview.reality_check?.most_likely_failure_mode} seed={5} />
            </p>
          </LockedCard>
        )}

        {preview?.ai_impact && (
          <LockedCard title="AI and your path">
            <p className="text-[14px] leading-[1.9] text-foreground">
              {preview.ai_impact.displacement_risk && (
                <>Displacement risk to your current role:{" "}
                  <strong className="font-semibold">{RISK_LABELS[preview.ai_impact.displacement_risk] ?? preview.ai_impact.displacement_risk}</strong>.{" "}
                </>
              )}
              <RedactedText field={preview.ai_impact.part_1} seed={3} />
            </p>
            {preview.ai_impact.adaptation_steps > 0 && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Plus a {preview.ai_impact.adaptation_steps}-step adaptation path, specific to your profile.
              </p>
            )}
          </LockedCard>
        )}

        {preview?.first_move && (
          <LockedCard title="Your first move">
            <p className="text-[14px] leading-[1.9] text-foreground">
              <RedactedText field={preview.first_move.action} seed={6} />
            </p>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {preview.first_move.draft_ready
                ? "A ready-to-send draft, written for you, with a 24-hour window."
                : "A single named action with a 24-hour window."}
              {preview.first_move.has_named_target ? " The recipient is named inside." : ""}
            </p>
          </LockedCard>
        )}

        {!preview && (
          <LockedCard title="Your full analysis">
            <p className="text-[14px] leading-[1.9] text-foreground">
              The recommendation, the income outlook, the AI-impact analysis and your
              first move are generated and waiting behind the gate.
            </p>
          </LockedCard>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Unlock callout ─────────────────────────── */

function UnlockCallout({ onUnlock, payLoading }: { onUnlock: () => void; payLoading: boolean }) {
  return (
    <div className="py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            <span>The offer</span>
          </div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight text-foreground">
            Your independence dossier. Live for 30 days.
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
            The report, your 30-day plan and the daily tracker arrive as one
            dossier, refreshed every Monday with live signals from your
            market. The report stays yours for good; £19 a month keeps the
            weekly refresh running past day 30, only if you want it.
          </p>
        </div>
        <div className="lg:col-span-7 lg:pt-4">
          <button
            type="button"
            onClick={onUnlock}
            disabled={payLoading}
            className="cta-block w-full px-7 py-4 text-[16px] transition-colors flex items-center justify-center gap-2"
          >
            {payLoading && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {payLoading ? "Redirecting…" : "Get my 30-day plan, £19.99"}
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
    d: "The harder parts of going independent: pricing your first proposal, scoping a discovery call, what to say when a buyer asks for credentials. The other 29 modules are part of the £19/month subscription, pitched separately when the 30-day plan ends.",
  },
];

function WhatYouGet() {
  return (
    <div className="py-12 border-t border-border">
      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#15735F] tabular-nums">
          06
        </span>
        <span className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-foreground">
          What's in the full report
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {WHAT_YOU_GET.map((item) => (
          <div key={item.n} className="flex gap-4">
            <span className="shrink-0 text-[#15735F] text-[10px] font-semibold tabular-nums tracking-[0.1em] pt-1">
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
    <div className="px-8 sm:px-12 lg:px-16 py-5 bg-[#F3F0EA] border-t border-border">
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
    <div className="py-14 text-center border-t border-border">
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
          className="cta-block px-8 py-4 text-[16px] transition-colors flex items-center justify-center gap-2"
        >
          {payLoading && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {payLoading ? "Redirecting…" : "Get my 30-day plan, £19.99"}
        </button>
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          One-time payment · No subscription · No auto-renewal
        </div>
      </div>
    </div>
  );
}
