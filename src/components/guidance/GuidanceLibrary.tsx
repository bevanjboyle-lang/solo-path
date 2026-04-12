import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Clock } from "lucide-react";
import { MODULES, GuidanceModule } from "@/data/guidanceModules";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GuidanceModuleFlow from "./GuidanceModuleFlow";
import GuidanceModuleOutput from "./GuidanceModuleOutput";

const AREA_COLORS: Record<string, string> = {
  "Legal & Tax": "bg-blue-500/20 text-blue-600",
  "Tax & Finance": "bg-amber-500/20 text-amber-600",
  "Compliance": "bg-violet-500/20 text-violet-600",
  "Risk & Protection": "bg-rose-500/20 text-rose-600",
  "Operations": "bg-cyan-500/20 text-cyan-600",
  "Profile & Positioning": "bg-emerald-500/20 text-emerald-600",
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

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => {
            const status = getStatus(mod);
            return (
              <button
                key={mod.id}
                disabled={status === "locked"}
                onClick={() => {
                  if (status === "completed") {
                    setViewingOutput({ module: mod, output: completionOutputs[mod.id] });
                  } else {
                    setActiveModule(mod);
                  }
                }}
                className={`group relative text-left rounded-xl border p-5 transition-all ${
                  status === "available"
                    ? "border-primary/30 bg-card hover:border-primary/60 hover:bg-muted/50 cursor-pointer"
                    : status === "completed"
                    ? "border-border bg-card cursor-pointer hover:bg-muted/30"
                    : "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
                }`}
              >
                {/* Number badge */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    status === "available" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {mod.id}
                  </span>
                  {status === "available" && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase tracking-wider">
                      Available
                    </Badge>
                  )}
                  {status === "completed" && (
                    <Badge className="bg-muted text-muted-foreground border-border text-[10px] uppercase tracking-wider">
                      <Check className="h-3 w-3 mr-1" /> Completed
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${AREA_COLORS[mod.area] || "bg-muted text-muted-foreground"}`}>
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
              </button>
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