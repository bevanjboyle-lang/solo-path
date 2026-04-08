import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle, Briefcase, Target, CalendarCheck, Users, BarChart3, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const lockedSections = [
  { label: "Full business model options", icon: Briefcase },
  { label: "Your recommendation", icon: Target },
  { label: "Reality check", icon: ShieldCheck },
  { label: "14-Day Activation Plan", icon: CalendarCheck },
  { label: "Network Toolkit", icon: Users },
  { label: "Market Snapshot", icon: BarChart3 },
];

export default function Results() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [paid, setPaid] = useState(false);
  const [searchParams] = useSearchParams();

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
    const fromPayment = searchParams.get("from") === "payment";

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
  }, [checkPayment, searchParams]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your Solo Plan B Report
          </h1>

          {/* Free preview — always visible */}
          <div className="mt-10 rounded-xl border border-border bg-card p-8 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Free Preview
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Based on your profile, you fit the{" "}
                <span className="font-medium text-foreground">Strategic Advisor</span>{" "}
                archetype — a professional whose experience in governance, risk, and senior
                stakeholder engagement positions them well for high-value independent work.
              </p>
              <p>
                Your background suggests strong potential in fractional advisory roles and
                structured consulting engagements.
                {!paid &&
                  " The full report explores three specific paths tailored to your experience, with pricing guidance and a step-by-step activation plan."}
              </p>
            </div>
          </div>

          {paid ? (
            /* Unlocked full report */
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle className="h-4 w-4" />
                Full report unlocked
              </div>

              <ReportSection title="Full Business Model Options" icon={Briefcase}>
                <p>
                  <strong>Option 1 — Fractional Chief Risk Officer:</strong> Serve 2–3 mid-size
                  firms on a retained basis (£1,200–£1,800/day). Low sales complexity — leverage
                  existing relationships with CFOs and audit committees. Time to first revenue:
                  4–8 weeks.
                </p>
                <p>
                  <strong>Option 2 — Regulatory Readiness Consultant:</strong> Project-based
                  engagements helping firms prepare for new regulation (FCA, PRA, EU directives).
                  Typical engagement £15k–£40k. Medium sales complexity. Time to first revenue:
                  6–12 weeks.
                </p>
                <p>
                  <strong>Option 3 — Board Advisory & NED Portfolio:</strong> Non-executive
                  director and advisory board roles across 3–5 organisations. £15k–£30k per
                  board seat annually. Low time commitment per role. Time to first revenue:
                  8–16 weeks.
                </p>
              </ReportSection>

              <ReportSection title="Your Recommendation" icon={Target}>
                <p>
                  Based on your seniority, network strength, and comfort with business
                  development, we recommend starting with <strong>Option 1 (Fractional CRO)</strong>.
                  It offers the fastest path to revenue, leverages your existing reputation,
                  and requires minimal marketing infrastructure.
                </p>
                <p>
                  Once established (typically 3–6 months), layer in Option 3 board roles for
                  income diversification and long-term positioning.
                </p>
              </ReportSection>

              <ReportSection title="Reality Check" icon={ShieldCheck}>
                <p>
                  Your profile shows strong commercial potential, but there are areas to
                  address: your network may need reactivation if relationships have cooled,
                  and pricing confidence is critical — underpricing is the most common mistake
                  for first-time independents at your level.
                </p>
                <p>
                  Expected timeline to replace 80% of current income: 4–9 months with
                  consistent effort.
                </p>
              </ReportSection>

              <ReportSection title="14-Day Activation Plan" icon={CalendarCheck}>
                <div className="space-y-2">
                  <p><strong>Days 1–3:</strong> Audit your network. List 50 contacts who could refer or hire you. Categorise by warmth and relevance.</p>
                  <p><strong>Days 4–6:</strong> Draft your positioning statement and one-page capability deck. Focus on outcomes, not credentials.</p>
                  <p><strong>Days 7–9:</strong> Reach out to your top 15 contacts with a personal, non-salesy message. Ask for coffee, not contracts.</p>
                  <p><strong>Days 10–12:</strong> Set up your professional infrastructure — LinkedIn optimisation, simple website, invoicing setup.</p>
                  <p><strong>Days 13–14:</strong> Schedule 5 exploratory conversations. Prepare a standard discovery call framework.</p>
                </div>
              </ReportSection>

              <ReportSection title="Network Toolkit" icon={Users}>
                <p>
                  <strong>Warm outreach template:</strong> "Hi [Name], I'm exploring a move into
                  independent advisory work focused on [specialism]. Given your experience in
                  [their area], I'd really value 20 minutes of your perspective. Would you be
                  open to a quick call this week?"
                </p>
                <p>
                  <strong>LinkedIn headline formula:</strong> [Role] | Helping [audience]
                  with [outcome] | Formerly [notable employer]
                </p>
                <p>
                  <strong>Key platforms:</strong> LinkedIn (primary), industry associations,
                  alumni networks, professional bodies relevant to your specialism.
                </p>
              </ReportSection>

              <ReportSection title="Market Snapshot" icon={BarChart3}>
                <p>
                  The UK fractional and interim market has grown 35% since 2021. Demand is
                  strongest in financial services regulation, ESG governance, and operational
                  resilience — all areas aligned with your profile.
                </p>
                <p>
                  Day rates for professionals at your level typically range from £1,000–£2,000,
                  with retained arrangements averaging £5k–£8k/month per client.
                </p>
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
                  <div
                    key={s.label}
                    className="rounded-lg bg-surface p-3 text-xs text-muted-foreground"
                  >
                    {s.label}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/50 pt-8 text-center">
                <p className="text-lg font-semibold">Unlock your full report for £9.99</p>
                <p className="text-sm text-muted-foreground">
                  One-time payment. No subscription.
                </p>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--gradient-cta)" }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Get full report →"
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-8 shadow-card"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </motion.div>
  );
}
