import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Copy, Check, ArrowRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface OutreachDraft {
  format: string;
  subject?: string;
  body: string;
  tone_note?: string;
  personalisation_instructions?: string;
}

interface FirstMove {
  action: string;
  window: string;
  why_first: string;
  outreach_draft: OutreachDraft;
  follow_up_prompt: string;
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);
  const [firstMove, setFirstMove] = useState<FirstMove | null>(null);
  const [resultsUrl, setResultsUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showDraft, setShowDraft] = useState(false);

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
          const url = `/results?${reportParam}from=payment`;

          // Try to surface First Move from the already-generated report
          if (savedReportId) {
            const { data: report } = await supabase
              .from("reports")
              .select("activation_plan")
              .eq("id", savedReportId)
              .single();

            const fm = (report?.activation_plan as any)?.first_move;
            if (fm?.action && fm?.outreach_draft) {
              setFirstMove(fm);
              setResultsUrl(url);
              return;
            }
          }

          // Fallback: no first_move, navigate directly
          setTimeout(() => navigate(url), 1500);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    };

    verify();
  }, [navigate, searchParams]);

  const handleCopy = () => {
    if (!firstMove?.outreach_draft?.body) return;
    const text = firstMove.outreach_draft.subject
      ? `Subject: ${firstMove.outreach_draft.subject}\n\n${firstMove.outreach_draft.body}`
      : firstMove.outreach_draft.body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── First Move view ──────────────────────────────────────────────────────────
  if (firstMove && resultsUrl) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
            <span className="text-base font-semibold tracking-tight">Solo</span>
          </div>
        </nav>

        <div className="mx-auto max-w-2xl px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-8"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">Your First Move</p>
                <h1 className="text-xl font-semibold tracking-tight">Do this in the next 24 hours</h1>
              </div>
            </div>

            {/* Action card */}
            <div className="rounded-xl border border-border/60 bg-card p-6 flex flex-col gap-4">
              <p className="text-base font-medium leading-snug">{firstMove.action}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{firstMove.why_first}</p>

              {/* Outreach draft toggle */}
              <button
                onClick={() => setShowDraft(!showDraft)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors w-fit"
              >
                {showDraft
                  ? "Hide draft"
                  : `See the ${firstMove.outreach_draft.format === "email" ? "email" : "message"} draft`}
                <ArrowRight
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${showDraft ? "rotate-90" : ""}`}
                />
              </button>

              {showDraft && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3 border-t border-border/40 pt-4"
                >
                  {firstMove.outreach_draft.subject && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Subject</p>
                      <p className="text-sm">{firstMove.outreach_draft.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Message</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{firstMove.outreach_draft.body}</p>
                  </div>
                  {firstMove.outreach_draft.personalisation_instructions && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                      {firstMove.outreach_draft.personalisation_instructions}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="self-start gap-2"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy draft"}
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Continue to full report */}
            <Button
              onClick={() => navigate(resultsUrl)}
              className="self-start gap-2"
            >
              View your full report
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Default payment confirmation (while verifying / fallback) ────────────────
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
