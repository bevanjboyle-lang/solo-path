import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      const savedReportId = localStorage.getItem("solo_report_id");
      navigate(savedReportId ? `/results?report_id=${savedReportId}&from=payment` : "/");
      return;
    }

    const verify = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (fnError) throw fnError;
        if (data?.paid) {
          const savedReportId = localStorage.getItem("solo_report_id");
          const reportParam = savedReportId ? `report_id=${savedReportId}&` : "";
          setTimeout(() => navigate(`/results?${reportParam}from=payment`), 1500);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    };

    verify();
  }, [navigate, searchParams]);

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
          <h1 className="text-2xl font-semibold tracking-tight">
            {error ? "Something went wrong" : "Payment successful"}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {error
              ? "We couldn't verify your payment. Please contact support."
              : "Redirecting to your full report..."}
          </p>
          {!error && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </motion.div>
      </div>
    </div>
  );
}
