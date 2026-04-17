import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";

type BridgeState =
  | "exchanging"    // default on mount
  | "polling"       // session set, polling readiness
  | "delayed"       // 10s elapsed, not ready
  | "ready"         // all state present, flash then navigate
  | "stuck"         // 60s elapsed
  | "token_error"   // invalid/expired token
  | "network_error" // can't reach servers
  | "no_token";     // redirect handled

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const flowType = searchParams.get("type");
  const isSecondReport = flowType === "second_report";

  const [state, setState] = useState<BridgeState>(token ? "exchanging" : "no_token");
  const [hasSession, setHasSession] = useState(false);
  const [secondReportClaiming, setSecondReportClaiming] = useState(isSecondReport);
  const elapsedRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // No token → redirect to /
  useEffect(() => {
    // For second_report flow, user is already authed — no token required
    if (!token && !isSecondReport) navigate("/", { replace: true });
  }, [token, isSecondReport, navigate]);

  // Second-report flow: claim and navigate to /cv-upload
  useEffect(() => {
    if (!isSecondReport) return;
    let cancelled = false;
    (async () => {
      const { claimSecondReport } = await import("@/lib/handlers");
      const result = await claimSecondReport(navigate);
      if (cancelled) return;
      if (result.error || result.reason === "cap_reached") {
        const { toast } = await import("sonner");
        toast.error(result.error || "Couldn't set up your second report.");
        navigate("/account", { replace: true });
        return;
      }
      // Handler navigates to /cv-upload on eligible
      setSecondReportClaiming(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSecondReport, navigate]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // Poll readiness
  const pollReadiness = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-account-readiness", {
        body: {},
      });

      if (!mountedRef.current) return;

      if (error) {
        // Single poll failure — self-recovering, don't change state
        scheduleNextPoll();
        return;
      }

      if (data?.ready) {
        setState("ready");
        // Brief flash then navigate
        setTimeout(() => {
          if (mountedRef.current) navigate("/plan", { replace: true });
        }, 400);
        return;
      }

      // Not ready yet
      scheduleNextPoll();
    } catch {
      if (mountedRef.current) scheduleNextPoll();
    }
  }, [navigate]);

  const scheduleNextPoll = useCallback(() => {
    if (!mountedRef.current) return;

    elapsedRef.current += getInterval();

    if (elapsedRef.current >= 60) {
      setState("stuck");
      return;
    }

    if (elapsedRef.current >= 10) {
      setState((prev) => (prev === "ready" || prev === "stuck" ? prev : "delayed"));
    }

    pollingRef.current = setTimeout(pollReadiness, getInterval() * 1000);
  }, [pollReadiness]);

  function getInterval(): number {
    if (elapsedRef.current < 10) return 1;
    return 2;
  }

  // Exchange token on mount
  useEffect(() => {
    if (!token || state !== "exchanging") return;

    const exchange = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("exchange-payment-token", {
          body: { token },
        });

        if (!mountedRef.current) return;

        if (error || !data?.session) {
          setState("token_error");
          return;
        }

        // Set supabase session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (!mountedRef.current) return;

        if (sessionError) {
          setState("token_error");
          return;
        }

        setHasSession(true);
        setState("polling");
        pollReadiness();
      } catch {
        if (mountedRef.current) setState("network_error");
      }
    };

    exchange();
  }, [token, state, pollReadiness]);

  // Retry handler for network errors and delayed state
  const handleRetry = useCallback(() => {
    if (state === "network_error") {
      setState("exchanging");
    } else if (state === "delayed") {
      elapsedRef.current = 0;
      pollReadiness();
    }
  }, [state, pollReadiness]);

  if (!token) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar minimal={!hasSession} />

      {/* Stuck banner */}
      {state === "stuck" && (
        <Banner variant="warning">
          Your payment worked, but we're catching up. Your report is safe. We're having trouble completing the handover. Please email support — we'll sort it out manually.
        </Banner>
      )}

      {/* Token error banner */}
      {state === "token_error" && (
        <Banner variant="error">
          This link is no longer valid. Please sign in with the magic link we emailed you.
        </Banner>
      )}

      {/* Network error banner */}
      {state === "network_error" && (
        <Banner variant="error">
          We can't reach our servers. Check your connection and try again.
        </Banner>
      )}

      {/* Centred content */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md text-center" aria-live="polite">
          <AnimatePresence mode="wait">
            {/* Exchanging / Polling — happy path */}
            {(state === "exchanging" || state === "polling") && (
              <motion.div
                key="exchanging"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  Setting up your account.
                </h1>
                <p className="text-sm text-muted-foreground">This takes a few seconds.</p>
                <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
              </motion.div>
            )}

            {/* Delayed */}
            {state === "delayed" && (
              <motion.div
                key="delayed"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  Almost there.
                </h1>
                <p className="text-sm text-muted-foreground">
                  Our system is catching up. This usually clears in a few seconds.
                </p>
                <Loader2 className="mt-2 h-5 w-5 animate-spin text-muted-foreground" />
                <div className="mt-4 flex flex-col items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleRetry}>
                    Try now
                  </Button>
                  <a
                    href="mailto:support@soloplanb.com"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact support
                  </a>
                </div>
              </motion.div>
            )}

            {/* Ready — brief flash */}
            {state === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  Your report is ready.
                </h1>
              </motion.div>
            )}

            {/* Stuck — content in banner, just support CTA here */}
            {state === "stuck" && (
              <motion.div
                key="stuck"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  Your payment worked, but we're catching up.
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your report is safe. We're having trouble completing the handover. Please email support — we'll sort it out manually.
                </p>
                <a
                  href="mailto:support@soloplanb.com"
                  className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Contact support
                </a>
              </motion.div>
            )}

            {/* Token error */}
            {state === "token_error" && (
              <motion.div
                key="token_error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  This link is no longer valid.
                </h1>
                <p className="text-sm text-muted-foreground">
                  Please sign in with the magic link we emailed you.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/auth")}
                  className="mt-2"
                >
                  Go to sign-in
                </Button>
              </motion.div>
            )}

            {/* Network error */}
            {state === "network_error" && (
              <motion.div
                key="network_error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  Connection issue.
                </h1>
                <p className="text-sm text-muted-foreground">
                  We can't reach our servers. Check your connection and try again.
                </p>
                <Button variant="secondary" onClick={handleRetry} className="mt-2">
                  Retry
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
