// src/hooks/useSignal.ts
//
// Fetches the latest published Signal edition (plus its FK sub-rows) from the
// get-latest-signal edge function. Used by both the home-page SignalSection
// and the /signal route page.
//
// The function is public (verify_jwt:false) so this hook works for anonymous
// visitors. Backend caches the response for 5 minutes via Cache-Control.
//
// Returns:
//   - data: SignalPayload | null   (null while loading or if fetch failed)
//   - loading: boolean             (true on first fetch)
//   - error: string | null         (set if fetch errored; component should render a quiet fallback)

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SignalEdition {
  id: string;
  week_number: number;
  publish_date: string;
  theme_archetype_id: string;
  theme_title: string;
  lead_headline: string;
  lead_subheadline: string;
  lead_body: string;
  lead_word_count: number;
  lead_cta_text: string;
  seo_keywords: string[];
  key_takeaways: string[];
  published_at: string;
}

export interface SignalMarketSignal {
  signal_text: string;
  source: string;
  source_date: string;
  source_reliability: "high" | "medium" | "low";
  what_this_means: string;
  archetypes_affected: string[];
  position_in_edition: number;
}

export interface SignalSpotlight {
  archetype_id: string;
  archetype_name: string;
  headline: string;
  summary: string;
  day_rate_range: string;
  demand_signal: string;
  first_step: string;
  cta_text: string;
}

export interface SignalAiWatch {
  headline: string;
  body: string;
  development_date: string;
  archetypes_most_affected: string[];
  opportunity: string;
  source: string;
  source_url: string | null;
}

export interface SignalPayload {
  edition: SignalEdition | null;
  market_signals: SignalMarketSignal[];
  spotlight: SignalSpotlight | null;
  ai_watch: SignalAiWatch | null;
}

export function useSignal() {
  const [data, setData] = useState<SignalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: response, error: invokeErr } = await supabase.functions.invoke(
          "get-latest-signal",
          { body: {} },
        );
        if (cancelled) return;
        if (invokeErr) {
          setError(invokeErr.message ?? "Failed to load The Signal");
          setLoading(false);
          return;
        }
        setData(response as SignalPayload);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error)?.message ?? "Failed to load The Signal");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

// ── Archive (2026-06-01) ───────────────────────────────────────────────────
// Powers the /signal index and /signal/<slug> permalink pages via the
// get-signal-editions function (public). The SEO moat: every edition is a
// permanent, listed, indexable page.

export interface SignalArchiveItem {
  slug: string;
  lead_headline: string;
  lead_subheadline: string;
  publish_date: string;
}

/** List all published editions, newest first, for the /signal index. */
export function useSignalArchive() {
  const [editions, setEditions] = useState<SignalArchiveItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("get-signal-editions", { body: {} });
        if (cancelled) return;
        if (invokeErr) { setError(invokeErr.message ?? "Failed to load the archive"); setLoading(false); return; }
        setEditions(((data as { editions?: SignalArchiveItem[] })?.editions) ?? []);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error)?.message ?? "Failed to load the archive");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { editions, loading, error };
}

/** Fetch one full edition (lead + signals + spotlight + ai_watch) by slug. */
export function useSignalEdition(slug: string | undefined) {
  const [data, setData] = useState<SignalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setLoading(false); setError("No edition specified"); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: response, error: invokeErr } = await supabase.functions.invoke("get-signal-editions", { body: { slug } });
        if (cancelled) return;
        if (invokeErr) { setError(invokeErr.message ?? "Failed to load this edition"); setLoading(false); return; }
        setData(response as SignalPayload);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error)?.message ?? "Failed to load this edition");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return { data, loading, error };
}
