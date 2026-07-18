/**
 * Funnel analytics helpers (Day Zero C0.5 named events; first consumer is the
 * free diagnostic, C1.1).
 *
 * Two sinks, both best-effort and both safe to call anywhere:
 *
 * 1. PostHog (client-side, EU project) via the snippet in index.html. Named
 *    events land next to autocaptured pageviews; properties must never
 *    include the user's email or free-text answers.
 * 2. The product's own `public.events` table via the public `track-event`
 *    edge function (service-role insert behind an allowlist and a per-IP
 *    rate limit). This is what the Day Zero gate ratios are computed from,
 *    keyed by client_session_id.
 *
 * Neither sink may ever break the product: every call is wrapped and
 * fire-and-forget.
 */

import { supabase } from "@/integrations/supabase/client";
import { getClientSessionId } from "@/lib/clientSession";

interface PostHogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

function posthogClient(): PostHogLike | null {
  try {
    const ph = (window as unknown as { posthog?: PostHogLike & { __loaded?: boolean } }).posthog;
    return ph && typeof ph.capture === "function" ? ph : null;
  } catch {
    return null;
  }
}

/** Capture a named PostHog event. No-op if the snippet hasn't loaded. */
export function phCapture(event: string, properties?: Record<string, unknown>): void {
  try {
    posthogClient()?.capture(event, properties);
  } catch {
    /* analytics must never break the product */
  }
}

/**
 * Record a funnel event on the product's own events table, keyed by the
 * anonymous client session. Fire-and-forget; failures are logged and
 * swallowed. `payload` must stay small (the function caps it) and must not
 * contain emails or free text.
 */
export function trackEvent(eventType: string, payload?: Record<string, unknown>): void {
  try {
    void supabase.functions
      .invoke("track-event", {
        body: {
          event_type: eventType,
          client_session_id: getClientSessionId(),
          payload: payload ?? {},
        },
      })
      .then(({ error }) => {
        if (error) console.warn("track-event failed (non-fatal):", error.message);
      });
  } catch (err) {
    console.warn("track-event threw (non-fatal):", err);
  }
}

/** Convenience: both sinks, same name, same properties. */
export function trackFunnelEvent(eventType: string, payload?: Record<string, unknown>): void {
  phCapture(eventType, payload);
  trackEvent(eventType, payload);
}
