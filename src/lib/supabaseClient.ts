// ADR-013: Wrap window.fetch so every Supabase call (REST, edge functions,
// auth endpoints) carries X-Client-Session-Id. We cannot replace the
// auto-generated client at src/integrations/supabase/client.ts, so we install
// a global fetch interceptor that adds the header for any request to the
// Supabase project host. Existing headers from `init` are preserved verbatim;
// only X-Client-Session-Id is added.

import { supabase } from "@/integrations/supabase/client";
import { getClientSessionId } from "./clientSession";

// Sprint 1: guard the module-load URL parse; an unset VITE_SUPABASE_URL used to
// throw here and blank the whole app. Empty host disables the interceptor below.
const SUPABASE_HOST = (() => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL!).host;
  } catch {
    console.error("VITE_SUPABASE_URL is unset or invalid; the client-session header interceptor is disabled.");
    return "";
  }
})();

let installed = false;

export function installSupabaseFetchHeader() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    let url: string;
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else url = input.url;

    if (SUPABASE_HOST && url.includes(SUPABASE_HOST)) {
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      headers.set("X-Client-Session-Id", getClientSessionId());
      return originalFetch(input, { ...init, headers });
    }
    return originalFetch(input, init);
  };
}

// Re-export the canonical client for convenience.
export { supabase };
