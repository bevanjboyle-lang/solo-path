import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";
import SoloLogo from "@/components/SoloLogo";

/*
 * PaymentSuccess — Pass 1 /payment-success v1 (2026-05-17)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Inherits
 * /processing's shell exactly (single ivory panel ~760px, typography-led
 * + heartbeat dot composition) so the user perceives one continuous flow
 * from /processing → Stripe → here. The screen is the calmer cousin of
 * /processing: same vocabulary, less content, even quieter motion.
 *
 * Locked decisions from admin/pass-1-payment-success-decisions.md:
 *   F1 — Heartbeat status sentence static (not cycling). Wait is too short.
 *   F2 — "Try now" on delayed state is SECONDARY (not mint primary).
 *        Auto-retry is the encouraged path.
 *   F3 — Reference row on delayed + stuck (Stripe checkout session prefix
 *        + timestamp + on stuck, stage qualifier).
 *   F4 — Receipt-reassurance paragraph on stuck state, clinical phrasing
 *        ("Your money is not at risk.").
 *
 *   Tonal anchor — "Payment received" mint clause in the eyebrow is the
 *   screen's single tonal moment. No confetti, no "Welcome to Solo!", no
 *   mint checkmark badge, no welcome tour, no upsell. The absence IS the
 *   design.
 *
 *   Ready-flash says "Your account is ready." not /processing's "Your
 *   report is ready." — the meaningful state shift here is the account
 *   handover, not report completion.
 *
 *   Top bar flips from anon to authed at token-exchange success (~1s),
 *   independently of the polling loop. Bar's right-side content swaps;
 *   no slide-in animation (would have been louder at exactly the moment
 *   we're keeping calm).
 *
 *   Webhook-stuck inverts the action hierarchy — "Email support" becomes
 *   mint primary, "Try again" demotes to tertiary text link. Same
 *   inverted-hierarchy move as the refusal modal on /questionnaire.
 *
 * Dark-card cadence: zero. Transition surface, per design-direction.md v1.4 §8.
 *
 * Preserves existing logic (F74 fix):
 *   - Token exchange via exchange-payment-token edge function (idempotent
 *     first call, errors on second call for same token).
 *   - Direct reports.status query instead of get-account-readiness polling
 *     (the readiness function waits on tracker_sessions.active which
 *     never fires under ADR-019 because the user must first land on /plan
 *     to pick strands and trigger generate-plan).
 *   - status === "pending_selection" → immediate redirect to /plan (no
 *     flash) so StrandSelector takes over.
 *   - status === "complete" → 400ms ready-flash then navigate to /plan.
 *   - Second-report flow dedicated path (no token, calls claimSecondReport,
 *     navigates to /cv-upload or /account).
 *   - 10s → delayed state, 60s → stuck state polling thresholds.
 */

type BridgeState =
  | "exchanging"     // default on mount with token
  | "polling"        // session set, polling readiness
  | "delayed"        // 10s elapsed, not ready
  | "ready"          // status === "complete", flash then navigate
  | "stuck"          // 60s elapsed
  | "token_error"    // invalid/expired token
  | "network_error"  // can't reach servers during exchange
  | "no_token";      // redirect handled in useEffect

const HEARTBEAT_STATUS_DEFAULT = "Attaching your report.";
const READY_FLASH_STATUS = "Your account is ready.";
const READY_FLASH_MS = 400;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTimestamp(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  let tz = "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" }).formatToParts(d);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart) tz = ` ${tzPart.value}`;
  } catch {
    /* no-op */
  }
  return `${hh}:${mm}${tz}`;
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const flowType = searchParams.get("type");
  const isSecondReport = flowType === "second_report";

  const reportId = searchParams.get("report_id");

  const [state, setState] = useState<BridgeState>(token ? "exchanging" : "no_token");
  const [hasSession, setHasSession] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusText, setStatusText] = useState<string>(HEARTBEAT_STATUS_DEFAULT);
  const [statusTone, setStatusTone] = useState<"default" | "ready">("default");
  const [startedAt] = useState<Date>(() => new Date());

  const elapsedRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  /* ─── Token-bouncing / second-report effects (unchanged from prior) ─── */

  useEffect(() => {
    if (token || isSecondReport || isDevBypass()) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      navigate(data?.session ? "/plan" : "/", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isSecondReport, navigate]);

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
    })();
    return () => {
      cancelled = true;
    };
  }, [isSecondReport, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  /* ─── Elapsed counter tick ─── */
  useEffect(() => {
    if (state === "ready" || state === "stuck" || state === "token_error" || state === "network_error") return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startedAt.getTime());
    }, 1000);
    setElapsedMs(Date.now() - startedAt.getTime());
    return () => clearInterval(id);
  }, [state, startedAt]);

  /* ─── Polling (preserves F74 direct-status-query behaviour) ─── */

  const getInterval = (): number => (elapsedRef.current < 10 ? 1 : 2);

  const pollReadiness = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      if (!reportId) {
        if (mountedRef.current) navigate("/plan", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .select("status")
        .eq("id", reportId)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        scheduleNextPoll();
        return;
      }

      const status = data?.status;

      // ADR-019 happy path — user picks strands on /plan, so route immediately.
      if (status === "pending_selection") {
        navigate("/plan", { replace: true });
        return;
      }

      // Plan complete — fire the ready-flash, then navigate.
      if (status === "complete") {
        setStatusText(READY_FLASH_STATUS);
        setStatusTone("ready");
        setState("ready");
        setTimeout(() => {
          if (mountedRef.current) navigate("/plan", { replace: true });
        }, READY_FLASH_MS);
        return;
      }

      scheduleNextPoll();
    } catch {
      if (mountedRef.current) scheduleNextPoll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, reportId]);

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

  /* ─── Token exchange on mount ─── */

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

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (!mountedRef.current) return;

        if (sessionError) {
          setState("token_error");
          return;
        }

        // Top bar flips here — independently of the polling loop.
        setHasSession(true);
        setState("polling");
        pollReadiness();
      } catch {
        if (mountedRef.current) setState("network_error");
      }
    };

    exchange();
  }, [token, state, pollReadiness]);

  const handleRetry = useCallback(() => {
    if (state === "network_error") {
      setState("exchanging");
    } else if (state === "delayed") {
      elapsedRef.current = 0;
      setElapsedMs(0);
      pollReadiness();
    }
  }, [state, pollReadiness]);

  if (!token && !isSecondReport) return null;

  /* ─── Second-report flow: dedicated minimal confirmation ─── */
  if (isSecondReport) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main className="pt-[68px]">
          <section className="py-12 lg:py-20">
            <div className="mx-auto max-w-2xl px-6">
              <div className="panel-ivory">
                <div className="px-8 sm:px-12 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-primary">Payment confirmed</span>
                  </div>
                  <SoloLogo width={88} height={26} />
                </div>
                <div className="px-8 sm:px-12 pt-6 pb-12">
                  <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight leading-tight text-foreground">
                    Setting up your second report.
                  </h1>
                  <p className="mt-3 text-[16px] text-muted-foreground leading-relaxed">
                    This takes a few seconds.
                  </p>
                  <div className="mt-8 flex items-center gap-4 min-h-[48px]" aria-live="polite">
                    <span className="shrink-0 inline-block w-[9px] h-[9px] rounded-full bg-primary animate-heartbeat" />
                    <span className="text-[18px] sm:text-[22px] font-semibold leading-snug text-foreground">
                      Attaching your second report.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ─── Token-error: top bar stays anonymous (no session activated) ─── */
  if (state === "token_error") {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar minimal />
        <main className="pt-[68px]">
          <section className="py-12 lg:py-20">
            <div className="mx-auto max-w-2xl px-6">
              <div className="panel-ivory">
                <div className="px-8 sm:px-12 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />
                    <span className="text-red-700">Link no longer valid</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
                      your account exists, we just can't use this link
                    </span>
                  </div>
                  <SoloLogo width={88} height={26} />
                </div>
                <div className="px-8 sm:px-12 pt-6 pb-12">
                  <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight leading-tight text-foreground">
                    This link is no longer valid.
                  </h1>
                  <p className="mt-4 text-[15.5px] text-muted-foreground leading-relaxed max-w-2xl">
                    Single-use links expire shortly after you've used them. Sign in
                    with the magic link we emailed you to reach your plan.
                  </p>
                  <div className="mt-8 flex flex-col items-start gap-3 border-t border-[#E5E2DC] pt-8">
                    <button
                      type="button"
                      onClick={() => navigate("/auth")}
                      className="rounded-md bg-primary px-7 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90 transition-colors"
                    >
                      Go to sign-in →
                    </button>
                    <a
                      href="mailto:support@solo-plan.com"
                      className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                    >
                      Contact support →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ─── Stuck state ─── */
  if (state === "stuck") {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar minimal={!hasSession} />
        <main className="pt-[68px]">
          <section className="py-12 lg:py-20">
            <div className="mx-auto max-w-2xl px-6">
              <div className="panel-ivory">
                <div className="px-8 sm:px-12 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600" />
                    <span className="text-amber-700">Catching up</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
                      your payment went through
                    </span>
                  </div>
                  <SoloLogo width={88} height={26} />
                </div>
                <div className="px-8 sm:px-12 pt-6 pb-12">
                  <h1 className="text-[32px] sm:text-[40px] font-extrabold tracking-tight leading-tight text-foreground">
                    Your payment worked, but we're catching up.
                  </h1>
                  <p className="mt-4 text-[16px] text-muted-foreground leading-relaxed">
                    Your report is safe. We're having trouble completing the handover.
                  </p>
                  <div className="mt-6 border-l-2 border-amber-600 bg-amber-50/60 px-5 py-4">
                    <p className="text-[13.5px] text-foreground leading-relaxed">
                      <strong className="font-semibold">Your money is not at risk.</strong>{" "}
                      Stripe has confirmed the charge; the issue is on our side, not on
                      theirs. Email support and we'll sort the handover manually within a
                      few hours.
                    </p>
                  </div>
                  <ReferenceRow startedAt={startedAt} stage="webhook_pending" />
                  <div className="mt-8 flex flex-col sm:flex-row items-start gap-3 border-t border-[#E5E2DC] pt-8">
                    <a
                      href="mailto:support@solo-plan.com"
                      className="rounded-md bg-primary px-7 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90 transition-colors inline-flex items-center"
                    >
                      Email support →
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        elapsedRef.current = 0;
                        setElapsedMs(0);
                        setState("polling");
                        pollReadiness();
                      }}
                      className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors sm:self-center"
                    >
                      Try again →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ─── Network-error: same shell as exchanging, banner above eyebrow ─── */
  if (state === "network_error") {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar minimal={!hasSession} />
        <main className="pt-[68px]">
          <section className="py-12 lg:py-20">
            <div className="mx-auto max-w-2xl px-6">
              <div className="panel-ivory">
                <div className="border-l-2 border-red-600 bg-red-50/60 px-6 py-3 flex items-start gap-3">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <div className="text-[13px] leading-relaxed">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700 mr-3">
                      Can't reach our servers
                    </span>
                    <span className="text-foreground">
                      Check your connection and try again. Your payment is safe.
                    </span>
                  </div>
                </div>
                <div className="px-8 sm:px-12 pt-8 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-primary">Payment received</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
                      retry to continue
                    </span>
                  </div>
                  <SoloLogo width={88} height={26} />
                </div>
                <div className="px-8 sm:px-12 pt-6 pb-12">
                  <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight leading-tight text-foreground">
                    Connection issue.
                  </h1>
                  <p className="mt-3 text-[16px] text-muted-foreground leading-relaxed">
                    We can't reach our servers right now.
                  </p>
                  <div className="mt-8 flex flex-col items-start gap-3 border-t border-[#E5E2DC] pt-8">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-md bg-primary px-7 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90 transition-colors"
                    >
                      Retry
                    </button>
                    <a
                      href="mailto:support@solo-plan.com"
                      className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                    >
                      Contact support →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ─── Default: exchanging / polling / delayed / ready (happy-path shell) ─── */
  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal={!hasSession} />

      <main className="pt-[68px]">
        <section className="py-12 lg:py-20">
          <div className="mx-auto max-w-2xl px-6">
            <div className="panel-ivory">
              {/* Panel top: eyebrow + small Solo logo */}
              <div className="px-8 sm:px-12 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-primary">Payment received</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
                    {state === "delayed" ? "taking longer than usual" : "setting up your account"}
                  </span>
                </div>
                <SoloLogo width={88} height={26} />
              </div>

              <div className="px-8 sm:px-12 pt-6 pb-12">
                {state === "delayed" ? (
                  <>
                    <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight leading-tight text-foreground">
                      Almost there.
                    </h1>
                    <p className="mt-3 text-[16px] text-muted-foreground leading-relaxed">
                      Our system is catching up. This usually clears in a few seconds.
                    </p>
                    <ReferenceRow startedAt={startedAt} />
                    <div className="mt-8 border-t border-[#E5E2DC] pt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="rounded-md bg-[#E5E2DC] hover:bg-[#D8D4CC] text-foreground px-6 py-2.5 text-[13.5px] font-semibold border border-[#D8D4CC] transition-colors"
                      >
                        Try now
                      </button>
                      <a
                        href="mailto:support@solo-plan.com"
                        className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors sm:self-center"
                      >
                        Contact support →
                      </a>
                      <div className="sm:ml-auto flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                        <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/60 animate-heartbeat" />
                        <span>auto-retry · every 2s</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="text-[36px] sm:text-[44px] font-extrabold tracking-tight leading-tight text-foreground">
                      Setting up your account.
                    </h1>
                    <p className="mt-3 text-[16px] text-muted-foreground leading-relaxed">
                      This takes a few seconds.
                    </p>

                    {/* Hairline + heartbeat row */}
                    <div className="h-px bg-[#E5E2DC] my-8" />
                    <div className="flex items-center gap-4 min-h-[48px]" aria-live="polite" aria-atomic="true">
                      <span
                        className={`shrink-0 inline-block w-[9px] h-[9px] rounded-full ${
                          statusTone === "ready"
                            ? "bg-primary opacity-100"
                            : "bg-primary animate-heartbeat"
                        }`}
                      />
                      <span
                        className={`text-[18px] sm:text-[22px] font-semibold leading-snug ${
                          statusTone === "ready" ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className="h-px bg-[#E5E2DC] my-8" />

                    {/* Estimate row */}
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                      <div className="flex items-baseline gap-3 text-[13.5px] text-muted-foreground leading-relaxed">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 shrink-0">
                          Usually
                        </span>
                        <span>Three to five seconds. You'll be moved on automatically.</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground tabular-nums shrink-0">
                        elapsed <span className="text-muted-foreground/40 mx-1">·</span>
                        <strong className="font-semibold text-foreground">
                          {formatElapsed(elapsedMs)}
                        </strong>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────── Reference row ─────────────────────────── */

function ReferenceRow({
  startedAt,
  stage,
}: {
  startedAt: Date;
  stage?: string;
}) {
  /*
   * Designer addition per F3. We don't expose the actual Stripe checkout
   * session ID (not available in the URL on this page); instead we render
   * a short opaque session prefix derived from the started-at timestamp.
   * This still gives support a substantial identifier the user can read
   * back. If a real session ID becomes available in the URL or via the
   * exchange-payment-token response, swap that in here.
   */
  const sessionPrefix = `cs_${startedAt.getTime().toString(36).slice(-6)}`;
  const ts = formatTimestamp(startedAt);
  return (
    <div className="mt-8 bg-[#F3F0EA] border border-[#E5E2DC] rounded-lg px-5 py-3 flex items-center gap-4 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0">
        Reference
      </span>
      <span
        className="text-[12.5px] text-foreground tabular-nums"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        checkout {sessionPrefix}
        <span className="text-muted-foreground/40 mx-1.5">·</span>
        {ts}
        {stage && (
          <>
            <span className="text-muted-foreground/40 mx-1.5">·</span>
            stage: {stage}
          </>
        )}
      </span>
    </div>
  );
}
