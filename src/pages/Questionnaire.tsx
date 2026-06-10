import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { questions, Question } from "@/data/questions";
import { getClientSessionId, generateReport } from "@/lib/handlers";
import { readCvPrefill } from "@/lib/cvPrefill";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import ProgressHeader from "@/components/ProgressHeader";
import SoloLogo from "@/components/SoloLogo";
import * as DialogPrimitive from "@radix-ui/react-dialog";

/*
 * Questionnaire, Pass 1 /questionnaire v1 (2026-05-16)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Inherits
 * the editorial composition vocabulary established on home + /cv-upload:
 * single contained ivory panel on the office photo, eyebrow vocabulary
 * + small-caps section labels, asymmetric grids where appropriate,
 * stone-inset inputs, mint discipline.
 *
 * Locked decisions from admin/pass-1-questionnaire-decisions.md:
 *   F1, RadioGroup-cards as vertical editorial stack (not a tile grid)
 *   F2, Hybrid option prefixes: letters (A·B·C·D·E) when ≤8 options,
 *        numerals (01·02·03) when more. Codify as a system-level rule.
 *   F3, EmailCaptureStep fields horizontal 5/7 on desktop, stacked on
 *        mobile
 *   F4, Trust line bracketed inline (stone-tinted inset) between
 *        fields and button
 *   F5, Refusal Modal inverted button hierarchy: mint primary on
 *        "Go back and add my email", tertiary link on "Continue without
 *        email"
 *   F6, Question step eyebrow renders as "Question N" only (section
 *        half dropped, no section taxonomy in the data model)
 *   F7, "Auto-saved" indicator (mint dot + label) in the panel top row
 *        after first interaction. No fake timestamps, answers are kept
 *        locally, only the final submit goes to the server.
 *   F8, Time chip static "≈ 8 min" across question steps, shifts to
 *        "≈ 1 min remaining" on the final step (only allowed reframe)
 *   F9, Generating-report state: inline button spinner + body faded to
 *        ~50% opacity (not a full-screen overlay)
 *
 * Dark-card cadence: zero on question steps (all-ivory). One dark moment
 * earned by content, the consequence inset inside the Refusal Modal
 * (three locked-copy sentences on a near-black surface, frame stays
 * ivory). Per design-direction.md v1.4 §8.
 *
 * The 13-questions/8-min promise on the home page is the user-facing
 * commitment; questions.length may exceed 13 (currently 16 due to
 * Q1/Q2/Q3/Q30/Q4–Q15). That drift is a content question for a later
 * pass and not addressed here. The progress header renders the actual
 * length; the chip says ≈ 8 min (the promise).
 *
 * No framer-motion slide animations between steps, the editorial
 * register should land instantly per the /cv-upload precedent.
 */

const QUESTIONNAIRE_TIME_CHIP = "≈ 8 min";
const FINAL_STEP_TIME_CHIP = "≈ 1 min remaining";

/*
 * P1-h (full-e2e-review-2026-06-10): the panel shows an "Auto-saved" chip, but
 * answers previously lived only in React state — a refresh or accidental
 * back-swipe mid-questionnaire wiped all ~16 steps. These helpers persist the
 * in-progress answers to localStorage (same pattern as solo.cv_extract.*),
 * keyed by client session, so the promise is true. All access is wrapped in
 * try/catch: on any failure the behaviour degrades to the previous in-memory
 * behaviour, never worse. The draft is cleared on successful submit.
 */
function questionnaireDraftKey(): string | null {
  try {
    return `solo.qdraft.${getClientSessionId()}`;
  } catch {
    return null;
  }
}

function loadDraftAnswers(
  base: Record<number, string | string[]>
): Record<number, string | string[]> {
  try {
    const key = questionnaireDraftKey();
    if (!key) return base;
    const raw = localStorage.getItem(key);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, string | string[]>;
    const restored: Record<number, string | string[]> = { ...base };
    // JSON keys come back as strings; coerce to the numeric question ids.
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      if (Number.isFinite(id)) restored[id] = v;
    }
    return restored;
  } catch {
    return base;
  }
}

function saveDraftAnswers(answers: Record<number, string | string[]>): void {
  try {
    const key = questionnaireDraftKey();
    if (key) localStorage.setItem(key, JSON.stringify(answers));
  } catch {
    /* no-op — persistence is best-effort */
  }
}

function clearDraftAnswers(): void {
  try {
    const key = questionnaireDraftKey();
    if (key) localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}

export default function Questionnaire() {
  const navigate = useNavigate();
  const cvPrefill = useMemo(() => readCvPrefill(), []);
  const [current, setCurrent] = useState(0);
  // P1-h: restore any in-progress draft (merged over CV pre-fill) so a refresh
  // mid-questionnaire doesn't wipe answers.
  const [answers, setAnswers] = useState<Record<number, string | string[]>>(() =>
    loadDraftAnswers(cvPrefill.answers)
  );
  const [firstName, setFirstName] = useState(cvPrefill.firstName);
  const [email, setEmail] = useState("");
  const [emailRefused, setEmailRefused] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  /*
   * F54 fix: validate the auth session against the server, not just
   * check whether one exists locally. supabase.auth.getSession() returns
   * the cached session object even when the JWT is expired or revoked
   * server-side; getUser() round-trips to GoTrue and is authoritative.
   */
  useEffect(() => {
    getClientSessionId();
    let cancelled = false;

    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !user) {
        if (error) {
          console.warn("Questionnaire: stale auth session, treating as anon:", error.message);
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
        setIsAuthed(false);
        return;
      }
      setIsAuthed(true);

      // Drift C fix (2026-05-18, journey-trace audit): if this authed user
      // already has a paid report, redirect to /plan. Without this guard
      // they can start a fresh test that either overwrites the existing
      // report or creates a duplicate row that breaks the post-questionnaire
      // flow. The second-report flow at /account → TakeAnotherTestCard is
      // the canonical path for retakes.
      const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
      const { data: existingReport } = await supabase
        .from("reports")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", PAID_STATUSES)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (existingReport) {
        toast.message("You already have a plan.", {
          description: "To take a fresh test, open Account → Take another test.",
        });
        navigate("/plan", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalSteps = isAuthed ? questions.length : questions.length + 1;
  const isEmailStep = !isAuthed && current >= questions.length;
  const currentQuestion = !isEmailStep ? questions[current] : null;
  const stepNumber = current + 1;
  const isLastQuestion = current === questions.length - 1;
  const isFinalStep = isEmailStep || (isAuthed === true && isLastQuestion);

  /* ─── Validation ─── */
  const isStepValid = useCallback(() => {
    if (isEmailStep) {
      if (emailRefused) return firstName.trim().length > 0;
      return firstName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];
    if (currentQuestion.required === false) return true;
    if (currentQuestion.type === "text") {
      return typeof answer === "string" && answer.trim().length > 0;
    }
    return answer !== undefined && (Array.isArray(answer) ? answer.length > 0 : true);
  }, [isEmailStep, emailRefused, firstName, email, currentQuestion, answers]);

  const setAnswer = useCallback(
    (val: string | string[]) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
      if (!hasInteracted) setHasInteracted(true);
    },
    [currentQuestion, hasInteracted]
  );

  // P1-h: persist answers as they change so the "Auto-saved" chip is truthful.
  // Also light up the chip on resume when a draft restored real answers.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    saveDraftAnswers(answers);
    if (!hasInteracted) setHasInteracted(true);
  }, [answers, hasInteracted]);

  const goBack = () => {
    if (current === 0) {
      navigate("/cv-upload");
      return;
    }
    setCurrent((c) => c - 1);
  };

  const goForward = async () => {
    if (!isStepValid()) return;

    if (isFinalStep) {
      setIsGenerating(true);
      setGenError(null);

      const clientSessionId = getClientSessionId();
      let cvExtract: Record<string, unknown> | undefined;
      try {
        const raw = localStorage.getItem(`solo.cv_extract.${clientSessionId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.cv_extract && typeof parsed.cv_extract === "object") {
            cvExtract = parsed.cv_extract as Record<string, unknown>;
          }
        }
      } catch {
        /* no-op */
      }

      const result = await generateReport({
        client_session_id: clientSessionId,
        answers,
        first_name: isAuthed ? "" : firstName.trim(),
        email: isAuthed ? null : emailRefused ? null : email.trim(),
        email_refused: isAuthed ? false : emailRefused,
        cvExtract,
      });
      setIsGenerating(false);

      if (result.error || !result.report_id) {
        setGenError(result.error || "Something went wrong. Please try again.");
        return;
      }
      clearDraftAnswers(); // P1-h: submitted successfully, draft no longer needed
      navigate(`/processing?report_id=${result.report_id}`);
      return;
    }

    setCurrent((c) => c + 1);
  };

  const handleRefusalConfirm = () => {
    setEmailRefused(true);
    setShowRefusalModal(false);
  };

  /* Progress labels, short "QN" for question steps, "Email" for final */
  const progressLabels = Array.from({ length: totalSteps }, (_, i) =>
    i < questions.length ? `Q${i + 1}` : "Email"
  );

  const timeChip = isFinalStep ? FINAL_STEP_TIME_CHIP : QUESTIONNAIRE_TIME_CHIP;

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar minimal />

      <main className="pt-[68px]">
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="panel-ivory">
              {/* ─── Panel top row: Back to /cv-upload + Auto-saved indicator + Solo logo ─── */}
              <div className="px-8 sm:px-12 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between gap-6">
                <button
                  onClick={() => navigate("/cv-upload")}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-6">
                  {hasInteracted && (
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Auto-saved</span>
                    </div>
                  )}
                  <SoloLogo width={96} height={28} />
                </div>
              </div>

              {/* ─── Section label ─── */}
              <div className="px-8 sm:px-12 lg:px-16 pt-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="text-primary mr-3 tabular-nums">02</span>
                  Activation
                </div>
              </div>

              {/* ─── Progress header ─── */}
              <div className="px-8 sm:px-12 lg:px-16 pt-4">
                <ProgressHeader
                  currentStep={stepNumber}
                  totalSteps={totalSteps}
                  labels={progressLabels}
                  onBack={current > 0 ? goBack : undefined}
                  timeEstimate={timeChip}
                />
              </div>

              {/* ─── Body: question step OR email capture ─── */}
              <div
                className={`px-8 sm:px-12 lg:px-16 pb-10 transition-opacity duration-200 ${
                  isGenerating ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
              >
                {isEmailStep ? (
                  <EmailCaptureStep
                    stepNumber={stepNumber}
                    totalSteps={totalSteps}
                    firstName={firstName}
                    email={email}
                    emailRefused={emailRefused}
                    onFirstNameChange={(v) => {
                      setFirstName(v);
                      if (!hasInteracted) setHasInteracted(true);
                    }}
                    onEmailChange={(v) => {
                      setEmail(v);
                      if (!hasInteracted) setHasInteracted(true);
                    }}
                    onRefuseClick={() => setShowRefusalModal(true)}
                  />
                ) : (
                  <QuestionStep
                    stepNumber={stepNumber}
                    question={currentQuestion!}
                    value={answers[currentQuestion!.id]}
                    onChange={setAnswer}
                  />
                )}

                {/* Save-failed / generation-error banner */}
                {genError && (
                  <div className="mt-8 flex items-start gap-3 border-l-2 border-red-600 bg-red-50/40 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <div className="text-[13px] text-foreground leading-relaxed">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700 mb-1">
                        Generation failed
                      </div>
                      {genError}{" "}
                      <button
                        onClick={() => {
                          setGenError(null);
                          goForward();
                        }}
                        className="text-primary border-b-[1.5px] border-primary pb-0.5 hover:opacity-80 transition-opacity"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Action row ─── */}
              <div className="px-8 sm:px-12 lg:px-16 pb-12 border-t border-[#E5E2DC] pt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {isGenerating ? (
                      <span className="text-[12px] text-muted-foreground/80 uppercase tracking-[0.14em]">
                        Page frozen · do not close
                      </span>
                    ) : current > 0 ? (
                      <button
                        onClick={goBack}
                        className="flex items-center gap-1.5 text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>
                          Back to step {String(stepNumber - 1).padStart(2, "0")}
                        </span>
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                  <button
                    onClick={goForward}
                    disabled={!isStepValid() || isGenerating}
                    className={`rounded-md px-7 py-3 text-[14px] font-semibold transition-colors w-full sm:w-auto flex items-center justify-center gap-2 ${
                      isStepValid() && !isGenerating
                        ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90"
                        : "bg-[#E5E2DC] text-muted-foreground/70 cursor-not-allowed"
                    }`}
                  >
                    {isGenerating && (
                      <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    {isGenerating
                      ? "Generating…"
                      : isFinalStep
                      ? "Generate my report"
                      : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Refusal Modal: ivory frame + dark consequence inset + inverted hierarchy ─── *
       * Built directly on Radix primitives (not the shadcn DialogContent wrapper)
       * because the wrapper hardcodes a close-X and default chrome we don't want
       * on this deliberate warning surface.
       */}
      <DialogPrimitive.Root open={showRefusalModal} onOpenChange={setShowRefusalModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[4px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] max-w-[640px] w-[calc(100vw-2rem)] bg-[#FAF9F7] border border-[#E5E2DC] rounded-2xl shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
            {/* Head */}
            <div className="px-8 pt-8 pb-6">
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground mb-4">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground" />
                <span>Last-step warning</span>
              </div>
              <DialogPrimitive.Title className="text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-[1.15] text-foreground">
                Without an email, we can't save your report.
              </DialogPrimitive.Title>
            </div>

            {/* Dark consequence inset, three numbered sentences from the spec */}
            <div className="mx-8 my-2 bg-[#1A1915] rounded-xl overflow-hidden">
              {[
                "If you close this tab, your report is gone.",
                "There is no recovery.",
                "This is your only chance to see it.",
              ].map((sentence, i, arr) => (
                <div
                  key={i}
                  className={`flex items-start gap-5 px-6 py-5 ${
                    i < arr.length - 1 ? "border-b border-white/[0.08]" : ""
                  }`}
                >
                  <span className="text-primary text-[11px] font-semibold tabular-nums tracking-[0.1em] pt-1 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[#FAF9F7] text-[17px] sm:text-[18px] font-semibold leading-snug">
                    {sentence}
                  </span>
                </div>
              ))}
            </div>

            {/* Body, return to ivory, returns choice to the user */}
            <DialogPrimitive.Description className="px-8 pt-6 pb-6 text-[14.5px] text-muted-foreground leading-relaxed">
              You can still continue without email, but we strongly recommend
              you don't.
            </DialogPrimitive.Description>

            {/* Inverted hierarchy, mint primary on cancel, tertiary link on confirm */}
            <div className="px-8 pb-8 pt-2 border-t border-[#E5E2DC]">
              <div className="flex flex-col items-stretch gap-3 pt-6">
                <button
                  onClick={() => setShowRefusalModal(false)}
                  className="rounded-md px-7 py-3 text-[14px] font-semibold bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5 hover:bg-primary/90 transition-colors w-full"
                >
                  Go back and add my email
                </button>
                <button
                  onClick={handleRefusalConfirm}
                  className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors self-center"
                >
                  Continue without email
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

/* ──────────────────── Small composable bits ──────────────────── */

function QuestionEyebrow({
  stepNumber,
  isFinal = false,
  totalSteps,
}: {
  stepNumber: number;
  isFinal?: boolean;
  totalSteps?: number;
}) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      {isFinal && totalSteps !== undefined ? (
        <>
          <span className="text-foreground">Final step</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground tabular-nums">
            {String(stepNumber).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
          </span>
        </>
      ) : (
        <span className="text-foreground">
          <span className="text-primary mr-2 tabular-nums">
            {String(stepNumber).padStart(2, "0")}
          </span>
          Question {String(stepNumber).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

/* ──────────────────── Option prefix helper (F2 hybrid rule) ──────────────────── */

/**
 * Returns the editorial prefix for a RadioGroup / CheckboxGroup option.
 * Letters (A·B·C…) when total options ≤ 8, gives keyboard hint + selection
 * commitment. Numerals (01·02·03…) when more, scales beyond the alphabet.
 *
 * System-level rule from Pass 1 /questionnaire F2 resolution 2026-05-16.
 */
function optionPrefix(index: number, total: number): string {
  if (total <= 8) return String.fromCharCode(65 + index);
  return String(index + 1).padStart(2, "0");
}

/* ──────────────────── Question Step ──────────────────── */

function QuestionStep({
  stepNumber,
  question,
  value,
  onChange,
}: {
  stepNumber: number;
  question: Question;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const textValue = typeof value === "string" ? value : "";
  const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;
  const charCount = textValue.length;

  return (
    <div className="pt-8 space-y-10">
      <div className="space-y-4">
        <QuestionEyebrow stepNumber={stepNumber} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-12 items-start">
          <h2 className="lg:col-span-8 text-[28px] sm:text-[32px] lg:text-[36px] font-semibold tracking-tight leading-[1.2] text-foreground">
            {question.text}
            {question.required === false && (
              <span className="ml-3 align-middle inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 border border-[#D8D4CC] rounded px-2 py-0.5">
                Optional
              </span>
            )}
          </h2>
          {question.subtext && (
            <p className="lg:col-span-4 lg:pt-2 text-[14.5px] text-muted-foreground leading-relaxed lg:text-right">
              {question.subtext}
            </p>
          )}
        </div>
      </div>

      {/* ─── Input ─── */}
      <div>
        {question.type === "single" && question.options && (
          <RadioStack
            options={question.options}
            value={typeof value === "string" ? value : undefined}
            onChange={(v) => onChange(v)}
          />
        )}

        {question.type === "multi" && question.options && (
          <CheckboxStack
            options={question.options}
            value={Array.isArray(value) ? value : []}
            maxSelect={question.maxSelect}
            onChange={(arr) => onChange(arr)}
          />
        )}

        {question.type === "text" && (
          <div className="bg-[#F3F0EA] border border-[#D8D4CC] rounded-xl overflow-hidden">
            <textarea
              className="w-full resize-y bg-transparent px-6 py-5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-h-[180px]"
              placeholder={question.placeholder}
              value={textValue}
              onChange={(e) => onChange(e.target.value)}
            />
            <div className="border-t border-[#E5E2DC] px-6 py-3 flex items-baseline justify-between gap-4 text-[12px] text-muted-foreground">
              <span>
                {question.expandableHint ? (
                  <em className="not-italic">{question.expandableHint}</em>
                ) : (
                  <em className="not-italic">
                    Plain prose. We grade specificity, not polish.
                  </em>
                )}
              </span>
              <span className="tabular-nums shrink-0">
                <strong className="font-semibold text-foreground">{wordCount}</strong>{" "}
                {wordCount === 1 ? "word" : "words"}
                <span className="mx-2 text-muted-foreground/40">·</span>
                <strong className="font-semibold text-foreground">{charCount}</strong>{" "}
                chars
              </span>
            </div>
          </div>
        )}

        {question.type === "dropdown" && question.options && (
          <div className="relative">
            <select
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-[#F3F0EA] border border-[#D8D4CC] rounded-xl px-6 py-5 pr-12 text-[15px] text-foreground focus:outline-none focus:border-primary cursor-pointer appearance-none"
            >
              <option value="">Select an option…</option>
              {question.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground text-[14px]">
              ▾
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── RadioStack (single-select RadioGroup-cards) ─── */

function RadioStack({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const selected = value === opt;
        const prefix = optionPrefix(i, options.length);
        // Long option labels (e.g. "Low - this is long-term planning, no immediate pressure")
        // are split into title + clarifier when they contain " - ".
        const dashIdx = opt.indexOf(" - ");
        const title = dashIdx >= 0 ? opt.slice(0, dashIdx) : opt;
        const desc = dashIdx >= 0 ? opt.slice(dashIdx + 3) : null;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            type="button"
            className={`relative text-left flex items-start gap-5 px-5 py-4 sm:px-6 sm:py-5 border rounded-xl transition-colors group ${
              selected
                ? "border-primary bg-gradient-to-r from-primary/[0.06] to-transparent"
                : "border-[#E5E2DC] bg-white hover:border-[#C8C3BA]"
            }`}
          >
            {selected && (
              <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-primary rounded-r" />
            )}
            <span
              className={`shrink-0 w-8 text-center text-[12px] font-semibold tabular-nums pt-0.5 ${
                selected ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {prefix}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className={`block text-[15.5px] font-semibold ${
                  selected ? "text-foreground" : "text-foreground"
                }`}
              >
                {title}
              </span>
              {desc && (
                <span className="block mt-1 text-[13.5px] text-muted-foreground leading-relaxed">
                  {desc}
                </span>
              )}
            </span>
            <span
              className={`shrink-0 mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                selected ? "border-primary" : "border-[#C8C3BA]"
              }`}
            >
              {selected && (
                <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── CheckboxStack (multi-select with same row-card vocabulary) ─── */

function CheckboxStack({
  options,
  value,
  maxSelect,
  onChange,
}: {
  options: string[];
  value: string[];
  maxSelect?: number;
  onChange: (arr: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      {maxSelect && (
        <div className="text-[12px] text-muted-foreground tabular-nums">
          Select up to {maxSelect}
          {value.length > 0 && (
            <>
              <span className="mx-2 text-muted-foreground/40">·</span>
              <strong className="font-semibold text-foreground">
                {value.length}
              </strong>{" "}
              chosen
            </>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const selected = value.includes(opt);
          const atMax = !!maxSelect && value.length >= maxSelect && !selected;
          const prefix = optionPrefix(i, options.length);
          const dashIdx = opt.indexOf(" - ");
          const title = dashIdx >= 0 ? opt.slice(0, dashIdx) : opt;
          const desc = dashIdx >= 0 ? opt.slice(dashIdx + 3) : null;
          return (
            <button
              key={opt}
              type="button"
              disabled={atMax}
              onClick={() => {
                if (selected) onChange(value.filter((s) => s !== opt));
                else onChange([...value, opt]);
              }}
              className={`relative text-left flex items-start gap-5 px-5 py-4 sm:px-6 sm:py-5 border rounded-xl transition-colors ${
                selected
                  ? "border-primary bg-gradient-to-r from-primary/[0.06] to-transparent"
                  : atMax
                  ? "border-[#E5E2DC] bg-[#F3F0EA] opacity-50 cursor-not-allowed"
                  : "border-[#E5E2DC] bg-white hover:border-[#C8C3BA]"
              }`}
            >
              {selected && (
                <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-primary rounded-r" />
              )}
              <span
                className={`shrink-0 w-8 text-center text-[12px] font-semibold tabular-nums pt-0.5 ${
                  selected ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {prefix}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15.5px] font-semibold text-foreground">
                  {title}
                </span>
                {desc && (
                  <span className="block mt-1 text-[13.5px] text-muted-foreground leading-relaxed">
                    {desc}
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 mt-1 w-4 h-4 border-2 flex items-center justify-center transition-colors ${
                  selected ? "border-primary bg-primary" : "border-[#C8C3BA]"
                }`}
              >
                {selected && (
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 6l3 3 5-6" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────── Email Capture Step ──────────────────── */

function EmailCaptureStep({
  stepNumber,
  totalSteps,
  firstName,
  email,
  emailRefused,
  onFirstNameChange,
  onEmailChange,
  onRefuseClick,
}: {
  stepNumber: number;
  totalSteps: number;
  firstName: string;
  email: string;
  emailRefused: boolean;
  onFirstNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onRefuseClick: () => void;
}) {
  return (
    <div className="pt-16 sm:pt-20 space-y-10">
      <div className="space-y-5">
        <QuestionEyebrow stepNumber={stepNumber} isFinal totalSteps={totalSteps} />
        <h2 className="text-[34px] sm:text-[40px] lg:text-[44px] font-extrabold tracking-tight leading-[1.1] text-foreground max-w-3xl">
          Where should we send your report?
        </h2>
        <p className="text-[15.5px] text-muted-foreground leading-relaxed max-w-2xl">
          We'll email your report so you don't lose it.
        </p>
      </div>

      <div className="space-y-6">
        {/* Fields: 5/7 horizontal on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6">
          <div className="sm:col-span-5 space-y-2">
            <label
              htmlFor="first-name"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              First name
            </label>
            <input
              id="first-name"
              type="text"
              placeholder="e.g. Jane"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              className="w-full bg-white border border-[#D8D4CC] rounded-lg px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {!emailRefused && (
            <div className="sm:col-span-7 space-y-2">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@work-or-personal.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full bg-white border border-[#D8D4CC] rounded-lg px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          {emailRefused && (
            <div className="sm:col-span-7 flex items-end">
              <p className="text-[13.5px] text-muted-foreground italic">
                Continuing without email. Your report won't be saved.
              </p>
            </div>
          )}
        </div>

        {/* Trust line, bracketed stone-tinted inset between fields and button (F4) */}
        <div className="bg-[#F3F0EA] border border-[#E5E2DC] rounded-lg px-5 py-3.5 flex items-center gap-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shrink-0">
            Trust
          </span>
          <span className="text-[13.5px] text-foreground leading-snug">
            <strong className="font-semibold">No marketing.</strong>{" "}
            <span className="text-muted-foreground">
              You can delete your data any time.
            </span>
          </span>
        </div>

        {/* Refusal link sits beneath the trust line, subordinate to the action zone */}
        {!emailRefused && (
          <div className="pt-2">
            <button
              onClick={onRefuseClick}
              className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
            >
              I'd rather not, continue without email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
