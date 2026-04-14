import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, Loader2, LogOut, CalendarCheck, MessageSquare, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SoloLogo from "@/components/SoloLogo";

export default function Activate() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("report_id");
  const [activating, setActivating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) {
      navigate("/results", { replace: true });
      return;
    }
    supabase
      .from("reports")
      .select("activation_plan")
      .eq("id", reportId)
      .single()
      .then(({ data }) => {
        if (data?.activation_plan) {
          setPlan(data.activation_plan);
        }
        setLoading(false);
      });
  }, [reportId]);

  const handleActivate = async () => {
    if (!user || !reportId || !plan) return;
    setActivating(true);
    try {
      // Check if session already exists
      const { data: existing } = await supabase
        .from("tracker_sessions")
        .select("id")
        .eq("report_id", reportId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        navigate("/tracker");
        return;
      }

      const { data, error } = await supabase
        .from("tracker_sessions")
        .insert({
          user_id: user.id,
          report_id: reportId,
          original_plan: plan,
          working_plan: plan,
          activated_at: new Date().toISOString(),
          current_day: 1,
          plan_state: "active",
          strand_status: plan.initialStrandStatus ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      navigate("/tracker");
    } catch (err) {
      console.error("Activation error:", err);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      <div className="mx-auto max-w-2xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--gradient-cta)" }}>
            <Rocket className="h-8 w-8 text-primary-foreground" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Start your Plan B activation
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-lg mx-auto">
            Your 30-day plan begins today. Each evening, you'll get a check-in prompt.
            Complete tasks, track progress, adapt when life gets in the way.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: CalendarCheck, title: "Daily tasks", desc: "Structured actions tailored to your plan" },
              { icon: MessageSquare, title: "Evening check-ins", desc: "Quick AI conversations to stay on track" },
              { icon: RefreshCw, title: "Adaptive plans", desc: "Your plan adjusts when life changes" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5 text-left shadow-card">
                <item.icon className="h-5 w-5 text-primary mb-2" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleActivate}
            disabled={activating || !plan}
            className="mt-10 inline-flex items-center gap-2 rounded-lg px-10 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-cta)" }}
          >
            {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Day 1 today →"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
