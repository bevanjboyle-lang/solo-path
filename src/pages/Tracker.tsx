import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, LogOut, CalendarCheck, ChevronDown, Circle, Lock, CreditCard, ClipboardList } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useTrackerSession } from "@/hooks/useTrackerSession";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import SoloLogo from "@/components/SoloLogo";
import TrackerProgress from "@/components/tracker/TrackerProgress";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CircularGauge from "@/components/ui/CircularGauge";

const momentumData = [
  { week: 'W1', completed: 3, total: 7 },
  { week: 'W2', completed: 5, total: 7 },
  { week: 'W3', completed: 6, total: 7 },
  { week: 'W4', completed: 4, total: 7 },
];

function AnimatedTaskIcon({ status }: { status: "done" | "pending" | "skipped" }) {
  if (status === "done") {
    return (
      <motion.svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
        <circle cx="12" cy="12" r="10" fill="#2ECDB0" />
        <motion.path
          d="M7 12.5L10.5 16L17 9"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </motion.svg>
    );
  }
  if (status === "skipped") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#A09A92" strokeWidth="1.5" opacity="0.5" />
        <path d="M9 9L15 15M15 9L9 15" stroke="#A09A92" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="none" stroke="#A09A92" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

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
  const phaseRanges = ["Days 1–7", "Days 8–16", "Days 17–25", "Days 26–30"];
  const phaseGradientNames = ["Foundation", "Build", "Launch", "Grow"];

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
          {/* Check if working_plan has the new phases-with-status format */}
          {session.working_plan?.phases && Array.isArray(session.working_plan.phases) && session.working_plan.phases[0]?.tasks?.[0]?.status ? (
            <TrackerProgress
              workingPlan={session.working_plan as any}
              currentDay={session.current_day}
              sessionId={session.id}
              lastCheckinDate={session.last_checkin_date}
            />
          ) : (
            <>
              {/* Header */}
              <ScrollReveal>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your Tracker</h1>
                  </div>
                </div>
              </ScrollReveal>

              {/* Day Progress Arc */}
              <ScrollReveal delay={0.1}>
                <GlassCard className="mt-8 flex flex-col items-center py-8">
                  <div style={{ filter: "drop-shadow(0 0 8px rgba(46,205,176,0.3))" }}>
                    <CircularGauge value={Math.round((session.current_day / 30) * 100)} size={180} strokeWidth={14} color="#2ECDB0" />
                  </div>
                  <div className="mt-[-100px] flex flex-col items-center z-10">
                    <span className="text-4xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
                      {session.current_day}
                    </span>
                    <span className="text-sm mt-1" style={{ color: "#5A5650" }}>of 30 days</span>
                  </div>
                  <div className="mt-14" />
                  <p className="text-xs text-muted-foreground">{completedCount} of {totalTasks} tasks completed · {progressPct}%</p>
                </GlassCard>
              </ScrollReveal>

              {/* Weekly Momentum Chart */}
              <ScrollReveal delay={0.2}>
                <GlassCard className="mt-6 p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
                    Your Momentum
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={momentumData}>
                      <defs>
                        <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2ECDB0" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#2ECDB0" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#5A5650" }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: "#FAF9F7", border: "1px solid #E5E2DC", borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number) => [`${value} tasks`, "Completed"]}
                      />
                      <Area type="monotone" dataKey="completed" stroke="#2ECDB0" strokeWidth={2} fill="url(#momentumFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>
              </ScrollReveal>

              {/* Check-in CTA */}
              <ScrollReveal delay={0.25}>
                <GlassCard className="mt-6 p-0 overflow-hidden">
                  <button
                    onClick={() => navigate(`/checkin/${session.id}`)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-[rgba(46,205,176,0.04)] transition-colors"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{
                        background: "linear-gradient(135deg, #2ECDB0, #25A896)",
                        animation: "checkin-pulse 2s ease-in-out infinite",
                      }}
                    >
                      <CalendarCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "#1D2025" }}>Check in for today</p>
                      <p className="text-xs" style={{ color: "#5A5650" }}>Log progress and get your next steps</p>
                    </div>
                  </button>
                </GlassCard>
              </ScrollReveal>

              {/* Strand Status Cards */}
              <StrandStatusCards phases={phases} completedTasks={completedTasks} session={session} navigate={navigate} />

              {/* Portfolio Review */}
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
                    <ScrollReveal key={pi} delay={0.1 * pi}>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <GlassCard className="metallic-border flex w-full items-center justify-between p-5 text-left hover:bg-[rgba(46,205,176,0.04)] transition-colors group cursor-pointer">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span
                                  className="text-sm font-medium"
                                  style={{
                                    background: "linear-gradient(135deg, #1D2025 0%, #2ECDB0 50%, #1D2025 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: 700,
                                  }}
                                >
                                  {phase.phase || phaseLabels[pi] || `Phase ${pi + 1}`}
                                </span>
                                <span className="text-xs" style={{ color: "#5A5650" }}>
                                  {phase.days || phaseRanges[pi] || ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <Progress value={phasePct} className="h-1.5 flex-1" />
                                <span className="text-xs font-medium text-muted-foreground w-8">{phasePct}%</span>
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground ml-4 transition-transform group-data-[state=open]:rotate-180" />
                          </GlassCard>
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
                                      <AnimatedTaskIcon status={isDone ? "done" : "pending"} />
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
                    </ScrollReveal>
                  );
                })}
              </div>

              {/* Day-30 Paywall */}
              {showPaywall && (
                <Day30PaywallSection
                  session={session}
                  selectedPlan={selectedPlan}
                  setSelectedPlan={setSelectedPlan}
                  subscribing={subscribing}
                  handleSubscribe={handleSubscribe}
                />
              )}
            </>
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
    <ScrollReveal delay={0.3}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <GlassCard className="border-2 border-primary/30 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                📋 Portfolio Review - Day {session.current_day}
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
        </GlassCard>
      </motion.div>
    </ScrollReveal>
  );
}

const STRAND_CARD_COLORS = [
  { dot: "bg-[hsl(168,70%,45%)]", bar: "bg-[hsl(168,70%,45%)]" },
  { dot: "bg-[hsl(38,90%,55%)]",  bar: "bg-[hsl(38,90%,55%)]" },
  { dot: "bg-[hsl(270,60%,60%)]", bar: "bg-[hsl(270,60%,60%)]" },
  { dot: "bg-[hsl(200,70%,50%)]", bar: "bg-[hsl(200,70%,50%)]" },
  { dot: "bg-[hsl(340,70%,55%)]", bar: "bg-[hsl(340,70%,55%)]" },
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
    <ScrollReveal delay={0.3}>
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((entry) => {
            const pct = entry.total > 0 ? Math.round((entry.done / entry.total) * 100) : 0;
            const c = STRAND_CARD_COLORS[entry.colorIdx % STRAND_CARD_COLORS.length];
            const badge = STATUS_BADGES[entry.status] || STATUS_BADGES.active;

            return (
              <GlassCard key={entry.name} className="p-4">
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
              </GlassCard>
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
    </ScrollReveal>
  );
}

function Day30PaywallSection({
  session,
  selectedPlan,
  setSelectedPlan,
  subscribing,
  handleSubscribe,
}: {
  session: any;
  selectedPlan: 'monthly' | 'annual';
  setSelectedPlan: (p: 'monthly' | 'annual') => void;
  subscribing: boolean;
  handleSubscribe: (plan: 'monthly' | 'annual') => void;
}) {
  const strandStatusArr: Array<{
    traction_score: number;
    signals_observed: string[];
  }> = Array.isArray(session?.working_plan?.strand_status) ? session.working_plan.strand_status : [];

  const hasTraction = strandStatusArr.some(
    (s) => (s.traction_score || 0) > 0 || (s.signals_observed || []).length > 0
  );

  const heading = hasTraction
    ? "You've made a start. Keep going."
    : "30 days is often not enough. That's normal.";

  const body = hasTraction
    ? "Your plan stays active when you continue. You also unlock the full Practical Guidance suite, 9 structured modules covering the practical steps of setting up independently, and Ask Solo, a direct advisory conversation built on everything you've done over the last 30 days."
    : "Getting to first income from a standing start takes longer than a month for most people. What usually gets in the way isn't lack of effort. It's a specific mindset or practical blocker that isn't obvious from the outside. Continuing gives you Ask Solo: a direct conversation, with full context of your profile and plan, to work out what's actually in the way. It's different from re-reading a plan.";

  return (
    <ScrollReveal delay={0.4}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <GlassCard className="p-8 text-center border-2 border-primary/30">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">{body}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${selectedPlan === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="text-sm font-medium">Monthly plan</div>
              <div className="text-2xl font-bold mt-1">£19<span className="text-sm font-normal text-muted-foreground">/month</span></div>
              <div className="text-xs text-muted-foreground mt-1">Cancel any time</div>
            </button>
            <button
              onClick={() => setSelectedPlan('annual')}
              className={`flex-1 rounded-lg border-2 p-4 text-left relative transition-all ${selectedPlan === 'annual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="absolute -top-2.5 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Save £79</div>
              <div className="text-sm font-medium">Full year of support</div>
              <div className="text-2xl font-bold mt-1">£149<span className="text-sm font-normal text-muted-foreground">/year</span></div>
              <div className="text-xs text-muted-foreground mt-1">£12.42/month</div>
            </button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={subscribing}
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--gradient-cta)", animation: "checkin-pulse 2s ease-in-out infinite" }}
            >
              {subscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  {selectedPlan === 'annual' ? 'Full year of support - £149' : 'Keep my plan active - £19/month'}
                </>
              )}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </ScrollReveal>
  );
}
