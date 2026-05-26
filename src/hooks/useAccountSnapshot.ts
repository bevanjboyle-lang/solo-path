// src/hooks/useAccountSnapshot.ts
//
// Fetches the authed user's account snapshot for the Account dropdown (A6).
// Backed by the get-account-snapshot edge function (verify_jwt:true).
//
// Behaviour:
//   - Fetches on mount (only when the user is signed in)
//   - Caches in component state for the session
//   - Exposes a refresh() function for explicit re-fetch (use after tracker
//     activation or subscription change)

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionState =
  | "pre_activation"
  | "trial"
  | "subscriber_monthly"
  | "subscriber_annual"
  | "lapsed"
  | "none";

export type TrackerState = "pre_activation" | "in_progress" | "completed" | "none";

export interface AccountSnapshot {
  email: string;
  first_name: string | null;
  subscription: { state: SubscriptionState; label: string };
  tracker: {
    state: TrackerState;
    current_day: number | null;
    day_x_of_30_label: string | null;
  };
  archetype: { id: string | null; name: string | null };
  recommended_model: { id: string | null; name: string | null } | null;
}

export function useAccountSnapshot(enabled = true) {
  const [data, setData] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: response, error: invokeErr } = await supabase.functions.invoke(
        "get-account-snapshot",
        { body: {} },
      );
      if (invokeErr) {
        setError(invokeErr.message ?? "Failed to load account snapshot");
        setLoading(false);
        return;
      }
      setData(response as AccountSnapshot);
      setLoading(false);
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to load account snapshot");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchSnapshot();
  }, [enabled, fetchSnapshot]);

  return { data, loading, error, refresh: fetchSnapshot };
}
