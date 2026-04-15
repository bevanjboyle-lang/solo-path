import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { triggerStripeCheckout, navigateAuthed, resumeSubscription } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import PanelLayout from "@/components/PanelLayout";
import Banner from "@/components/Banner";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const INCLUDES = [
  "Ongoing 30-day tracker",
  "Nine guidance modules",
  "Unlimited Ask Solo",
  "New guidance every week",
  "A fresh test when you need one",
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const fromDay31 = searchParams.get("from") === "day31";
  const paymentCancelled = searchParams.get("payment_cancelled") === "1";

  // Mock state
  const isSubscriber = false;
  const isCancelPending = false;
  const cancelEndDate = "15 May 2026";

  const [checkingOut, setCheckingOut] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState(false);

  const handleCheckout = async (plan: "monthly" | "annual") => {
    setCheckingOut(plan);
    setError(false);
    try {
      const priceId = plan === "monthly" ? "price_sub_monthly" : "price_sub_annual";
      await triggerStripeCheckout(priceId, { email: user?.email });
    } catch {
      setError(true);
    }
    setCheckingOut(null);
  };

  const handleResume = async () => {
    await resumeSubscription();
    toast({ title: "Subscription resumed." });
  };

  const handleBackToPlan = () => navigateAuthed(navigate, "/plan");
  const handleFaqLink = () => navigate("/faq#subscription");

  // Already subscribed
  if (isSubscriber && !isCancelPending) {
    return (
      <div className="min-h-screen flex flex-col text-foreground">
        <TopBar />
        <PanelLayout className="px-6 py-16 sm:px-10">
          <div className="mx-auto max-w-md text-center">
            <h1
              className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              You're already subscribed.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your subscription is active. Head back to your plan.
            </p>
            <Button className="mt-8" onClick={handleBackToPlan}>
              Back to plan
            </Button>
          </div>
        </PanelLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />

      {fromDay31 && (
        <div className="px-6 pt-4">
          <p className="text-center text-xs text-muted-foreground">Your 30 days are complete.</p>
        </div>
      )}

      {paymentCancelled && (
        <div className="px-6">
          <Banner variant="info">No charge made. You can try again whenever you're ready.</Banner>
        </div>
      )}

      {error && (
        <div className="px-6">
          <Banner variant="error">We couldn't open checkout. Please try again.</Banner>
        </div>
      )}

      {isCancelPending && (
        <div className="px-6">
          <Banner variant="info">
            Your subscription is set to end on {cancelEndDate}. Resume it instead.
          </Banner>
        </div>
      )}

      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          {/* Hero */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              Keep your plan alive.
            </h1>
            <p className="mt-4 mx-auto max-w-lg text-sm text-muted-foreground leading-relaxed">
              Your 30-day report is yours forever. The subscription is what keeps the tracker moving after Day 30 — new guidance, unlimited Ask Solo, and the modules you haven't opened yet.
            </p>
          </motion.div>

          {/* Pricing cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Monthly */}
            <GlassCard className="flex flex-col p-6">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-foreground">£19</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <div className="mt-6 flex-1" />
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => handleCheckout("monthly")}
                disabled={checkingOut !== null}
              >
                {checkingOut === "monthly" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Subscribe — £19 / month"
                )}
              </Button>
            </GlassCard>

            {/* Annual */}
            <GlassCard
              className="relative flex flex-col p-6"
              style={{ background: "rgba(46,205,176,0.04)", border: "1px solid rgba(46,205,176,0.2)" }}
            >
              <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                Two months free
              </Badge>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Annual</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-foreground">£149</span>
                <span className="text-sm text-muted-foreground">/ year</span>
              </div>
              <div className="mt-6 flex-1" />
              <Button
                className="w-full mt-4"
                onClick={() => handleCheckout("annual")}
                disabled={checkingOut !== null}
              >
                {checkingOut === "annual" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Subscribe — £149 / year"
                )}
              </Button>
            </GlassCard>
          </div>

          {/* Resume button for cancel-pending */}
          {isCancelPending && (
            <div className="mt-6 text-center">
              <Button onClick={handleResume}>Resume subscription</Button>
            </div>
          )}

          {/* What you get */}
          <div className="mt-12">
            <h3
              className="font-display text-lg font-semibold text-foreground"
              style={{ letterSpacing: "-0.01em" }}
            >
              What you get
            </h3>
            <ul className="mt-4 space-y-2.5">
              {INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your report stays yours whether you subscribe or not.
          </p>

          {/* Tertiary row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <Button variant="ghost" className="text-muted-foreground" onClick={handleBackToPlan}>
              Not right now
            </Button>
            <button
              onClick={handleFaqLink}
              className="text-xs font-medium text-muted-foreground underline hover:text-foreground transition-colors"
            >
              See full subscription FAQ →
            </button>
          </div>
        </div>
      </PanelLayout>
    </div>
  );
}
