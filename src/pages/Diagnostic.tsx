import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { questions } from "@/data/questions";
import {
  DIAGNOSTIC_QUESTION_IDS,
  DiagnosticAnswers,
  DiagnosticRead,
  assembleGenericRead,
  assembleRead,
  readSnapshotText,
} from "@/data/diagnosticRead";
import { getClientSessionId } from "@/lib/clientSession";
import { readCvPrefill } from "@/lib/cvPrefill";
import { trackFunnelEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import ProgressHeader from "@/components/ProgressHeader";
import SoloLogo from "@/components/SoloLogo";
import CVUploadZone from "@/components/CVUploadZone";

/*
 * /diagnostic — the free diagnostic (Day Zero C1.1, design at
 * admin/free-diagnostic-design.md).
 *
 * Six structured questions drawn verbatim from src/data/questions.ts
 * (ids 1, 2, 3, 4, 5, 10), a deterministic "optionality read" assembled from
 * src/data/diagnosticRead.ts, email capture at the moment of highest desire
 * (after the questions, before the reveal), and carry-forward into the full
 * questionnaire via the existing solo.qdraft.{csid} draft key, so /questionnaire
 * needs no changes to pre-fill.
 *
 * Anonymous, pre-auth, mirrors the /cv-upload composition vocabulary:
 * TopBar minimal, section label, ProgressHeader, all-ivory question steps.
 * One dark moment on the read screen only: the honest blocker line renders on
 * the near-black inset, per the dark-card cadence rule (earned by content).
 *
 * Events (design §11): diagnostic_started, diagnostic_completed,
 * diagnostic_email_captured, diagnostic_read_viewed, diagnostic_to_questionnaire
 * fire to PostHog + the events table via lib/analytics. diagnostic_to_checkout
 * is derived in SQL by joining client_session_id, not fired here.
 */

const DIAGNOSTIC_IDS = [
  DIAGNOSTIC_QUESTION_IDS.title,
  DIAGNOSTIC_QUESTION_IDS.years,
  DIAGNOSTIC_QUESTION_IDS.sector,
  DIAGNOSTIC_QUESTION_IDS.workType,
  DIAGNOSTIC_QUESTION_IDS.seniority,
  DIAGNOSTIC_QUESTION_IDS.confidence,
] as const;

const STEP_LABELS = ["Title", "Years", "Sector", "Work", "Level", "Confidence", "Read"];

type Stage = "questions" | "capture" | "read";

interface StoredDiagnostic {
  answers: Record<number, string>;
  variant: "full" | "generic" | null;
  emailCaptured: boolean;
  ts: string;
}

function diagnosticKey(): string {
  return `solo.diagnostic.${getClientSessionId()}`;
}

function loadStored(): StoredDiagnostic | null {
  try {
    const raw = localStorage.getItem(diagnosticKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDiagnostic;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(next: StoredDiagnostic): void {
  try {
    localStorage.setItem(diagnosticKey(), JSON.stringify(next));
  } catch {
    /* best-effort */
  }
}

/** Merge the six diagnostic answers into the questionnaire draft so
 *  /questionnaire restores them via its existing loadDraftAnswers path. */
function writeQuestionnaireDraft(answers: Record<number, string>): void {
  try {
    const key = `solo.qdraft.${getClientSessionId()}`;
    let existing: Record<string, unknown> = {};
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") existing = parsed as Record<string, unknown>;
      } catch {
        /* corrupt draft: overwrite */
      }
    }
    for (const id of DIAGNOSTIC_IDS) {
      const v = answers[id];
      if (typeof v === "string" && v.trim()) existing[String(id)] = v;
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    /* best-effort */
  }
}

function toDiagnosticAnswers(answers: Record<number, string>): DiagnosticAnswers {
  return {
    title: answers[DIAGNOSTIC_QUESTION_IDS.title] ?? "",
    years: answers[DIAGNOSTIC_QUESTION_IDS.years] ?? "8–12 years",
    sector: answers[DIAGNOSTIC_QUESTION_IDS.sector] ?? "Other",
    workType: answers[DIAGNOSTIC_QUESTION_IDS.workType] ?? "Consulting and advisory",
    seniority: answers[DIAGNOSTIC_QUESTION_IDS.seniority] ?? "Other",
    confidence: answers[DIAGNOSTIC_QUESTION_IDS.confidence] ?? "Medium",
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-[#15735F] mr-3 tabular-nums">01</span>
      {children}
    </div>
  );
}

function StepEyebrow({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="text-muted-foreground tabular-nums">
        {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

/** Single-select option stack, same visual grammar as the questionnaire. */
function OptionStack({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const selected = value === opt;
        const dashIdx = opt.indexOf(" - ");
        const title = dashIdx >= 0 ? opt.slice(0, dashIdx) : opt;
        const desc = dashIdx >= 0 ? opt.slice(dashIdx + 3) : null;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`relative text-left flex items-start gap-5 px-5 py-4 sm:px-6 sm:py-5 border transition-colors group ${
              selected
                ? "border-primary bg-gradient-to-r from-primary/[0.06] to-transparent"
                : "border-border bg-white hover:border-foreground/30"
            }`}
          >
            <span
              className={`text-[11px] font-semibold tabular-nums tracking-[0.1em] pt-0.5 shrink-0 ${
                selected ? "text-[#15735F]" : "text-muted-foreground/60 group-hover:text-muted-foreground"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-foreground leading-snug">{title}</span>
              {desc && (
                <span className="mt-0.5 block text-[13px] text-muted-foreground leading-snug">{desc}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RuleHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground border-t border-border pt-5">
      {children}
    </h3>
  );
}

export default function Diagnostic() {
  const navigate = useNavigate();
  const stored = useMemo(loadStored, []);
  const cvPrefill = useMemo(() => readCvPrefill(), []);

  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (stored?.answers && Object.keys(stored.answers).length > 0) return stored.answers;
    const fromCv: Record<number, string> = {};
    for (const id of DIAGNOSTIC_IDS) {
      const v = cvPrefill.answers[id];
      if (typeof v === "string") fromCv[id] = v;
    }
    return fromCv;
  });
  const [stage, setStage] = useState<Stage>(() => (stored?.variant ? "read" : "questions"));
  const [variant, setVariant] = useState<"full" | "generic" | null>(stored?.variant ?? null);
  const [emailCaptured, setEmailCaptured] = useState<boolean>(stored?.emailCaptured ?? false);
  const [step, setStep] = useState(() => {
    if (stored?.variant) return DIAGNOSTIC_IDS.length;
    for (let i = 0; i < DIAGNOSTIC_IDS.length; i++) {
      const v = (stored?.answers ?? {})[DIAGNOSTIC_IDS[i]];
      if (!(typeof v === "string" && v.trim())) return i;
    }
    return 0;
  });
  const [email, setEmail] = useState("");
  const [captureStatus, setCaptureStatus] = useState<"idle" | "loading" | "error">("idle");
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const [showCvZone, setShowCvZone] = useState(false);
  const startedFired = useRef(false);

  useEffect(() => {
    if (startedFired.current) return;
    startedFired.current = true;
    if (!stored?.variant) trackFunnelEvent("diagnostic_started");
  }, [stored]);

  useEffect(() => {
    if (stage !== "read" || !variant) return;
    trackFunnelEvent("diagnostic_read_viewed", { variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, variant]);

  const currentId = DIAGNOSTIC_IDS[Math.min(step, DIAGNOSTIC_IDS.length - 1)];
  const currentQuestion = questions.find((q) => q.id === currentId);
  const currentValue = answers[currentId] ?? "";
  const isTextStep = currentQuestion?.type === "text";
  const stepValid = typeof currentValue === "string" && currentValue.trim().length > 0;

  const diagnosticAnswers = toDiagnosticAnswers(answers);
  const read: DiagnosticRead | null =
    stage === "read" && variant
      ? variant === "full"
        ? assembleRead(diagnosticAnswers)
        : assembleGenericRead(diagnosticAnswers)
      : null;

  function setAnswer(v: string) {
    setAnswers((prev) => {
      const next = { ...prev, [currentId]: v };
      saveStored({ answers: next, variant, emailCaptured, ts: new Date().toISOString() });
      return next;
    });
  }

  function goForward() {
    if (!stepValid) return;
    if (step < DIAGNOSTIC_IDS.length - 1) {
      setStep(step + 1);
      return;
    }
    trackFunnelEvent("diagnostic_completed", {
      sector: diagnosticAnswers.sector,
      seniority: diagnosticAnswers.seniority,
      work_type: diagnosticAnswers.workType,
    });
    setStage("capture");
  }

  function goBack() {
    if (stage === "capture") {
      setStage("questions");
      setStep(DIAGNOSTIC_IDS.length - 1);
      return;
    }
    if (step === 0) {
      navigate("/");
      return;
    }
    setStep(step - 1);
  }

  function revealRead(nextVariant: "full" | "generic", captured: boolean) {
    setVariant(nextVariant);
    setEmailCaptured(captured);
    setStage("read");
    saveStored({ answers, variant: nextVariant, emailCaptured: captured, ts: new Date().toISOString() });
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (captureStatus === "loading") return;
    setCaptureStatus("loading");
    setCaptureMessage(null);
    try {
      const fullRead = assembleRead(diagnosticAnswers);
      const { data, error } = await supabase.functions.invoke("subscribe-signal", {
        body: {
          email,
          source: "diagnostic",
          diagnostic: {
            snapshot: readSnapshotText(fullRead, diagnosticAnswers),
            sector: diagnosticAnswers.sector,
            seniority: diagnosticAnswers.seniority,
            work_type: diagnosticAnswers.workType,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!(data as { ok?: boolean })?.ok) {
        setCaptureStatus("error");
        setCaptureMessage(
          (data as { response_text?: string })?.response_text ?? "Please enter a valid email."
        );
        return;
      }
      trackFunnelEvent("diagnostic_email_captured", {
        sector: diagnosticAnswers.sector,
        seniority: diagnosticAnswers.seniority,
      });
      setCaptureStatus("idle");
      revealRead("full", true);
    } catch {
      setCaptureStatus("error");
      setCaptureMessage("Something went wrong sending your read. Your answers are safe; try again.");
    }
  }

  function handleSkipCapture() {
    revealRead("generic", false);
  }

  function handleContinueToQuestionnaire() {
    writeQuestionnaireDraft(answers);
    trackFunnelEvent("diagnostic_to_questionnaire", { variant: variant ?? "unknown" });
    navigate("/questionnaire");
  }

  function handleCvExtract() {
    // CVUploadZone has just written solo.cv_extract.{csid}; re-read and merge.
    const prefill = readCvPrefill();
    setAnswers((prev) => {
      const next = { ...prev };
      for (const id of DIAGNOSTIC_IDS) {
        const v = prefill.answers[id];
        if (typeof v === "string" && v.trim() && !(next[id] ?? "").trim()) next[id] = v;
      }
      saveStored({ answers: next, variant, emailCaptured, ts: new Date().toISOString() });
      // Jump to the first still-unanswered question.
      for (let i = 0; i < DIAGNOSTIC_IDS.length; i++) {
        const val = next[DIAGNOSTIC_IDS[i]];
        if (!(typeof val === "string" && val.trim())) {
          setStep(i);
          return next;
        }
      }
      setStep(DIAGNOSTIC_IDS.length - 1);
      return next;
    });
    setShowCvZone(false);
  }

  const progressStep = stage === "questions" ? step + 1 : STEP_LABELS.length;

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal />

      <main>
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            {/* ─── Top row: Back + section label ─── */}
            <div className="pt-8 sm:pt-10 flex items-center justify-between gap-6">
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            <div className="pt-6">
              <SectionLabel>Diagnostic</SectionLabel>
            </div>

            {stage !== "read" && (
              <div className="pt-4">
                <ProgressHeader
                  currentStep={progressStep}
                  totalSteps={STEP_LABELS.length}
                  labels={STEP_LABELS}
                  timeEstimate="≈ 90 sec"
                />
              </div>
            )}

            {/* ─── Questions ─── */}
            {stage === "questions" && currentQuestion && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4">
                  <StepEyebrow
                    step={step + 1}
                    total={DIAGNOSTIC_IDS.length}
                    label={`Question ${String(step + 1).padStart(2, "0")}`}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start">
                    <h1 className="lg:col-span-8 text-[28px] sm:text-[32px] lg:text-[36px] font-semibold tracking-tight leading-[1.2] text-foreground">
                      {currentQuestion.text}
                    </h1>
                    <p className="lg:col-span-4 lg:pt-2 text-[14.5px] text-muted-foreground leading-relaxed lg:text-right">
                      {step === 0
                        ? "Six quick questions, then a free read on how portable your value is. No email needed to start."
                        : null}
                    </p>
                  </div>
                </div>

                <div>
                  {isTextStep ? (
                    <div className="bg-[#F3F0EA] border border-border">
                      <input
                        type="text"
                        autoFocus
                        value={currentValue}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") goForward();
                        }}
                        placeholder={currentQuestion.placeholder}
                        className="w-full bg-transparent px-6 py-5 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                      />
                    </div>
                  ) : currentQuestion.type === "dropdown" && currentQuestion.options ? (
                    <OptionStack
                      options={currentQuestion.options}
                      value={currentValue || undefined}
                      onSelect={(v) => setAnswer(v)}
                    />
                  ) : currentQuestion.options ? (
                    <OptionStack
                      options={currentQuestion.options}
                      value={currentValue || undefined}
                      onSelect={(v) => setAnswer(v)}
                    />
                  ) : null}
                </div>

                {/* CV shortcut, step 1 only (design §4: offered, clearly skippable) */}
                {step === 0 && (
                  <div className="border-t border-border pt-5">
                    {showCvZone ? (
                      <div className="space-y-3">
                        <p className="text-[13px] text-muted-foreground">
                          Upload your CV and we'll fill in these six answers where we can. Optional;
                          read once, deletable, never shared.
                        </p>
                        <CVUploadZone
                          clientSessionId={getClientSessionId()}
                          onUploadComplete={() => {}}
                          onUploadClear={() => {}}
                          onExtractComplete={() => handleCvExtract()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCvZone(false)}
                          className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                        >
                          Never mind, I'll type
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCvZone(true)}
                        className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                      >
                        Have a CV handy? Upload it and skip the typing →
                      </button>
                    )}
                  </div>
                )}

                <div className="border-t border-border pt-8 flex items-center justify-between gap-6">
                  <button
                    onClick={goForward}
                    disabled={!stepValid}
                    className={`transition-colors text-center ${
                      stepValid
                        ? "cta-block"
                        : "px-[18px] py-[9px] text-[13px] font-semibold bg-[#E5E2DC] text-muted-foreground/70 cursor-not-allowed"
                    }`}
                  >
                    {step === DIAGNOSTIC_IDS.length - 1 ? "Finish" : "Continue"}
                  </button>
                  <span className="text-[12px] text-muted-foreground/80">
                    {DIAGNOSTIC_IDS.length - step - 1 === 0
                      ? "Last question"
                      : `${DIAGNOSTIC_IDS.length - step - 1} to go`}
                  </span>
                </div>
              </div>
            )}

            {/* ─── Email capture ─── */}
            {stage === "capture" && (
              <div className="pt-8 pb-16 space-y-10 max-w-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-foreground">Your read is ready</span>
                  </div>
                  <h1 className="title-h1">Where should we send it?</h1>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Enter your email to see your optionality read here and get a copy in your inbox.
                    You'll also join The Signal, our Monday briefing on where independent work is
                    heading. Unsubscribe anytime.
                  </p>
                </div>

                <form onSubmit={handleCapture} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@work.com"
                      className="flex-1 bg-[#F3F0EA] border border-border px-6 py-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={captureStatus === "loading"}
                      className="cta-block disabled:opacity-60"
                    >
                      {captureStatus === "loading" ? "One moment…" : "Show my read"}
                    </button>
                  </div>
                  {captureStatus === "error" && captureMessage && (
                    <p className="text-[12.5px] text-red-600">{captureMessage}</p>
                  )}
                  <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                    [ No spam. One-click unsubscribe. Your answers stay on this device until you
                    choose otherwise. ]
                  </p>
                </form>

                <div className="border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={handleSkipCapture}
                    className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                  >
                    Show a shorter version without my email →
                  </button>
                </div>
              </div>
            )}

            {/* ─── The read ─── */}
            {stage === "read" && read && (
              <div className="pt-8 pb-16 space-y-10">
                <div className="space-y-4 max-w-3xl">
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-foreground">Your optionality read</span>
                    {emailCaptured && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground">Copy sent to your inbox</span>
                      </>
                    )}
                  </div>
                  <h1 className="title-h1">
                    You read as <span className="text-[#15735F]">{read.identity}</span>.
                  </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-3">
                      <RuleHead>The signal</RuleHead>
                      <p className="text-[15.5px] text-foreground leading-relaxed">{read.signal}</p>
                    </div>

                    {read.strengths.length > 0 && (
                      <div className="space-y-3">
                        <RuleHead>What travels</RuleHead>
                        <ul className="space-y-4 pt-1">
                          {read.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-4">
                              <span className="text-[#15735F] text-[11px] font-semibold tabular-nums tracking-[0.1em] pt-1 shrink-0">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="text-[14.5px] text-foreground leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      <RuleHead>Where it points</RuleHead>
                      <p className="text-[15.5px] text-foreground leading-relaxed">{read.direction}</p>
                    </div>

                    {read.blocker && (
                      <div className="bg-[#1A1915] px-6 py-6 sm:px-8 sm:py-7">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FAF9F7]/60 mb-3">
                          The honest line
                        </div>
                        <p className="text-[#FAF9F7] text-[15.5px] leading-relaxed">{read.blocker}</p>
                      </div>
                    )}
                  </div>

                  <aside className="lg:col-span-4">
                    <div className="border-t border-border pt-5 space-y-4">
                      <h4 className="rule-head">What the full read adds</h4>
                      <ul className="space-y-3 text-[13.5px] text-muted-foreground leading-relaxed">
                        <li>The named routes for your profile, scored for fit</li>
                        <li>The insight most people in your position miss</li>
                        <li>A first move you could take inside 24 hours</li>
                        <li>A 30-day plan built from your actual answers</li>
                      </ul>
                      <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
                        Your six answers carry forward, so the questionnaire starts where this left
                        off. About 15 minutes, mostly questions only you can answer.
                      </p>
                    </div>
                  </aside>
                </div>

                <div className="border-t border-border pt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <button onClick={handleContinueToQuestionnaire} className="cta-block">
                      See your full read →
                    </button>
                    {!emailCaptured && (
                      <button
                        type="button"
                        onClick={() => {
                          setStage("capture");
                          setVariant(null);
                        }}
                        className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors self-start sm:self-auto"
                      >
                        Get the full version by email instead →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Footer ─── */}
            <div className="border-t border-border py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <SoloLogo width={64} height={18} />
                  <span className="text-muted-foreground/40">·</span>
                  <span>The diagnostic is free</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>Full report £19.99, one-time</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy
                  </a>
                  <span className="text-muted-foreground/40">·</span>
                  <a href="/terms" className="hover:text-foreground transition-colors">
                    Terms
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
