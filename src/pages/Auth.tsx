import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { signIn, startTest } from "@/lib/handlers";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";

/*
 * Auth — Pass 1 /auth v1 (2026-05-17)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Narrow
 * ivory panel (460px) sits high on the page (not vertically centred —
 * the user is mid-transition, not in a "moment"). Sent state is a
 * composition shift inside the same card.
 *
 * Locked decisions from admin/pass-1-auth-decisions.md:
 *   F1 — Labelled eyebrow "Returning sign-in · magic link" (not dot-only)
 *   F2 — Sent-state eyebrow with tick glyph + "Sent · link valid 15 minutes"
 *   F3 — Safety-net link outside the card, on the photo background
 *   F4 — Faint dot leading the trust line (non-mint, deliberate)
 *   F5 — Period-ended H1s ("Sign in." / "Check your email.") — system convention
 *
 * Dark-card cadence: zero. Utility surface, per design-direction.md v1.4 §8.
 *
 * Preserves existing logic:
 *   - safeRedirectTarget (F95 open-redirect defence)
 *   - anti-enumeration discipline (non-transport errors → sent state silently)
 *   - hash-based expired-link detection
 *   - sessionStorage redirect-target persistence across PKCE round-trip
 *   - resend rate-limit guard
 *   - magic-link only, no password, no sign-up — three locked product principles
 *   - already-authed redirect before form paints
 *
 * Drops framer-motion AnimatePresence — editorial register lands instantly
 * per the spine precedent.
 */

type ViewState = "form" | "sent";
type BannerState = "transport_error" | "expired" | null;

// F95 (2026-05-08): validate ?redirect=... before honouring. Must be a
// same-origin internal path. Blocks //evil.com, javascript:, etc.
function safeRedirectTarget(raw: string | null): string {
  const fallback = "/plan";
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (/[\\\x00-\x1f]/.test(raw)) return fallback;
  return raw;
}

// F37: anti-enumeration — only true transport failures keep the form
// visible. Everything else routes to the sent state so unknown emails
// look identical to known ones.
function isTransportError(errMsg?: string): boolean {
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
}

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTarget = safeRedirectTarget(params.get("redirect"));
  const expired = params.get("expired") === "true";
  const prefillEmail = params.get("email") || "";

  const [view, setView] = useState<ViewState>("form");
  const [email, setEmail] = useState(prefillEmail);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendDisabledUntil, setResendDisabledUntil] = useState(0);
  const [bannerState, setBannerState] = useState<BannerState>(expired ? "expired" : null);

  const successH1Ref = useRef<HTMLHeadingElement>(null);

  // Hash-based expired-link detection (Supabase auth errors come back in the URL fragment).
  useEffect(() => {
    if (!window.location.hash) return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("error")) {
      setBannerState("expired");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // Persist deep-link redirect target so it survives the PKCE round-trip.
  useEffect(() => {
    if (redirectTarget && redirectTarget !== "/plan") {
      sessionStorage.setItem("solo.auth_redirect_target", redirectTarget);
    }
  }, [redirectTarget]);

  // Redirect already-authed users before form paints.
  if (!loading && user && !isDevBypass()) {
    return <Navigate to={redirectTarget} replace />;
  }
  if (loading) return null;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    if (!isValidEmail || submitting) return;
    setBannerState(null);
    setSubmitting(true);

    let result: Awaited<ReturnType<typeof signIn>>;
    try {
      result = await signIn(email.trim(), redirectTarget);
    } catch {
      setSubmitting(false);
      setBannerState("transport_error");
      return;
    }
    setSubmitting(false);

    if (result.error && isTransportError(result.error)) {
      setBannerState("transport_error");
      return;
    }

    // Anti-enumeration: success, rate-limited, unknown email, 4xx — all → sent.
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
      // Silent — anti-enumeration. Banner does not surface on sent state.
    }
    setSubmitting(false);
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal />

      <main className="pt-6">
        <section className="py-10 lg:py-16">
          <div className="mx-auto w-full max-w-md px-6">
            <div>
              {/* In-card banners sit above the eyebrow, push content down */}
              {bannerState === "transport_error" && (
                <CardBanner tone="error" label="Couldn't send" message="We couldn't send the link right now. Please try again in a moment." />
              )}
              {bannerState === "expired" && (
                <CardBanner tone="info" label="Expired link" message="That link has expired. Enter your email to get a fresh one." />
              )}

              {view === "form" ? (
                <FormBody
                  email={email}
                  isValidEmail={isValidEmail}
                  submitting={submitting}
                  onEmailChange={setEmail}
                  onSubmit={handleSend}
                  onStartTest={() => startTest(navigate)}
                />
              ) : (
                <SentBody
                  submittedEmail={submittedEmail}
                  submitting={submitting}
                  onResend={handleResend}
                  onReset={handleReset}
                  successH1Ref={successH1Ref}
                  onStartTest={() => startTest(navigate)}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────── Form (default) ─────────────────────────── */

function FormBody({
  email,
  isValidEmail,
  submitting,
  onEmailChange,
  onSubmit,
  onStartTest,
}: {
  email: string;
  isValidEmail: boolean;
  submitting: boolean;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
  onStartTest: () => void;
}) {
  return (
    <div className="pt-6 pb-8">
      {/* Eyebrow */}
      <div className="flex items-center gap-3">
        <span className="eyebrow">Returning sign-in</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground text-[12px]">
          magic link
        </span>
      </div>

      <h1 className="mt-5 title-h1">
        Sign in.
      </h1>
      <p className="standfirst mt-3">
        We'll email you a one-time link. No password required.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-8 space-y-5"
      >
        <div className="space-y-2">
          <label
            htmlFor="auth-email"
            className="eyebrow--muted text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@work-or-personal.com"
            autoComplete="email"
            autoFocus
            className="w-full bg-white border border-border px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!isValidEmail || submitting}
          className={`w-full px-6 py-3 text-[14px] font-semibold transition-colors flex items-center justify-center gap-2 ${
            isValidEmail && !submitting
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-[#E5E2DC] text-muted-foreground/70 cursor-not-allowed"
          }`}
        >
          {submitting && (
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {submitting ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {/* Trust line — hairline above, faint dot leading, two-sentence auth contract */}
      <div className="mt-7 pt-5 border-t border-border">
        <p className="flex items-start gap-3 text-[12.5px] text-muted-foreground leading-relaxed">
          <span className="inline-block w-1 h-1 rounded-full bg-[#C8C3BA] mt-2 shrink-0" />
          <span>
            <strong className="font-semibold text-foreground">No password, no sign-up.</strong>{" "}
            You become an account at the moment of payment, not before.
          </span>
        </p>
      </div>

      {/*
       * Safety-net link — inside the card per the 2026-05-18 contrast fix.
       * Originally rendered outside the panel on the photo background per
       * Pass 1 /auth F3, but grey-on-grey-photo contrast was unreadable on
       * live. Moved inside the card with subordinate centred styling — the
       * visual hierarchy (small, muted, beneath the trust line) preserves
       * the "this is a backstop, not the encouraged path" intent without
       * relying on photo-background contrast.
       */}
      <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
        New here?{" "}
        <button
          type="button"
          onClick={onStartTest}
          className="text-foreground border-b border-[#D8D4CC] hover:border-foreground transition-colors"
        >
          Find what works →
        </button>
      </p>
    </div>
  );
}

/* ─────────────────────────── Sent (success) ─────────────────────────── */

function SentBody({
  submittedEmail,
  submitting,
  onResend,
  onReset,
  successH1Ref,
  onStartTest,
}: {
  submittedEmail: string;
  submitting: boolean;
  onResend: () => void;
  onReset: () => void;
  successH1Ref: React.RefObject<HTMLHeadingElement>;
  onStartTest: () => void;
}) {
  return (
    <div className="pt-6 pb-8">
      {/* Sent eyebrow — tick replaces mint dot */}
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-[#15735F]">Sent</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
          link valid 15 minutes
        </span>
      </div>

      <h1
        ref={successH1Ref}
        tabIndex={-1}
        className="mt-5 title-h1 outline-none"
      >
        Check your email.
      </h1>

      <div className="mt-5 space-y-4">
        <p className="text-[14.5px] text-foreground leading-relaxed">
          Click the link we just sent to sign in.
        </p>

        {/* Monospaced verifiable email line — anti-enumeration cover */}
        <div className="bg-[#F3F1ED] border border-border px-4 py-3 flex items-baseline gap-3 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0">
            Sent to
          </span>
          <span
            className="text-[13px] text-foreground break-all"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {submittedEmail}
          </span>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <strong className="font-semibold text-foreground">The link expires in 15 minutes.</strong>{" "}
          If you don't see it, check your spam folder.
        </p>
      </div>

      {/* Sent actions — hairline above, two tertiary text links, faint middle dot */}
      <div className="mt-7 pt-5 border-t border-border flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onResend}
          disabled={submitting}
          className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Sending…" : "Send again"}
        </button>
        <span className="text-muted-foreground/40">·</span>
        <button
          type="button"
          onClick={onReset}
          className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
        >
          Use a different email
        </button>
      </div>

      {/*
       * Safety-net link — inside the card per the 2026-05-18 contrast fix.
       * See FormBody for the rationale. Same subordinate centred styling on
       * both states so the backstop is consistently reachable whether the
       * user is on the form or the sent confirmation.
       */}
      <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
        New here?{" "}
        <button
          type="button"
          onClick={onStartTest}
          className="text-foreground border-b border-[#D8D4CC] hover:border-foreground transition-colors"
        >
          Find what works →
        </button>
      </p>
    </div>
  );
}

/* ─────────────────────────── In-card banner ─────────────────────────── */

function CardBanner({
  tone,
  label,
  message,
}: {
  tone: "error" | "warning" | "info";
  label: string;
  message: string;
}) {
  // Tone vocabulary inherited from /teaser banners.
  // info uses mint-tint (the welcome-back / quietly-positive register).
  const styles = (() => {
    switch (tone) {
      case "error":
        return {
          bg: "bg-red-50/60",
          rule: "border-red-600",
          dot: "bg-red-600",
          label: "text-red-700",
        };
      case "warning":
        return {
          bg: "bg-amber-50/70",
          rule: "border-amber-600",
          dot: "bg-amber-600",
          label: "text-amber-700",
        };
      case "info":
        return {
          bg: "bg-[#E8F7F3]",
          rule: "border-primary",
          dot: "bg-primary",
          label: "text-[#15735F]",
        };
    }
  })();

  return (
    <div className={`${styles.bg} border-l-2 ${styles.rule} px-6 py-3 flex items-start gap-3`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot} mt-1.5 shrink-0`} />
      <div className="text-[13px] leading-relaxed">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.label} mr-3`}>
          {label}
        </span>
        <span className="text-foreground">{message}</span>
      </div>
    </div>
  );
}
