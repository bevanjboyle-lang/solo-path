import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Sparkles } from "lucide-react";

export default function Teaser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const reportId = searchParams.get("report_id");
  const [hookInsight, setHookInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!user || !reportId) return;
    // Store report_id for post-payment redirect
    localStorage.setItem("solo_report_id", reportId);
    supabase
      .from("reports")
      .select("hook_insight")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHookInsight((data as any)?.hook_insight || null);
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <span className="text-sm font-medium text-foreground">Solo</span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-20 pb-12">
        <motion.div
          className="flex w-full max-w-lg flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="mb-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-cta)" }}
          >
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Your Plan B insight is ready
          </h1>

          {hookInsight ? (
            <motion.p
              className="mt-8 text-xl font-bold leading-snug text-foreground sm:text-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              "{hookInsight}"
            </motion.p>
          ) : (
            <p className="mt-8 text-lg text-muted-foreground">
              Your personalised insight is available in your full report.
            </p>
          )}

          <p className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground">
            Your full Plan B report includes your recommended business model, financial
            projections, a 90-day action plan, and your AI risk assessment.
          </p>

          <button
            onClick={handleCheckout}
            disabled={payLoading}
            className="mt-10 inline-flex items-center rounded-lg px-8 py-3 text-base font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-cta)" }}
          >
            {payLoading ? "Loading..." : "Unlock your full report — £19.99"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
