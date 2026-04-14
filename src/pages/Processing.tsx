import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Processing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState(false);

  const generate = useCallback(async () => {
    if (!user) return;
    setError(false);

    try {
      // Fetch saved answers
      const { data: qr } = await supabase
        .from("questionnaire_responses")
        .select("answers")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!qr?.answers) throw new Error("No questionnaire answers found");

      const { data, error: fnErr } = await supabase.functions.invoke("generate-report", {
        body: { answers: qr.answers },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      const reportId = data?.reportId || data?.report_id;
      if (!reportId || reportId === 'undefined') {
        console.error('generate-report did not return a valid reportId:', data);
        setError(true);
        return;
      }

      navigate(`/teaser?report_id=${reportId}`);
    } catch (err) {
      console.error("Report generation failed:", err);
      setError(true);
    }
  }, [user, navigate]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            We couldn't generate your report. Please try again.
          </p>
          <button
            onClick={generate}
            className="mt-2 inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            style={{ background: "var(--gradient-cta)" }}
          >
            Try again
          </button>
        </motion.div>
      ) : (
        <>
          <motion.div
            className="mb-10 h-10 w-10 rounded-full border-2 border-border border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
          <motion.h1
            className="text-2xl font-semibold text-foreground sm:text-3xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Building your Plan B report...
          </motion.h1>
          <motion.p
            className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            This takes about 30 seconds. We're analysing your profile against our business model library.
          </motion.p>
        </>
      )}
    </div>
  );
}
