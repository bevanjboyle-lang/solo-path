import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle, Briefcase, Target, CalendarCheck, Users, BarChart3, ShieldCheck, LogOut, Copy, Check, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const lockedSections = [
  { label: "Your Profile & Transferable Value", icon: Briefcase },
  { label: "Your Three Options", icon: Target },
  { label: "Our Recommendation", icon: Target },
  { label: "Reality Check", icon: ShieldCheck },
  { label: "14-Day Activation Plan", icon: CalendarCheck },
  { label: "Network Toolkit", icon: Users },
  { label: "Market Snapshot", icon: BarChart3 },
];

interface ReportData {
  core_report: any;
  activation_plan: any;
  market_snapshot: string;
}

export default function Results() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [paid, setPaid] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [searchParams] = useSearchParams();

  const reportId = searchParams.get("report_id");
  const fromPayment = searchParams.get("from") === "payment";

  // Fetch report data
  useEffect(() => {
    if (!reportId) {
      setChecking(false);
      return;
    }
    supabase
      .from("reports")
      .select("core_report, activation_plan, market_snapshot")
      .eq("id", reportId)
      .single()
      .then(({ data }) => {
        if (data) {
          setReport(data as ReportData);
        }
      });
  }, [reportId]);

  const checkPayment = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("check-payment");
      return data?.paid === true;
    } catch {
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
        if (isPaid) {
          setPaid(true);
          setChecking(false);
          return;
        }
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      if (!cancelled) setChecking(false);
    };
    poll();
    return () => { cancelled = true; };
  }, [checkPayment, fromPayment]);

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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cr = report?.core_report;
  const ap = report?.activation_plan;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <span className="text-base font-semibold tracking-tight">Solo</span>
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your Solo Plan B Report</h1>

          {/* Free preview — always visible */}
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
                    <p>The full report explores three specific paths tailored to your experience, with pricing guidance and a step-by-step activation plan.</p>
                  )}
                </>
              ) : (
                <p>
                  Based on your profile, you fit the{" "}
                  <span className="font-medium text-foreground">Strategic Advisor</span>{" "}
                  archetype — a professional whose experience positions them well for high-value independent work.
                </p>
              )}
            </div>
          </div>

          {paid && cr ? (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle className="h-4 w-4" />
                Full report unlocked
              </div>

              {/* Section 1: Your Profile */}
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

              {/* Section 2: Your Three Options */}
              <ReportSection title="Your Three Options" icon={Target}>
                <div className="space-y-4">
                  {cr.options?.map((opt: any) => (
                    <OptionCard key={opt.label} option={opt} isRecommended={opt.label === cr.recommendation?.recommended_option} />
                  ))}
                </div>
              </ReportSection>

              {/* Section 3: Our Recommendation */}
              <ReportSection title="Our Recommendation" icon={Target}>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-3">
                  <p className="font-medium text-foreground">
                    We recommend Option {cr.recommendation?.recommended_option}
                  </p>
                  <p>{cr.recommendation?.rationale}</p>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Key Condition</p>
                    <p>{cr.recommendation?.key_condition}</p>
                  </div>
                </div>
              </ReportSection>

              {/* Section 4: Reality Check */}
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

              {/* Section 5: First Steps */}
              <ReportSection title="Your First Steps" icon={Target}>
                <ol className="list-decimal list-inside space-y-2">
                  {cr.first_steps?.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </ReportSection>

              {/* Section 6: 14-Day Activation Plan */}
              <ReportSection title="14-Day Activation Plan" icon={CalendarCheck}>
                {ap?.activation_plan && (
                  <div className="space-y-4">
                    <p>{ap.activation_plan.summary}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-lg bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Pacing</p>
                        <p className="text-xs">{ap.activation_plan.pacing_note}</p>
                      </div>
                      <div className="rounded-lg bg-surface p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Network</p>
                        <p className="text-xs">{ap.activation_plan.network_note}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ap.activation_plan.phases?.map((phase: any, i: number) => (
                        <PhaseSection key={i} phase={phase} />
                      ))}
                    </div>
                  </div>
                )}
              </ReportSection>

              {/* Section 7: Network Toolkit */}
              <ReportSection title="Network Toolkit" icon={Users}>
                {ap?.network_toolkit && (
                  <div className="space-y-4">
                    <CopyBox label="Reconnect Email" subject={ap.network_toolkit.reconnect_email?.subject} content={ap.network_toolkit.reconnect_email?.body} />
                    <CopyBox label="LinkedIn DM" content={ap.network_toolkit.linkedin_dm?.body} />
                    <CopyBox label="Referral Ask Email" subject={ap.network_toolkit.referral_ask_email?.subject} content={ap.network_toolkit.referral_ask_email?.body} />
                    <CopyBox label="Verbal Positioning Script" content={ap.network_toolkit.verbal_positioning?.script} />
                  </div>
                )}
              </ReportSection>

              {/* Section 8: Market Snapshot */}
              <ReportSection title="Market Snapshot" icon={BarChart3}>
                <MarketSnapshotRenderer text={report?.market_snapshot || ""} />
              </ReportSection>
            </div>
          ) : (
            /* Paywall */
            <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Lock className="h-4 w-4" />
                Full Report
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {lockedSections.map((s) => (
                  <div key={s.label} className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/50 pt-8 text-center">
                <p className="text-lg font-semibold">Unlock your full report for £9.99</p>
                <p className="text-sm text-muted-foreground">One-time payment. No subscription.</p>
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
    </div>
  );
}

// ─── Sub-components ────────────────────────

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

function OptionCard({ option, isRecommended }: { option: any; isRecommended: boolean }) {
  const diffColors: Record<string, string> = {
    easy: "bg-green-500/10 text-green-400 border-green-500/20",
    moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    hard: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className={`rounded-lg border p-5 space-y-3 ${isRecommended ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">
          Option {option.label}: {option.model_name?.startsWith("BM_") ? option.model_name.replace(/^BM_/, "").replace(/_/g, " ") : option.model_name}
        </h4>
        <div className="flex items-center gap-2">
          {isRecommended && (
            <Badge variant="default" className="text-[10px] px-2 py-0.5">Recommended</Badge>
          )}
          <Badge className={`text-[10px] px-2 py-0.5 border ${diffColors[option.difficulty_rating] || diffColors.moderate}`}>
            {option.difficulty_rating}
          </Badge>
        </div>
      </div>
      <p>{option.positioning}</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">Target Buyer</span>
          <p className="mt-0.5">{option.target_buyer}</p>
        </div>
        <div>
          <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">What They Buy</span>
          <p className="mt-0.5">{option.what_they_are_buying}</p>
        </div>
        <div>
          <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">Pricing</span>
          <p className="mt-0.5">£{option.pricing?.range_low_gbp?.toLocaleString()} – £{option.pricing?.range_high_gbp?.toLocaleString()} {option.pricing?.cadence}</p>
        </div>
        <div>
          <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">Time to Revenue</span>
          <p className="mt-0.5">{option.time_to_first_revenue}</p>
        </div>
      </div>
      <p className="text-xs italic text-muted-foreground/80">{option.why_this_works_for_them}</p>
    </div>
  );
}

function PhaseSection({ phase }: { phase: any }) {
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
              <ul className="list-disc list-inside text-xs space-y-0.5 ml-1">
                {d.tasks?.map((t: string, j: number) => <li key={j}>{t}</li>)}
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

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {subject && <p className="text-xs font-medium text-foreground mb-1">Subject: {subject}</p>}
      <p className="text-xs whitespace-pre-wrap">{content}</p>
    </div>
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

        // Check if it's the header block
        if (heading.includes("LOCAL MARKET FEASIBILITY SNAPSHOT")) {
          return (
            <div key={i} className="border-b border-border/50 pb-3 mb-2">
              {lines.map((line, j) => (
                <p key={j} className={j === 0 ? "font-medium text-foreground text-xs uppercase tracking-wider" : "text-xs text-muted-foreground/70"}>
                  {line}
                </p>
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
