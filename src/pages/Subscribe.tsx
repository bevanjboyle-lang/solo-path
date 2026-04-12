import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowLeft, Zap, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrackerSession } from "@/hooks/useTrackerSession";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SoloLogo from "@/components/SoloLogo";

const plans = [
  {
    id: "monthly" as const,
    name: "Monthly",
    price: "\u00a39.99",
    period: "/month",
    description: "Flexible, cancel anytime.",
    features: [
      "Daily AI check-ins",
      "Adaptive replanning",
      "Extended tracking beyond 30 days",
      "Priority support",
    ],
  },
  {
    id: "annual" as const,
    name: "Annual",
    price: "\u00a389",
    period: "/year",
    savings: "Save 26%",
    description: "Best value for committed professionals.",
    features: [
      "Everything in Monthly",
      "Two months free",
      "Early access to new features",
      "Priority support",
    ],
    highlighted: true,
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, subscribe, isSubscribed, loading } = useTrackerSession();
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSubscribed) {
    navigate("/manage-subscription", { replace: true });
    return null;
  }

  const handleCheckout = async () => {
    if (!session) {
      navigate("/questionnaire");
      return;
    }
    setSubmitting(true);
    try {
      const url = await subscribe(selected);
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
    }
    setSubmitting(false);
  };

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

      <main className="flex flex-1 items-center justify-center px-6 pt-20 pb-16">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Keep your plan active
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
              Your profile, your plan, and everything you've built over the last 30 days stays live.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`relative cursor-pointer transition-all ${
                  selected === plan.id
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border/50 hover:border-border"
                } bg-card`}
              >
                {plan.savings && (
                  <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                    {plan.savings}
                  </Badge>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        selected === plan.id ? "border-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {selected === plan.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium text-foreground">{plan.name}</span>
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full max-w-sm h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1.5" />
                  {selected === "annual" ? "Full year of support" : "Keep your plan active"}  - {selected === "annual" ? "£149" : "£9.99/month"}
                </>
              )}
            </Button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="h-3 w-3" />
              Secure checkout via Stripe. Cancel anytime.
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
