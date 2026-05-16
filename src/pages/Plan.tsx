import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { useToast } from "@/hooks/use-toast";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";

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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const viewStrands = searchParams.get("view") === "strands";

  // Tracker / day state
  const [planState, setPlanState] = useState<PlanState>("loading");
  const [dayNumber, setDayNumber] = useState(0);
  const [weekNumber] = useState(1);
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const [trackerDays, setTrackerDays] = useState<
    { day: number; completed: boolean; isToday: boolean }[]
  >([]);

  // Auth / payment state
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [showSubscribeWall, setShowSubscribeWall] = useState(false);

  // Report / plan state
  const [reportId, setReportId] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<ReportRow["status"] | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [activationPlan, setActivationPlan] = useState<ActivationPlanOutput | null>(null);
  // Kept on state for future use in strand summary expansion; not rendered here.
  const [, setMarketSnapshots] = useState<ReportRow["market_snapshots"]>(null);

  // Refine
  const [refineOpen, setRefineOpen] = useState(false);

  // Replan
  const [replanPending, setReplanPending] = useState(false);
  const [replanContext, setReplanContext] = useState<Record<string, unknown> | null>(null);

  // Error
  const [loadError, setLoadError] = useState(false);

  // StrandSelector submission flag
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
        const { data, error } = await (supabase as any)
          .from("reports")
          .select(
            "id, status, hook_insight, core_report, activation_plan, market_snapshots, recommended_selection, ai_impact_section, selected_strands, selected_option_rank, answers",
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
          if (!isDevBypass()) {
            navigate("/teaser", { replace: true });
            return;
          }
          setHasPaid(true);
          setPlanState("day0");
          return;
        }

        if (data.status === "teaser_ready") {
          if (!isDevBypass()) {
            navigate(`/teaser?report_id=${data.id}`, { replace: true });
            return;
          }
        }

        setHasPaid(true);
        applyReportRow(data as Record<string, unknown>);
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

  // Poll while plan is being generated.
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

  // /checkin/:sessionId deep-link
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

  const openCheckin = useCallback(() => {
    setCheckinOpen(true);
  }, []);

  const openRefinePanel = useCallback(() => {
    setRefineOpen(true);
  }, []);

  const checkinReplanPendingRef = useRef(false);

  const handleCheckinSubmit = useCallback(
    async (response: string): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke("process-checkin", {
        body: { session_id: sessionId, response },
      });
      if (error) throw error;

      const replanPendingFromCheckin = !!(data as { replan_pending?: boolean } | null)?.replan_pending;
      checkinReplanPendingRef.current = replanPendingFromCheckin;

      setPlanState((prev) => {
        if (prev === "active") return "done_today";
        if (prev === "sub_active") return "sub_done";
        return prev;
      });

      setTrackerDays((prev) =>
        prev.map((d) => (d.isToday ? { ...d, completed: true } : d)),
      );

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
    [sessionId, initialSessionId],
  );

  const handleDayClick = useCallback((day: number) => {
    setDayNumber(day);
    setCheckinOpen(true);
  }, []);

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

  // ── Sidebar items (area-level nav) ──
  const sidebarItems: SidebarItem[] = [
    { id: "today", label: "Today", to: "/plan", isActive: !viewStrands },
    { id: "strands", label: "Strands", to: "/plan?view=strands", isActive: viewStrands },
    { id: "history", label: "Check-in history", to: "/checkin/history" },
    { id: "report", label: "Report", to: "/report" },
    { id: "refine", label: "Refine your report", onClick: openRefinePanel },
  ];

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <Banner variant="error">
          We couldn't load your plan. Try refreshing, or contact support if this keeps happening.
        </Banner>
        <main className="mx-auto w-full max-w-3xl px-6 pt-12 pb-24">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Your plan</h1>
        </main>
      </div>
    );
  }

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

  const awaitingSelection =
    reportStatus === "pending_selection" && !activationPlan;
  const planBuilding =
    reportStatus === "generating_plan" || (awaitingSelection && strandSubmitting);

  const strands = activationPlan?.portfolio_summary?.strands ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

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

      <div className="mx-auto w-full max-w-screen-xl px-6">
        <div className="flex gap-10">
          <AreaSidebar items={sidebarItems} />

          <main className="flex-1 min-w-0 mx-auto w-full max-w-3xl pt-8 pb-24">
            <h1 className="sr-only">Your plan</h1>

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

            {awaitingSelection && coreReport?.options && coreReport.options.length > 0 && (
              <section className="mb-8">
                <StrandSelector
                  options={coreReport.options}
                  recommended_selection={coreReport.recommended_selection ?? null}
                  onSubmit={handleStrandSubmit}
                  submitting={strandSubmitting}
                />
              </section>
            )}

            {planBuilding && !awaitingSelection && (
              <div className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-[hsl(var(--surface-panel))] px-5 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Building your plan… this usually takes a minute or two.</span>
              </div>
            )}

            {!awaitingSelection && (
              <section>
                <TodayCard
                  state={planState}
                  dayNumber={dayNumber}
                  weekNumber={weekNumber}
                  sessionId={sessionId}
                  onScrollToReport={() => {
                    /* Report is its own route; surface a CTA via sidebar. */
                  }}
                  onOpenCheckin={openCheckin}
                  onOpenActivation={() => setActivationOpen(true)}
                />
              </section>
            )}

            {planState !== "day0" && trackerDays.length > 0 && (
              <motion.section
                className="mt-10"
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

            {/* Strand summary row — compact list, expanded under ?view=strands. */}
            {strands.length > 0 && (
              <motion.section
                className="mt-10 rounded-lg border border-border/60 bg-[hsl(var(--surface-panel))]/85 p-5 backdrop-blur-md"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    {viewStrands ? "Your strands" : "Strands"}
                  </h2>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {strands.length} active
                  </span>
                </div>
                <ul className="space-y-3">
                  {strands.map((s) => (
                    <li key={s.strand_id} className="border-l-2 border-primary/40 pl-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{s.model_name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(s.time_weight * 100)}% time
                        </span>
                      </div>
                      {viewStrands && s.why_included && (
                        <p className="mt-1 text-[12px] text-muted-foreground">{s.why_included}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </main>
        </div>
      </div>

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