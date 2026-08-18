import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Sprint 1: guard missing env at module load. createClient throws on a missing
// URL, which blanked the whole app on misconfigured builds; prod always sets
// these, so the placeholder only ever serves a broken build a visible page.
const FALLBACK_SUPABASE_URL = "https://missing-env.invalid.supabase.co";
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "Supabase env missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Running with a non-functional placeholder client; data calls will fail.",
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL || FALLBACK_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY || "missing-publishable-key", {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: true,
  }
});
