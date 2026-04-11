import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TrackerSession {
  id: string;
  current_day: number;
  plan_state: string;
  subscription_status: string | null;
  working_plan: any;
  original_plan: any;
  activated_at: string | null;
  stripe_subscription_id: string | null;
  report_id: string;
  running_narrative: string;
  last_checkin_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface UseTrackerSessionOptions {
  sessionId?: string; // fetch by ID (for checkin page)
}

export function useTrackerSession(options?: UseTrackerSessionOptions) {
  const { user } = useAuth();
  const [session, setSession] = useState<TrackerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const loadSession = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let data: any;
    if (options?.sessionId) {
      const res = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("id", options.sessionId)
        .single();
      data = res.data;
    } else {
      const res = await supabase
        .from("tracker_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      data = res.data;
    }

    if (data) {
      setSession(data as TrackerSession);
      // Load completed tasks
      const { data: progress } = await supabase
        .from("tracker_progress")
        .select("phase_index, day_index, task_index")
        .eq("user_id", user.id)
        .eq("report_id", data.report_id);

      if (progress) {
        setCompletedTasks(new Set(progress.map((p) => `${p.phase_index}-${p.day_index}-${p.task_index}`)));
      }
    }
    setLoading(false);
  }, [user, options?.sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const toggleTask = useCallback(async (phaseIdx: number, dayIdx: number, taskIdx: number) => {
    if (!user || !session) return;
    const key = `${phaseIdx}-${dayIdx}-${taskIdx}`;
    const isCompleted = completedTasks.has(key);

    if (isCompleted) {
      await supabase
        .from("tracker_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("report_id", session.report_id)
        .eq("phase_index", phaseIdx)
        .eq("day_index", dayIdx)
        .eq("task_index", taskIdx);
      setCompletedTasks((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      await supabase.from("tracker_progress").insert({
        user_id: user.id,
        report_id: session.report_id,
        phase_index: phaseIdx,
        day_index: dayIdx,
        task_index: taskIdx,
      });
      setCompletedTasks((prev) => new Set(prev).add(key));
    }
  }, [user, session, completedTasks]);

  const subscribe = useCallback(async (plan: 'monthly' | 'annual' = 'monthly') => {
    if (!session) return null;
    const { data, error } = await supabase.functions.invoke("create-subscription", {
      body: { tracker_session_id: session.id, plan_type: plan },
    });
    if (error) throw error;
    return data?.checkout_url as string | null;
  }, [session]);

  // Derived state
  const phases = session?.working_plan?.activation_plan?.phases || session?.working_plan?.phases || [];
  let totalTasks = 0;
  let completedCount = 0;
  phases.forEach((phase: any, pi: number) => {
    phase.days_detail?.forEach((day: any, di: number) => {
      day.tasks?.forEach((_: any, ti: number) => {
        totalTasks++;
        if (completedTasks.has(`${pi}-${di}-${ti}`)) completedCount++;
      });
    });
  });
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const showPaywall = !!session && session.current_day > 30 && session.subscription_status !== "active";
  const isSubscribed = session?.subscription_status === "active";

  return {
    session,
    setSession,
    loading,
    completedTasks,
    toggleTask,
    subscribe,
    refresh: loadSession,
    phases,
    totalTasks,
    completedCount,
    progressPct,
    showPaywall,
    isSubscribed,
  };
}
