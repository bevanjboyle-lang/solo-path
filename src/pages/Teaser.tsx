import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Sparkles, CheckCircle } from "lucide-react";
import SoloLogo from "@/components/SoloLogo";
import { Badge } from "@/components/ui/badge";

export default function Teaser() {
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const reportId = searchParams.get("report_id");
  const [hookInsight, setHookInsight] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!user || !reportId) return;
    localStorage.setItem("solo_report_id", reportId);
    supabase
      .from("reports")
      .select("hook_insight, core_report")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHookInsight((data as any)?.hook_insight || null);
        setArchetype((data as any)?.core_report?.archetype?.primary || null);
        setLoading(false);
      });
  }, [user, reportId]);

  const handleCheckout = async () => {
    setPayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-border border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </div>
    );
  }

  const outcomeItems = [
    "The full analysis of your career capital and what it's worth commercially",
    "10 scored and ranked options, with honest assessments of what each one requires",
    "Your 30-day activation plan, with every outreach message written for you",
    "A realistic assessment of AI risk to your current role, and the options most resilient to it",
    "A market snapshot for your sector and location",
    "30 days of daily execution support via the Adaptive Tracker",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <SoloLogo width={100} height={28} />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-6 pt-20 pb-12">
        <motion.div
          className="flex w-full max-w-lg flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Section 1: Archetype card */}
          <div
            className="mb-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-cta)" }}
          >
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Your Plan B options are ready
          </h1>

          {archetype && (
            <p className="mt-3 text-sm text-muted-foreground">
              Archetype: <span className="font-medium text-foreground">{archetype}</span>
            </p>
          )}

          {/* Section 2: Hook insight - enlarged */}
          {hookInsight && (
            <motion.div
              className="mt-8 w-full rounded-xl border-l-4 border-primary bg-card p-6 text-left"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary mb-3">What we know about your situation</p>
              <p className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
                "{hookInsight}"
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                This is specific to your role and sector. The full analysis is below.
              </p>
            </motion.div>
          )}

          {/* Section 3: Outcomes list */}
          <motion.div
            className="mt-8 w-full rounded-xl border border-border bg-card p-6 text-left"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">What's in your report.</h3>
            <div className="space-y-3">
              {outcomeItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Section 4: Trust signal + CTA */}
          <motion.div
            className="mt-8 flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <p className="max-w-md text-xs text-center text-muted-foreground leading-relaxed">
              Built from 95 professional archetypes across 14 sectors. Every output is specific to your role, your sector, and your seniority level. Not a framework with your name on it.
            </p>

            <button
              onClick={handleCheckout}
              disabled={payLoading}
              className="inline-flex items-center rounded-lg px-8 py-3 text-base font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--gradient-cta)" }}
            >
              {payLoading ? "Loading..." : "Unlock your 30-day execution plan — £19.99"}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}