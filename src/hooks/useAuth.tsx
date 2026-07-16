import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/*
 * PostHog identity bridge (Day Zero C0.5 follow-through, 2026-07-16).
 * The analytics snippet loads globally in index.html with person_profiles
 * 'identified_only', so nobody gets a person profile until we identify them.
 * Identifying signed-in users by their stable auth id (+ email property):
 *  - makes the PostHog "filter out internal and test users" email filter
 *    actually bite (it can only see identified persons), and
 *  - lets funnels distinguish buyers/subscribers later.
 * reset() fires only on a real SIGNED_OUT transition — never on anonymous
 * page loads — so anonymous device continuity is preserved.
 */
type PostHogLike = {
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};
function posthogClient(): PostHogLike | null {
  const ph = (window as unknown as { posthog?: PostHogLike & { __loaded?: boolean } }).posthog;
  return ph && typeof ph.identify === "function" ? ph : null;
}
function identifyInPostHog(user: User | null) {
  try {
    if (user) posthogClient()?.identify(user.id, { email: user.email });
  } catch { /* analytics must never break auth */ }
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from storage FIRST, then set up listener
    const restoreSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          setSession(null);
          setLoading(false);
          return;
        }
        const { data: { session: restoredSession } } = await supabase.auth.getSession();
        setSession(restoredSession);
        identifyInPostHog(restoredSession?.user ?? null);
      } catch (error) {
        console.error("Error restoring session:", error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // Set up listener AFTER restore to handle future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === "SIGNED_OUT") {
          try { posthogClient()?.reset(); } catch { /* noop */ }
        } else {
          identifyInPostHog(session?.user ?? null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try { localStorage.removeItem("solo_dev_bypass"); } catch {}
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
