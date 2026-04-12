import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Loader2, CheckCircle, Briefcase, Target, CalendarCheck, Users, BarChart3, ShieldCheck, LogOut, Copy, Check, ChevronDown, ChevronUp, MessageSquare, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SoloLogo from "@/components/SoloLogo";

interface ReportData {
  core_report: any;
  activation_plan: any;
  market_snapshot: string;
  ai_impact_section: any;
  status: string;
}

const LOADING_MESSAGES = [
  "Building your personalised 30-day plan...",
  "Mapping strand-specific tasks...",
  "Designing your activation strategy...",
  "Drafting outreach messages...",
  "Analysing your local market...",
  "Scoring pricing benchmarks...",
  "Finalising your plan...",
];

export default function Results() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [paid, setPaid] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [searchParams] = useSearchParams();
  const [selectedRanks, setSelectedRanks] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [forceSelection, setForceSelection] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [recommendedLoaded, setRecommendedLoaded] = useState(false);
  const [selectionChanged, setSelectionChanged] = useState(false);

  const MIN_SELECTIONS = 2;
  const MAX_SELECTIONS = 5;

  const reportId = searchParams.get("report_id");
  const fromPayment = searchParams.get("from") === "payment";

  // Fetch report data
  useEffect(() => {
    if (!reportId) { setChecking(false); return; }
    supabase
      .from("reports")
      .select("core_report, activation_plan, market_snapshot, ai_impact_section, status")
      .eq("id", reportId)
      .single()
      .then(({ data }) => {
        if (data) {
          setReport(data as ReportData);
          // Pre-load recommended_selection
          const cr = (data as ReportData).core_report;
          if (cr?.recommended_selection && !recommendedLoaded) {
            const ranks = (cr.recommended_selection.ranks || []) as number[];
            if (ranks.length > 0) {
              setSelectedRanks(new Set(ranks));
              setRecommendedLoaded(true);
            }
          }
        }
      });
  }, [reportId]);

  const checkPayment = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("check-payment");
      return data?.paid === true;
    } catch { return false; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const maxAttempts = fromPayment ? 15 : 1;
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;
        const isPaid = await checkPayment();
        if (isPaid) { setPaid(true); setChecking(false); return; }
        if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) {
        setChecking(false);
        if (reportId) navigate(`/teaser?report_id=${reportId}`, { replace: true });
        else navigate("/", { replace: true });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [checkPayment, fromPayment]);

  // Cycle loading messages
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [generating]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRank = (rank: number) => {
    setSelectedRanks((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else if (next.size < MAX_SELECTIONS) {
        next.add(rank);
      }
      return next;
    });
    setSelectionChanged(true);
  };

  const handleGeneratePlan = async () => {
    setShowConfirm(false);
    setGenerating(true);
    setGenError(null);
    setLoadingMsgIdx(0);
    try {
      const ranks = Array.from(selectedRanks).sort((a, b) => a - b);
      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: { report_id: reportId, selected_ranks: ranks },
      });
      if (error) throw error;
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activation_plan: data.activation_plan,
          market_snapshot: data.market_snapshot,
          core_report: data.core_report || prev.core_report,
          status: "complete",
        };
      });
      setForceSelection(false);
    } catch (err: any) {
      console.error("Generate plan error:", err);
      setGenError(err.message || "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cr = report?.core_report;
  const ap = report?.activation_plan;
  const isPendingSelection = report?.status === "pending_selection" || forceSelection;
  const showPlanPhase = paid && cr && !isPendingSelection && ap;

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

      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your Solo Plan B Report</h1>

          {/* Free preview  - always visible */}
          <div className="mt-10 rounded-xl border border-border bg-card p-8 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free Preview</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {cr ? (
                <>
                  <p>
                    Based on your profile, you fit the{" "}
                    <span className="font-medium text-foreground">{cr.archetype?.primary}</span>{" "}
                    archetype.
                  </p>
                  <p>{cr.archetype?.summary}</p>
                  {!paid && (
                    <p>The full report explores specific paths tailored to your experience, with pricing guidance and a step-by-step activation plan.</p>
                  )}
                </>
              ) : (
                <p>
                  Based on your profile, you fit the{" "}
                  <span className="font-medium text-foreground">Strategic Advisor</span>{" "}
                  archetype  - a professional whose experience positions them well for high-value independent work.
                </p>
              )}
            </div>
          </div>

          {/* Generating plan loading state */}
          <AnimatePresence>
            {generating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8 rounded-xl border border-border bg-card p-12 text-center"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <motion.p
                  key={loadingMsgIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-sm text-foreground font-medium"
                >
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generation error */}
          {genError && !generating && (
            <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
              <p className="text-sm text-red-400">{genError}</p>
              <Button variant="outline" onClick={() => setGenError(null)}>Back to options</Button>
            </div>
          )}

          {/* PHASE 1: Model Selection */}
          {paid && cr && isPendingSelection && !generating && !genError && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle className="h-4 w-4" />
                Full report unlocked
              </div>

              {/* Archetype & Transferable Value */}
              <ReportSection title="Your Profile" icon={Briefcase}>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">What You Can Sell</p>
                    <p>{cr.transferable_value?.what_they_can_sell}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Why Buyers Would Pay</p>
                    <p>{cr.transferable_value?.why_buyers_would_pay}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Your Credibility Assets</p>
                    <ul className="list-disc list-inside space-y-1">
                      {cr.transferable_value?.credibility_assets?.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ReportSection>

              {/* Options Card Grid */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">We suggest starting with these options. Change anything you like.</h2>
                <p className="text-sm text-muted-foreground mb-2">You can select 2 to 5 options. The recommendation is based on your capability profile and income risk spread.</p>
                {cr.recommended_selection?.rationale && (
                  <p className="text-sm text-muted-foreground/80 mb-4 italic">{cr.recommended_selection.rationale}</p>
                )}

                {/* Top 5  - expanded */}
                <div className="space-y-4">
                  {(cr.options || [])
                    .slice()
                    .sort((a: any, b: any) => a.rank - b.rank)
                    .filter((opt: any) => opt.rank <= 5)
                    .map((opt: any) => (
                      <SelectionOptionCard
                        key={opt.rank}
                        option={opt}
                        selected={selectedRanks.has(opt.rank)}
                        onToggle={() => toggleRank(opt.rank)}
                        selectionFull={selectedRanks.size >= MAX_SELECTIONS}
                      />
                    ))}
                </div>

                {/* Remaining 6-10  - collapsed */}
                {(cr.options || []).some((o: any) => o.rank > 5) && (
                  <div className="mt-4">
                    {!showRemaining ? (
                      <button
                        onClick={() => setShowRemaining(true)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown className="h-4 w-4" />
                        Show remaining {(cr.options || []).filter((o: any) => o.rank > 5).length} options
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {(cr.options || [])
                          .slice()
                          .sort((a: any, b: any) => a.rank - b.rank)
                          .filter((opt: any) => opt.rank > 5)
                          .map((opt: any) => (
                            <CompactOptionCard
                              key={opt.rank}
                              option={opt}
                              selected={selectedRanks.has(opt.rank)}
                              onToggle={() => toggleRank(opt.rank)}
                              selectionFull={selectedRanks.size >= MAX_SELECTIONS}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Impact */}
              {report?.ai_impact_section && (
                <AIImpactSection data={report.ai_impact_section} />
              )}
            </div>
          )}

          {/* Fixed bottom selection bar  - rendered outside the scrollable content */}
          <AnimatePresence>
            {paid && isPendingSelection && !generating && !genError && selectedRanks.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/30 bg-card/95 backdrop-blur-lg px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
              >
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{selectedRanks.size}</span> option{selectedRanks.size !== 1 ? "s" : ""} selected
                      </p>
                      {selectedRanks.size < MIN_SELECTIONS && (
                        <p className="text-xs text-muted-foreground">Select at least {MIN_SELECTIONS} options</p>
                      )}
                    </div>
                    <Button
                      disabled={selectedRanks.size < MIN_SELECTIONS}
                      onClick={() => setShowConfirm(true)}
                      style={{ background: "#2ECDB0" }}
                      className="text-[#0D0D12] font-semibold border-0 hover:opacity-90"
                    >
                      Build my plan with these {selectedRanks.size} options →
                    </Button>
                  </div>
                  {selectedRanks.size >= MAX_SELECTIONS && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      You've reached the maximum of {MAX_SELECTIONS}. Deselect one to add a different option.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* PHASE 2: Plan Display */}
          {showPlanPhase && !generating && !genError && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Full report unlocked
                </div>
                {/* Change selection link  - only if tracker not started */}
                <button
                  onClick={() => setForceSelection(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Change selection
                </button>
              </div>

              {/* Selected model header */}
              {cr.selected_models && cr.selected_models.length > 1 ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                  <p className="font-medium text-foreground">Your Portfolio Plan</p>
                  <div className="flex flex-wrap gap-2">
                    {cr.selected_models.map((m: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold">
                          {m.rank}
                        </span>
                        {m.model_name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : cr.selected_model && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    #{cr.selected_rank || "✓"}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Your Plan: {cr.selected_model}</p>
                  </div>
                </div>
              )}

              {/* Profile */}
              <ReportSection title="Your Profile" icon={Briefcase}>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">What You Can Sell</p>
                    <p>{cr.transferable_value?.what_they_can_sell}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Why Buyers Would Pay</p>
                    <p>{cr.transferable_value?.why_buyers_would_pay}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Your Credibility Assets</p>
                    <ul className="list-disc list-inside space-y-1">
                      {cr.transferable_value?.credibility_assets?.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ReportSection>

              {/* Reality Check */}
              <ReportSection title="Reality Check" icon={ShieldCheck}>
                <div className="space-y-3">
                  {[
                    { label: "Most Likely Failure Mode", value: cr.reality_check?.most_likely_failure_mode },
                    { label: "Second Failure Mode", value: cr.reality_check?.second_failure_mode },
                    { label: "What You'll Find Hard", value: cr.reality_check?.what_they_will_find_hard },
                    { label: "Honest Income Outlook", value: cr.reality_check?.honest_income_outlook },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">{item.label}</p>
                      <p>{item.value}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>

              {/* First Steps */}
              {cr.first_steps && (
                <ReportSection title="Your First Steps" icon={Target}>
                  <ol className="list-decimal list-inside space-y-2">
                    {cr.first_steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </ReportSection>
              )}

              {/* First Move */}
              {ap?.first_move && (
                <ReportSection title="Your First Move" icon={Zap}>
                  <FirstMoveCard firstMove={ap.first_move} />
                </ReportSection>
              )}

              {/* 30-Day Activation Plan */}
              <ReportSection title="30-Day Activation Plan" icon={CalendarCheck}>
                {ap?.activation_plan && (
                  <ActivationPlanDisplay plan={ap.activation_plan} />
                )}
              </ReportSection>

              {/* Network Toolkit */}
              {ap?.network_toolkit && (
                <ReportSection title="Network Toolkit" icon={Users}>
                  <div className="space-y-4">
                    {ap.network_toolkit.intro && <p>{ap.network_toolkit.intro}</p>}
                    {ap.network_toolkit.templates?.map((t: any, i: number) => (
                      <CopyBox key={i} label={t.label || `Template ${i + 1}`} subject={t.subject} content={t.body} />
                    ))}
                    {/* Legacy format support */}
                    {ap.network_toolkit.reconnect_email && (
                      <CopyBox label="Reconnect Email" subject={ap.network_toolkit.reconnect_email.subject} content={ap.network_toolkit.reconnect_email.body} />
                    )}
                    {ap.network_toolkit.linkedin_dm && (
                      <CopyBox label="LinkedIn DM" content={ap.network_toolkit.linkedin_dm.body} />
                    )}
                    {ap.network_toolkit.referral_ask_email && (
                      <CopyBox label="Referral Ask Email" subject={ap.network_toolkit.referral_ask_email.subject} content={ap.network_toolkit.referral_ask_email.body} />
                    )}
                    {ap.network_toolkit.verbal_positioning && (
                      <CopyBox label="Verbal Positioning Script" content={ap.network_toolkit.verbal_positioning.script} />
                    )}
                  </div>
                </ReportSection>
              )}

              {/* Market Snapshot  - tabbed by strand if portfolio */}
              <MarketSnapshotSection report={report} ap={ap} />

              {/* AI Impact */}
              {report?.ai_impact_section && (
                <AIImpactSection data={report.ai_impact_section} />
              )}

              {/* Start 30-day plan CTA */}
              {ap?.activation_plan && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-xl border-2 border-primary/20 bg-card p-8 shadow-card text-center">
                  <CalendarCheck className="h-8 w-8 text-primary mx-auto mb-3" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold text-foreground">Ready to take action?</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    Turn your activation plan into daily tasks with check-ins, progress tracking, and adaptive replanning.
                  </p>
                  <button
                    onClick={() => navigate(`/activate?report_id=${reportId}`)}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                    style={{ background: "var(--gradient-cta)" }}
                  >
                    Start your 30-day plan →
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Paywall  - not paid */}
          {!paid && (
            <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Lock className="h-4 w-4" />
                Full Report
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/50 pt-8 text-center">
                <p className="text-lg font-semibold">Unlock your full report for £19.99</p>
                <p className="text-sm text-muted-foreground">One-time payment. No ongoing commitment.</p>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--gradient-cta)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get full report →"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Build your portfolio plan</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You're building a parallel pursuit plan across {selectedRanks.size} strands:</p>
                <ul className="space-y-1.5 text-left">
                  {cr && (cr.options || [])
                    .filter((o: any) => selectedRanks.has(o.rank))
                    .sort((a: any, b: any) => a.rank - b.rank)
                    .map((o: any) => (
                      <li key={o.rank} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {o.rank}
                        </span>
                        {o.model_name}
                      </li>
                    ))}
                </ul>
                {selectionChanged && (
                  <p className="text-xs text-muted-foreground/80">
                    Rebuilding your plan for your chosen options. Usually under 20 seconds.
                  </p>
                )}
                {!selectionChanged && (
                  <p className="text-xs text-muted-foreground/80">
                    Solo will create one integrated 30-day plan with strand-specific tasks for each path.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Back to options</Button>
            <Button
              onClick={handleGeneratePlan}
              style={{ background: "#2ECDB0" }}
              className="text-[#0D0D12] font-semibold border-0 hover:opacity-90"
            >
              Build my plan with these {selectedRanks.size} options
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

//  - - - Sub-components  - - - - - - - - - - - - - - - - - - - -

const diffColors: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400 border-green-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hard: "bg-red-500/10 text-red-400 border-red-500/20",
};

function SelectionOptionCard({ option, selected, onToggle, selectionFull }: { option: any; selected: boolean; onToggle: () => void; selectionFull: boolean }) {
  const isTop3 = option.rank <= 3;
  const dc = diffColors[option.difficulty_rating] || diffColors.moderate;
  const disabled = !selected && selectionFull;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => !disabled && onToggle()}
      className={`relative rounded-xl border bg-card shadow-card cursor-pointer transition-all ${
        selected ? "border-primary ring-1 ring-primary/30" : disabled ? "border-border opacity-50 cursor-not-allowed" : "border-border hover:border-primary/40"
      } ${isTop3 ? "p-6" : "p-4"}`}
    >
      {/* Checkbox top-right */}
      <div className={`absolute top-4 right-4 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
        selected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-transparent"
      }`}>
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>

      <div className="flex items-start gap-3 pr-8">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
          #{option.rank}
        </span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-foreground ${isTop3 ? "text-base" : "text-sm"}`}>
              {option.model_name}
            </h3>
            {option.rank === 1 && (
              <Badge className="text-[10px] px-2 py-0.5 border-0" style={{ background: "#2ECDB0", color: "#000" }}>
                Recommended
              </Badge>
            )}
            <Badge className={`text-[10px] px-2 py-0.5 border ${dc}`}>
              {option.difficulty_rating}
            </Badge>
          </div>

          {option.fit_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {option.fit_tags.map((tag: string, i: number) => (
                <span key={i} className="text-[10px] rounded-full border border-border bg-surface px-2 py-0.5 text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`mt-3 ${isTop3 ? "space-y-3" : "space-y-2"} text-sm text-muted-foreground`}>
        <p className={isTop3 ? "" : "line-clamp-2"}>{option.positioning}</p>

        <div className={`grid ${isTop3 ? "grid-cols-2" : "grid-cols-3"} gap-3 text-xs`}>
          <div>
            <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">Target Buyer</span>
            <p className="mt-0.5">{option.target_buyer}</p>
          </div>
          <div>
            <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">Pricing</span>
            <p className="mt-0.5">£{option.pricing?.range_low_gbp?.toLocaleString()}–£{option.pricing?.range_high_gbp?.toLocaleString()} per {option.pricing?.cadence}</p>
          </div>
          <div>
            <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">Time to Revenue</span>
            <p className="mt-0.5">{option.time_to_first_revenue}</p>
          </div>
        </div>

        {isTop3 && (
          <>
            <div className="text-xs">
              <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">What They Buy</span>
              <p className="mt-0.5">{option.what_they_are_buying}</p>
            </div>
            <p className="text-xs italic text-muted-foreground/80">{option.why_this_works_for_them}</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function CompactOptionCard({ option, selected, onToggle, selectionFull }: { option: any; selected: boolean; onToggle: () => void; selectionFull: boolean }) {
  const dc = diffColors[option.difficulty_rating] || diffColors.moderate;
  const disabled = !selected && selectionFull;

  return (
    <div
      onClick={() => !disabled && onToggle()}
      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
        selected ? "border-primary bg-primary/5" : disabled ? "border-border opacity-40 cursor-not-allowed" : "border-border hover:border-primary/30"
      }`}
    >
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
        selected ? "bg-primary border-primary" : "border-muted-foreground/30"
      }`}>
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
        {option.rank}
      </span>
      <span className="text-sm font-medium text-foreground flex-1">{option.model_name}</span>
      <Badge className={`text-[10px] px-2 py-0.5 border ${dc}`}>
        {option.difficulty_rating}
      </Badge>
      {option.fit_score != null && (
        <span className="text-xs text-muted-foreground">{option.fit_score}/10</span>
      )}
    </div>
  );
}

function ReportSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-xl border border-border bg-card p-8 shadow-card">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </motion.div>
  );
}

function OutreachDraftPanel({ draft }: { draft: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = draft.format === 'email' && draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="mt-2 ml-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
        <MessageSquare className="w-3 h-3" />
        {open ? 'Hide draft' : 'View draft message'}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-surface/50 p-3 space-y-2">
          {draft.format === 'email' && draft.subject && <p className="text-xs font-semibold text-foreground">Subject: {draft.subject}</p>}
          <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
              <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          {draft.tone_note && <p className="text-xs text-muted-foreground/70 italic">{draft.tone_note}</p>}
          {draft.personalisation_instructions && <p className="text-xs text-amber-500/80">{draft.personalisation_instructions}</p>}
        </div>
      )}
    </div>
  );
}

function OutreachTaskItem({ task, strandColorMap, greyStrands }: { task: any; strandColorMap?: Map<string, number>; greyStrands?: boolean }) {
  const strand = task.strand;
  return (
    <li className="space-y-1">
      <span className="flex items-center gap-1.5 flex-wrap">
        <span>{task.task}</span>
        {strand && strandColorMap?.has(strand) && (
          <StrandPill strand={strand} colorIdx={strandColorMap.get(strand)!} grey={greyStrands} />
        )}
      </span>
      {task.outreach_draft && <OutreachDraftPanel draft={task.outreach_draft} />}
    </li>
  );
}

function FirstMoveCard({ firstMove }: { firstMove: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!firstMove.outreach_draft) return;
    const d = firstMove.outreach_draft;
    const text = d.format === 'email' && d.subject ? `Subject: ${d.subject}\n\n${d.body}` : d.body;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Your First Move  - do this today</span>
      </div>
      <p className="text-sm text-foreground/90">{firstMove.action}</p>
      {firstMove.why_first && <p className="text-xs text-muted-foreground">{firstMove.why_first}</p>}
      {firstMove.outreach_draft && (
        <div className="space-y-2">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            <MessageSquare className="w-3 h-3" />{open ? 'Hide draft message' : 'View ready-to-send draft'}
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {open && (
            <div className="rounded-md border border-border bg-background p-3 space-y-2">
              {firstMove.outreach_draft.format === 'email' && firstMove.outreach_draft.subject && (
                <p className="text-xs font-semibold">Subject: {firstMove.outreach_draft.subject}</p>
              )}
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">{firstMove.outreach_draft.body}</pre>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
              {firstMove.outreach_draft.personalisation_instructions && (
                <p className="text-xs text-amber-500/80">{firstMove.outreach_draft.personalisation_instructions}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Strand color palette  - auto-assigned by index
const STRAND_COLORS = [
  { bg: "bg-[hsl(168,70%,45%)]/15", dot: "bg-[hsl(168,70%,45%)]", text: "text-[hsl(168,70%,45%)]" },   // mint
  { bg: "bg-[hsl(38,90%,55%)]/15",  dot: "bg-[hsl(38,90%,55%)]",  text: "text-[hsl(38,90%,55%)]" },    // amber
  { bg: "bg-[hsl(270,60%,60%)]/15", dot: "bg-[hsl(270,60%,60%)]", text: "text-[hsl(270,60%,60%)]" },   // violet
  { bg: "bg-[hsl(200,70%,50%)]/15", dot: "bg-[hsl(200,70%,50%)]", text: "text-[hsl(200,70%,50%)]" },   // blue
  { bg: "bg-[hsl(340,70%,55%)]/15", dot: "bg-[hsl(340,70%,55%)]", text: "text-[hsl(340,70%,55%)]" },   // rose
];

const STRAND_SINGLE = { bg: "bg-destructive/15", dot: "bg-destructive", text: "text-destructive" };

function StrandPill({ strand, colorIdx, grey }: { strand: string; colorIdx: number; grey?: boolean }) {
  const c = grey ? STRAND_SINGLE : STRAND_COLORS[colorIdx % STRAND_COLORS.length];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${c.bg} px-2 py-0.5 text-[10px] font-medium ${c.text}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {strand}
    </span>
  );
}

function ActivationPlanDisplay({ plan }: { plan: any }) {
  // Build strand color map from all tasks
  const strandColorMap = new Map<string, number>();
  let colorIdx = 0;
  plan.phases?.forEach((phase: any) => {
    phase.days_detail?.forEach((d: any) => {
      d.tasks?.forEach((t: any) => {
        const strand = typeof t === 'object' && t !== null ? t.strand : null;
        if (strand && !strandColorMap.has(strand)) {
          strandColorMap.set(strand, colorIdx++);
        }
      });
    });
  });

  const hasStrands = strandColorMap.size > 1;
  const isSingleStrand = strandColorMap.size === 1;

  return (
    <div className="space-y-4">
      <p>{plan.summary}</p>
      {hasStrands && (
        <div className="flex flex-wrap gap-2">
          {Array.from(strandColorMap.entries()).map(([strand, idx]) => (
            <StrandPill key={strand} strand={strand} colorIdx={idx} />
          ))}
        </div>
      )}
      {plan.pacing_note && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Pacing</p>
            <p className="text-xs">{plan.pacing_note}</p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Network</p>
            <p className="text-xs">{plan.network_note}</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {plan.phases?.map((phase: any, i: number) => (
          <PhaseSection key={i} phase={phase} strandColorMap={strandColorMap} greyStrands={isSingleStrand} />
        ))}
      </div>
      {plan.success_metric && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Success Metric</p>
          <p className="text-xs">{plan.success_metric}</p>
        </div>
      )}
    </div>
  );
}

function PhaseSection({ phase, strandColorMap, greyStrands }: { phase: any; strandColorMap: Map<string, number>; greyStrands?: boolean }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-surface p-4 text-left hover:bg-surface/80 transition-colors group">
        <div>
          <span className="text-sm font-medium text-foreground">{phase.phase}</span>
          <span className="ml-2 text-xs text-muted-foreground">({phase.days})</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-3">
        <p className="text-xs text-muted-foreground/70 mt-2 mb-3">{phase.goal}</p>
        <div className="space-y-2">
          {phase.days_detail?.map((d: any, i: number) => (
            <div key={i}>
              <p className="text-xs font-semibold text-foreground">{d.day}</p>
              <ul className="list-disc list-inside text-xs space-y-1 ml-1">
                {d.tasks?.map((t: any, j: number) => {
                  const taskText = typeof t === 'string' ? t : (t?.task || '');
                  const strand = typeof t === 'object' && t !== null ? t.strand : null;
                  const hasOutreach = typeof t === 'object' && t !== null && t.outreach_draft;
                  
                  return hasOutreach ? (
                    <OutreachTaskItem key={j} task={t} strandColorMap={strandColorMap} greyStrands={greyStrands} />
                  ) : (
                    <li key={j} className="flex items-center gap-1.5 flex-wrap">
                      <span>{taskText}</span>
                      {strand && strandColorMap.has(strand) && (
                        <StrandPill strand={strand} colorIdx={strandColorMap.get(strand)!} grey={greyStrands} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CopyBox({ label, subject, content }: { label: string; subject?: string; content?: string }) {
  const [copied, setCopied] = useState(false);
  const text = [subject && `Subject: ${subject}`, content].filter(Boolean).join("\n\n");
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
      {subject && <p className="text-xs font-medium text-foreground mb-1">Subject: {subject}</p>}
      <p className="text-xs whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function MarketSnapshotSection({ report, ap }: { report: ReportData | null; ap: any }) {
  const marketSnapshots = ap?.activation_plan?.market_snapshots;
  const strandIds = marketSnapshots ? Object.keys(marketSnapshots) : [];
  const hasStrandSnapshots = strandIds.length > 0;
  const [activeStrand, setActiveStrand] = useState(strandIds[0] || "");

  // Fallback to single market_snapshot
  if (!hasStrandSnapshots && report?.market_snapshot) {
    return (
      <ReportSection title="Market Snapshot" icon={BarChart3}>
        <MarketSnapshotRenderer text={report.market_snapshot} />
      </ReportSection>
    );
  }

  if (!hasStrandSnapshots) return null;

  return (
    <ReportSection title="Market Snapshot" icon={BarChart3}>
      <div className="space-y-4">
        {strandIds.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {strandIds.map((id) => (
              <button
                key={id}
                onClick={() => setActiveStrand(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeStrand === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        )}
        <MarketSnapshotRenderer text={marketSnapshots[activeStrand] || ""} />
      </div>
    </ReportSection>
  );
}

function MarketSnapshotRenderer({ text }: { text: string }) {
  if (!text) return null;
  const sections = text.split(/\n(?=[A-Z]{2,})/).filter(Boolean);
  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const lines = section.trim().split("\n");
        const heading = lines[0];
        const body = lines.slice(1).join("\n").trim();
        if (heading.includes("LOCAL MARKET FEASIBILITY SNAPSHOT")) {
          return (
            <div key={i} className="border-b border-border/50 pb-3 mb-2">
              {lines.map((line, j) => (
                <p key={j} className={j === 0 ? "font-medium text-foreground text-xs uppercase tracking-wider" : "text-xs text-muted-foreground/70"}>{line}</p>
              ))}
            </div>
          );
        }
        return (
          <div key={i}>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">{heading}</p>
            <p className="whitespace-pre-wrap">{body}</p>
          </div>
        );
      })}
    </div>
  );
}

function AIImpactSection({ data }: { data: any }) {
  const riskColors: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    "medium-high": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-green-500/10 text-green-400 border-green-500/20",
  };
  const RiskBadge = ({ risk }: { risk: string }) => (
    <Badge className={`text-[10px] px-2 py-0.5 border ${riskColors[risk] || riskColors.medium}`}>{risk} risk</Badge>
  );
  return (
    <ReportSection title="Your AI Risk & Adaptation Plan" icon={Zap}>
      <div className="space-y-6">
        {data.part_1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">AI Displacement Risk for Your Archetype</p>
              <RiskBadge risk={data.part_1.displacement_risk} />
            </div>
            {data.part_1.risk_horizon && <p className="text-[11px] text-muted-foreground/70">Risk horizon: {data.part_1.risk_horizon}</p>}
            <p className="whitespace-pre-wrap">{data.part_1.content}</p>
          </div>
        )}
        {data.part_2 && (
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">How Your Business Model Holds Up</p>
              <RiskBadge risk={data.part_2.displacement_risk} />
            </div>
            <p className="whitespace-pre-wrap">{data.part_2.content}</p>
          </div>
        )}
        {data.part_3?.steps && data.part_3.steps.length > 0 && (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Your {data.part_3.steps.length}-Step AI Adaptation Plan</p>
            <div className="space-y-2">
              {data.part_3.steps.map((step: any, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-4 flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{step.action}</p>
                      {step.priority && (
                        <Badge className={`text-[10px] px-1.5 py-0 border ${riskColors[step.priority] || "bg-primary/10 text-primary border-primary/20"}`}>{step.priority}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ReportSection>
  );
}
