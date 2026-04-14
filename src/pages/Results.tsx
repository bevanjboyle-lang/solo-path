import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Loader2, CheckCircle, Briefcase, Target, CalendarCheck, Users, BarChart3, ShieldCheck, LogOut, Copy, Check, ChevronDown, ChevronUp, MessageSquare, Zap, RefreshCw, Download, Send, Mail, MessageCircle, Mic } from "lucide-react";
import ShimmerSkeleton from "@/components/ui/ShimmerSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SoloLogo from "@/components/SoloLogo";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CircularGauge from "@/components/ui/CircularGauge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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

const PORTFOLIO_LOADING_MESSAGES = [
  "Building your portfolio plan...",
  "Designing shared foundations for your first week...",
  "Creating strand-specific outreach for each path...",
  "Analysing your local market for each option...",
  "Building your integrated 30-day plan...",
  "Almost there...",
];

const incomeProjectionData = [
  { name: "Consulting", month3: 2500, month6: 5500, month12: 8500 },
  { name: "Fractional CFO", month3: 4000, month6: 7500, month12: 12000 },
  { name: "Online Course", month3: 500, month6: 3000, month12: 9000 },
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return false;

      const urlParams = new URLSearchParams(window.location.search);
      const stripeSessionId = urlParams.get('session_id') || localStorage.getItem('stripe_session_id') || '';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stripeSessionId ? { session_id: stripeSessionId } : {}),
        }
      );

      const result = await response.json();
      return result.paid === true || result.is_complete === true;
    } catch (err) {
      console.error('check-payment error:', err);
      return false;
    }
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

  const handleDownloadPdf = async () => {
    if (!reportId) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ report_id: reportId }),
        }
      );
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `Solo-Plan-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      setPdfError("PDF generation failed. Please try again.");
    } finally {
      setPdfLoading(false);
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
      <div className="min-h-screen">
        <nav className="border-b border-border/50/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
            <SoloLogo width={100} height={28} />
          </div>
        </nav>
        <div className="mx-auto max-w-3xl px-6 py-16 space-y-8">
          <ShimmerSkeleton width="60%" height={32} />
          <ShimmerSkeleton width="80%" height={16} />
          {/* Gauge skeleton */}
          <GlassCard className="flex items-center gap-6 p-6">
            <ShimmerSkeleton width={140} height={140} borderRadius="50%" />
            <div className="space-y-2 flex-1">
              <ShimmerSkeleton width="50%" height={18} />
              <ShimmerSkeleton width="90%" height={14} />
              <ShimmerSkeleton width="70%" height={14} />
            </div>
          </GlassCard>
          {/* Chart skeleton */}
          <GlassCard className="p-6">
            <ShimmerSkeleton width={160} height={16} className="mb-4" />
            <ShimmerSkeleton width="100%" height={200} borderRadius={8} />
          </GlassCard>
          {/* Text block skeletons */}
          <GlassCard className="p-6 space-y-3">
            <ShimmerSkeleton width="40%" height={16} />
            <ShimmerSkeleton width="100%" height={12} />
            <ShimmerSkeleton width="85%" height={12} />
            <ShimmerSkeleton width="60%" height={12} />
          </GlassCard>
        </div>
      </div>
    );
  }

  const cr = report?.core_report;
  const ap = report?.activation_plan;
  const isPendingSelection = report?.status === "pending_selection" || forceSelection;
  const showPlanPhase = paid && cr && !isPendingSelection && ap;

  return (
    <div className="min-h-screen text-foreground">
      <nav className="border-b border-border/50/80 backdrop-blur-xl">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your Solo Plan B Report</h1>
            {report && paid && (
              <div className="flex flex-col items-start sm:items-end gap-1">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="w-full sm:w-auto text-white"
                  style={{ backgroundColor: pdfLoading ? undefined : "#2ECDB0" }}
                >
                  {pdfLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download as PDF
                    </>
                  )}
                </Button>
                {pdfError && (
                  <p className="text-xs text-destructive">{pdfError}</p>
                )}
              </div>
            )}
          </div>

          {/* Free preview - always visible */}
          <ScrollReveal>
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

                    {/* Transferability CircularGauge */}
                    {cr.archetype?.transferability_score != null && (
                      <div className="flex items-center gap-4 pt-2">
                        <div style={{ filter: "drop-shadow(0 0 8px rgba(46,205,176,0.3))" }}>
                          <CircularGauge value={cr.archetype.transferability_score} size={140} strokeWidth={10} color="#2ECDB0" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Transferability Score</p>
                          <p className="text-sm text-foreground mt-1">How portable your skills are across industries and roles.</p>
                        </div>
                      </div>
                    )}

                    {!paid && (
                      <p>The full report explores specific paths tailored to your experience, with pricing guidance and a step-by-step activation plan.</p>
                    )}
                  </>
                ) : (
                  <p>
                    Based on your profile, you fit the{" "}
                    <span className="font-medium text-foreground">Strategic Advisor</span>{" "}
                    archetype - a professional whose experience positions them well for high-value independent work.
                  </p>
                )}
              </div>
            </div>
          </ScrollReveal>

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
                  {(selectedRanks.size > 1 ? PORTFOLIO_LOADING_MESSAGES : LOADING_MESSAGES)[loadingMsgIdx % (selectedRanks.size > 1 ? PORTFOLIO_LOADING_MESSAGES.length : LOADING_MESSAGES.length)]}
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
              <ScrollReveal>
                <ReportSection title="Your Profile" icon={Briefcase}>
                  <div className="space-y-4">
                    {/* Transferability gauge row */}
                    {cr.archetype?.transferability_score != null && (
                      <div className="flex items-center gap-6 py-2">
                        <div style={{ filter: "drop-shadow(0 0 8px rgba(46,205,176,0.3))" }}>
                          <CircularGauge value={cr.archetype.transferability_score} size={140} strokeWidth={10} color="#2ECDB0" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Transferability Score</p>
                          <p className="text-sm">How portable your skills are across industries and roles.</p>
                        </div>
                      </div>
                    )}
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
              </ScrollReveal>

              {/* Options Card Grid */}
              <ScrollReveal delay={0.1}>
                <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Select your options</h2>
                  <p className="text-sm text-muted-foreground mb-2">Choose 2–3 options to build a portfolio plan — or pick 1 if you have a clear preference. We recommend 3.</p>
                  {cr.recommended_selection?.rationale && (
                    <p className="text-sm text-muted-foreground/80 mb-4 italic">{cr.recommended_selection.rationale}</p>
                  )}

                  {/* Top 5 - expanded */}
                  <GlassCard className="p-4 space-y-4">
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
                  </GlassCard>

                  {/* Remaining 6-10 - collapsed */}
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
              </ScrollReveal>

              {/* AI Impact */}
              {report?.ai_impact_section && (
                <ScrollReveal delay={0.15}>
                  <AIImpactSection data={report.ai_impact_section} />
                </ScrollReveal>
              )}
            </div>
          )}

          {/* Fixed bottom selection bar */}
          <AnimatePresence>
            {paid && isPendingSelection && !generating && !genError && selectedRanks.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4"
                style={{ background: "#1a1a2e", borderTop: "1px solid rgba(46,205,176,0.3)" }}
              >
                <div className="mx-auto max-w-3xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-white">
                        <span className="font-semibold">{selectedRanks.size}</span>
                        {selectedRanks.size === 1
                          ? " option selected"
                          : selectedRanks.size >= MAX_SELECTIONS
                          ? ` strands selected (maximum)`
                          : " strands selected — building a portfolio"}
                      </p>
                      {selectedRanks.size < MIN_SELECTIONS && (
                        <p className="text-xs text-white/50">Select at least {MIN_SELECTIONS} options</p>
                      )}
                      {selectedRanks.size >= MAX_SELECTIONS && (
                        <p className="text-xs text-white/50 mt-0.5">Deselect one to add a different option.</p>
                      )}
                    </div>
                    <Button
                      disabled={selectedRanks.size < MIN_SELECTIONS}
                      onClick={() => setShowConfirm(true)}
                      style={{ background: "#2ECDB0" }}
                      className="text-[#0D0D12] font-semibold border-0 hover:opacity-90 w-full sm:w-auto"
                    >
                      {selectedRanks.size <= 1 ? "Build my plan →" : "Build my portfolio plan →"}
                    </Button>
                  </div>
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
                <button
                  onClick={() => setForceSelection(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Change selection
                </button>
              </div>

              {/* Selected model header */}
              <ScrollReveal>
              {cr.selected_models && cr.selected_models.length > 1 ? (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-card">
                    <p className="font-medium text-foreground">Your Portfolio Plan</p>
                    <div className="flex flex-wrap gap-2">
                      {cr.selected_models.map((m: any, i: number) => {
                        const hex = STRAND_HEX[i % STRAND_HEX.length];
                        const alloc = m.allocation_pct;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                            style={{ background: `${hex}15`, color: hex }}
                          >
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: hex }} />
                            {m.model_name}{alloc ? ` — ${alloc}%` : ""}
                          </span>
                        );
                      })}
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
              </ScrollReveal>

              {/* Profile */}
              <ScrollReveal delay={0.05}>
                <ReportSection title="Your Profile" icon={Briefcase}>
                  <div className="space-y-4">
                    {cr.archetype?.transferability_score != null && (
                      <div className="flex items-center gap-6 py-2">
                        <div style={{ filter: "drop-shadow(0 0 8px rgba(46,205,176,0.3))" }}>
                          <CircularGauge value={cr.archetype.transferability_score} size={140} strokeWidth={10} color="#2ECDB0" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Transferability Score</p>
                          <p className="text-sm">How portable your skills are across industries and roles.</p>
                        </div>
                      </div>
                    )}
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
              </ScrollReveal>

              {/* Reality Check */}
              <ScrollReveal delay={0.08}>
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
              </ScrollReveal>

              {/* Income Projection Chart */}
              <ScrollReveal delay={0.1}>
                <GlassCard className="p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Income Projection by Path</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={incomeProjectionData} barGap={2} barCategoryGap="20%">
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#7A7670" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#7A7670" }}
                        tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#FAF9F7",
                          border: "1px solid #E5E2DC",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`£${value.toLocaleString()}`, ""]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, color: "#7A7670" }}
                      />
                      <Bar dataKey="month3" name="3 months" fill="#2ECDB0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="month6" name="6 months" fill="#25A896" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="month12" name="12 months" fill="#1D8477" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              </ScrollReveal>

              {/* First Steps */}
              {cr.first_steps && (
                <ScrollReveal delay={0.1}>
                  <ReportSection title="Your First Steps" icon={Target}>
                    <ol className="list-decimal list-inside space-y-2">
                      {cr.first_steps.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </ReportSection>
                </ScrollReveal>
              )}

              {/* First Move(s) — supports single or per-strand array */}
              {(ap?.first_moves?.length > 0 || ap?.first_move) && (
                <ScrollReveal delay={0.1}>
                  <ReportSection title={ap?.first_moves?.length > 1 ? "Your First Moves" : "Your First Move"} icon={Zap}>
                    {ap?.first_moves?.length > 0 ? (
                      <div className="space-y-4">
                        {ap.first_moves.map((fm: any, i: number) => (
                          <div key={i}>
                            {fm.strand_name && (
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                                {fm.strand_name}
                              </p>
                            )}
                            <FirstMoveCard firstMove={fm} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <FirstMoveCard firstMove={ap.first_move} />
                    )}
                  </ReportSection>
                </ScrollReveal>
              )}

              {/* 30-Day Activation Plan with Timeline */}
              <ScrollReveal delay={0.1}>
                <ReportSection title="30-Day Activation Plan" icon={CalendarCheck}>
                  {/* Horizontal timeline visual */}
                  <div className="mb-6">
                    <div className="relative flex items-center">
                      {/* Connecting line */}
                      <div className="absolute top-5 left-6 right-6 h-0.5 bg-primary/20" />
                      {[
                        { label: "Foundation", week: "Week 1", opacity: 1.0 },
                        { label: "Build", week: "Week 2", opacity: 0.8 },
                        { label: "Launch", week: "Week 3", opacity: 0.6 },
                        { label: "Grow", week: "Week 4", opacity: 0.4 },
                      ].map((phase, i) => (
                        <div key={i} className="relative z-10 flex flex-1 flex-col items-center">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground"
                            style={{ backgroundColor: `rgba(46,205,176,${phase.opacity})` }}
                          >
                            {i + 1}
                          </div>
                          <span className="mt-2 text-[10px] font-semibold text-foreground">{phase.label}</span>
                          <span className="text-[9px] text-muted-foreground">{phase.week}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {ap?.activation_plan && (
                    <ActivationPlanDisplay plan={ap.activation_plan} />
                  )}
                </ReportSection>
              </ScrollReveal>

              {/* Network Toolkit */}
              {ap?.network_toolkit && (
                <ScrollReveal delay={0.1}>
                  <ReportSection title="Network Toolkit" icon={Users}>
                    <div className="space-y-4">
                      {ap.network_toolkit.intro && <p>{ap.network_toolkit.intro}</p>}
                      {ap.network_toolkit.templates?.map((t: any, i: number) => (
                        <ScrollReveal key={i} delay={i * 0.08}>
                          <CopyBox label={t.label || `Template ${i + 1}`} subject={t.subject} content={t.body} />
                        </ScrollReveal>
                      ))}
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
                </ScrollReveal>
              )}

              {/* Market Snapshot */}
              <ScrollReveal delay={0.1}>
                <MarketSnapshotSection report={report} ap={ap} />
              </ScrollReveal>

              {/* Traction Signals (portfolio only) */}
              {ap?.activation_plan?.plan_type === "portfolio" && ap?.activation_plan?.traction_signals && (
                <ScrollReveal delay={0.1}>
                  <TractionSignalsSection
                    tractionSignals={ap.activation_plan.traction_signals}
                    strandColorMap={buildStrandColorMap(ap.activation_plan)}
                  />
                </ScrollReveal>
              )}

              {/* AI Impact */}
              {report?.ai_impact_section && (
                <ScrollReveal delay={0.1}>
                  <AIImpactSection data={report.ai_impact_section} />
                </ScrollReveal>
              )}

              {/* Start 30-day plan CTA */}
              {ap?.activation_plan && (
                <ScrollReveal delay={0.1}>
                  <div className="rounded-xl border-2 border-primary/20 bg-card p-8 shadow-card text-center">
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
                  </div>
                </ScrollReveal>
              )}

              {/* Refine Report */}
              {reportId && (
                <ScrollReveal delay={0.1}>
                  <RefineReportSection
                    reportId={reportId}
                    refinementCount={cr?.refinement_count || 0}
                    onReportUpdated={(updatedReport, newCount) => {
                      setReport((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          core_report: updatedReport.core_report ?? prev.core_report,
                          activation_plan: updatedReport.activation_plan ?? prev.activation_plan,
                          market_snapshot: updatedReport.market_snapshot ?? prev.market_snapshot,
                          ai_impact_section: updatedReport.ai_impact_section ?? prev.ai_impact_section,
                          status: updatedReport.status ?? prev.status,
                        };
                      });
                    }}
                  />
                </ScrollReveal>
              )}
            </div>
          )}

          {/* Paywall - not paid */}
          {!paid && (
            <ScrollReveal>
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
            </ScrollReveal>
          )}
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRanks.size <= 1 ? "Build your plan" : "Build your portfolio plan"}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {selectedRanks.size <= 1 ? (
                  <p>Solo will generate your personalised 30-day activation plan.</p>
                ) : (
                  <>
                    <ol className="space-y-1.5 text-left list-none p-0 m-0">
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
                    </ol>
                    <p className="text-xs text-muted-foreground/80">
                      Solo will create one integrated 30-day plan with strand-specific tasks, market snapshots for each path, and traction signals to track your progress.
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Back to options</Button>
            <Button
              onClick={handleGeneratePlan}
              style={{ background: "#2ECDB0" }}
              className="text-[#0D0D12] font-semibold border-0 hover:opacity-90"
            >
              {selectedRanks.size <= 1 ? "Build my plan" : "Build portfolio plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// - - Sub-components - - - - - - - - - -

const diffColors: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400 border-green-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hard: "bg-red-500/10 text-red-400 border-red-500/20",
};

const moveTypeStyles: Record<string, { bg: string; label: string }> = {
  leverage: { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Leverage" },
  moonshot: { bg: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Moonshot" },
  anchor: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Anchor" },
  growth: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Growth" },
  pivot: { bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "Pivot" },
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
      className={`relative rounded-xl border bg-card shadow-card cursor-pointer transition-all duration-200 ${
        selected
          ? "border-primary/30 ring-0"
          : disabled
          ? "border-border opacity-50 cursor-not-allowed"
          : "border-border hover:border-primary/40 hover:bg-[rgba(46,205,176,0.05)]"
      } ${isTop3 ? "p-6" : "p-4"}`}
      style={selected ? { borderLeft: "4px solid #2ECDB0", background: "rgba(46, 205, 176, 0.05)" } : undefined}
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
            {option.move_type && moveTypeStyles[option.move_type] && (
              <Badge className={`text-[10px] px-2 py-0.5 border ${moveTypeStyles[option.move_type].bg}`}>
                {moveTypeStyles[option.move_type].label}
              </Badge>
            )}
          </div>
          {(option.difficulty_score != null || option.speed_score != null) && (
            <div className="flex gap-4 mt-3">
              {option.difficulty_score != null && (
                <div className="flex flex-col items-center">
                  <CircularGauge value={option.difficulty_score * 10} size={80} strokeWidth={6} color="#2ECDB0" />
                  <span className="text-[9px] text-muted-foreground mt-1">Difficulty</span>
                </div>
              )}
              {option.speed_score != null && (
                <div className="flex flex-col items-center">
                  <CircularGauge value={option.speed_score * 10} size={80} strokeWidth={6} color="#2ECDB0" />
                  <span className="text-[9px] text-muted-foreground mt-1">Speed</span>
                </div>
              )}
              {option.fit_score != null && (
                <div className="flex flex-col items-center">
                  <CircularGauge value={option.fit_score * 10} size={80} strokeWidth={6} color="#2ECDB0" />
                  <span className="text-[9px] text-muted-foreground mt-1">Fit</span>
                </div>
              )}
            </div>
          )}

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
        selected ? "border-primary/30" : disabled ? "border-border opacity-40 cursor-not-allowed" : "border-border hover:border-primary/30 hover:bg-[rgba(46,205,176,0.05)]"
      }`}
      style={selected ? { borderLeft: "4px solid #2ECDB0", background: "rgba(46, 205, 176, 0.05)" } : undefined}
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
      {option.move_type && moveTypeStyles[option.move_type] && (
        <Badge className={`text-[10px] px-2 py-0.5 border ${moveTypeStyles[option.move_type].bg}`}>
          {moveTypeStyles[option.move_type].label}
        </Badge>
      )}
      {option.fit_score != null && (
        <span className="text-xs text-muted-foreground">{option.fit_score}/10</span>
      )}
    </div>
  );
}

function ReportSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-card">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
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
        <div
          className="mt-2 rounded-lg border border-border p-3 space-y-2"
          style={{
            borderLeft: "3px solid #2ECDB0",
            background: "hsl(var(--surface-card))",
            backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.03) 28px)",
          }}
        >
          {draft.format === 'email' && draft.subject && <p className="text-xs font-semibold text-foreground">Subject: {draft.subject}</p>}
          <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
              <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          {draft.personalisation_instructions && (
            <p className="text-xs text-amber-500/80">{draft.personalisation_instructions}</p>
          )}
        </div>
      )}
    </div>
  );
}

function OutreachTaskItem({ task, strandColorMap, greyStrands }: { task: any; strandColorMap: Map<string, number>; greyStrands?: boolean }) {
  const taskText = task?.task || '';
  const strand = task?.strand;
  return (
    <li className="flex items-center gap-1.5 flex-wrap">
      <span>{taskText}</span>
      {strand && strandColorMap.has(strand) && (
        <StrandPill strand={strand} colorIdx={strandColorMap.get(strand)!} grey={greyStrands} />
      )}
      {task.outreach_draft && <OutreachDraftPanel draft={task.outreach_draft} />}
    </li>
  );
}

function DrafterModal({ firstMove, open, onOpenChange }: { firstMove: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [relationship, setRelationship] = useState("");
  const [format, setFormat] = useState<string>("cold_email");
  const [sharedContext, setSharedContext] = useState("");
  const [notes, setNotes] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDraft = async () => {
    setDrafting(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("draft-outreach", {
        body: {
          user_context: {
            first_name: "",
            archetype: firstMove?.strand_name || "",
            recommended_model: firstMove?.strand_name || "",
            q6_achievement: "",
            tracker_day: 0,
          },
          contact: {
            name: contactName || "[Name]",
            role: contactRole,
            company: contactCompany,
            relationship,
            any_shared_context: sharedContext || undefined,
          },
          request: {
            format,
            purpose: relationship === "new_contact" ? "cold_outreach" : "reconnect",
            any_specific_notes: notes || undefined,
          },
        },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || "Draft failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setDrafting(false);
    }
  };

  const handleCopy = () => {
    if (!result?.draft) return;
    const d = result.draft;
    const text = d.format === "email" && d.subject ? `Subject: ${d.subject}\n\n${d.body}` : d.body;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const formatIcon = { email: Mail, linkedin_dm: MessageCircle, verbal: Mic }[result?.draft?.format || format] || Mail;
  const FormatIcon = formatIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Draft outreach message
          </DialogTitle>
          <DialogDescription>
            {firstMove?.strand_name ? `For: ${firstMove.strand_name}` : "Generate a personalised outreach draft"}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contact name</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Head of Strategy" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Company</label>
                <input value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} placeholder="Acme Ltd" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Relationship</label>
                <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select…</option>
                  <option value="former_colleague">Former colleague</option>
                  <option value="current_contact">Current contact</option>
                  <option value="new_contact">New contact</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="cold_email">Cold email</option>
                <option value="warm_email">Warm email</option>
                <option value="linkedin_dm">LinkedIn DM</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Shared context <span className="text-muted-foreground/50">(optional)</span></label>
              <input value={sharedContext} onChange={(e) => setSharedContext(e.target.value)} placeholder="e.g. Met at a conference last year" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Any specific notes <span className="text-muted-foreground/50">(optional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context..." rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleDraft} disabled={drafting} style={{ background: "#2ECDB0" }} className="text-[#0D0D12] font-semibold border-0 hover:opacity-90">
                {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate draft"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Per-type output display */}
            <div className="flex items-center gap-2 mb-2">
              <FormatIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {result.draft.format === "email" ? "Email" : result.draft.format === "linkedin_dm" ? "LinkedIn DM" : "Verbal Script"}
              </span>
              <span className="text-[10px] text-muted-foreground/60 ml-auto">{result.draft.word_count} words</span>
            </div>

            <div
              className="rounded-lg border border-border p-4 space-y-2"
              style={{
                borderLeft: `3px solid ${result.draft.format === "email" ? "#2ECDB0" : result.draft.format === "linkedin_dm" ? "#6366F1" : "#F59E0B"}`,
                background: "hsl(var(--surface-card))",
                backgroundImage: result.draft.format === "verbal" ? "none" : "repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.03) 28px)",
              }}
            >
              {/* Email: subject + body */}
              {result.draft.format === "email" && result.draft.subject && (
                <p className="text-xs font-semibold text-foreground">Subject: {result.draft.subject}</p>
              )}

              {/* Verbal: larger, quote-style */}
              {result.draft.format === "verbal" ? (
                <blockquote className="text-sm text-foreground/90 italic border-l-2 border-amber-500/30 pl-3">
                  {result.draft.body}
                </blockquote>
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">{result.draft.body}</pre>
              )}
            </div>

            {result.tone_note && (
              <p className="text-xs text-muted-foreground"><span className="font-medium">Tone:</span> {result.tone_note}</p>
            )}
            {result.personalisation_instructions && (
              <p className="text-xs text-amber-500/80">⚠ {result.personalisation_instructions}</p>
            )}
            {result.alternative_approach && (
              <p className="text-xs text-muted-foreground/70 italic">💡 {result.alternative_approach}</p>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setResult(null)}>
                ← New draft
              </Button>
              <Button onClick={handleCopy} variant="outline" className="gap-1.5">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FirstMoveCard({ firstMove }: { firstMove: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drafterOpen, setDrafterOpen] = useState(false);
  const handleCopy = () => {
    if (!firstMove.outreach_draft) return;
    const d = firstMove.outreach_draft;
    const text = d.format === 'email' && d.subject ? `Subject: ${d.subject}\n\n${d.body}` : d.body;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const moveType = firstMove.move_type as string | undefined;
  const mt = moveType ? moveTypeStyles[moveType] : undefined;

  const accentMap: Record<string, { border: string; bg: string; text: string }> = {
    leverage: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-400" },
    moonshot: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-400" },
    anchor: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-400" },
    growth: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-400" },
    pivot: { border: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-400" },
  };
  const accent = moveType ? accentMap[moveType] : undefined;
  const borderCls = accent?.border ?? "border-primary/30";
  const bgCls = accent?.bg ?? "bg-primary/5";
  const iconCls = accent?.text ?? "text-primary";

  return (
    <div className={`rounded-lg border ${borderCls} ${bgCls} p-4 space-y-3`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Zap className={`w-4 h-4 ${iconCls}`} />
        <span className="text-sm font-semibold text-foreground">Your First Move — do this today</span>
        {mt && (
          <Badge className={`text-[10px] px-2 py-0.5 border ${mt.bg}`}>
            {mt.label}
          </Badge>
        )}
      </div>
      <p className="text-sm text-foreground/90">{firstMove.action}</p>
      {firstMove.why_first && <p className="text-xs text-muted-foreground">{firstMove.why_first}</p>}

      {/* Draft outreach button */}
      <button
        onClick={() => setDrafterOpen(true)}
        className={`flex items-center gap-1.5 text-xs font-medium ${iconCls} hover:opacity-80 transition-colors`}
      >
        <Send className="w-3 h-3" />
        Draft outreach message
      </button>

      {firstMove.outreach_draft && (
        <div className="space-y-2">
          <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 text-xs font-medium ${iconCls} hover:opacity-80 transition-colors`}>
            <MessageSquare className="w-3 h-3" />{open ? 'Hide draft message' : 'View ready-to-send draft'}
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {open && (
            <div
              className="rounded-md border border-border p-3 space-y-2"
              style={{
                borderLeft: "3px solid #2ECDB0",
                background: "hsl(var(--surface-card))",
                backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.03) 28px)",
              }}
            >
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

      <DrafterModal firstMove={firstMove} open={drafterOpen} onOpenChange={setDrafterOpen} />
    </div>
  );
}

// Strand color palette — hex values for inline styles
const STRAND_HEX = ["#2ECDB0", "#6366F1", "#F59E0B", "#EF4444", "#8B5CF6"];

const STRAND_COLORS = [
  { bg: "bg-[#2ECDB0]/15", dot: "bg-[#2ECDB0]", text: "text-[#2ECDB0]" },
  { bg: "bg-[#6366F1]/15", dot: "bg-[#6366F1]", text: "text-[#6366F1]" },
  { bg: "bg-[#F59E0B]/15", dot: "bg-[#F59E0B]", text: "text-[#F59E0B]" },
  { bg: "bg-[#EF4444]/15", dot: "bg-[#EF4444]", text: "text-[#EF4444]" },
  { bg: "bg-[#8B5CF6]/15", dot: "bg-[#8B5CF6]", text: "text-[#8B5CF6]" },
];

const STRAND_SINGLE = { bg: "bg-destructive/15", dot: "bg-destructive", text: "text-destructive" };

function StrandPill({ strand, colorIdx, grey }: { strand: string; colorIdx: number; grey?: boolean }) {
  const c = grey ? STRAND_SINGLE : STRAND_COLORS[colorIdx % STRAND_COLORS.length];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${c.bg} px-2 py-0.5 text-[10px] font-medium ${c.text}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
      <span className="hidden sm:inline">{strand}</span>
    </span>
  );
}

function buildStrandColorMap(plan: any): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  plan.phases?.forEach((phase: any) => {
    phase.days_detail?.forEach((d: any) => {
      d.tasks?.forEach((t: any) => {
        const strand = typeof t === 'object' && t !== null ? t.strand : null;
        if (strand && !map.has(strand)) map.set(strand, idx++);
      });
    });
  });
  return map;
}

function ActivationPlanDisplay({ plan }: { plan: any }) {
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

  const isPortfolio = plan.plan_type === "portfolio";
  const hasStrands = strandColorMap.size > 1;
  const isSingleStrand = strandColorMap.size === 1 && !isPortfolio;

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
          <PhaseSection key={i} phase={phase} strandColorMap={strandColorMap} greyStrands={isSingleStrand} isPortfolio={isPortfolio} />
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

function PhaseSection({ phase, strandColorMap, greyStrands, isPortfolio }: { phase: any; strandColorMap: Map<string, number>; greyStrands?: boolean; isPortfolio?: boolean }) {
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
          {phase.days_detail?.map((d: any, i: number) => {
            const dayNum = parseDayNumber(d.day);
            const isReviewDay = isPortfolio && (dayNum === 19 || dayNum === 26);
            return (
              <div key={i}>
                <p className="text-xs font-semibold text-foreground">{d.day}</p>
                {isReviewDay && (
                  <div className="rounded-lg border border-primary/20 p-3 my-2" style={{ background: "rgba(46,205,176,0.08)" }}>
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-primary" />
                      Portfolio Review — assess strand progress and adjust focus
                    </p>
                  </div>
                )}
                <ul className="list-disc list-inside text-xs space-y-1 ml-1">
                  {d.tasks?.map((t: any, j: number) => {
                    const taskText = typeof t === 'string' ? t : (t?.task || '');
                    const strandId = typeof t === 'object' && t !== null ? t.strand_id : null;
                    const strand = typeof t === 'object' && t !== null ? t.strand : null;
                    const hasOutreach = typeof t === 'object' && t !== null && t.outreach_draft;

                    // For portfolio plans, show strand_id-based pills
                    const pillStrand = strand;
                    const isShared = isPortfolio && (!strandId || strandId === "shared");

                    return hasOutreach ? (
                      <OutreachTaskItem key={j} task={t} strandColorMap={strandColorMap} greyStrands={greyStrands} />
                    ) : (
                      <li key={j} className="flex items-center gap-1.5 flex-wrap">
                        <span>{taskText}</span>
                        {isPortfolio && isShared && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            Shared
                          </span>
                        )}
                        {pillStrand && strandColorMap.has(pillStrand) && !isShared && (
                          <StrandPill strand={pillStrand} colorIdx={strandColorMap.get(pillStrand)!} grey={greyStrands} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function parseDayNumber(dayStr: string): number {
  const match = dayStr?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

const TRACTION_WEIGHT_COLORS: Record<string, string> = {
  negative: "bg-red-500/10 text-red-500 border-red-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
  moderate: "bg-muted text-muted-foreground border-border",
  strong: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  very_strong: "bg-[#2ECDB0]/10 text-[#2ECDB0] border-[#2ECDB0]/20",
};

function TractionSignalsSection({ tractionSignals, strandColorMap }: { tractionSignals: any; strandColorMap: Map<string, number> }) {
  if (!tractionSignals || typeof tractionSignals !== 'object') return null;
  const strandIds = Object.keys(tractionSignals);
  if (strandIds.length === 0) return null;

  return (
    <ReportSection title="Traction Signals" icon={Target}>
      <div className="space-y-2">
        {strandIds.map((strandId) => {
          const signals = tractionSignals[strandId];
          const colorIdx = strandColorMap.get(strandId) ?? 0;
          const hex = STRAND_HEX[colorIdx % STRAND_HEX.length];
          return (
            <Collapsible key={strandId}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-surface p-3 text-left hover:bg-surface/80 transition-colors group">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: hex }} />
                  {strandId}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <ul className="space-y-2 mt-2">
                  {(Array.isArray(signals) ? signals : []).map((sig: any, i: number) => {
                    const wc = TRACTION_WEIGHT_COLORS[sig.weight] || TRACTION_WEIGHT_COLORS.neutral;
                    return (
                      <li key={i} className="flex items-start justify-between gap-2 text-xs">
                        <span className="text-foreground/90">{sig.signal}</span>
                        <Badge className={`text-[9px] px-1.5 py-0 border shrink-0 ${wc}`}>{sig.weight?.replace("_", " ")}</Badge>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ReportSection>
  );
}

function CopyBox({ label, subject, content }: { label: string; subject?: string; content?: string }) {
  const [copied, setCopied] = useState(false);
  const text = [subject && `Subject: ${subject}`, content].filter(Boolean).join("\n\n");
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div
      className="rounded-lg border border-border p-4"
      style={{
        borderLeft: "3px solid #2ECDB0",
        background: "hsl(var(--surface-card))",
        backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.03) 28px)",
      }}
    >
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
            {strandIds.map((id, i) => {
              const hex = STRAND_HEX[i % STRAND_HEX.length];
              const isActive = activeStrand === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveStrand(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                  style={isActive ? { background: hex } : undefined}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: isActive ? "#fff" : hex }} />
                  {id}
                </button>
              );
            })}
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

function RefineReportSection({
  reportId,
  refinementCount: initialCount,
  onReportUpdated,
}: {
  reportId: string;
  refinementCount: number;
  onReportUpdated: (updatedReport: any, newCount: number) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);
  const [showSuccess, setShowSuccess] = useState(false);
  const remaining = Math.max(0, 3 - count);
  const exhausted = remaining <= 0;

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  const handleRefine = async () => {
    if (!feedback.trim() || exhausted) return;
    setRefining(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("refine-report", {
        body: { report_id: reportId, feedback_text: feedback.trim() },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Refinement failed");
      const newCount = data.refinement_count ?? count + 1;
      setCount(newCount);
      setFeedback("");
      onReportUpdated(data.report, newCount);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setRefining(false);
    }
  };

  return (
    <GlassCard className="mx-auto max-w-[600px] p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <RefreshCw className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Refine your report</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {exhausted
          ? "You've used all 3 refinements for this report."
          : "Something doesn't feel right? Tell us and we'll adjust the analysis. Up to 3 refinements included."}
      </p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={refining || exhausted}
        placeholder="e.g., I think Option 2 is more realistic than Option 1 because..."
        rows={3}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">{remaining} of 3 refinement{remaining !== 1 ? "s" : ""} remaining</p>
        <Button
          onClick={handleRefine}
          disabled={refining || exhausted || !feedback.trim()}
          style={{ background: "#2ECDB0" }}
          className="text-white font-semibold border-0 hover:opacity-90 disabled:opacity-40 min-w-[90px]"
        >
          {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refine"}
        </Button>
      </div>
      <AnimatePresence>
        {showSuccess && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-primary font-medium"
          >
            ✓ Report updated.
          </motion.p>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
