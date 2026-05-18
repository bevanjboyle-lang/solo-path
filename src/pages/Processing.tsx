import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import SoloLogo from "@/components/SoloLogo";
import { isDevBypass } from "@/lib/devBypass";

/*
 * Processing, Pass 1 /processing v1 (2026-05-17)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Inherits
 * the editorial composition vocabulary established on the previous spine
 * screens. Narrower panel (max-w-2xl ≈ 672px, target ~760px on widescreen
 * via responsive sizing), the screen is a short, centred moment, not a
 * long working surface. The narrower panel makes the photo bleed more
 * visible.
 *
 * Locked decisions from admin/pass-1-processing-decisions.md:
 *   Central, typography-led + heartbeat dot. Cycling status text is the
 *     visual primary; a single mint dot adjacent to the message pulses on
 *     a 2.8s ease-in-out cycle as the page's only motion element (uses
 *     the existing eyebrow-dot vocabulary, not a new visual primitive).
 *     Reduced-motion variant: dot becomes static, crossfade dropped.
 *   F1, Keep the heartbeat dot.
 *   F2, Keep the elapsed counter on the estimate row (honest, not
 *     predictive, "elapsed · 0:04" never "remaining").
 *   F3, Keep the reference row visible on the Failed state (small
 *     stone-tinted inset with report ID prefix + timestamp).
 *   F4, Approve eyebrow second clauses ("your answers received" /
 *     "your answers are saved").
 *   Top bar, simplified to a "Generating" / "Generation failed" status
 *     chip (mint or red dot + small-caps label only). No session/report
 *     ID exposure in the chrome.
 *
 * Dark-card cadence: zero. /processing is operational/transitional —
 * runs all-ivory per design-direction.md v1.4 §8.
 *
 * Drops framer-motion AnimatePresence (no slide animations between page
 * states). Message crossfade uses tailwindcss-animate fade-in only, not
 * framer-motion.
 *
 * Preserves existing polling logic, prefers-reduced-motion hook, retry
 * behaviour (handleRetry restarts polling without navigating to
 * /questionnaire, which would wipe the user's Q1–Q15 answers).
 */

const CYCLING_MESSAGES = [
  "Reading your answers.",
  "Mapping your archetype.",
  "Shortlisting business options.",
  "Drafting your 30-day plan.",
  "Finishing up.",
];

const CYCLE_INTERVAL = 2800; // matches the heartbeat dot's breath cycle
const TIMEOUT_MS = 300_000;  // 5 minutes, lenient vs spec's 60s, kept from prior implementation
const READY_FLASH_MS = 400;

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

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTimestamp(d: Date): string {
  // Local time, HH:mm, with a short timezone abbreviation if available.
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  // Try to extract a short TZ name (e.g. "BST", "GMT", "PDT"). Falls back
  // to UTC offset if the runtime doesn't expose a name.
  let tz = "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZoneName: "short",
    }).formatToParts(d);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart) tz = ` ${tzPart.value}`;
  } catch {
    /* no-op */
  }
  return `${hh}:${mm}${tz}`;
}

export default function Processing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("report_id");

  const [state, setState] = useState<PageState>("generating");
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [failureTime, setFailureTime] = useState<Date | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());
  const mountedRef = useRef(true);

  /* No report_id, redirect home */
  useEffect(() => {
    if (!reportId && !isDevBypass()) {
      navigate("/", { replace: true });
    }
  }, [reportId, navigate]);

  /* Cycling messages, only while generating */
  useEffect(() => {
    if (state !== "generating") return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % CYCLING_MESSAGES.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(id);
  }, [state]);

  /* Elapsed counter, ticks every second while generating */
  useEffect(() => {
    if (state !== "generating") return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 1000);
    // Also update once immediately so the counter shows 0:00 not nothing.
    setElapsedMs(Date.now() - startRef.current);
    return () => clearInterval(id);
  }, [state]);

  /* Polling */
  const poll = useCallback(async () => {
    if (!reportId || !mountedRef.current) return;

    const elapsed = Date.now() - startRef.current;
    if (elapsed >= TIMEOUT_MS) {
      setFailureTime(new Date());
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
        setTimeout(() => {
          if (mountedRef.current) {
            navigate(`/teaser?report_id=${reportId}`, { replace: true });
          }
        }, READY_FLASH_MS);
        return;
      }

      if (data?.status === "failed") {
        setFailureTime(new Date());
        setState("failed");
        return;
      }
    } catch {
      /* Single failed poll is self-recovering, continue */
    }

    if (!mountedRef.current) return;

    /* Adaptive polling interval: tighter early, looser later */
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
    /* Reset timer and restart polling, DO NOT navigate to /questionnaire,
     * which would wipe the user's answers. The report row already exists;
     * the backend may still be working on it. */
    startRef.current = Date.now();
    setElapsedMs(0);
    setFailureTime(null);
    setState("generating");
  };

  if (!reportId && !isDevBypass()) return null;

  /* ─── Status chip for the top of the panel ─── */
  const statusChip = (() => {
    if (state === "failed") {
      return { tone: "error" as const, label: "Generation failed" };
    }
    if (state === "timed_out") {
      return { tone: "error" as const, label: "Taking longer than usual" };
    }
    return { tone: "neutral" as const, label: "Generating" };
  })();

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal />

      <main className="pt-[68px]">
        <section className="py-12 lg:py-20">
          <div className="mx-auto max-w-2xl px-6">
            <div className="panel-ivory">
              {/* ─── Panel top row: status chip + small Solo logo ─── */}
              <div className="px-8 sm:px-12 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      statusChip.tone === "error" ? "bg-red-600" : "bg-primary"
                    }`}
                  />
                  <span
                    className={
                      statusChip.tone === "error"
                        ? "text-red-700"
                        : "text-muted-foreground"
                    }
                  >
                    {statusChip.label}
                  </span>
                </div>
                <SoloLogo width={88} height={26} />
              </div>

              {/* ─── Body, branches by state ─── */}
              {state === "generating" || state === "ready" ? (
                <GeneratingBody
                  message={
                    state === "ready"
                      ? "Your report is ready."
                      : CYCLING_MESSAGES[msgIndex]
                  }
                  msgKey={state === "ready" ? "ready" : `m-${msgIndex}`}
                  elapsedMs={elapsedMs}
                  reducedMotion={reducedMotion}
                  isReady={state === "ready"}
                />
              ) : state === "failed" ? (
                <FailedBody
                  reportId={reportId}
                  failureTime={failureTime}
                  onRetry={handleRetry}
                />
              ) : (
                <TimedOutBody
                  reportId={reportId}
                  failureTime={failureTime}
                  onRetry={handleRetry}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────── Generating body ─────────────────────────── */

function GeneratingBody({
  message,
  msgKey,
  elapsedMs,
  reducedMotion,
  isReady,
}: {
  message: string;
  msgKey: string;
  elapsedMs: number;
  reducedMotion: boolean;
  isReady: boolean;
}) {
  return (
    <div className="px-8 sm:px-12 pt-6 pb-12">
      {/* Eyebrow */}
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        <span>Generating report</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
          your answers received
        </span>
      </div>

      {/* H1 + subhead */}
      <h1 className="mt-6 text-[36px] sm:text-[44px] lg:text-[48px] font-extrabold tracking-tight leading-[1.1] text-foreground">
        Building your report.
      </h1>
      <p className="mt-3 text-[16px] sm:text-[17px] text-muted-foreground leading-relaxed">
        This takes a couple of minutes.
      </p>

      {/* Hairline separator */}
      <div className="h-px bg-[#E5E2DC] my-8" />

      {/* Cycling region, aria-live, heartbeat dot + display-weight message */}
      <div
        className="flex items-center gap-4 min-h-[52px]"
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          className={`shrink-0 inline-block w-[9px] h-[9px] rounded-full ${
            isReady
              ? "bg-primary opacity-100"
              : reducedMotion
              ? "bg-primary"
              : "bg-primary animate-heartbeat"
          }`}
        />
        {/*
         * Key-based remount triggers tailwindcss-animate fade-in on each
         * new message. Reduced-motion users see the swap without the
         * fade (the animate classes are no-ops under their CSS query in
         * tailwindcss-animate; the content updates still occur on the
         * same cadence, content updates are not motion).
         */}
        <span
          key={msgKey}
          className={`text-[22px] sm:text-[26px] font-semibold leading-snug ${
            isReady ? "text-primary" : "text-foreground"
          } ${reducedMotion ? "" : "animate-in fade-in duration-300"}`}
        >
          {message}
        </span>
      </div>

      {/* Hairline separator */}
      <div className="h-px bg-[#E5E2DC] my-8" />

      {/* Estimate row: framing on the left, elapsed counter on the right */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div className="flex items-baseline gap-3 text-[13.5px] text-muted-foreground leading-relaxed">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 shrink-0">
            Usually
          </span>
          <span>Usually 2-3 minutes. We'll move you on the moment it's done.</span>
        </div>
        <div className="text-[12px] text-muted-foreground tabular-nums shrink-0">
          elapsed <span className="text-muted-foreground/40 mx-1">·</span>
          <strong className="font-semibold text-foreground">
            {formatElapsed(elapsedMs)}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Failed body ─────────────────────────── */

function FailedBody({
  reportId,
  failureTime,
  onRetry,
}: {
  reportId: string | null;
  failureTime: Date | null;
  onRetry: () => void;
}) {
  return (
    <div className="px-8 sm:px-12 pt-6 pb-12">
      {/* Eyebrow, red dot + small-caps label + muted reassurance */}
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />
        <span className="text-red-700">Generation failed</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
          your answers are saved
        </span>
      </div>

      {/* H1 + explainer */}
      <h1 className="mt-6 text-[36px] sm:text-[44px] lg:text-[48px] font-extrabold tracking-tight leading-[1.1] text-foreground">
        We couldn't generate your report.
      </h1>
      <p className="mt-4 text-[16px] sm:text-[17px] text-muted-foreground leading-relaxed max-w-2xl">
        Something went wrong on our side. Your answers are saved, you can retry
        without starting over.
      </p>

      {/* Reference row, small stone-tinted inset */}
      <ReferenceRow reportId={reportId} failureTime={failureTime} />

      {/* Vertical action stack */}
      <div className="mt-8 flex flex-col items-start gap-3">
        <button
          onClick={onRetry}
          className="rounded-md bg-primary px-7 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <a
          href="mailto:support@solo-plan.com"
          className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
        >
          Contact support →
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────── Timed-out body ─────────────────────────── */

function TimedOutBody({
  reportId,
  failureTime,
  onRetry,
}: {
  reportId: string | null;
  failureTime: Date | null;
  onRetry: () => void;
}) {
  return (
    <div className="px-8 sm:px-12 pt-6 pb-12">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600" />
        <span className="text-red-700">Taking longer than usual</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground normal-case tracking-normal text-[12px] font-normal">
          your answers are saved
        </span>
      </div>

      <h1 className="mt-6 text-[36px] sm:text-[44px] lg:text-[48px] font-extrabold tracking-tight leading-[1.1] text-foreground">
        This is taking longer than usual.
      </h1>
      <p className="mt-4 text-[16px] sm:text-[17px] text-muted-foreground leading-relaxed max-w-2xl">
        Your answers are saved. You can retry now, or come back via the email
        we just sent and we'll pick up where we left off.
      </p>

      <ReferenceRow reportId={reportId} failureTime={failureTime} />

      <div className="mt-8 flex flex-col items-start gap-3">
        <button
          onClick={onRetry}
          className="rounded-md bg-primary px-7 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <a
          href="mailto:support@solo-plan.com"
          className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
        >
          Contact support →
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────── Reference row (shared) ─────────────────────────── */

function ReferenceRow({
  reportId,
  failureTime,
}: {
  reportId: string | null;
  failureTime: Date | null;
}) {
  if (!reportId) return null;
  const prefix = reportId.slice(0, 6);
  const ts = failureTime ? formatTimestamp(failureTime) : "";
  return (
    <div className="mt-8 bg-[#F3F0EA] border border-[#E5E2DC] rounded-lg px-5 py-3 flex items-center gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0">
        Reference
      </span>
      <span
        className="text-[12.5px] text-foreground tabular-nums"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        report {prefix}
        {ts && (
          <>
            {" "}
            <span className="text-muted-foreground/40">·</span> {ts}
          </>
        )}
      </span>
    </div>
  );
}
