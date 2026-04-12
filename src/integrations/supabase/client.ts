import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dnnxmjazillhktwttkux.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubnhtamF6aWxsaGt0d3R0a3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjM5NTEsImV4cCI6MjA5MTIzOTk1MX0.kf_6j2W2Vnw01qaxBrtg4yCJUHVs40Es_WG-IFu53YE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
