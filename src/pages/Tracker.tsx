import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, LogOut, CalendarCheck, ChevronDown, CheckCircle2, Circle, Lock, CreditCard, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrackerSession } from "@/hooks/useTrackerSession";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import SoloLogo from "@/components/SoloLogo";
import TrackerProgress from "@/components/tracker/TrackerProgress";

export default function Tracker() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  const {
    session,
    loading,
    completedTasks,
    toggleTask,
    subscribe,
    refresh,
    phases,
    totalTasks,
    completedCount,
    progressPct,
    showPaywall,
  } = useTrackerSession();

  // Handle return from Stripe
  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      refresh();
    }
  }, [searchParams]);

  const handleSubscribe = async (plan: 'monthly' | 'annual' = selectedPlan) => {
    setSubscribing(true);
    try {
      const url = await subscribe(plan);
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Subscription error:", err);
    }
    setSubscribing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    navigate("/", { replace: true });
    return null;
  }

  const phaseLabels = ["Foundations", "Network Activation", "Outreach", "Consolidation"];
  const phaseRanges = ["Days 1â7", "Days 8â16", "Days 17â25", "Days 26â30"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <SoloLogo width={100} height={28} />
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your Tracker</h1>
              <p className="mt-1 text-sm text-muted-foreground">Day {session.current_day} of 30</p>
            </div>
            <button
              onClick={() => navigate(`/checkin/${session.id}`)}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
              style={{ background: "var(--gradient-cta)" }}
            >
              <CalendarCheck className="h-4 w-4" />
              Check in for today
            </button>
          </div>

          {/* Overall progress */}
          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm font-semibold text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{completedCount} of {totalTasks} tasks completed</p>
          </div>

          {/* Strand Status Cards — per-strand progress for portfolio plans */}
          <StrandStatusCards phases={phases} completedTasks={completedTasks} session={session} navigate={navigate} />

          {/* Portfolio Review — mid-plan check-in for multi-strand plans */}
          <PortfolioReviewCard session={session} navigate={navigate} />

          {/* Phase cards */}
          <div className="mt-6 space-y-4">
            {phases.map((phase: any, pi: number) => {
              let phaseTotalTasks = 0;
              let phaseCompleted = 0;
              phase.days_detail?.forEach((day: any, di: number) => {
                day.tasks?.forEach((_: any, ti: number) => {
                  phaseTotalTasks++;
                  if (completedTasks.has(`${pi}-${di}-${ti}`)) phaseCompleted++;
                });
              });
              const phasePct = phaseTotalTasks > 0 ? Math.round((phaseCompleted / phaseTotalTasks) * 100) : 0;

              return (
                <Collapsible key={pi}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-5 text-left hover:bg-card/80 transition-colors group shadow-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {phase.phase || phaseLabels[pi] || `Phase ${pi + 1}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {phase.days || phaseRanges[pi] || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Progress value={phasePct} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground w-8">{phasePct}%</span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 pl-2">
                    {phase.days_detail?.map((day: any, di: number) => (
                      <div key={di} className="rounded-lg border border-border/50 bg-surface p-4">
                        <p className="text-xs font-semibold text-foreground mb-2">{day.day}</p>
                        <div className="space-y-2">
                          {day.tasks?.map((task: any, ti: number) => {
                            const key = `${pi}-${di}-${ti}`;
                            const isDone = completedTasks.has(key);
                            return (
                              <button
                                key={ti}
                                onClick={() => toggleTask(pi, di, ti)}
                                className="flex w-full items-start gap-3 text-left group"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 mt-0.5 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground" />
                                )}
                                <span className={`text-sm leading-snug ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                  {typeof task === "string" ? task : task.task || task.description || JSON.stringify(task)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {/* Day-30 Paywall */}
          {showPaywall && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-xl border-2 border-primary/30 bg-card p-8 shadow-elevated text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                Your 30 days are up â keep the momentum going
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
                Continue with guided check-ins, an adaptive plan, and the full Practical Guidance suite.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${selectedPlan === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="text-sm font-medium">Monthly</div>
                  <div className="text-2xl font-bold mt-1">£19<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Cancel any time</div>
                </button>
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`flex-1 rounded-lg border-2 p-4 text-left relative transition-all ${selectedPlan === 'annual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="absolute -top-2.5 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Save £79</div>
                  <div className="text-sm font-medium">Annual</div>
                  <div className="text-2xl font-bold mt-1">£149<span className="text-sm font-normal text-muted-foreground">/year</span></div>
                  <div className="text-xs text-muted-foreground mt-1">£12.42/month</div>
                </button>
              </div>
              <div className="mt-4 flex flex-col items-center gap-3">
                <button
                  onClick={() => handleSubscribe(selectedPlan)}
                  disabled={subscribing}
                  className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--gradient-cta)" }}
                >
                  {subscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Continue — {selectedPlan === 'annual' ? '£149/year' : '£19/month'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {}}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View your plan summary
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Extract unique strand names from the working plan
function getStrandsFromPlan(workingPlan: any): string[] {
  const strands = new Set<string>();
  const phases = workingPlan?.activation_plan?.phases || workingPlan?.phases || [];
  phases.forEach((phase: any) => {
    phase.days_detail?.forEach((d: any) => {
      d.tasks?.forEach((t: any) => {
        if (typeof t === 'object' && t !== null && t.strand) {
          strands.add(t.strand);
        }
      });
    });
  });
  return Array.from(strands);
}

function PortfolioReviewCard({ session, navigate }: { session: any; navigate: (path: string) => void }) {
  const strands = getStrandsFromPlan(session.working_plan);
  const isPortfolio = strands.length > 1;
  const showReview = isPortfolio && (session.current_day === 19 || session.current_day === 26);

  if (!showReview) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-xl border-2 border-primary/30 bg-card p-6 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            📋 Portfolio Review — Day {session.current_day}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This is your mid-plan check-in. You'll review which strands are showing signal and decide where to focus your final stretch.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strands.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                {s}
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate(`/checkin/${session.id}?review=portfolio`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            style={{ background: "var(--gradient-cta)" }}
          >
            Start portfolio review →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const STRAND_CARD_COLORS = [
  { dot: "bg-[hsl(168,70%,45%)]", bar: "bg-[hsl(168,70%,45%)]" },   // mint
  { dot: "bg-[hsl(38,90%,55%)]",  bar: "bg-[hsl(38,90%,55%)]" },    // amber
  { dot: "bg-[hsl(270,60%,60%)]", bar: "bg-[hsl(270,60%,60%)]" },   // violet
  { dot: "bg-[hsl(200,70%,50%)]", bar: "bg-[hsl(200,70%,50%)]" },   // blue
  { dot: "bg-[hsl(340,70%,55%)]", bar: "bg-[hsl(340,70%,55%)]" },   // rose
];

type StrandStatus = "active" | "watching" | "paused" | "graduated";

const STATUS_BADGES: Record<StrandStatus, { label: string; className: string }> = {
  active:    { label: "ACTIVE",       className: "bg-[hsl(168,70%,45%)]/15 text-[hsl(168,70%,45%)] border-[hsl(168,70%,45%)]/20" },
  watching:  { label: "WATCHING",     className: "bg-muted text-muted-foreground border-border" },
  paused:    { label: "PAUSED",       className: "bg-muted/50 text-muted-foreground/60 border-border/50" },
  graduated: { label: "GRADUATED ★",  className: "bg-[hsl(142,70%,40%)]/15 text-[hsl(142,70%,40%)] border-[hsl(142,70%,40%)]/20 font-bold" },
};

function SignalDots({ score }: { score: number }) {
  const filled = Math.round(Math.max(0, Math.min(10, score)) / 2);
  return (
    <div className="flex items-center gap-1" title={`Signal: ${score}/10`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
            i < filled ? "bg-primary" : "bg-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

function StrandStatusCards({ phases, completedTasks, session, navigate }: { phases: any[]; completedTasks: Set<string>; session: any; navigate: (path: string) => void }) {
  // Read strand_status array from working_plan
  const strandStatusArr: Array<{
    model_name: string;
    status: StrandStatus;
    traction_score: number;
    signals_observed: string[];
    tasks_completed: number;
    tasks_total: number;
  }> = Array.isArray(session?.working_plan?.strand_status) ? session.working_plan.strand_status : [];

  const hasStrandData = strandStatusArr.length >= 2;

  if (!hasStrandData) {
    // Fallback: count unique strands from tasks
    const strandNames = new Set<string>();
    phases.forEach((phase: any) => {
      phase.days_detail?.forEach((d: any) => {
        d.tasks?.forEach((t: any) => {
          if (typeof t === 'object' && t !== null && t.strand) strandNames.add(t.strand);
        });
      });
    });
    if (strandNames.size < 2) return null;
  }

  const isReviewDay = session?.current_day === 19 || session?.current_day === 26;

  // Build entries from strand_status data if available, otherwise from tasks
  let entries: Array<{
    name: string; status: StrandStatus; traction_score: number;
    signals_count: number; done: number; total: number; colorIdx: number;
  }>;

  if (hasStrandData) {
    entries = strandStatusArr.map((s, i) => ({
      name: s.model_name,
      status: s.status || "active",
      traction_score: s.traction_score || 0,
      signals_count: (s.signals_observed || []).length,
      done: s.tasks_completed || 0,
      total: s.tasks_total || 0,
      colorIdx: i,
    }));
  } else {
    const strandStats = new Map<string, { total: number; done: number; colorIdx: number }>();
    let ci = 0;
    phases.forEach((phase: any, pi: number) => {
      phase.days_detail?.forEach((d: any, di: number) => {
        d.tasks?.forEach((t: any, ti: number) => {
          const strand = typeof t === 'object' && t !== null ? t.strand : null;
          if (!strand) return;
          if (!strandStats.has(strand)) strandStats.set(strand, { total: 0, done: 0, colorIdx: ci++ });
          const ss = strandStats.get(strand)!;
          ss.total++;
          if (completedTasks.has(`${pi}-${di}-${ti}`)) ss.done++;
        });
      });
    });
    entries = Array.from(strandStats.entries()).map(([name, s]) => ({
      name, status: "active" as StrandStatus, traction_score: 0,
      signals_count: 0, done: s.done, total: s.total, colorIdx: s.colorIdx,
    }));
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map((entry) => {
          const pct = entry.total > 0 ? Math.round((entry.done / entry.total) * 100) : 0;
          const c = STRAND_CARD_COLORS[entry.colorIdx % STRAND_CARD_COLORS.length];
          const badge = STATUS_BADGES[entry.status] || STATUS_BADGES.active;

          return (
            <div key={entry.name} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                  <span className="text-sm font-medium text-foreground truncate">{entry.name}</span>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-8 text-right">{pct}%</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Tasks: {entry.done}/{entry.total} complete</p>
                <div className="flex items-center gap-2">
                  {entry.signals_count > 0 && (
                    <span className="text-[10px] text-muted-foreground/70">{entry.signals_count} signal{entry.signals_count !== 1 ? "s" : ""}</span>
                  )}
                  {entry.traction_score > 0 && <SignalDots score={entry.traction_score} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isReviewDay && (
        <button
          onClick={() => navigate(`/checkin/${session.id}?review=portfolio`)}
          className="w-full rounded-xl border-2 border-primary/30 bg-card p-4 shadow-card text-left hover:bg-card/80 transition-colors flex items-center gap-3"
        >
          <span className="text-lg">🗓</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Portfolio Review Today</p>
            <p className="text-xs text-muted-foreground">Review which strands are showing signal and decide where to focus</p>
          </div>
          <span className="text-xs text-primary font-medium">Start →</span>
        </button>
      )}
    </div>
  );
}
