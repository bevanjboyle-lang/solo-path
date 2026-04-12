import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrackerSession } from "@/hooks/useTrackerSession";
import SoloLogo from "@/components/SoloLogo";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useTrackerSession();

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-6">
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-6">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>

        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Your plan is active.
        </h1>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your profile, your plan, and everything you've built over the last 30 days stays live. You have full access to daily check-ins, adaptive replanning, and extended tracking.
        </p>

        <div className="mt-8 space-y-3">
          <Button
            onClick={() => navigate("/tracker")}
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Go to Tracker
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
