import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import TodayCard, { type PlanState } from "@/components/plan/TodayCard";
import ActivationDialog from "@/components/plan/ActivationDialog";
import TrackerGrid from "@/components/plan/TrackerGrid";
import CheckInPanel from "@/components/plan/CheckInPanel";
import ReplanPromptCard from "@/components/plan/ReplanPromptCard";
import RefineReportPanel from "@/components/plan/RefineReportPanel";
import StrandSelector from "@/components/plan/StrandSelector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";
import { useActiveSection } from "@/hooks/useActiveSection";
import PlanSidebar, { type SidebarItem } from "@/components/plan/PlanSidebar";

// Sample-report sections (Phase 3a refactor — all prop-driven, canonical typed)
import HookInsightSection from "@/components/sample-report/HookInsightSection";
import ArchetypeSection from "@/components/sample-report/ArchetypeSection";
import TransferableValueSection from "@/components/sample-report/TransferableValueSection";
import TransferableSkillsSection from "@/components/sample-report/TransferableSkillsSection";
import BusinessPaths from "@/components/sample-report/BusinessPaths";
import RecommendationSection from "@/components/sample-report/RecommendationSection";
import RealityCheckSection from "@/components/sample-report/RealityCheckSection";
import IncomeOutlookSection from "@/components/sample-report/IncomeOutlookSection";
import AIImpactSection from "@/components/sample-report/AIImpactSection";
import PortfolioSummarySection from "@/components/sample-report/PortfolioSummarySection";
import MarketSnapshotSection from "@/components/sample-report/MarketSnapshotSection";
import FirstMoveSection from "@/components/sample-report/FirstMoveSection";
import PlanSection from "@/components/sample-report/PlanSection";
import TractionSignalsSection from "@/components/sample-report/TractionSignalsSection";
import PortfolioReviewSection from "@/components/sample-report/PortfolioReviewSection";
import NetworkToolkitSection from "@/components/sample-report/NetworkToolkitSection";

import type {
  SoloCoreReport,
  ActivationPlanOutput,
  ReportRow,
} from "@/types/canonical";
import {
  SAMPLE_CORE_REPORT,
  SAMPLE_ACTIVATION_PLAN,
  SAMPLE_MARKET_SNAPSHOTS,
} from "@/data/canonicalSampleReport";

interface PlanPageProps {
  initialSessionId?: string;
}

export default function Plan({ initialSessionId }: PlanPageProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  // Tracker / day state
  const [planState, setPlanState] = useState<PlanState>("loading");
  const [dayNumber, setDayNumber] = useState(0);
  const [weekNumber, setWeekNumber] = useState(1);
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [checkinOpen, setCheckinOpen] = useState(false);
  // F78: activation dialog state. Opens from TodayCard's day0 state via the
  // "Start my 30-day plan" button. On success we refetch the tracker session
  // so TodayCard transitions to "active" with current_day=1.
  const [activationOpen, setActivationOpen] = useState(false);
  const [trackerDays, setTrackerDays] = useState<{ day: number; completed: boolean; isToday: boolean }[]>([]);

  // Auth / payment state
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [showSubscribeWall, setShowSubscribeWall] = useState(false);

  // Report state — canonical-typed
  const [reportId, setReportId] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<ReportRow["status"] | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [activationPlan, setActivationPlan] = useState<ActivationPlanOutput | null>(null);
  const [marketSnapshots, setMarketSnapshots] = useState<ReportRow["market_snapshots"]>(null);

  // Refine + export state
  const [refinementCount, setRefinementCount] = useState(0);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineLimitReached, setRefineLimitReached] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Replan
  const [replanPending, setReplanPending] = useState(false);
  const [replanContext, setReplanContext] = useState<Record<string, unknown> | null>(null);

  // Error
  const [loadError, setLoadError] = useState(false);

  // StrandSelector: true while generate-plan invocation is in flight.
  // Cleared once polling sees the row flip to `generating_plan` (or `complete`).
  const [strandSubmitting, setStrandSubmitting] = useState(false);

  // Apply the queried row to local state (used by both initial load and polling).
  const applyReportRow = useCallback((row: Record<string, unknown>) => {
    setReportId(row.id as string);
    setReportStatus(row.status as ReportRow["status"]);
    setCoreReport((row.core_report as SoloCoreReport | null) ?? null);
    setActivationPlan((row.activation_plan as ActivationPlanOutput | null) ?? null);
    setMarketSnapshots(
      (row.market_snapshots as ReportRow["market_snapshots"]) ?? null
    );

    const cr = (row.core_report as Record<string, unknown> | null) ?? null;
    const rc = Number((cr?.refinement_count as number) ?? 0) || 0;
    setRefinementCount(rc);
    if (rc >= 3) setRefineLimitReached(true);
  }, []);

  // Route guard + plan fetch with explicit error handling.
  // Resolution rules:
  //   unauthed       → /auth (handled by ProtectedRoute, but defensive here too)
  //   no paid plan   → /teaser  (per route-map §9 gating)
  //   fetch error    → loadError = true (renders error Banner, never blanks)
  //   populated      → setHasPaid(true) and load tracker session
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (isDevBypass()) {
        // Dev-bypass: load the canonical sample fixture so every section renders
        // against real-shaped data without going through auth/payment.
        setHasPaid(true);
        setReportId("dev-bypass-sample");
        setReportStatus("complete");
        setCoreReport(SAMPLE_CORE_REPORT);
        setActivationPlan(SAMPLE_ACTIVATION_PLAN);
        setMarketSnapshots(SAMPLE_MARKET_SNAPSHOTS);
        setPlanState("day0");
        return;
      }
      navigate("/auth?redirect=/plan", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("reports")
          .select(
            "id, status, hook_insight, core_report, activation_plan, market_snapshots, recommended_selection, ai_impact_section, selected_strands, selected_option_rank, answers"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setLoadError(true);
          setHasPaid(false);
          return;
        }

        if (!data || data.status === "pending" || data.status === "generating") {
          // Authed but no paid plan yet — route to teaser per spec.
          if (!isDevBypass()) {
            navigate("/teaser", { replace: true });
            return;
          }
          setHasPaid(true);
          setPlanState("day0");
          return;
        }

        // Unpaid users (teaser_ready) — bounce back to teaser.
        if (data.status === "teaser_ready") {
          if (!isDevBypass()) {
            navigate(`/teaser?report_id=${data.id}`, { replace: true });
            return;
          }
        }

        setHasPaid(true);
        applyReportRow(data as Record<string, unknown>);

        // NOTE: previously auto-fired generate-plan here using the backend's
        // recommended_selection. Per ADR-019, the user must actively choose
        // their strands via <StrandSelector />. The render branch below
        // handles `pending_selection` + null activation_plan.

        loadTrackerSession(user.id, data.id);
      } catch (err) {
        if (cancelled) return;
        console.error("Plan: report fetch failed", err);
        setLoadError(true);
        setHasPaid(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate, applyReportRow]);

  const loadTrackerSession = useCallback(async (uid: string, rid: string) => {
    const { data: session } = await (supabase as any)
      .from("tracker_sessions")
      .select("id, current_day, activated_at, subscription_status, last_checkin_date, replan_pending, replan_context, working_plan")
      .eq("user_id", uid)
      .eq("report_id", rid)
      .maybeSingle();

    if (!session) {
      setPlanState("day0");
      buildTrackerDays(0, []);
      setReplanPending(false);
      setReplanContext(null);
      return;
    }

    setSessionId(session.id);
    const currentDay = session.current_day || 0;
    setDayNumber(currentDay);

    const isSub = session.subscription_status === "active";
    setIsSubscriber(isSub);

    setReplanPending(!!session.replan_pending);
    setReplanContext((session.replan_context as Record<string, unknown> | null) ?? null);

    // F89 (2026-05-07): prefer tracker_sessions.working_plan over reports.activation_plan
    // when present and shaped like the canonical deep structure. This is what makes
    // post-checkin status mutations and post-replan rebuilds visible to the user.
    // process-checkin v35 mutates working_plan in deep shape in place; process-replan
    // v24 emits the same deep shape on rebuild. Both keep top-level siblings intact.
    const wp = session.working_plan as Record<string, unknown> | null;
    const wpInner = wp?.activation_plan as Record<string, unknown> | undefined;
    if (wp && Array.isArray(wpInner?.phases) && wpInner.phases.length > 0) {
      setActivationPlan(wp as unknown as ActivationPlanOutput);
    }

    const today = new Date().toISOString().slice(0, 10);
    const checkedInToday = session.last_checkin_date === today;

    if (currentDay === 0) {
      setPlanState("day0");
    } else if (isSub) {
      setPlanState(checkedInToday ? "sub_done" : "sub_active");
    } else if (currentDay > 30) {
      setPlanState("day31_nosub");
      setShowSubscribeWall(true);
    } else {
      setPlanState(checkedInToday ? "done_today" : "active");
    }

    const { data: checkins } = await supabase
      .from("checkin_history")
      .select("day_number")
      .eq("tracker_session_id", session.id);
    const completedDays = new Set((checkins || []).map((c) => c.day_number));
    buildTrackerDays(currentDay, Array.from(completedDays));
  }, []);

  // Poll for status transitions while the plan is being generated.
  // pending_selection → generating_plan → complete (~90-120s).
  useEffect(() => {
    if (!reportId || !user) return;
    if (!reportStatus) return;
    if (reportStatus !== "pending_selection" && reportStatus !== "generating_plan") return;

    let cancelled = false;
    const startedAt = Date.now();
    const POLL_INTERVAL_MS = 3000;
    const POLL_TIMEOUT_MS = 5 * 60 * 1000;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) return;

      const { data: latest } = await (supabase as any)
        .from("reports")
        .select(
          "id, status, hook_insight, core_report, activation_plan, market_snapshots, recommended_selection, ai_impact_section, selected_strands, selected_option_rank, answers"
        )
        .eq("id", reportId)
        .maybeSingle();

      if (cancelled || !latest) return;

      applyReportRow(latest as Record<string, unknown>);

      // Once the row has moved off pending_selection, the StrandSelector is
      // unmounted by the render branch — stop blocking its UI.
      if (latest.status !== "pending_selection") {
        setStrandSubmitting(false);
      }

      if (latest.status === "complete") {
        if (user) loadTrackerSession(user.id, reportId);
        return;
      }

      setTimeout(tick, POLL_INTERVAL_MS);
    };

    const handle = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [reportId, user, reportStatus, loadTrackerSession, applyReportRow]);


  // /checkin/:sessionId deep-link: pre-open drawer immediately on mount
  // and rewrite URL to /plan so the deep-link is not visible in the address bar.
  useEffect(() => {
    if (initialSessionId) {
      setCheckinOpen(true);
      window.history.replaceState({}, "", "/plan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscription return toast
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("from") === "subscribe") {
      toast({ title: "Subscription active. Library unlocked." });
      window.history.replaceState(null, "", "/plan");
    }
  }, [location.search, toast]);

  function buildTrackerDays(currentDay: number, completedDays: number[]) {
    const total = 30;
    const days = Array.from({ length: total }, (_, i) => ({
      day: i + 1,
      completed: completedDays.includes(i + 1),
      isToday: i + 1 === currentDay,
    }));
    setTrackerDays(days);
  }

  const scrollToReport = useCallback(() => {
    reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // StrandSelector submit — fires generate-plan with the user's chosen ranks.
  // The polling effect picks up the resulting status transition (pending_selection
  // → generating_plan → complete) and clears `strandSubmitting`.
  const handleStrandSubmit = useCallback(
    async (selected_ranks: number[]) => {
      if (!reportId) return;
      setStrandSubmitting(true);
      try {
        const { error } = await supabase.functions.invoke("generate-plan", {
          body: { report_id: reportId, selected_ranks },
        });
        if (error) throw error;
        // Safety net: if polling never observes a status change within ~12s,
        // release the UI so the user isn't stuck. The polling effect will
        // also clear it as soon as the row moves off pending_selection.
        setTimeout(() => setStrandSubmitting(false), 12000);
      } catch (err) {
        console.error("Plan: generate-plan invoke failed", err);
        setStrandSubmitting(false);
        toast({
          title: "We couldn't start your plan. Please try again.",
        });
      }
    },
    [reportId, toast],
  );

  const openCheckin = useCallback(() => {
    setCheckinOpen(true);
  }, []);

  const checkinReplanPendingRef = useRef(false);

  // F87 (2026-05-07): returns the AI's response_text so CheckInPanel can render
  // the closing message inline before the drawer closes. Previously this just
  // returned void and showed a generic "Check-in saved." toast — the AI's
  // contextual reply ("Got it. I've moved today's two tasks to tomorrow…") was
  // computed and stored but never surfaced to the user.
  const handleCheckinSubmit = useCallback(async (response: string): Promise<string | null> => {
    // Call existing submit-checkin edge function
    const { data, error } = await supabase.functions.invoke("process-checkin", {
      body: { session_id: sessionId, response },
    });
    if (error) throw error;

    const replanPendingFromCheckin = !!(data as { replan_pending?: boolean } | null)?.replan_pending;
    checkinReplanPendingRef.current = replanPendingFromCheckin;

    // Optimistic update
    setPlanState((prev) => {
      if (prev === "active") return "done_today";
      if (prev === "sub_active") return "sub_done";
      return prev;
    });

    setTrackerDays((prev) =>
      prev.map((d) => (d.isToday ? { ...d, completed: true } : d))
    );

    // If opened via deep-link, update URL
    if (initialSessionId) {
      window.history.replaceState(null, "", "/plan");
    }

    // Return the AI's response_text for inline display in CheckInPanel.
    // Falls back to a sensible default if the field is missing.
    const aiText =
      (data as { response_text?: string; response?: string; message?: string } | null)?.response_text
      || (data as { response?: string } | null)?.response
      || (data as { message?: string } | null)?.message
      || null;

    return aiText;
  }, [sessionId, initialSessionId]);

  const handleDayClick = useCallback((day: number) => {
    // Open read-only drawer for completed day
    setDayNumber(day);
    setCheckinOpen(true);
  }, []);

  const handleRefined = useCallback((updatedReport: unknown, newCount: number) => {
    const r = updatedReport as Record<string, unknown> | null;
    if (r) {
      // Apply the refreshed row back through the same canonical setter.
      // Refinement only updates core_report; activation_plan and snapshots
      // remain unchanged but we reapply for safety.
      const merged = {
        id: reportId,
        status: reportStatus,
        ...r,
      } as Record<string, unknown>;
      applyReportRow(merged);
    }
    setRefinementCount(newCount);
    if (newCount >= 3) setRefineLimitReached(true);
  }, [reportId, reportStatus, applyReportRow]);

  const submitRefinement = useCallback(() => {
    if (refineLimitReached || refinementCount >= 3) return;
    setRefineOpen(true);
  }, [refineLimitReached, refinementCount]);

  const exportPdf = useCallback(async () => {
    if (!reportId || exportingPdf) return;
    setExportingPdf(true);
    setPdfError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No auth session");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-pdf`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `Solo-Plan-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("exportPdf error", err);
      setPdfError("Couldn't generate PDF. Please try again.");
      setTimeout(() => setPdfError(null), 5000);
    } finally {
      setExportingPdf(false);
    }
  }, [reportId, exportingPdf]);

  // Self-check: after mount, ensure main content has a visible heading.
  // If not, render a loud fallback Banner so a regression is never silent.
  const renderRegression = useMainContentSelfCheck(hasPaid === true && !loadError);

  // Sidebar items + active-section tracking — must be derived BEFORE early
  // returns so the useActiveSection hook order stays stable across renders.
  // Pre-computed here; used in the main render branch below.
  const awaitingSelectionPre =
    reportStatus === "pending_selection" && !activationPlan;
  const sidebarItems: SidebarItem[] = [];
  if (!awaitingSelectionPre) {
    sidebarItems.push({
      id: "sect-today",
      label: "Today",
      group: "today",
      available: planState !== "loading",
    });
  }
  if (planState !== "day0" && trackerDays.length > 0) {
    sidebarItems.push({
      id: "sect-tracker",
      label: "30-day tracker",
      group: "today",
      available: true,
    });
  }
  if (awaitingSelectionPre && coreReport?.options && coreReport.options.length > 0) {
    sidebarItems.push({
      id: "sect-strand-selector",
      label: "Pick your paths",
      group: "today",
      available: true,
    });
  }
  if (coreReport) {
    if (coreReport.hook_insight)
      sidebarItems.push({ id: "sect-hook", label: "Your edge", group: "report", available: true });
    if (coreReport.archetype)
      sidebarItems.push({ id: "sect-archetype", label: "Your archetype", group: "report", available: true });
    if (coreReport.transferable_value)
      sidebarItems.push({ id: "sect-transferable-value", label: "What you can sell", group: "report", available: true });
    if (coreReport.transferable_skills && coreReport.transferable_skills.length > 0)
      sidebarItems.push({ id: "sect-transferable-skills", label: "Your transferable skills", group: "report", available: true });
    if (coreReport.options && coreReport.options.length > 0)
      sidebarItems.push({ id: "sect-business-paths", label: "Your 10 paths", group: "report", available: true });
    if (coreReport.recommendation)
      sidebarItems.push({ id: "sect-recommendation", label: "Our recommendation", group: "report", available: true });
    if (coreReport.reality_check)
      sidebarItems.push({ id: "sect-reality-check", label: "Reality check", group: "report", available: true });
    if (coreReport.income_outlook)
      sidebarItems.push({ id: "sect-income-outlook", label: "Income outlook", group: "report", available: true });
    if (coreReport.ai_impact)
      sidebarItems.push({ id: "sect-ai-impact", label: "AI & your future", group: "report", available: true });
  }
  if (activationPlan) {
    if (activationPlan.portfolio_summary)
      sidebarItems.push({ id: "sect-portfolio-summary", label: "Portfolio strategy", group: "plan", available: true });
    if (marketSnapshots && Object.keys(marketSnapshots).length > 0)
      sidebarItems.push({ id: "sect-market-snapshot", label: "Market feasibility", group: "plan", available: true });
    if (activationPlan.first_move)
      sidebarItems.push({ id: "sect-first-move", label: "Your first move", group: "plan", available: true });
    if (activationPlan.activation_plan)
      sidebarItems.push({ id: "sect-plan", label: "Your 30-day plan", group: "plan", available: true });
    if (activationPlan.traction_signals && activationPlan.traction_signals.length > 0)
      sidebarItems.push({ id: "sect-traction", label: "Traction signals", group: "plan", available: true });
    if (activationPlan.portfolio_review_guide)
      sidebarItems.push({ id: "sect-portfolio-review", label: "Review checkpoints", group: "plan", available: true });
    if (activationPlan.network_toolkit)
      sidebarItems.push({ id: "sect-network-toolkit", label: "Network toolkit", group: "plan", available: true });
  }
  const sectionIds = sidebarItems.map((i) => i.id);
  const activeSectionId = useActiveSection(sectionIds);

  // ERROR state — fetch failed. Keep TopBar visible, render a Banner.
  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <Banner variant="error">
          We couldn't load your plan. Try refreshing, or contact support if this keeps happening.
        </Banner>
        <main className="mx-auto w-full max-w-3xl px-6 pt-12 pb-24">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Your plan
          </h1>
        </main>
      </div>
    );
  }

  // LOADING state — full-width centred spinner, matches /auth/callback.
  if (authLoading || hasPaid === null) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading your plan…</p>
          </div>
        </div>
      </div>
    );
  }

  // Render-state derivations driven by report status + presence of plan.
  //   awaitingSelection — paid, plan not yet built, user must choose strands.
  //                       StrandSelector is rendered; TodayCard is hidden.
  //   planBuilding      — generate-plan is in flight or just kicked off.
  //                       "Building your plan…" notice is shown.
  const awaitingSelection = awaitingSelectionPre;
  const planBuilding =
    reportStatus === "generating_plan" ||
    (awaitingSelection && strandSubmitting);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      {/* Day 31+ subscribe wall banner */}
      {showSubscribeWall && (
        <Banner variant="info">
          Your 30-day plan is complete. Your report and check-in history stay here. Open a subscription to keep going.
        </Banner>
      )}

      {renderRegression && (
        <Banner variant="error">
          Something went wrong rendering this page. Please refresh.
        </Banner>
      )}

      {/* Mobile sidebar (sticky chip + sheet). Hidden on lg via component. */}
      {sidebarItems.length > 0 && (
        <PlanSidebar items={sidebarItems} activeId={activeSectionId} variant="mobile" />
      )}

      <div className="mx-auto w-full max-w-screen-xl px-6">
        <div className="flex gap-10">
          {/* Desktop sidebar — sticky left rail. */}
          {sidebarItems.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0 pt-8">
              <div className="sticky top-20">
                <PlanSidebar items={sidebarItems} activeId={activeSectionId} variant="desktop" />
              </div>
            </aside>
          )}

          <main className="flex-1 min-w-0 mx-auto w-full max-w-3xl pt-8 pb-24">
        <h1 className="sr-only">Your plan</h1>
        {/* §1 ReplanPromptCard — only when a replan is pending */}
        {replanPending && sessionId && user && (
          <ReplanPromptCard
            trackerSessionId={sessionId}
            userId={user.id}
            context={replanContext}
            onResolved={() => {
              if (user && reportId) loadTrackerSession(user.id, reportId);
            }}
          />
        )}

        {/* §2a StrandSelector — shown when the user is paid but hasn't yet
            chosen their strands. Replaces the F60 auto-fire bridge per
            ADR-019. While visible, TodayCard is suppressed so selection is
            the unambiguous primary action. */}
        {awaitingSelection && coreReport?.options && coreReport.options.length > 0 && (
          <section id="sect-strand-selector" className="mb-8 scroll-mt-24">
            <StrandSelector
              options={coreReport.options}
              recommended_selection={coreReport.recommended_selection ?? null}
              onSubmit={handleStrandSubmit}
              submitting={strandSubmitting}
            />
          </section>
        )}

        {/* §2b "Building your plan…" notice — shown once the user has
            submitted their selection and we're waiting for generate-plan
            to finish. The StrandSelector unmounts at this point. */}
        {planBuilding && !awaitingSelection && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-[hsl(var(--surface-panel))] px-5 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Building your plan… this usually takes a minute or two.</span>
          </div>
        )}

        {/* §2c TodayCard — primary action once a plan exists. Hidden during
            the selection step so the StrandSelector is the unambiguous CTA. */}
        {!awaitingSelection && (
          <section id="sect-today" className="scroll-mt-24">
            <TodayCard
              state={planState}
              dayNumber={dayNumber}
              weekNumber={weekNumber}
              sessionId={sessionId}
              onScrollToReport={scrollToReport}
              onOpenCheckin={openCheckin}
              onOpenActivation={() => setActivationOpen(true)}
            />
          </section>
        )}

        {/* §3 TrackerGrid */}
        {planState !== "day0" && trackerDays.length > 0 && (
          <motion.section
            id="sect-tracker"
            className="mt-10 scroll-mt-24"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <TrackerGrid
              days={trackerDays}
              variant={isSubscriber ? "rolling-weekly" : "thirty-day"}
              onDayClick={handleDayClick}
            />
          </motion.section>
        )}

        {/* §4 Report — the canonical sample-report composition.
            Order matches admin/sample-report-v2.html. Each section guards on
            its own data slice so missing fields render nothing rather than
            crashing. */}
        <motion.div
          ref={reportRef}
          className="mt-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Report actions — paid users only */}
          {hasPaid && reportId && (
            <div className="mb-5 flex flex-col items-start gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={submitRefinement}
                  disabled={refineLimitReached || refinementCount >= 3}
                  className="text-xs font-medium"
                >
                  Refine your report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPdf}
                  disabled={exportingPdf}
                  className="text-xs font-medium"
                >
                  {exportingPdf ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating PDF...
                    </span>
                  ) : (
                    "Download as PDF"
                  )}
                </Button>
              </div>
              {(refineLimitReached || refinementCount >= 3) && (
                <p className="text-[11px] text-muted-foreground">Refinement limit reached.</p>
              )}
              {pdfError && (
                <p className="text-[11px] text-red-500">{pdfError}</p>
              )}
            </div>
          )}

          {/* ----- Core report sections (always when core_report present) ----- */}
          {coreReport?.hook_insight && (
            <section id="sect-hook" className="mb-10 scroll-mt-24">
              <HookInsightSection hook_insight={coreReport.hook_insight} />
            </section>
          )}

          {coreReport?.archetype && (
            <section id="sect-archetype" className="mb-10 scroll-mt-24">
              <ArchetypeSection archetype={coreReport.archetype} />
            </section>
          )}

          {coreReport?.transferable_value && (
            <section id="sect-transferable-value" className="mb-10 scroll-mt-24">
              <TransferableValueSection transferable_value={coreReport.transferable_value} />
            </section>
          )}

          {coreReport?.transferable_skills && coreReport.transferable_skills.length > 0 && (
            <section id="sect-transferable-skills" className="mb-10 scroll-mt-24">
              <TransferableSkillsSection transferable_skills={coreReport.transferable_skills} />
            </section>
          )}

          {coreReport?.options && coreReport.options.length > 0 && (
            <section id="sect-business-paths" className="mb-10 scroll-mt-24">
              <BusinessPaths
                options={coreReport.options}
                recommended_selection={coreReport.recommended_selection ?? undefined}
                locked={false}
              />
            </section>
          )}

          {coreReport?.recommendation && (
            <section id="sect-recommendation" className="mb-10 scroll-mt-24">
              <RecommendationSection
                recommendation={coreReport.recommendation}
                options={coreReport.options}
              />
            </section>
          )}

          {coreReport?.reality_check && (
            <section id="sect-reality-check" className="mb-10 scroll-mt-24">
              <RealityCheckSection reality_check={coreReport.reality_check} />
            </section>
          )}

          {coreReport?.income_outlook && (
            <section id="sect-income-outlook" className="mb-10 scroll-mt-24">
              <IncomeOutlookSection income_outlook={coreReport.income_outlook} />
            </section>
          )}

          {coreReport?.ai_impact && (
            <section id="sect-ai-impact" className="mb-10 scroll-mt-24">
              <AIImpactSection ai_impact={coreReport.ai_impact} />
            </section>
          )}

          {/* ----- Activation-plan sections (only when activation_plan present) ----- */}
          {activationPlan?.portfolio_summary && (
            <section id="sect-portfolio-summary" className="mb-10 scroll-mt-24">
              <PortfolioSummarySection portfolio_summary={activationPlan.portfolio_summary} />
            </section>
          )}

          {marketSnapshots && Object.keys(marketSnapshots).length > 0 && (
            <section id="sect-market-snapshot" className="mb-10 scroll-mt-24">
              <MarketSnapshotSection market_snapshots={marketSnapshots} />
            </section>
          )}

          {activationPlan?.first_move && (
            <section id="sect-first-move" className="mb-10 scroll-mt-24">
              <FirstMoveSection first_move={activationPlan.first_move} />
            </section>
          )}

          {activationPlan?.activation_plan && (
            <section id="sect-plan" className="mb-10 scroll-mt-24">
              <PlanSection activation_plan={activationPlan.activation_plan} />
            </section>
          )}

          {activationPlan?.traction_signals && activationPlan.traction_signals.length > 0 && (
            <section id="sect-traction" className="mb-10 scroll-mt-24">
              <TractionSignalsSection traction_signals={activationPlan.traction_signals} />
            </section>
          )}

          {activationPlan?.portfolio_review_guide && (
            <section id="sect-portfolio-review" className="mb-10 scroll-mt-24">
              <PortfolioReviewSection portfolio_review_guide={activationPlan.portfolio_review_guide} />
            </section>
          )}

          {activationPlan?.network_toolkit && (
            <section id="sect-network-toolkit" className="mb-10 scroll-mt-24">
              <NetworkToolkitSection network_toolkit={activationPlan.network_toolkit} />
            </section>
          )}
        </motion.div>
          </main>
        </div>
      </div>

      {/* CheckInPanel — Drawer, not a route */}
      <CheckInPanel
        open={checkinOpen}
        onOpenChange={(open) => {
          setCheckinOpen(open);
          if (!open) {
            if (initialSessionId) {
              window.history.replaceState(null, "", "/plan");
            }
            // If the latest check-in flagged a pending replan, refetch the
            // tracker session so the ReplanPromptCard becomes visible.
            if (checkinReplanPendingRef.current && user && reportId) {
              checkinReplanPendingRef.current = false;
              loadTrackerSession(user.id, reportId);
            }
          }
        }}
        sessionId={sessionId}
        dayNumber={dayNumber}
        onSubmit={handleCheckinSubmit}
      />

      {/* Refine Report Panel */}
      {reportId && (
        <RefineReportPanel
          open={refineOpen}
          onOpenChange={setRefineOpen}
          reportId={reportId}
          refinementCount={refinementCount}
          onRefined={handleRefined}
          onLimitReached={() => setRefineLimitReached(true)}
          onToast={(message) => toast({ title: message })}
        />
      )}

      {/* F78 — Activation dialog. Mounted at the page root so it sits above
          the sticky TopBar and sidebar. Calls activate-plan → tracker_sessions
          insert. On success we reload the tracker session, which flips
          planState from "day0" to "active" via loadTrackerSession. */}
      <ActivationDialog
        open={activationOpen}
        onOpenChange={setActivationOpen}
        reportId={reportId}
        onActivated={() => {
          if (user && reportId) {
            loadTrackerSession(user.id, reportId);
          }
          toast({ title: "Plan activated. Day 1 starts now." });
        }}
      />
    </div>
  );
}
