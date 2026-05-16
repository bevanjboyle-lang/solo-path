import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import CheckinHistoryList, {
  type CheckinTimelineEntry,
} from "@/components/plan/CheckinHistoryList";
import CheckInPanel from "@/components/plan/CheckInPanel";

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

  const completedCount = checkins.length;

  const sidebarItems: SidebarItem[] = [
    { id: "today", label: "Today", to: "/plan" },
    { id: "strands", label: "Strands", to: "/plan?view=strands" },
    { id: "history", label: "Check-in history", to: "/checkin/history", isActive: true },
    { id: "report", label: "Report", to: "/report" },
    { id: "refine", label: "Refine your report", to: "/plan" },
  ];

  const handleOpenEntry = useCallback((entry: CheckinTimelineEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  }, []);

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <Banner variant="error">
          We couldn't load your check-in history. Try refreshing.
        </Banner>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading your check-ins…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="mx-auto w-full max-w-screen-xl px-6">
        <div className="flex gap-10">
          <AreaSidebar items={sidebarItems} />
          <main className="flex-1 min-w-0 mx-auto w-full max-w-3xl pt-8 pb-24">
            <header className="mb-6">
              <h1
                className="font-display text-3xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                Check-in history
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {completedCount} check-in{completedCount === 1 ? "" : "s"} · Days 1–30
              </p>
            </header>

            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your plan isn't active yet. Once you activate, your daily check-ins will appear here.
              </p>
            ) : (
              <CheckinHistoryList entries={timeline} onOpenEntry={handleOpenEntry} />
            )}
          </main>
        </div>
      </div>

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