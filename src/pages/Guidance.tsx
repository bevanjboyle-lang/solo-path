import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GuidanceLibrary from "@/components/guidance/GuidanceLibrary";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function Guidance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: reports }, { data: profile }] = await Promise.all([
        supabase.from("reports").select("id").eq("user_id", user.id).limit(1),
        supabase.from("user_profiles").select("subscription_active").eq("user_id", user.id).maybeSingle(),
      ]);
      setHasAccess(
        (reports && reports.length > 0) || profile?.subscription_active === true
      );
    })();
  }, [user]);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ background: "linear-gradient(180deg, rgba(46,205,176,0.03) 0%, transparent 30%)" }}
    >
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pt-24 pb-16">
        <ScrollReveal>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D2025" }}>
            Practical Guidance
          </h1>
          <p className="text-sm mb-8" style={{ color: "#5A5650" }}>
            Nine modules to help you navigate going independent.
          </p>
        </ScrollReveal>

        {hasAccess === null ? (
          <div className="h-40 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasAccess ? (
          <GuidanceLibrary />
        ) : (
          <ScrollReveal delay={0.1}>
            <div className="rounded-xl border border-border bg-muted/30 p-10 text-center max-w-md mx-auto">
              <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                This feature is available with an active plan. Continue from your tracker page.
              </p>
              <Button
                onClick={() => navigate("/subscribe")}
                className="bg-primary text-primary-foreground hover:bg-[#1FAF97]"
              >
                Keep your plan active
              </Button>
            </div>
          </ScrollReveal>
        )}
      </main>
    </div>
  );
}
