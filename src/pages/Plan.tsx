import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { useToast } from "@/hooks/use-toast";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";

import type {
  SoloCoreReport,
  ActivationPlanOutput,
  ReportRow,
  DayDetail,
  Phase,
} from "@/types/canonical";
import {
  SAMPLE_CORE_REPORT,
  SAMPLE_ACTIVATION_PLAN,
  SAMPLE_MARKET_SNAPSHOTS,
} from "@/data/canonicalSampleReport";

/*
 * Plan — Pass 1 /plan v1 (2026-05-17)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Pass 1
 * scope is shell + chrome + panel composition + section-header pattern +
 * dark Day 31+ wall + AreaSidebar with editorial nav vocabulary.
 * Internal composite components (TodayCard internals, TrackerGrid cell
 * visual, StrandCard compact mode, CheckInPanel question flow,
 * LibraryCard) are preserved as-is for this pass; their visual reskin
 * sits in Phase 2 per admin/pass-1-plan-decisions.md.
 *
 * Locked decisions from admin/pass-1-plan-decisions.md:
 *   F1 — Multi-panel main column (each section its own panel-ivory with
 *        its own elevation). Diverges from the spine's single-panel
 *        pattern; daily-scan ergonomics justify the divergence.
 *   F2 — AreaSidebar footer stat block ("Plan · One-time · Day 7 of 30").
 *   F3 — TodayCard meta row with state-appropriate substantiation.
 *   F4 — TrackerGrid as editorial squares with state dots (preserved in
 *        existing TrackerGrid component; will be reskinned in Phase 2).
 *   F5 — Day 0 dormant tracker block (no 30 future cells).
 *   F6 — Day 0 strand row hidden until user picks strands on /report.
 *   F7 — Ask Solo widget meta clause changes per state (out of scope for
 *        Pass 1 page-level work; lives in the global widget component).
 *   F8 — Day 31+ TodayCard meta row inverts to trust substantiation
 *        (Cancel any time · Your data always yours · 14-day refund).
 *
 *   Cadence: one dark moment, on the Day 31+ wall. TodayCard runs ivory
 *   in all states. Subscriber experience runs all-ivory.
 *
 * Drops framer-motion. Editorial register lands instantly per the spine
 * precedent. Preserves all existing logic: data fetch, replan handling,
 * strand selector for pending_selection, plan-building poll, check-in
 * submit + state update, deep-link /checkin/:sessionId, subscription
 * return toast, dev-bypass, error states, Rules of Hooks discipline.
 */

interface PlanPageProps {
  initialSessionId?: string;
}

export default function Plan({ initialSessionId }: PlanPageProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const viewStrands = searchParams.get("view") === "strands";

  /* ─── State (preserved from prior implementation) ─── */
  const [planState, setPlanState] = useState<PlanState>("loading");
  const [dayNumber, setDayNumber] = useState(0);
  const [weekNumber] = useState(1);
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [checkinOpen, setCheckinOpen] = useState(false);
  // v39 (Gap 2, 2026-05-17): tracks which mode CheckInPanel opens in so it can
  // render the right title/subhead and disable input for read-only views.
  type CheckInPanelMode = "today" | "backfill" | "readOnly";
  const [checkinPanelMode, setCheckinPanelMode] = useState<CheckInPanelMode>("today");
  const [activationOpen, setActivationOpen] = useState(false);
  const [trackerDays, setTrackerDays] = useState<
    { day: number; completed: boolean; isToday: boolean }[]
  >([]);

  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);

  const [reportId, setReportId] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<ReportRow["status"] | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [activationPlan, setActivationPlan] = useState<ActivationPlanOutput | null>(null);
  const [, setMarketSnapshots] = useState<ReportRow["market_snapshots"]>(null);

  const [refineOpen, setRefineOpen] = useState(false);

  const [replanPending, setReplanPending] = useState(false);
  const [replanContext, setReplanContext] = useState<Record<string, unknown> | null>(null);

  const [loadError, setLoadError] = useState(false);
  const [strandSubmitting, setStrandSubmitting] = useState(false);

  const applyReportRow = useCallback((row: Record<string, unknown>) => {
    setReportId(row.id as string);
    setReportStatus(row.status as ReportRow["status"]);
    setCoreReport((row.core_report as SoloCoreReport | null) ?? null);
    setActivationPlan((row.activation_plan as ActivationPlanOutput | null) ?? null);
    setMarketSnapshots(
      (row.market_snapshots as ReportRow["market_snapshots"]) ?? null,
    );
  }, []);

  /* ─── Data fetch on auth (preserved) ─── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (isDevBypass()) {
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
        // Fetch all the user's reports and pick the BEST one — prefer paid
        // over unpaid, then most recent within tier. Previously this just
        // grabbed the most recent row regardless of payment status, which
        // bounced paid users with newer unpaid test runs to /teaser. See
        // AuthCallback.tsx for the matching fix.
        const PAID_STATUSES = new Set(["pending_selection", "generating_plan", "complete"]);
        const { data: reports, error } = await (supabase as any)
          .from("reports")
          .select(
            "id, status, hook_insight, core_report, activation_plan, market_snapshots, recommended_selection, ai_impact_section, selected_strands, selected_option_rank, answers, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (error) {
          setLoadError(true);
          setHasPaid(false);
          return;
        }

        // Pick the best report: most recent paid, else most recent of any tier.
        const paidReport = (reports as Array<{ status: string }> | null)?.find((r) => PAID_STATUSES.has(r.status));
        const data = paidReport ?? (reports as Array<unknown> | null)?.[0] ?? null;

        if (!data || (data as { status?: string }).status === "pending" || (data as { status?: string }).status === "generating") {
          if (!isDevBypass()) {
            navigate("/teaser", { replace: true });
            return;
          }
          setHasPaid(true);
          setPlanState("day0");
          return;
        }

        if ((data as { status: string }).status === "teaser_ready") {
          if (!isDevBypass()) {
            navigate(`/teaser?report_id=${(data as { id: string }).id}`, { replace: true });
            return;
          }
        }

        setHasPaid(true);
        applyReportRow(data as Record<string, unknown>);
        loadTrackerSession(user.id, (data as { id: string }).id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, navigate, applyReportRow]);

  const loadTrackerSession = useCallback(async (uid: string, rid: string) => {
    const { data: session } = await (supabase as any)
      .from("tracker_sessions")
      .select(
        "id, current_day, activated_at, subscription_status, last_checkin_date, replan_pending, replan_context, working_plan",
      )
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

  /* ─── Plan-building poll (preserved) ─── */
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
          "id, status, hook_insight, core_report, activation_plan, market_snapshots, recommended_selection, ai_impact_section, selected_strands, selected_option_rank, answers",
        )
        .eq("id", reportId)
        .maybeSingle();

      if (cancelled || !latest) return;

      applyReportRow(latest as Record<string, unknown>);

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

  /* ─── /checkin/:sessionId deep-link ─── */
  useEffect(() => {
    if (initialSessionId) {
      // Drawer opens 200ms after page mounts so the user sees they're back on /plan first.
      const t = setTimeout(() => setCheckinOpen(true), 200);
      window.history.replaceState({}, "", "/plan");
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Subscription return toast ─── */
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

  const handleStrandSubmit = useCallback(
    async (selected_ranks: number[]) => {
      if (!reportId) return;
      setStrandSubmitting(true);
      try {
        const { error } = await supabase.functions.invoke("generate-plan", {
          body: { report_id: reportId, selected_ranks },
        });
        if (error) throw error;
        setTimeout(() => setStrandSubmitting(false), 12000);
      } catch (err) {
        console.error("Plan: generate-plan invoke failed", err);
        setStrandSubmitting(false);
        toast({ title: "We couldn't start your plan. Please try again." });
      }
    },
    [reportId, toast],
  );

  const openCheckin = useCallback(() => setCheckinOpen(true), []);
  const openRefinePanel = useCallback(() => setRefineOpen(true), []);

  const checkinReplanPendingRef = useRef(false);

  const handleCheckinSubmit = useCallback(
    async (response: string): Promise<string | null> => {
      // v39 (Gap 2, 2026-05-17): pass target_day so the backend knows which day
      // this check-in is for. Defaults to currentDay on the server when omitted,
      // but we send it explicitly so backfills (dayNumber < currentDay) work and
      // re-submitted today-check-ins are rejected with the lock 409.
      const { data, error } = await supabase.functions.invoke("process-checkin", {
        body: {
          session_id: sessionId,
          response,
          target_day: dayNumber,
        },
      });

      // v39: a 409 (checkin_locked) is surfaced as the panel's inline reply.
      // FunctionsHttpError carries the response body on .context — parse it
      // to get the friendly response_text the server returned.
      if (error) {
        type FunctionsHttpErrorLike = {
          context?: { json?: () => Promise<{ response_text?: string; error?: string }> };
        };
        const ctx = (error as FunctionsHttpErrorLike).context;
        if (ctx?.json) {
          try {
            const body = await ctx.json();
            if (body?.response_text) return body.response_text;
          } catch {
            /* fall through to throw below */
          }
        }
        throw error;
      }

      const replanPendingFromCheckin = !!(data as { replan_pending?: boolean } | null)?.replan_pending;
      checkinReplanPendingRef.current = replanPendingFromCheckin;

      const isComplete = !!(data as { check_in_complete?: boolean } | null)?.check_in_complete;
      const isBackfill = !!(data as { is_backfill?: boolean } | null)?.is_backfill;

      // v39: only flip the "done today" tracker state when the completed check-in
      // is for the current day. Backfill completions update only the specific
      // historic day cell.
      if (isComplete && !isBackfill) {
        setPlanState((prev) => {
          if (prev === "active") return "done_today";
          if (prev === "sub_active") return "sub_done";
          return prev;
        });
        setTrackerDays((prev) =>
          prev.map((d) => (d.isToday ? { ...d, completed: true } : d)),
        );
      } else if (isComplete && isBackfill) {
        setTrackerDays((prev) =>
          prev.map((d) => (d.day === dayNumber ? { ...d, completed: true } : d)),
        );
      }

      if (initialSessionId) {
        window.history.replaceState(null, "", "/plan");
      }

      const aiText =
        (data as { response_text?: string; response?: string; message?: string } | null)?.response_text ||
        (data as { response?: string } | null)?.response ||
        (data as { message?: string } | null)?.message ||
        null;

      return aiText;
    },
    [sessionId, dayNumber, initialSessionId],
  );

  /* ── Day-by-day list state (plan visibility gap fix, 2026-05-18) ──
   * The §03 "Your 30 days" list lets the user browse plan content by
   * day. `expandedDayInList` tracks which day's row is open. Today is
   * expanded by default once we know the current day; user can toggle.
   * Hash deep-link `/plan#day-15` is parsed below; opening from there
   * also scrolls to the day row. */
  const [expandedDayInList, setExpandedDayInList] = useState<number | null>(null);
  const dayListRef = useRef<HTMLDivElement | null>(null);
  const dayRowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Expand today by default once dayNumber is known (Day 1+)
  useEffect(() => {
    if (dayNumber > 0 && expandedDayInList === null) {
      setExpandedDayInList(dayNumber);
    }
  }, [dayNumber, expandedDayInList]);

  // Hash deep-link: /plan#day-15 expands + scrolls to day 15
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    const match = hash.match(/^day-(\d+)$/);
    if (match) {
      const day = parseInt(match[1], 10);
      if (day >= 1 && day <= 30) {
        setExpandedDayInList(day);
        // Defer scroll so the row is in the DOM
        requestAnimationFrame(() => {
          dayRowRefs.current[day]?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [location.hash]);

  /* ── handleDayBrowse — Chunk 2 wiring ──
   * Replaces the previous "click tracker cell → open check-in drawer"
   * behaviour. Now clicking a tracker cell scrolls to and expands the
   * matching day row in §03's day-by-day list. The check-in drawer is
   * still accessible from inside the expanded row (today's row has a
   * "Submit check-in" button; past completed rows have a "View check-in"
   * button). Preserves the /checkin/:sessionId deep-link path — it
   * still opens the check-in drawer via initialSessionId. */
  const handleDayBrowse = useCallback((day: number) => {
    setDayNumber(day);
    setExpandedDayInList(day);
    requestAnimationFrame(() => {
      dayRowRefs.current[day]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleDayInListToggle = useCallback((day: number) => {
    setExpandedDayInList((prev) => (prev === day ? null : day));
  }, []);

  // Kept for compatibility — TodayCard may still call this; routes through the new browse behaviour.
  const handleDayClick = useCallback((day: number) => {
    handleDayBrowse(day);
  }, [handleDayBrowse]);

  const handleRefined = useCallback(
    (updatedReport: unknown) => {
      const r = updatedReport as Record<string, unknown> | null;
      if (r) {
        const merged = {
          id: reportId,
          status: reportStatus,
          ...r,
        } as Record<string, unknown>;
        applyReportRow(merged);
      }
    },
    [reportId, reportStatus, applyReportRow],
  );

  const renderRegression = useMainContentSelfCheck(hasPaid === true && !loadError);

  /* ─── Derived (above conditional returns per Rules of Hooks) ─── */

  /* Scroll-to-day-list handler — sidebar "Your 30 days" item scrolls
   * the page to the §03 list and expands today's row if nothing is
   * currently expanded. */
  const handleScrollToDayList = useCallback(() => {
    dayListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (expandedDayInList === null && dayNumber > 0) {
      setExpandedDayInList(dayNumber);
    }
  }, [expandedDayInList, dayNumber]);

  const sidebarItems: SidebarItem[] = [
    { id: "today", label: "Today", to: "/plan", isActive: !viewStrands },
    { id: "days", label: "Your 30 days", onClick: handleScrollToDayList },
    { id: "strands", label: "Strands", to: "/plan?view=strands", isActive: viewStrands },
    { id: "history", label: "Check-in history", to: "/checkin/history" },
    { id: "report", label: "Report", to: "/report" },
    { id: "div", label: "", isDivider: true },
    { id: "refine", label: "Refine your report", onClick: openRefinePanel, isUtility: true },
  ];

  const sidebarFooter: ReactNode = (() => {
    if (planState === "day31_nosub") {
      return (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Plan
          </div>
          <div className="mt-1 text-[12px] text-foreground">One-time · 30 days complete</div>
        </>
      );
    }
    if (isSubscriber) {
      return (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Plan
          </div>
          <div className="mt-1 text-[12px] text-foreground">
            Subscription · Week {weekNumber}
          </div>
        </>
      );
    }
    return (
      <>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Plan
        </div>
        <div className="mt-1 text-[12px] text-foreground">
          One-time · Day {dayNumber === 0 ? 0 : dayNumber} of 30
        </div>
      </>
    );
  })();

  const sidebarHead: ReactNode = (
    <>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      <span>Your plan</span>
    </>
  );

  /* ─── Early returns ─── */

  if (loadError) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main className="pt-[68px]">
          <section className="py-10 lg:py-14">
            <div className="mx-auto max-w-3xl px-6">
              <Banner variant="error">
                We couldn't load your plan. Try refreshing, or contact support if this keeps happening.
              </Banner>
              <div className="mt-8 panel-ivory px-8 sm:px-12 py-10">
                <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight text-foreground">
                  Your plan
                </h1>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (authLoading || hasPaid === null) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main className="pt-[68px]">
          <section className="py-12">
            <div className="mx-auto max-w-3xl px-6 flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-[13px]">Loading your plan…</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const awaitingSelection =
    reportStatus === "pending_selection" && !activationPlan;
  const planBuilding =
    reportStatus === "generating_plan" || (awaitingSelection && strandSubmitting);

  const strands = activationPlan?.portfolio_summary?.strands ?? [];

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      {renderRegression && (
        <Banner variant="error">
          Something went wrong rendering this page. Please refresh.
        </Banner>
      )}

      <main className="pt-[68px]">
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="flex gap-8 lg:gap-10">
              <AreaSidebar
                items={sidebarItems}
                head={sidebarHead}
                footer={sidebarFooter}
              />

              <div className="flex-1 min-w-0">
                <h1 className="sr-only">Your plan</h1>

                {/* ─── Replan prompt (when a check-in flags it) ─── */}
                {replanPending && sessionId && user && (
                  <div className="mb-6">
                    <ReplanPromptCard
                      trackerSessionId={sessionId}
                      userId={user.id}
                      context={replanContext}
                      onResolved={() => {
                        if (user && reportId) loadTrackerSession(user.id, reportId);
                      }}
                    />
                  </div>
                )}

                {/* ─── Strand selector (pending_selection state) ─── */}
                {awaitingSelection && coreReport?.options && coreReport.options.length > 0 && (
                  <section className="mb-8 panel-ivory px-6 sm:px-10 py-8">
                    <StrandSelector
                      options={coreReport.options}
                      recommended_selection={coreReport.recommended_selection ?? null}
                      onSubmit={handleStrandSubmit}
                      submitting={strandSubmitting}
                    />
                  </section>
                )}

                {/* ─── Plan-building hold ─── */}
                {planBuilding && !awaitingSelection && (
                  <div className="mb-8 panel-ivory px-6 sm:px-10 py-5 flex items-center gap-3 text-[13.5px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Building your plan… this usually takes a minute or two.</span>
                  </div>
                )}

                {/* ─── Day 31+ Dark Wall (the screen's single dark moment) ─── */}
                {planState === "day31_nosub" && <DarkWall />}

                {/* ─── TodayCard (visual primary in all states) ─── */}
                {!awaitingSelection && (
                  <section className="panel-ivory px-6 sm:px-10 lg:px-12 py-8 sm:py-10">
                    <TodayCard
                      state={planState}
                      dayNumber={dayNumber}
                      weekNumber={weekNumber}
                      sessionId={sessionId}
                      onScrollToReport={() => {
                        /* Report is its own route at /report; sidebar handles the nav. */
                      }}
                      onOpenCheckin={openCheckin}
                      onOpenActivation={() => setActivationOpen(true)}
                    />
                  </section>
                )}

                {/* ─── Tracker (Day 0 = dormant block; Day 1+ = grid) ─── */}
                {planState === "day0" ? (
                  <PanelSection num="02" label="Your tracker" meta="starts tomorrow">
                    <DormantTrackerBlock />
                  </PanelSection>
                ) : (
                  trackerDays.length > 0 && (
                    <PanelSection
                      num="02"
                      label={isSubscriber ? "Your rolling tracker" : "Your 30-day tracker"}
                      meta={trackerMetaFor(trackerDays, planState)}
                    >
                      <TrackerGrid
                        days={trackerDays}
                        variant={isSubscriber ? "rolling-weekly" : "thirty-day"}
                        onDayClick={handleDayClick}
                      />
                    </PanelSection>
                  )
                )}

                {/* ─── §03 Your 30 days — day-by-day plan browser ───
                  * Plan visibility gap fix (2026-05-18). Renders 30 day
                  * rows (or rolling window for subscribers) populated
                  * from activation_plan.activation_plan.phases[].days_detail.
                  * Each row collapsed by default except today (set via
                  * useEffect above). Click toggles. Hash deep-link
                  * /plan#day-N expands and scrolls to that row.
                  * TrackerGrid cell clicks (handleDayBrowse) route here.
                  * Hidden on Day 0 — no day-by-day plan to browse yet. */}
                {planState !== "day0" && trackerDays.length > 0 && (
                  <div ref={dayListRef} className="scroll-mt-24">
                    <PanelSection
                      num="03"
                      label="Your 30 days"
                      meta={isSubscriber ? "rolling window" : `${dayNumber} of 30`}
                    >
                      <p className="text-[13.5px] text-muted-foreground leading-[1.5] mb-5 max-w-[60ch]">
                        Click any day to see its tasks, time allocation, and any templates Solo drafted for you. Today is expanded by default.
                      </p>
                      <div className="space-y-0">
                        {trackerDays.map((d) => {
                          const dayDetail = activationPlan
                            ? findDayDetail(activationPlan, d.day)
                            : null;
                          const status: DayRowStatus = d.completed
                            ? "completed"
                            : d.isToday
                            ? "today"
                            : d.day < dayNumber
                            ? "missed"
                            : "future";
                          return (
                            <div
                              key={d.day}
                              ref={(el) => { dayRowRefs.current[d.day] = el; }}
                              id={`day-${d.day}`}
                              className="scroll-mt-24"
                            >
                              <DayRow
                                day={d.day}
                                dayDetail={dayDetail}
                                status={status}
                                isExpanded={expandedDayInList === d.day}
                                onToggle={() => handleDayInListToggle(d.day)}
                                onOpenCheckin={() => {
                                  // v39 (Gap 2): the panel mode is derived from
                                  // the day's status — today=submit, missed=backfill,
                                  // completed=read-only viewer (Chunk C below).
                                  setDayNumber(d.day);
                                  setCheckinPanelMode(
                                    status === "completed" ? "readOnly"
                                      : status === "missed" ? "backfill"
                                      : "today",
                                  );
                                  setCheckinOpen(true);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </PanelSection>
                  </div>
                )}

                {/* ─── §04 Strand row (Day 1+ only — hidden on Day 0 per F6) ─── */}
                {planState !== "day0" && strands.length > 0 && (
                  <PanelSection
                    num="04"
                    label="Your strands"
                    meta={`${strands.length} active`}
                  >
                    <ul className="space-y-3">
                      {strands.map((s) => (
                        <li
                          key={s.strand_id}
                          className="flex items-baseline justify-between gap-4 border-l-2 border-primary/40 pl-4 py-1"
                        >
                          <span className="text-[14.5px] font-semibold text-foreground">
                            {s.model_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums uppercase tracking-[0.14em] shrink-0">
                            {Math.round(s.time_weight * 100)}% time
                          </span>
                        </li>
                      ))}
                    </ul>
                    {viewStrands && (
                      <div className="mt-4 space-y-2">
                        {strands.map((s) =>
                          s.why_included ? (
                            <p
                              key={`why-${s.strand_id}`}
                              className="text-[13px] text-muted-foreground leading-relaxed"
                            >
                              <strong className="font-semibold text-foreground">
                                {s.model_name}.
                              </strong>{" "}
                              {s.why_included}
                            </p>
                          ) : null,
                        )}
                      </div>
                    )}
                  </PanelSection>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Drawers + dialogs (preserved) ─── */}
      {/* v39 (Gap 2, 2026-05-17): mode + isBackfill drive the panel's title,
        * subhead, and input-vs-readonly rendering. Mode is set when the row
        * CTA fires (today / backfill / readOnly). */}
      <CheckInPanel
        open={checkinOpen}
        onOpenChange={(open) => {
          setCheckinOpen(open);
          if (!open) {
            if (initialSessionId) {
              window.history.replaceState(null, "", "/plan");
            }
            if (checkinReplanPendingRef.current && user && reportId) {
              checkinReplanPendingRef.current = false;
              loadTrackerSession(user.id, reportId);
            }
          }
        }}
        sessionId={sessionId}
        dayNumber={dayNumber}
        readOnly={checkinPanelMode === "readOnly"}
        isBackfill={checkinPanelMode === "backfill"}
        onSubmit={handleCheckinSubmit}
      />

      {reportId && (
        <RefineReportPanel
          open={refineOpen}
          onOpenChange={setRefineOpen}
          reportId={reportId}
          refinementCount={0}
          onRefined={handleRefined}
          onLimitReached={() => { /* limit handled on /report */ }}
          onToast={(message) => toast({ title: message })}
        />
      )}

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

/* ─────────────────────────── Section wrapper ─────────────────────────── */

function PanelSection({
  num,
  label,
  meta,
  children,
}: {
  num: string;
  label: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 panel-ivory px-6 sm:px-10 lg:px-12 py-8">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="text-primary mr-3 tabular-nums">{num}</span>
          {label}
        </div>
        {meta && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 tabular-nums">
            {meta}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

/* ─────────────────────────── Day 31+ Dark Wall ─────────────────────────── */

function DarkWall() {
  const today = new Date();
  const ended = today.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const started = startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="mb-6 panel-dark px-6 sm:px-10 lg:px-12 py-7 sm:py-8">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-10 items-center">
        <div className="sm:col-span-8">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(250,249,247,0.65)] mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[#FAF9F7]">30 days complete</span>
          </div>
          <p className="text-[18px] sm:text-[20px] font-semibold leading-snug text-[#FAF9F7]">
            Your report and history stay here. To keep running your plan, open a subscription.
          </p>
        </div>
        <div className="sm:col-span-4 sm:text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(250,249,247,0.55)] mb-1">
            Your 30 days
          </div>
          <div className="text-[13.5px] font-semibold text-[#FAF9F7] tabular-nums">
            started {started} · ended {ended}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Day 0 dormant tracker ─────────────────────────── */

function DormantTrackerBlock() {
  return (
    <div className="bg-[#F3F0EA] border border-[#E5E2DC] rounded-lg px-8 sm:px-12 py-10 sm:py-12 text-center">
      <div className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-foreground">
        Your tracker starts tomorrow.
      </div>
      <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed max-w-md mx-auto">
        Today's job is to read your report. Tomorrow we'll start the 30-day plan with your first move.
      </p>
    </div>
  );
}

/* ─────────────────────────── Tracker meta helper ─────────────────────────── */

function trackerMetaFor(
  days: { completed: boolean; isToday: boolean }[],
  state: PlanState,
): string {
  const done = days.filter((d) => d.completed).length;
  if (state === "day31_nosub") return `${days.length} of ${days.length} · frozen`;
  const active = days.some((d) => d.isToday) ? 1 : 0;
  const remaining = days.length - done - active;
  return `${String(done).padStart(2, "0")} done · ${active} active · ${String(remaining).padStart(2, "0")} remaining`;
}

/* ─────────────────────────── Day-by-day list helpers + DayRow ─────────────────────────── */

/*
 * findDayDetail — walks the phases.days_detail nested structure to
 * find the DayDetail for a given day number. activation_plan structure:
 *   activation_plan
 *     └── activation_plan          (yes, nested again)
 *         └── phases[]
 *             └── days_detail[]    (each has { day: "1" | "Day 1", ... })
 *
 * Day strings vary in the source data ("1", "Day 1", "day-1"), so we
 * normalise by extracting the first integer in the string. Returns null
 * when no matching DayDetail exists — the row renders an "empty" message.
 */
type DayRowStatus = "completed" | "today" | "missed" | "future";

function findDayDetail(
  plan: ActivationPlanOutput,
  dayNum: number,
): DayDetail | null {
  const phases = plan?.activation_plan?.phases;
  if (!Array.isArray(phases)) return null;
  for (const phase of phases as Phase[]) {
    if (!Array.isArray(phase.days_detail)) continue;
    for (const detail of phase.days_detail) {
      const match = String(detail.day).match(/\d+/);
      if (match && parseInt(match[0], 10) === dayNum) {
        return detail;
      }
    }
  }
  return null;
}

/*
 * DayRow — a single day in the §03 list. Collapsed shows day numeral +
 * label + time + status pill + toggle. Expanded shows the label as a
 * substantive heading, the time allocation, each task as a sub-block
 * with description + move-type tag + outreach_draft (when present) in
 * a stone callout box, and a context-appropriate check-in CTA.
 *
 * Status drives:
 *   - status pill colour + glyph (Completed mint solid, Today mint
 *     outline pulse, Missed stone, Future faint)
 *   - check-in CTA presence (Today: "Submit your check-in"; Completed:
 *     "View this check-in" — opens existing read-only drawer; Missed
 *     and Future: no CTA)
 *
 * Empty-data fallback: if dayDetail is null, the expanded body shows a
 * quiet "No specific tasks logged for this day" message. Real activation
 * plans may not have day-by-day content for every day; the message is
 * honest rather than rendering empty space.
 */
function DayRow({
  day, dayDetail, status, isExpanded, onToggle, onOpenCheckin,
}: {
  day: number;
  dayDetail: DayDetail | null;
  status: DayRowStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenCheckin: () => void;
}) {
  const isMissed = status === "missed";
  const isFuture = status === "future";
  const isToday = status === "today";
  const isCompleted = status === "completed";

  // Status pill — matches /checkin-history's four-pill vocabulary.
  const pill = (() => {
    if (isCompleted) {
      // Pass 2 (2026-05-18, F2): white tick glyph inside the Done pill. Tick is
      // the system's existing completion mark (matches /auth sent state and
      // /account modal confirmations). Earns the most semantically loaded state.
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] text-white" style={{ background: "#2ECDB0" }}>
          <span
            className="inline-flex items-center justify-center w-2 h-2 rounded-full text-[7px] font-bold leading-none"
            style={{ background: "rgba(255,255,255,0.92)", color: "#1A8A72" }}
            aria-hidden="true"
          >
            ✓
          </span>
          Done
        </span>
      );
    }
    if (isToday) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em]" style={{ border: "1.5px solid #2ECDB0", color: "#1A8A72" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#2ECDB0" }} />
          Today
        </span>
      );
    }
    if (isMissed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground" style={{ background: "#F3F1ED", border: "1px solid #D5D0C8" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#A09A92" }} />
          Missed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ border: "1px solid #A09A92" }} />
        Future
      </span>
    );
  })();

  return (
    <div
      className={`border-t border-[#EDEBE6] first:border-t-0 transition-colors ${
        isExpanded ? "bg-[#FAFAF7]" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center px-2 py-4 text-left hover:bg-[#F3F1ED]/40 transition-colors"
      >
        {/* Pass 2 (2026-05-18, F1): split into two spans so the "Day" prefix
          * carries mint and the numeral carries the row-state ink. Active rows
          * (today/completed) get a mint prefix; missed/future fade the prefix
          * with the rest of the row. Reads as editorial wayfinding rather than
          * a uniform text block. */}
        <span
          className={`shrink-0 font-display font-bold text-[15px] tabular-nums tracking-[0.04em] ${
            isToday ? "text-primary"
              : isCompleted ? "text-foreground"
              : isMissed ? "text-muted-foreground"
              : "text-muted-foreground/70"
          }`}
        >
          <span
            className={`mr-1 ${
              isToday || isCompleted ? "text-primary" : "text-muted-foreground/60"
            }`}
          >
            Day
          </span>
          {String(day).padStart(2, "0")}
        </span>
        <span
          className={`min-w-0 truncate font-display text-[14.5px] sm:text-[15.5px] ${
            isExpanded ? "font-semibold" : "font-medium"
          } ${isFuture || isMissed ? "text-muted-foreground/70" : "text-foreground"}`}
          style={{ letterSpacing: "-0.012em" }}
        >
          {dayDetail?.label ?? <span className="italic text-muted-foreground/60">No detail yet</span>}
        </span>
        <span className="shrink-0">{pill}</span>
        <span className="shrink-0 text-[20px] text-muted-foreground/60 font-light leading-none select-none">
          {isExpanded ? "–" : "+"}
        </span>
      </button>

      {isExpanded && (
        <div className="px-2 sm:px-6 pb-6 pt-2">
          {dayDetail ? (
            <DayBody dayDetail={dayDetail} status={status} />
          ) : (
            <p className="text-[13.5px] italic text-muted-foreground/70 leading-relaxed">
              No specific tasks logged for this day. Your activation plan's day-by-day detail may be lighter for certain days — your overall plan structure still applies.
            </p>
          )}
          {(isToday || isCompleted || isMissed) && (
            // v39 (Gap 2): missed days are backfillable. Backfill CTA uses the
            // stone-with-mint-rule treatment to distinguish from today's mint
            // primary and completed's quieter stone. View-check-in for
            // completed days opens the read-only transcript.
            // Pass 2 (2026-05-18, F4 + lift-in): right-side hint on the missed
            // CTA names the spec's hard rule ("backfilling won't change today")
            // at the moment of decision, before the user clicks.
            <div className="mt-5 pt-5 border-t border-[#E5E2DC] flex items-baseline gap-3 flex-wrap">
              <button
                onClick={onOpenCheckin}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-[13px] font-semibold transition-colors"
                style={
                  isToday
                    ? { background: "#2ECDB0", color: "#FFFFFF" }
                    : isMissed
                      ? { background: "#FAFAF7", color: "#1D2025", border: "1px solid #2ECDB0" }
                      : { background: "#F3F1ED", color: "#1D2025", border: "1px solid #D5D0C8" }
                }
              >
                {isToday
                  ? "Submit your check-in →"
                  : isMissed
                    ? "Backfill this day →"
                    : "View this check-in →"}
              </button>
              {isMissed && (
                <span className="text-[11px] text-muted-foreground/70 leading-snug">
                  A retroactive note won't change today's tracker — just fills the gap.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* DayBody — renders the substantive content for an expanded day:
 * time allocation, tasks (with descriptions, move tags, outreach drafts).
 *
 * Pass 2 (2026-05-18):
 *   - F5 resolution: no leading eyebrow above the H3 — the row label is
 *     promoted to a substantive H3 heading. Just heading + content.
 *   - F6 resolution: missed rows use past-tense labels throughout
 *     ("Was planned" / "Planned allocation" / "Tasks that were planned").
 *   - Tasks count meta moves to the right of the "Tasks" eyebrow.
 *   - Missed rows render the H3 + meta/alloc/tasks in muted ink so the user
 *     can read what was planned without it competing with today.
 *   - Missed rows do NOT show outreach_draft callouts (drafts were prep for
 *     tasks that didn't happen; surfacing them retroactively would confuse).
 */
function DayBody({ dayDetail, status }: { dayDetail: DayDetail; status: DayRowStatus }) {
  const isMissedRow = status === "missed";

  // time_allocation can be array (TimeAllocationEntry[]) or object form
  // (Record<string, string>) per the deployed adapter. Components must
  // handle both per the type comment.
  const timeAllocationEntries: Array<[string, string]> = (() => {
    const ta = dayDetail.time_allocation;
    if (Array.isArray(ta)) {
      return ta.map((e) => [String(e.strand_key ?? "Activity"), String(e.minutes ?? "")]);
    }
    if (ta && typeof ta === "object") {
      return Object.entries(ta).map(([k, v]) => [k, String(v)]);
    }
    return [];
  })();

  // Pass 2 (F6): present-tense for today/future, past-tense for missed.
  const labels = isMissedRow
    ? { timeReq: "Was planned", alloc: "Planned allocation", tasks: "Tasks that were planned" }
    : { timeReq: "Time required", alloc: "Time allocation", tasks: "Tasks" };

  return (
    <div className="sm:pl-12">
      {/* Pass 2 (F5): substantive H3 heading promotes the day label to body
        * weight. No eyebrow above — the row's collapsed header carries the
        * unit/date context; the H3 makes the expanded body's purpose. */}
      {dayDetail.label && (
        <h3
          className={`font-display font-bold text-[18px] sm:text-[19px] leading-snug mb-5 ${
            isMissedRow ? "text-muted-foreground" : "text-foreground"
          }`}
          style={{ letterSpacing: "-0.018em" }}
        >
          {dayDetail.label}
        </h3>
      )}

      {/* Meta row — time required */}
      {dayDetail.time_required && (
        <div className="flex items-baseline gap-3 mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-primary">{labels.timeReq}</span>
          <span className={`normal-case tracking-normal text-[13px] font-medium ${
            isMissedRow ? "text-muted-foreground" : "text-foreground"
          }`}>
            {dayDetail.time_required}
          </span>
        </div>
      )}

      {/* Time allocation */}
      {timeAllocationEntries.length > 0 && (
        <div className="mb-5 rounded-md px-4 py-3" style={{ background: "#F3F1ED" }}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            {labels.alloc}
          </div>
          <div className="space-y-1.5">
            {timeAllocationEntries.map(([activity, time]) => (
              <div key={activity} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={isMissedRow ? "text-muted-foreground" : "text-foreground/85"}>{activity}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      {dayDetail.tasks?.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary translate-y-[-1px]" aria-hidden="true" />
            <span className="text-primary">{labels.tasks}</span>
            <span className="ml-auto tabular-nums text-muted-foreground/70">{dayDetail.tasks.length}</span>
          </div>
          <ul className="space-y-4">
            {dayDetail.tasks.map((task, i) => (
              <li key={task.task_id || i} className="border-l-2 border-[#D5D0C8] pl-4">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <p className="font-display text-[14.5px] font-semibold text-foreground leading-snug" style={{ letterSpacing: "-0.012em" }}>
                    {task.description}
                  </p>
                  {task.move_type && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#1A8A72" }}>
                      {task.move_type}
                    </span>
                  )}
                </div>

                {/* Pass 2 (2026-05-18): missed rows suppress outreach_draft callouts.
                  * The drafts were prep for tasks that didn't happen; surfacing
                  * them retroactively would confuse. Copy affordance gets the
                  * "⧉ Copy" text+glyph treatment per F3. */}
                {task.outreach_draft && !isMissedRow && (
                  <div
                    className="mt-3 rounded-md px-4 py-3.5"
                    style={{ background: "#F3F1ED", borderLeft: "3px solid #2ECDB0" }}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#1A8A72" }}>
                        Draft Solo prepared
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(task.outreach_draft || "");
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
                      >
                        <span aria-hidden="true">⧉</span>
                        Copy
                      </button>
                    </div>
                    <p
                      className="text-[13.5px] text-foreground/85 leading-[1.6] whitespace-pre-wrap"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      {task.outreach_draft}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
