import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Copy, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import SoloLogo from "@/components/SoloLogo";

interface ProvisionalFirstMove {
  action_text: string;
  why_first: string;
  draft_message: {
    format?: string;
    subject?: string;
    body: string;
  };
  follow_up_prompt: string;
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);
  const [provisionalFirstMove, setProvisionalFirstMove] = useState<ProvisionalFirstMove | null>(null);
  const [resultsUrl, setResultsUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

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
          setResultsUrl(url);
          setVerified(true);

          // Try to load provisional_first_move from report
          if (savedReportId) {
            const { data: report } = await supabase
              .from("reports")
              .select("core_report")
              .eq("id", savedReportId)
              .single();

            const pfm = (report?.core_report as any)?.provisional_first_move;
            if (pfm?.action_text && pfm?.draft_message) {
              setProvisionalFirstMove(pfm);
              return;
            }

            // Also check activation_plan.first_move as fallback
            const { data: report2 } = await supabase
              .from("reports")
              .select("activation_plan")
              .eq("id", savedReportId)
              .single();
            const fm = (report2?.activation_plan as any)?.first_move;
            if (fm?.action && fm?.outreach_draft) {
              setProvisionalFirstMove({
                action_text: fm.action,
                why_first: fm.why_first || "",
                draft_message: {
                  format: fm.outreach_draft.format,
                  subject: fm.outreach_draft.subject,
                  body: fm.outreach_draft.body,
                },
                follow_up_prompt: fm.follow_up_prompt || "We'll ask you about this tomorrow.",
              });
              return;
            }
          }
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
    if (!provisionalFirstMove?.draft_message?.body) return;
    const text = provisionalFirstMove.draft_message.subject
      ? `Subject: ${provisionalFirstMove.draft_message.subject}\n\n${provisionalFirstMove.draft_message.body}`
      : provisionalFirstMove.draft_message.body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen text-foreground">
        <nav className="border-b border-border/50/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
            <SoloLogo width={100} height={28} />
          </div>
        </nav>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <CheckCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">We couldn't verify your payment. Please contact support.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Still verifying
  if (!verified) {
    return (
      <div className="min-h-screen text-foreground">
        <nav className="border-b border-border/50/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
            <SoloLogo width={100} height={28} />
          </div>
        </nav>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying payment...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <nav className="border-b border-border/50/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <SoloLogo width={100} height={28} />
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-8">
          {/* Section 1: Confirmation */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Payment confirmed. Your full report is ready.</h1>
            </div>
          </div>

          {/* Section 2: Provisional First Move (if available) */}
          {provisionalFirstMove && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">Before you read your report: do this one thing.</h2>
                <p className="mt-1 text-sm text-muted-foreground">The best time to act is before the planning starts. This is based on your top-ranked option.</p>
              </div>

              {/* Action text */}
              <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
                <p className="text-base font-medium leading-snug text-foreground">{provisionalFirstMove.action_text}</p>
                {provisionalFirstMove.why_first && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{provisionalFirstMove.why_first}</p>
                )}

                {/* Draft message card */}
                <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-3">
                  {provisionalFirstMove.draft_message.subject && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-1">Subject</p>
                      <p className="text-sm text-foreground">{provisionalFirstMove.draft_message.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 mb-1">Message</p>
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{provisionalFirstMove.draft_message.body}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy message"}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground italic">We'll ask you about this tomorrow.</p>
              </div>
            </motion.div>
          )}

          {/* Section 3: CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: provisionalFirstMove ? 0.4 : 0.2, duration: 0.4 }}
          >
            <Button
              onClick={() => navigate(resultsUrl)}
              className="gap-2"
              style={{ background: "var(--gradient-cta)" }}
            >
              View your full report
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}