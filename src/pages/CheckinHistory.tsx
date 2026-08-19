import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TopBar from "@/components/TopBar";
import EditorialLoading from "@/components/EditorialLoading";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import CheckinHistoryList, {
  type CheckinTimelineEntry,
} from "@/components/plan/CheckinHistoryList";
import CheckInPanel from "@/components/plan/CheckInPanel";

/*
 * CheckinHistory Pass 1 /checkin-history v1 (2026-05-18) fifth Phase 2 surface
 *
 * Editorial reskin of the read-only 30-day check-in log. Two-column shell
 * inheriting /plan + /report + /library + /account. AreaSidebar with the
 * five /plan items (Check-in history active), numerals 01-04 + ↻ on Refine
 * utility. Page-header in panel-ivory with mint-dot eyebrow + H1 + subhead
 * + right-side stats block (Completed / Missed / Ahead).
 *
 * Locked decisions from admin/pass-1-checkin-history-decisions.md:
 *   F1, Week separators inline in the timeline composite (rebuilt in v1).
 *   F2, Right-side stats block: 3 columns (or 2 when no missed days yet).
 *     Honest tabular counts, not gamification.
 *   F3, Move-tag column DROPPED for Pass 1 (data flow not yet wired).
 *   F4, Drawer prev/next deferred (CheckInPanel doesn't expose hooks;
 *     lands alongside the read-only data-loading fix in a follow-up).
 *
 * Cadence: zero dark. /checkin-history is the quietest surface in the
 * system, a calm read-only log of the user's own daily reflections.
 * System carries cadence load from /plan, /library, /report, /pricing.
 *
 * Pass 1 scope: shell + sidebar + page-header with stats + rebuilt
 * timeline composite + read-only drawer wrapper. CheckInPanel composite
 * preserved (its read-only mode is a pre-existing stub outside Pass 1).
 *
 * Preserves: data fetch (tracker_sessions + checkin_history), timeline
 * derivation logic, drawer state machinery, all handlers.
 */

interface CheckinRow {
  id: string;
  day_number: number;
  checkin_date: string | null;
  narrative_addition: string | null;
  exchanges: unknown;
}

function extractExcerpt(row: CheckinRow): string | null {
  if (row.narrative_addition && row.narrative_addition.trim().length > 0) {
    return row.narrative_addition.trim();
  }
  const ex = row.exchanges as Array<{ user?: string; response?: string }> | null;
  if (Array.isArray(ex) && ex.length > 0) {
    const first = ex[0];
    return (first?.user || first?.response || "") || null;
  }
  return null;
}

export default function CheckinHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  const [selectedEntry, setSelectedEntry] =
    useState<CheckinTimelineEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?redirect=/checkin/history", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: session, error: sErr } = await (supabase as any)
          .from("tracker_sessions")
          .select("id, current_day, activated_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (sErr) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        if (!session) {
          setLoading(false);
          return;
        }
        setSessionId(session.id);
        setCurrentDay(session.current_day || 0);
        const start = session.activated_at || session.created_at;
        if (start) setStartDate(new Date(start));

        const { data: rows } = await supabase
          .from("checkin_history")
          .select("id, day_number, checkin_date, narrative_addition, exchanges")
          .eq("tracker_session_id", session.id)
          .order("day_number", { ascending: true });
        if (cancelled) return;
        setCheckins((rows || []) as unknown as CheckinRow[]);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("CheckinHistory: load failed", err);
        setLoadError(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  /* ── Timeline derivation (unchanged) ── */
  const timeline: CheckinTimelineEntry[] = useMemo(() => {
    if (!startDate) return [];
    const byDay = new Map<number, CheckinRow>();
    for (const r of checkins) byDay.set(r.day_number, r);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entries: CheckinTimelineEntry[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const day = i + 1;
      const row = byDay.get(day);
      let status: CheckinTimelineEntry["status"];
      if (row) {
        status = "completed";
      } else if (day === currentDay) {
        status = "today";
      } else if (d.getTime() < today.getTime()) {
        status = "missed";
      } else {
        status = "future";
      }
      entries.push({
        day,
        date: d,
        status,
        excerpt: row ? extractExcerpt(row) : null,
        checkinId: row?.id,
      });
    }
    return entries;
  }, [startDate, checkins, currentDay]);

  /* ── Stats for page header right-column ──
   * Drift F fix (2026-05-18, journey-trace audit): "today" is no longer
   * counted as "ahead", it's its own category. Previously a Day-11 user
   * saw "20 AHEAD" when 19 days were genuinely ahead + 1 was today.
   * Today is now silent in the stats row (the TodayCard on /plan and the
   * timeline below already mark today as the active row). Counts sum to 30.
   */
  const completedCount = timeline.filter((t) => t.status === "completed").length;
  const missedCount = timeline.filter((t) => t.status === "missed").length;
  const aheadCount = timeline.filter((t) => t.status === "future").length;

  /* ── Sidebar config, mirror /plan ──
   * Drift E fix (2026-05-18, journey-trace audit): added "Your 30 days"
   * item to match /plan's sidebar exactly. Navigates to /plan which
   * auto-expands today's row in §03 (Hash deep-link /plan#day-N also
   * available for specific-day jumps). Renumbered subsequent items so the
   * sidebar numerals stay sequential.
   */
  const sidebarItems: SidebarItem[] = [
    { id: "today", label: "Today", numeral: "01", to: "/plan" },
    { id: "days", label: "Your 30 days", numeral: "02", to: "/plan#day-list" },
    { id: "strands", label: "Strands", numeral: "03", to: "/plan?view=strands" },
    { id: "history", label: "Check-in history", numeral: "04", to: "/checkin/history", isActive: true },
    { id: "report", label: "Report", numeral: "05", to: "/report" },
    { id: "sep", label: "", isDivider: true },
    { id: "refine", label: "Refine your report", isUtility: true, to: "/plan" },
  ];

  const sidebarHead: ReactNode = (
    <>
      <span className="inline-block w-1.5 h-1.5 bg-primary" />
      <span>Your plan</span>
    </>
  );

  const sidebarFooter: ReactNode = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Plan
      </div>
      <div className="mt-1 text-[12px] text-foreground">
        One-time · Day {currentDay || 1} of 30
      </div>
    </>
  );

  const handleOpenEntry = useCallback((entry: CheckinTimelineEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  }, []);

  const handleOpenToday = useCallback(() => {
    navigate("/plan");
  }, [navigate]);

  /* ── Error state ── */
  if (loadError) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main className="pt-6">
          <section className="py-16 px-6">
            <div className="mx-auto max-w-[600px] px-8 sm:px-12 py-10 text-center">
              <h1 className="title-h1">
                Couldn't load your history.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Try refreshing the page. If the problem persists, contact support.
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ── Loading state ── */
  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main className="pt-6">
          <div className="min-h-[60vh] px-6 pt-8">
            <EditorialLoading
              label="Check-in history"
              line="Fetching the record. Every day you showed up is in here."
            />
          </div>
        </main>
      </div>
    );
  }

  /* ── No tracker session, paid user whose tracker hasn't initialised ── */
  if (timeline.length === 0) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main>
          <section className="pt-6 pb-8 lg:pb-12">
            <div className="mx-auto max-w-screen-xl px-6">
              <div className="flex gap-8 lg:gap-10">
                <AreaSidebar items={sidebarItems} head={sidebarHead} footer={sidebarFooter} />
                <div className="flex-1 min-w-0">
                  <div className="py-4">
                    <h1 className="title-h1">
                      Your tracker hasn't started yet.
                    </h1>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Visit Today to begin your 30-day plan. Once you start, every day appears here.
                    </p>
                    <button
                      onClick={() => navigate("/plan")}
                      className="cta-block mt-6"
                    >
                      Open Today
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ── Default render ── */
  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main>
        <section className="pt-6 pb-8 lg:pb-12">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="flex gap-8 lg:gap-10">
              <AreaSidebar
                items={sidebarItems}
                head={sidebarHead}
                footer={sidebarFooter}
              />

              <div className="flex-1 min-w-0">
                <h1 className="sr-only">Check-in history</h1>

                {/* ── Page-header panel ── */}
                <section className="pb-8 mb-6 border-b border-border">
                  <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <span className="inline-block w-1.5 h-1.5 bg-primary" />
                    <span className="text-foreground">Your plan</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">Check-in history</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
                    <div className="lg:col-span-8">
                      <div aria-hidden className="title-h1">
                        Check-in history.
                      </div>
                      <p className="mt-3 font-display text-[15px] sm:text-[16px] text-muted-foreground leading-[1.4] max-w-[54ch]">
                        {completedCount === 0
                          ? "No check-ins yet, your first one is today. The rest of your 30 days will fill in here as you go."
                          : "Every day of your 30-day plan. Read past check-ins, see today's, watch the days ahead."}
                      </p>
                    </div>

                    <div className="lg:col-span-4 lg:text-right">
                      {/* Drift F fix (2026-05-18): added "Today" stat between
                        * Missed and Ahead so the four counts sum to 30
                        * (previously today was folded into Ahead, making 1+9+20=30
                        * but reading misleadingly as "20 days ahead" when only 19
                        * actually are). Today is silent on Day 0. */}
                      <div className="flex gap-6 lg:justify-end">
                        <Stat value={completedCount} label="Completed" />
                        {(missedCount > 0 || completedCount > 0) && (
                          <Stat value={missedCount} label="Missed" />
                        )}
                        {currentDay > 0 && currentDay <= 30 && (
                          <Stat value={1} label="Today" />
                        )}
                        <Stat value={aheadCount} label="Ahead" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Timeline ── */}
                <CheckinHistoryList
                  entries={timeline}
                  onOpenEntry={handleOpenEntry}
                  onOpenToday={handleOpenToday}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Read-only drawer (CheckInPanel composite preserved) ──
       * Note: CheckInPanel's readOnly mode currently renders a stub
       * placeholder. Proper read-only data loading + the prev/next nav
       * (F4) deferred to a follow-up. */}
      <CheckInPanel
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sessionId={sessionId}
        dayNumber={selectedEntry?.day}
        readOnly
      />
    </div>
  );
}

/* ── Stat, tabular count + small-caps label, no gamification ── */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div
        className="font-display font-bold text-[22px] sm:text-[24px] tabular-nums text-[#15735F] leading-none"
        style={{ letterSpacing: "-0.02em" }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
