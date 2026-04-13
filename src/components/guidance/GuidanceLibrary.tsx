import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MODULES, TRACKS, GuidanceModule } from "@/data/guidanceModules";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GuidanceModuleFlow from "./GuidanceModuleFlow";
import GuidanceModuleOutput from "./GuidanceModuleOutput";
import GlassCard from "@/components/ui/GlassCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { useNavigate } from "react-router-dom";

export default function GuidanceLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [completionOutputs, setCompletionOutputs] = useState<Record<number, any>>({});
  const [activeModule, setActiveModule] = useState<GuidanceModule | null>(null);
  const [viewingOutput, setViewingOutput] = useState<{ module: GuidanceModule; output: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set(["A"]));
  const [isSubscribed, setIsSubscribed] = useState(false);

  const fetchCompletions = async () => {
    if (!user) return;
    const [{ data }, { data: profile }] = await Promise.all([
      supabase.from("guidance_module_completions").select("module_id, output").eq("user_id", user.id),
      supabase.from("user_profiles").select("subscription_active").eq("user_id", user.id).maybeSingle(),
    ]);
    const ids = (data || []).map((r: any) => r.module_id);
    const outputs: Record<number, any> = {};
    (data || []).forEach((r: any) => { outputs[r.module_id] = r.output; });
    setCompletedIds(ids);
    setCompletionOutputs(outputs);
    setIsSubscribed(profile?.subscription_active === true);
    setLoading(false);
  };

  useEffect(() => { fetchCompletions(); }, [user]);

  const getModuleStatus = (mod: GuidanceModule): "available" | "completed" | "locked" | "prereq-needed" => {
    if (completedIds.includes(mod.id)) return "completed";
    if (mod.prereq && !completedIds.includes(mod.prereq)) return "prereq-needed";
    return "available";
  };

  const handleComplete = (moduleId: number, output: any) => {
    setActiveModule(null);
    setCompletedIds((prev) => [...prev, moduleId]);
    setCompletionOutputs((prev) => ({ ...prev, [moduleId]: output }));
    const mod = MODULES.find((m) => m.id === moduleId);
    if (mod) setViewingOutput({ module: mod, output });
  };

  const toggleTrack = (trackId: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
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

  const totalModules = MODULES.length;
  const completionPct = Math.round((completedIds.length / totalModules) * 100);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Progress bar */}
      <ScrollReveal>
        <GlassCard className="mb-8 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
              {completedIds.length} of {totalModules} modules completed
            </span>
            <span className="text-xs font-medium" style={{ color: "#2ECDB0" }}>
              {completionPct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "rgba(46,205,176,0.12)" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%`, background: "#2ECDB0" }}
            />
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Tracks */}
      <div className="space-y-4">
        {TRACKS.map((track) => {
          const trackModules = MODULES.filter((m) => track.moduleIds.includes(m.id));
          const isExpanded = expandedTracks.has(track.id);
          const trackCompleted = trackModules.filter((m) => completedIds.includes(m.id)).length;
          const needsSub = track.badgeType === "subscription" && !isSubscribed;

          return (
            <ScrollReveal key={track.id}>
              <div style={{ borderLeft: "3px solid #2ECDB0" }} className="rounded-2xl overflow-hidden">
                {/* Track header */}
                <button
                  onClick={() => toggleTrack(track.id)}
                  className="w-full text-left p-5 flex items-center gap-4 transition-colors hover:bg-[rgba(46,205,176,0.03)]"
                  style={{ background: "rgba(250,249,247,0.7)" }}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
                    style={{ background: "rgba(46,205,176,0.15)", color: "#2ECDB0" }}>
                    {track.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
                        {track.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">{trackModules.length} modules</span>
                      {track.badgeType === "included" ? (
                        <Badge className="bg-[rgba(46,205,176,0.15)] text-[#2ECDB0] border-[rgba(46,205,176,0.3)] text-[10px]">
                          {track.badge}
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border text-[10px]">
                          {!isSubscribed && <Lock className="h-3 w-3 mr-1" />}
                          {track.badge}
                        </Badge>
                      )}
                      {trackCompleted > 0 && (
                        <span className="text-[10px] font-medium" style={{ color: "#2ECDB0" }}>
                          {trackCompleted}/{trackModules.length} done
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#5A5650" }}>{track.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {/* Module list */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 space-y-2">
                        {needsSub && (
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs" style={{ background: "rgba(46,205,176,0.06)", color: "#5A5650" }}>
                            <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: "#2ECDB0" }} />
                            <span>Continue your plan to unlock these modules.</span>
                            <button
                              onClick={() => navigate("/pricing")}
                              className="ml-auto text-xs font-semibold underline"
                              style={{ color: "#2ECDB0" }}
                            >
                              View pricing
                            </button>
                          </div>
                        )}
                        {trackModules.map((mod) => {
                          const status = getModuleStatus(mod);
                          const disabled = status === "locked" || status === "prereq-needed" || needsSub;

                          return (
                            <button
                              key={mod.id}
                              disabled={disabled}
                              onClick={() => {
                                if (status === "completed") {
                                  setViewingOutput({ module: mod, output: completionOutputs[mod.id] });
                                } else {
                                  setActiveModule(mod);
                                }
                              }}
                              className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                                disabled
                                  ? "opacity-60 cursor-not-allowed"
                                  : "hover:bg-[rgba(46,205,176,0.04)] cursor-pointer"
                              } ${status === "completed" ? "bg-[rgba(46,205,176,0.04)]" : ""}`}
                              style={{ background: disabled ? "rgba(243,241,237,0.5)" : undefined }}
                            >
                              <span className="text-[11px] font-bold w-6 text-center shrink-0" style={{ color: "#9E9A93" }}>
                                {mod.id}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold block" style={{ color: disabled ? "#9E9A93" : "#1D2025", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {mod.name}
                                </span>
                                {mod.description && (
                                  <span className="text-xs block mt-0.5" style={{ color: "#9E9A93" }}>
                                    {mod.description}
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0">
                                {status === "completed" && (
                                  <Badge className="bg-[rgba(46,205,176,0.15)] text-[#2ECDB0] border-[rgba(46,205,176,0.3)] text-[10px]">
                                    <Check className="h-3 w-3 mr-1" /> Done
                                  </Badge>
                                )}
                                {status === "available" && !needsSub && (
                                  <Badge className="bg-[rgba(46,205,176,0.1)] text-[#2ECDB0] border-[rgba(46,205,176,0.25)] text-[10px]">
                                    Available
                                  </Badge>
                                )}
                                {status === "prereq-needed" && (
                                  <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Prereq needed
                                  </Badge>
                                )}
                                {needsSub && status !== "completed" && (
                                  <Lock className="h-3.5 w-3.5" style={{ color: "#9E9A93" }} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          );
        })}
      </div>

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
