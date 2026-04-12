import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Sparkles } from "lucide-react";
import SoloLogo from "@/components/SoloLogo";
import { Badge } from "@/components/ui/badge";

interface OptionPreview {
  rank: number;
  model_name: string;
  difficulty_rating: "easy" | "moderate" | "hard";
  pricing: { range_low_gbp: number; range_high_gbp: number; cadence: string };
  why_this_works_for_them: string;
}

const diffColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: "bg-green-500/10", text: "text-green-400" },
  moderate: { bg: "bg-amber-500/10", text: "text-amber-400" },
  hard: { bg: "bg-red-500/10", text: "text-red-400" },
};

export default function Teaser() {
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const reportId = searchParams.get("report_id");
  const [hookInsight, setHookInsight] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionPreview[]>([]);
  const [totalOptions, setTotalOptions] = useState(0);
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
        const opts = (data as any)?.core_report?.options || [];
        const sorted = [...opts].sort((a: any, b: any) => a.rank - b.rank);
        setTotalOptions(sorted.length);
        setOptions(sorted.slice(0, 3));
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
          <div
            className="mb-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-cta)" }}
          >
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Your Plan B options are ready
          </h1>

          {hookInsight && (
            <motion.p
              className="mt-4 text-lg font-bold leading-snug text-foreground sm:text-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              "{hookInsight}"
            </motion.p>
          )}

          {/* Preview cards */}
          <div className="mt-8 w-full space-y-3">
            {options.map((opt, i) => {
              const dc = diffColors[opt.difficulty_rating] || diffColors.moderate;
              return (
                <motion.div
                  key={opt.rank}
                  className="rounded-xl border border-border bg-card p-5 text-left"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {opt.rank}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{opt.model_name}</h3>
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 border-0 ${dc.bg} ${dc.text}`}>
                      {opt.difficulty_rating}
                    </Badge>
                  </div>

                  {/* Pricing - blurred */}
                  <div className="mt-3 select-none blur-[5px] pointer-events-none">
                    <p className="text-xs text-muted-foreground">
                      £{opt.pricing?.range_low_gbp?.toLocaleString()}–£{opt.pricing?.range_high_gbp?.toLocaleString()} per {opt.pricing?.cadence}
                    </p>
                  </div>

                  {/* Why this works - blurred */}
                  <div className="mt-2 select-none blur-[5px] pointer-events-none">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {opt.why_this_works_for_them}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {totalOptions > 3 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Plus {totalOptions - 3} more options scored for your profile
            </p>
          )}

          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Unlock all options with full pricing, personalised rationale, and a 30-day action plan built for your top choice.
          </p>

          <button
            onClick={handleCheckout}
            disabled={payLoading}
            className="mt-8 inline-flex items-center rounded-lg px-8 py-3 text-base font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-cta)" }}
          >
            {payLoading ? "Loading..." : "Unlock your full report — £19.99"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
