import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import { isDevBypass } from "@/lib/devBypass";

const CYCLING_MESSAGES = [
  "Reading your answers.",
  "Mapping your archetype.",
  "Shortlisting business options.",
  "Drafting your 30-day plan.",
  "Finishing up.",
];

const CYCLE_INTERVAL = 2800;
const TIMEOUT_MS = 300_000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

type PageState = "generating" | "ready" | "failed" | "timed_out";

export default function Processing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("report_id");

  const [state, setState] = useState<PageState>("generating");
  const [msgIndex, setMsgIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());
  const mountedRef = useRef(true);

  // No report_id → redirect home
  useEffect(() => {
    if (!reportId && !isDevBypass()) {
      navigate("/", { replace: true });
    }
  }, [reportId, navigate]);

  // Cycling messages
  useEffect(() => {
    if (state !== "generating") return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % CYCLING_MESSAGES.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(id);
  }, [state]);

  // Polling
  const poll = useCallback(async () => {
    if (!reportId || !mountedRef.current) return;

    const elapsed = Date.now() - startRef.current;
    if (elapsed >= TIMEOUT_MS) {
      setState("timed_out");
      return;
    }

    try {
      const { data } = await supabase
        .from("reports")
        .select("status")
        .eq("id", reportId)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (data?.status === "teaser_ready") {
        setState("ready");
        // Brief flash then navigate
        setTimeout(() => {
          if (mountedRef.current) {
            navigate(`/teaser?report_id=${reportId}`, { replace: true });
          }
        }, 400);
        return;
      }

      if (data?.status === "failed") {
        setState("failed");
        return;
      }
    } catch {
      // Single failed poll is self-recovering — continue
    }

    if (!mountedRef.current) return;

    // Schedule next poll with adaptive interval
    const nextElapsed = Date.now() - startRef.current;
    let delay: number;
    if (nextElapsed < 10_000) delay = 1000;
    else if (nextElapsed < 30_000) delay = 2000;
    else delay = 3000;

    pollingRef.current = setTimeout(poll, delay);
  }, [reportId, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    if (reportId && state === "generating") {
      pollingRef.current = setTimeout(poll, 1000);
    }
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [reportId, poll, state]);

  const handleRetry = () => {
    // Reset timer and restart polling — DO NOT navigate to /questionnaire,
    // which would wipe the user's Q1-Q17 answers.
    startRef.current = Date.now();
    setState("generating");
    // The useEffect on state === "generating" will start a fresh poll cycle.
  };

  if (!reportId && !isDevBypass()) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar minimal />

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {state === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              {/* Spinner / static indicator */}
              {reducedMotion ? (
                <div className="mb-10 h-10 w-10 rounded-full border-2 border-muted-foreground/30 border-t-[#2ECDB0]" />
              ) : (
                <motion.div
                  className="mb-10 h-10 w-10 rounded-full border-2 border-muted-foreground/30 border-t-[#2ECDB0]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              )}

              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Building your report.
              </h1>

              <p className="mt-3 text-sm text-muted-foreground">
                This usually takes about a minute.
              </p>

              {/* Cycling messages */}
              <div
                className="mt-8 h-6"
                aria-live="polite"
                aria-atomic="true"
              >
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIndex}
                    initial={reducedMotion ? {} : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? {} : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm text-muted-foreground/70"
                  >
                    {CYCLING_MESSAGES[msgIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <p className="mt-8 max-w-md text-xs leading-relaxed text-muted-foreground/70">
                No need to wait here — we've also emailed you a link to your report. You can close this tab and come back when you're ready.
              </p>
            </motion.div>
          )}

          {state === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#2ECDB0]/15">
                <svg className="h-6 w-6 text-[#2ECDB0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Your report is ready.
              </h1>
            </motion.div>
          )}

          {state === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex max-w-md flex-col items-center text-center"
            >
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                We couldn't generate your report.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Something went wrong on our side. Your answers are saved — you can retry without starting over.
              </p>
              <button
                onClick={handleRetry}
                className="mt-8 rounded-lg px-8 py-2.5 text-sm font-semibold text-primary-foreground transition-colors"
                style={{ backgroundColor: "hsl(var(--primary))" }}
              >
                Try again
              </button>
              <a
                href="mailto:support@soloplan.ai"
                className="mt-4 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Contact support
              </a>
            </motion.div>
          )}

          {state === "timed_out" && (
            <motion.div
              key="timed_out"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex max-w-md flex-col items-center text-center"
            >
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Still working on your report.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                This is taking longer than usual. Your answers are saved. You can keep waiting, or check the email we just sent and come back later via the link.
              </p>
              <button
                onClick={handleRetry}
                className="mt-8 rounded-lg px-8 py-2.5 text-sm font-semibold text-primary-foreground transition-colors"
                style={{ backgroundColor: "hsl(var(--primary))" }}
              >
                Keep waiting
              </button>
              <a
                href="mailto:support@soloplan.ai"
                className="mt-4 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Contact support
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
