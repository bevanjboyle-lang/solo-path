// useTicker — public feed for the always-on Radar ticker (ADR-026, 2026-06-10).
// Fetches get-ticker (anonymous-safe; verify_jwt:false) once per mount.
// Failure mode is an empty feed: the ticker hides rather than breaks.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TickerItem {
  category: string;
  title: string;
  value_text: string | null;
  deadline: string | null;
}

export interface TickerFeed {
  items: TickerItem[];
  signal: { headline: string; slug: string } | null;
  loaded: boolean;
}

export function useTicker(): TickerFeed {
  const [feed, setFeed] = useState<TickerFeed>({ items: [], signal: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<{
          items: TickerItem[];
          signal: { headline: string; slug: string } | null;
        }>("get-ticker", { body: {} });
        if (cancelled) return;
        if (error || !data) {
          setFeed({ items: [], signal: null, loaded: true });
        } else {
          setFeed({ items: data.items ?? [], signal: data.signal ?? null, loaded: true });
        }
      } catch {
        if (!cancelled) setFeed({ items: [], signal: null, loaded: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return feed;
}
