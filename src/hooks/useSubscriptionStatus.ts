import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Reads the user's subscription_status from their most-recent tracker_session.
 * Returns "active" for paying subscribers, otherwise null/other status.
 */
export function useSubscriptionStatus() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("tracker_sessions")
      .select("subscription_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus(data?.subscription_status ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { status, isActive: status === "active", loading };
}
