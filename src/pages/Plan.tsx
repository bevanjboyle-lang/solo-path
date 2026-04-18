import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import TodayCard, { type PlanState } from "@/components/plan/TodayCard";
import TrackerGrid from "@/components/plan/TrackerGrid";
import CheckInPanel from "@/components/plan/CheckInPanel";
import ReplanPromptCard from "@/components/plan/ReplanPromptCard";
import ReportSection from "@/components/ReportSection";
import LibraryCard from "@/components/plan/LibraryCard";
import RefineReportPanel from "@/components/plan/RefineReportPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMainContentSelfCheck } from "@/hooks/useMainContentSelfCheck";
import type { StrandData } from "@/components/StrandCard";

// Mock data for preview (Day 0 default)
const MOCK_NARRATIVE =
  "You're a senior product manager with 12 years in fintech. Your experience maps cleanly to three commercial paths, with two requiring minimal ramp-up. Here's what stands out.";

const MOCK_STRANDS: StrandData[] = [
  {
    title: "Fractional CPO for Series A fintechs",
    pitch: "Your product leadership experience is directly applicable to early-stage companies that need strategic product direction without a full-time hire.",
    primary_move_type: "leverage",
    structural_warmth: "Warm — direct network match",
  },
  {
    title: "Product strategy consultancy",
    pitch: "Package your methodology into a consultancy offering targeting mid-market fintechs navigating regulatory complexity.",
    primary_move_type: "anchor",
    structural_warmth: "Warm — sector credibility",
  },
  {
    title: "B2B SaaS for compliance workflows",
    pitch: "The compliance pain point you identified is underserved. A focused tool could capture a niche market.",
    primary_move_type: "moonshot",
    structural_warmth: "Cold — requires build phase",
  },
  {
    title: "Advisory board positions",
    pitch: "Your regulatory knowledge makes you valuable to boards. Low commitment, high signal, builds network for other moves.",
    primary_move_type: "growth",
    structural_warmth: "Warm — reputation-based",
  },
  {
    title: "Corporate training in product thinking",
    pitch: "Banks and insurers pay well for structured product training. Your background gives you instant credibility.",
    primary_move_type: "pivot",
    structural_warmth: "Neutral — requires outreach",
  },
];

const MOCK_GUIDANCE = [
  { title: "Positioning your expertise", description: "How to articulate what you do in one sentence that lands.", track: "Foundation" },
  { title: "First outreach templates", description: "Proven message structures for warm and cold contacts.", track: "Activation" },
  { title: "Pricing your time", description: "How to set rates that reflect your value without pricing yourself out.", track: "Commercial" },
];

interface PlanPageProps {
  initialSessionId?: string;
}

export default function Plan({ initialSessionId }: PlanPageProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [planState, setPlanState] = useState<PlanState>("loading");
  const [dayNumber, setDayNumber] = useState(0);
  const [weekNumber, setWeekNumber] = useState(1);
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(MOCK_NARRATIVE);
  const [strands, setStrands] = useState<StrandData[]>(MOCK_STRANDS);
  const [trackerDays, setTrackerDays] = useState<{ day: number; completed: boolean; isToday: boolean }[]>([]);
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [showSubscribeWall, setShowSubscribeWall] = useState(false);
  const [reportId, setReportId] = useState<string>("");
  const [refinementCount, setRefinementCount] = useState(0);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineLimitReached, setRefineLimitReached] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [replanPending, setReplanPending] = useState(false);
  const [replanContext, setReplanContext] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Route guard + plan fetch with explicit error handling.
  // Resolution rules:
  //   unauthed       → /auth (handled by ProtectedRoute, but defensive here too)
  //   no paid plan   → /teaser  (per route-map §9 gating)
  //   fetch error    → loadError = true (renders error Banner, never blanks)
  //   populated      → setHasPaid(true) and load tracker session
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?redirect=/plan", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("reports")
          .select("id, status, hook_insight, core_report, answers")
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
          navigate("/teaser", { replace: true });
          return;
        }

        setHasPaid(true);
        setReportId(data.id);
        setNarrative(data.hook_insight || MOCK_NARRATIVE);

        const coreReport = data.core_report as Record<string, unknown> | null;
        const rc = Number((coreReport?.refinement_count as number) ?? 0) || 0;
        setRefinementCount(rc);
        if (rc >= 3) setRefineLimitReached(true);
        const options = (coreReport?.options as Array<Record<string, unknown>>) || [];
        if (options.length > 0) {
          setStrands(
            options.map((opt) => ({
              title: (opt.model_name as string) || (opt.title as string) || "Untitled option",
              pitch: (opt.one_line_pitch as string) || (opt.one_liner as string) || (opt.pitch as string) || "",
              primary_move_type: (opt.primary_move_type as string) || null,
              structural_warmth: (opt.structural_warmth as string) || null,
            }))
          );
        }

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
  }, [user, authLoading, navigate]);

  const loadTrackerSession = useCallback(async (uid: string, rid: string) => {
    const { data: session } = await (supabase as any)
      .from("tracker_sessions")
      .select("id, current_day, activated_at, subscription_status, last_checkin_date, replan_pending, replan_context")
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

  const openCheckin = useCallback(() => {
    setCheckinOpen(true);
  }, []);

  const checkinReplanPendingRef = useRef(false);

  const handleCheckinSubmit = useCallback(async (response: string) => {
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

    // Don't show "Plan updated" framing when a replan is pending — the AI
    // output already states the plan hasn't been rebuilt yet.
    if (!replanPendingFromCheckin) {
      toast({ title: "Check-in saved." });
    }

    // If opened via deep-link, update URL
    if (initialSessionId) {
      window.history.replaceState(null, "", "/plan");
    }
  }, [sessionId, initialSessionId, toast]);

  const handleDayClick = useCallback((day: number) => {
    // Open read-only drawer for completed day
    setDayNumber(day);
    setCheckinOpen(true);
  }, []);

  const handleRefined = useCallback((updatedReport: unknown, newCount: number) => {
    const r = updatedReport as Record<string, unknown> | null;
    if (r) {
      const coreReport = (r.core_report as Record<string, unknown>) || null;
      if (typeof r.hook_insight === "string") setNarrative(r.hook_insight as string);
      const options = (coreReport?.options as Array<Record<string, unknown>>) || [];
      if (options.length > 0) {
        setStrands(
          options.map((opt) => ({
            title: (opt.model_name as string) || (opt.title as string) || "Untitled option",
            pitch: (opt.one_line_pitch as string) || (opt.one_liner as string) || (opt.pitch as string) || "",
            primary_move_type: (opt.primary_move_type as string) || null,
            structural_warmth: (opt.structural_warmth as string) || null,
          }))
        );
      }
    }
    setRefinementCount(newCount);
    if (newCount >= 3) setRefineLimitReached(true);
  }, []);

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

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      {/* Day 31+ subscribe wall banner */}
      {showSubscribeWall && (
        <Banner variant="info">
          Your 30-day plan is complete. Your report and check-in history stay here. Open a subscription to keep going.
        </Banner>
      )}

      <main className="mx-auto w-full max-w-3xl px-6 pt-8 pb-24">
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

        {/* §2 TodayCard — always first, always primary */}
        <TodayCard
          state={planState}
          dayNumber={dayNumber}
          weekNumber={weekNumber}
          sessionId={sessionId}
          onScrollToReport={scrollToReport}
          onOpenCheckin={openCheckin}
        />

        {/* §3 TrackerGrid */}
        {planState !== "day0" && trackerDays.length > 0 && (
          <motion.div
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
          </motion.div>
        )}

        {/* §4 Strand summary row */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-[0.08em]">
            Your options
          </h2>
          <div className="space-y-3">
            {strands.map((strand, i) => (
              <div key={i} className="rounded-lg border border-border bg-[hsl(var(--surface-panel))] px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{strand.title}</span>
                    <span className="hidden sm:inline">
                      {strand.primary_move_type && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {strand.primary_move_type}
                        </span>
                      )}
                    </span>
                  </div>
                  {strand.structural_warmth && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {strand.structural_warmth}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* §5 ReportSection */}
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

          <ReportSection
            narrative={narrative}
            strands={strands}
            locked={false}
            initialExpanded={planState === "day0"}
            mode="full"
          />
        </motion.div>

        {/* §6 Recent guidance teaser */}
        <motion.div
          className="mt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-[0.08em]">
            Guidance for you
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {MOCK_GUIDANCE.map((item, i) => (
              <LibraryCard
                key={i}
                title={item.title}
                description={item.description}
                track={item.track}
                onClick={() => navigateAuthed(navigate, "/library")}
              />
            ))}
          </div>
        </motion.div>
      </main>

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
    </div>
  );
}
