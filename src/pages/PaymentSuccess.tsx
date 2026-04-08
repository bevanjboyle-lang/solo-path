import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <span className="text-base font-semibold tracking-tight">Solo</span>
        </div>
      </nav>

      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment successful</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your full Solo Plan B report is now unlocked. Thank you for your purchase.
          </p>
          <button
            onClick={() => navigate("/results")}
            className="mt-4 inline-flex items-center rounded-lg px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            style={{ background: "var(--gradient-cta)" }}
          >
            View your report →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
