import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Lock, ArrowRight, Zap, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SoloLogo from "@/components/SoloLogo";

const modules = [
  { id: 1, title: "Positioning Your Expertise", desc: "Define what you offer and why clients should choose you." },
  { id: 2, title: "Finding Your First Clients", desc: "Identify and reach the people most likely to pay you." },
  { id: 3, title: "Pricing Your Services", desc: "Set rates that reflect your value and win the work." },
  { id: 4, title: "Building Your Pipeline", desc: "Create a repeatable system for generating leads." },
  { id: 5, title: "Outreach That Converts", desc: "Write messages that get replies and start conversations." },
  { id: 6, title: "Managing Client Relationships", desc: "Deliver great work and turn clients into repeat buyers." },
  { id: 7, title: "Creating Scalable Offers", desc: "Package your knowledge into products that sell without you." },
  { id: 8, title: "Building Your Online Presence", desc: "Show up where your clients are looking for help." },
  { id: 9, title: "From Freelancer to Business", desc: "Move from trading time to building something lasting." },
];

export default function Modules() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("subscription_active")
        .eq("user_id", user.id)
        .maybeSingle();
      setSubscriptionActive(data?.subscription_active ?? false);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-10">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Solo Modules
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nine guided modules to take you from idea to income.
            </p>
          </div>

          {subscriptionActive === false ? (
            <Card className="bg-card border-border/50 max-w-lg mx-auto">
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-5">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Unlock all modules
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Modules are available to Solo subscribers. Upgrade to access all nine guided modules, plus check-ins and replanning.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={() => navigate("/pricing")}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Zap className="h-4 w-4 mr-1.5" />
                    View Plans
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className="w-full sm:w-auto"
                  >
                    Compare Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <Card
                  key={m.id}
                  className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/modules/${m.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                        {m.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground leading-snug">{m.title}</h3>
                        <p className="mt-1.5 text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
