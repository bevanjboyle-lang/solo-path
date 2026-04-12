import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Clock, Target, DollarSign, Users, Shield, BookOpen, Lightbulb, BarChart3, Briefcase, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { MODULES, GuidanceModule } from "@/data/guidanceModules";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GuidanceModuleFlow from "./GuidanceModuleFlow";
import GuidanceModuleOutput from "./GuidanceModuleOutput";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

const MODULE_ICONS: Record<number, React.ElementType> = {
  1: Briefcase,
  2: BookOpen,
  3: DollarSign,
  4: BarChart3,
  5: Shield,
  6: Shield,
  7: Shield,
  8: Briefcase,
  9: Target,
};

const TRACK_BORDER_OPACITY: Record<string, number> = {
  "Legal & Tax": 1.0,
  "Tax & Finance": 0.8,
  "Compliance": 0.6,
  "Risk & Protection": 0.6,
  "Operations": 0.4,
  "Profile & Positioning": 0.2,
};

export default function GuidanceLibrary() {
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [completionOutputs, setCompletionOutputs] = useState<Record<number, any>>({});
  const [activeModule, setActiveModule] = useState<GuidanceModule | null>(null);
  const [viewingOutput, setViewingOutput] = useState<{ module: GuidanceModule; output: any } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompletions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("guidance_module_completions")
      .select("module_id, output")
      .eq("user_id", user.id);
    const ids = (data || []).map((r: any) => r.module_id);
    const outputs: Record<number, any> = {};
    (data || []).forEach((r: any) => { outputs[r.module_id] = r.output; });
    setCompletedIds(ids);
    setCompletionOutputs(outputs);
    setLoading(false);
  };

  useEffect(() => { fetchCompletions(); }, [user]);

  const getStatus = (mod: GuidanceModule): "available" | "completed" | "locked" => {
    if (completedIds.includes(mod.id)) return "completed";
    if (mod.prereq && !completedIds.includes(mod.prereq)) return "locked";
    return "available";
  };

  const handleComplete = (moduleId: number, output: any) => {
    setActiveModule(null);
    setCompletedIds((prev) => [...prev, moduleId]);
    setCompletionOutputs((prev) => ({ ...prev, [moduleId]: output }));
    const mod = MODULES.find((m) => m.id === moduleId);
    if (mod) setViewingOutput({ module: mod, output });
  };

  if (viewingOutput) {
    return (
      <GuidanceModuleOutput
        module={viewingOutput.module}
        output={viewingOutput.output}
        onBack={() => setViewingOutput(null)}
      />
    );
  }

  const completionPct = Math.round((completedIds.length / MODULES.length) * 100);
  const radialData = [{ name: "progress", value: completionPct, fill: "#2ECDB0" }];

  return (
    <>
      {/* Progress Overview Header */}
      <ScrollReveal>
        <GlassCard className="mb-8 flex flex-col sm:flex-row items-center gap-6 p-6">
          <div className="w-[160px] h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                data={radialData}
                barSize={12}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: "rgba(46,205,176,0.1)" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
                {completedIds.length}
              </span>
              <span className="text-xs" style={{ color: "#5A5650" }}>of {MODULES.length}</span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
              Your Guidance Progress
            </h2>
            <p className="text-sm mt-1" style={{ color: "#5A5650" }}>
              {completedIds.length} of {MODULES.length} modules complete — keep going to cover all the essentials.
            </p>
          </div>
        </GlassCard>
      </ScrollReveal>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod, idx) => {
            const status = getStatus(mod);
            const Icon = MODULE_ICONS[mod.id] || BookOpen;
            const borderOpacity = TRACK_BORDER_OPACITY[mod.area] ?? 0.5;

            return (
              <ScrollReveal key={mod.id} delay={idx * 0.05}>
                <motion.button
                  disabled={status === "locked"}
                  onClick={() => {
                    if (status === "completed") {
                      setViewingOutput({ module: mod, output: completionOutputs[mod.id] });
                    } else {
                      setActiveModule(mod);
                    }
                  }}
                  whileHover={status !== "locked" ? { y: -4, boxShadow: "0 8px 30px rgba(0,0,0,0.1)" } : {}}
                  transition={{ duration: 0.2 }}
                  className="w-full text-left"
                  style={{ borderLeft: `3px solid rgba(46,205,176,${borderOpacity})` }}
                >
                  <GlassCard
                    className={`p-5 h-full transition-all ${
                      status === "completed"
                        ? "bg-[rgba(46,205,176,0.05)]"
                        : status === "locked"
                        ? "backdrop-blur-lg !bg-[rgba(243,241,237,0.9)] opacity-60 cursor-not-allowed"
                        : "hover:bg-[rgba(46,205,176,0.03)] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" style={{ color: "#2ECDB0" }} />
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          status === "available" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {mod.id}
                        </span>
                      </div>
                      {status === "available" && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-wider">
                          Available
                        </Badge>
                      )}
                      {status === "completed" && (
                        <Badge className="bg-muted text-muted-foreground border-border text-[10px] uppercase tracking-wider">
                          <Check className="h-3 w-3 mr-1" /> Done
                        </Badge>
                      )}
                      {status === "locked" && (
                        <Badge className="bg-muted/50 text-muted-foreground/50 border-border/50 text-[10px] uppercase tracking-wider">
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                      )}
                    </div>

                    <h3 className={`text-sm font-semibold mb-1 ${status === "locked" ? "text-muted-foreground/50" : "text-foreground"}`}>
                      {mod.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {mod.area}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {mod.minutes} min
                      </span>
                    </div>

                    {status === "locked" && mod.prereq && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        Complete Module {mod.prereq} first
                      </p>
                    )}
                  </GlassCard>
                </motion.button>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {activeModule && (
        <GuidanceModuleFlow
          module={activeModule}
          onClose={() => setActiveModule(null)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
