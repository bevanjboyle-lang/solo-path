import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import GuidanceLibrary from "@/components/guidance/GuidanceLibrary";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Guidance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Check if user has a report (paid) or active subscription
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
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pt-24 pb-16">
        <h1 className="text-2xl font-bold mb-1">Practical Guidance</h1>
        <p className="text-sm text-white/40 mb-8">
          Nine modules to help you navigate going independent.
        </p>

        {hasAccess === null ? (
          <div className="h-40 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasAccess ? (
          <GuidanceLibrary />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center max-w-md mx-auto">
            <Lock className="h-8 w-8 text-white/20 mx-auto mb-4" />
            <p className="text-sm text-white/50 mb-4">
              This feature is available with an active plan. Continue from your tracker page.
            </p>
            <Button
              onClick={() => navigate("/subscribe")}
              className="bg-primary text-primary-foreground hover:bg-[#1FAF97]"
            >
              Keep your plan active
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
