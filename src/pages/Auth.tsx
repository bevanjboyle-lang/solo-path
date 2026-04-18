import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { signIn, startTest } from "@/lib/handlers";
import { Loader2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";

type ViewState = "form" | "sent";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTarget = params.get("redirect") || "/plan";
  const expired = params.get("expired") === "true";
  const prefillEmail = params.get("email") || "";

  const [view, setView] = useState<ViewState>("form");
  const [email, setEmail] = useState(prefillEmail);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendDisabledUntil, setResendDisabledUntil] = useState(0);
  const [bannerState, setBannerState] = useState<"transport_error" | "expired" | null>(
    expired ? "expired" : null
  );

  const successH1Ref = useRef<HTMLHeadingElement>(null);

  // Detect Supabase auth errors returned in the URL hash (e.g. expired magic link).
  useEffect(() => {
    if (!window.location.hash) return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("error")) {
      setBannerState("expired");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // Persist the deep-link redirect target so it survives the PKCE round-trip.
  useEffect(() => {
    if (redirectTarget && redirectTarget !== "/plan") {
      sessionStorage.setItem("solo.auth_redirect_target", redirectTarget);
    }
  }, [redirectTarget]);

  // Redirect already-authed users before form paints
  if (!loading && user) {
    return <Navigate to={redirectTarget} replace />;
  }
  if (loading) return null;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // F37: anti-enumeration. Any non-transport response → sent state.
  // Only true transport failures (network/5xx/timeout) keep the form visible.
  const isTransportError = (errMsg?: string): boolean => {
    if (!errMsg) return false;
    const m = errMsg.toLowerCase();
    return (
      m.includes("network") ||
      m.includes("failed to fetch") ||
      m.includes("timeout") ||
      m.includes("timed out") ||
      m.includes("503") ||
      m.includes("502") ||
      m.includes("500") ||
      m.includes("504")
    );
  };

  const handleSend = async () => {
    if (!isValidEmail || submitting) return;
    setBannerState(null);
    setSubmitting(true);

    let result: Awaited<ReturnType<typeof signIn>>;
    try {
      result = await signIn(email.trim(), redirectTarget);
    } catch (err) {
      setSubmitting(false);
      setBannerState("transport_error");
      return;
    }
    setSubmitting(false);

    // Transport-level error → keep form visible, show banner
    if (result.error && isTransportError(result.error)) {
      setBannerState("transport_error");
      return;
    }

    // Everything else (success, rate-limited, unknown email, 4xx) → sent state
    setSubmittedEmail(email.trim());
    setView("sent");
    setTimeout(() => successH1Ref.current?.focus(), 100);
  };

  const handleReset = () => {
    setEmail("");
    setSubmittedEmail("");
    setView("form");
    setBannerState(null);
  };

  const handleResend = async () => {
    if (submitting) return;
    if (Date.now() < resendDisabledUntil) return;
    setSubmitting(true);
    setResendDisabledUntil(Date.now() + 5000);
    try {
      await signIn(submittedEmail, redirectTarget);
    } catch {
      // Silent — anti-enumeration. The banner stays out of sent state.
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar minimal />

      {/* Banners — only transport errors and expired-link messaging surface here */}
      <div aria-live="polite">
        {bannerState === "transport_error" && (
          <Banner variant="error">
            Something went wrong. Please try again.
          </Banner>
        )}
        {bannerState === "expired" && (
          <Banner variant="info">
            That link has expired. Enter your email to get a fresh one.
          </Banner>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[420px]">
          <motion.div
            className="rounded-2xl border border-border bg-[hsl(var(--surface-panel))] p-8 shadow-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              {view === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    Sign in
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We'll email you a one-time link. No password required.
                  </p>

                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="mt-8 space-y-4"
                  >
                    <div>
                      <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Email address
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-md border border-border bg-[hsl(var(--surface-card))] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        autoComplete="email"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!isValidEmail || submitting}
                      className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send magic link"}
                    </button>
                  </form>

                  <p className="mt-4 text-center text-[11px] text-muted-foreground">
                    We'll email you a one-time link. No password, no sign-up.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1
                    ref={successH1Ref}
                    tabIndex={-1}
                    className="font-display text-2xl font-semibold tracking-tight outline-none"
                  >
                    Check your email.
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    We've sent a link to <strong className="text-foreground">{email}</strong>. Click it to sign in. The link expires in 15 minutes.
                  </p>

                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      onClick={handleResend}
                      disabled={submitting}
                      className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {submitting ? "Sending…" : "Send again"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Use a different email
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Safety net link — outside the card */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Haven't taken the test yet?{" "}
            <button
              onClick={() => startTest(navigate)}
              className="font-medium text-primary hover:underline"
            >
              Start here →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
