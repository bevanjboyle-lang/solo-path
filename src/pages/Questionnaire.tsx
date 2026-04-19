import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, AlertCircle } from "lucide-react";
import { questions, Question } from "@/data/questions";
import { getClientSessionId, generateReport } from "@/lib/handlers";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import ProgressHeader from "@/components/ProgressHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const TOTAL_STEPS = questions.length + 1; // questions + email capture

export default function Questionnaire() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [emailRefused, setEmailRefused] = useState(false);
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  // Ensure client_session_id exists before any submit fires.
  useEffect(() => {
    getClientSessionId();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(session !== null);
    });
  }, []);

  // Authed users skip the email-capture step entirely.
  const totalSteps = isAuthed ? questions.length : questions.length + 1;
  const isEmailStep = !isAuthed && current >= questions.length;
  const currentQuestion = !isEmailStep ? questions[current] : null;
  const stepNumber = current + 1;

  // Validation
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
    },
    [currentQuestion]
  );

  const goBack = () => {
    if (current === 0) {
      navigate("/cv-upload");
      return;
    }
    setDirection(-1);
    setCurrent((c) => c - 1);
  };

  const isLastQuestion = current === questions.length - 1;
  const isFinalStep = isEmailStep || (isAuthed === true && isLastQuestion);

  const goForward = async () => {
    if (!isStepValid()) return;

    if (isFinalStep) {
      // Final submit — generate report
      setIsGenerating(true);
      setGenError(null);
      const result = await generateReport({
        client_session_id: getClientSessionId(),
        answers,
        first_name: isAuthed ? "" : firstName.trim(),
        email: isAuthed ? null : emailRefused ? null : email.trim(),
        email_refused: isAuthed ? false : emailRefused,
      });
      setIsGenerating(false);

      if (result.error || !result.report_id) {
        setGenError(result.error || "Something went wrong. Please try again.");
        return;
      }
      navigate(`/processing?report_id=${result.report_id}`);
      return;
    }

    setDirection(1);
    setCurrent((c) => c + 1);
  };

  const handleRefusalConfirm = () => {
    setEmailRefused(true);
    setShowRefusalModal(false);
  };

  // Build progress labels dynamically
  const progressLabels = Array.from({ length: totalSteps }, (_, i) =>
    i < questions.length ? `Q${i + 1}` : "Email"
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Minimal TopBar — logo only */}
      <TopBar minimal />

      {/* Progress */}
      <ProgressHeader
        currentStep={stepNumber}
        totalSteps={TOTAL_STEPS}
        labels={progressLabels}
        onBack={current > 0 ? goBack : undefined}
      />

      {/* Main area */}
      <main className="flex-1 flex items-center justify-center px-6 pb-32 pt-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" initial={false}>
            {isEmailStep ? (
              <motion.div
                key="email-capture"
                initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
                <EmailCaptureStep
                  firstName={firstName}
                  email={email}
                  emailRefused={emailRefused}
                  onFirstNameChange={setFirstName}
                  onEmailChange={setEmail}
                  onRefuseClick={() => setShowRefusalModal(true)}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`q-${currentQuestion!.id}`}
                initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <QuestionStep
                  question={currentQuestion!}
                  value={answers[currentQuestion!.id]}
                  onChange={setAnswer}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          {genError && (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-[hsl(var(--error))]/30 bg-[hsl(var(--error-bg))] px-4 py-3">
              <AlertCircle className="w-4 h-4 text-[hsl(var(--error))] shrink-0" />
              <p className="text-sm text-[hsl(var(--error))]">{genError}</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-[hsl(var(--surface-panel))]">
        <div className="max-w-xl mx-auto flex items-center justify-between px-6 h-16">
          {current > 0 ? (
            <button
              onClick={goBack}
              className="text-sm text-[hsl(var(--text-muted))] underline underline-offset-2 hover:text-[hsl(var(--text-body))] transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <Button
            onClick={goForward}
            disabled={!isStepValid() || isGenerating}
            className="bg-[hsl(var(--mint))] hover:bg-[hsl(var(--mint-hover))] text-white font-medium px-8"
          >
            {isGenerating
              ? "Generating your plan…"
              : isEmailStep
              ? "Generate my report"
              : "Continue"}
          </Button>
        </div>
      </div>

      {/* Email refusal modal */}
      <Dialog open={showRefusalModal} onOpenChange={setShowRefusalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[hsl(var(--text-heading))]">
              Without an email, we can't save your report.
            </DialogTitle>
            <DialogDescription className="text-sm text-[hsl(var(--text-body))] leading-relaxed pt-2">
              If you close this tab, your report is gone. There is no recovery.
              This is your only chance to see it. You can still continue without
              email — but we strongly recommend you don't.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRefusalModal(false)}
              className="w-full sm:w-auto"
            >
              Go back and add my email
            </Button>
            <Button
              variant="ghost"
              onClick={handleRefusalConfirm}
              className="w-full sm:w-auto text-[hsl(var(--text-muted))]"
            >
              Continue without email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────── Question Step ──────────────────── */

function QuestionStep({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl md:text-2xl font-semibold text-[hsl(var(--text-heading))] leading-snug">
            {question.text}
          </h2>
          {question.required === false && (
            <span className="shrink-0 rounded-full bg-[hsl(var(--surface-card))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--text-muted))]">
              Optional
            </span>
          )}
        </div>
        {question.subtext && (
          <p className="mt-2 text-sm text-[hsl(var(--text-muted))] leading-relaxed">
            {question.subtext}
          </p>
        )}
        {question.type === "multi" && question.maxSelect && (
          <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">
            Select up to {question.maxSelect}
          </p>
        )}
      </div>

      {/* Input control */}
      <div>
        {question.type === "text" && (
          <div className="space-y-3">
            <textarea
              className="w-full resize-none rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-4 text-sm leading-relaxed text-[hsl(var(--text-body))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mint))]/40"
              rows={3}
              placeholder={question.placeholder}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
            {question.expandableHint && (
              <div>
                <button
                  type="button"
                  onClick={() => setHintOpen(!hintOpen)}
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-body))] transition-colors"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${hintOpen ? "rotate-180" : ""}`}
                  />
                  {question.expandableLabel || "More detail"}
                </button>
                {hintOpen && (
                  <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--text-muted))] pl-4 border-l-2 border-[hsl(var(--mint))]/20">
                    {question.expandableHint}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {question.type === "single" && (
          <div className="flex flex-col gap-2.5">
            {question.options?.map((opt) => {
              const selected = value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => onChange(opt)}
                  className={`w-full rounded-lg border p-4 text-left text-sm transition-all ${
                    selected
                      ? "border-[hsl(var(--mint))] bg-[hsl(var(--surface-mint-tint))] text-[hsl(var(--text-heading))]"
                      : "border-border bg-[hsl(var(--surface-panel))] text-[hsl(var(--text-body))] hover:border-[hsl(var(--mint))]/30"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "multi" && (
          <div className="flex flex-col gap-2.5">
            {question.options?.map((opt) => {
              const selected = ((value as string[]) ?? []).includes(opt);
              const atMax =
                question.maxSelect &&
                ((value as string[]) ?? []).length >= question.maxSelect &&
                !selected;
              return (
                <button
                  key={opt}
                  disabled={!!atMax}
                  onClick={() => {
                    const arr = (value as string[]) ?? [];
                    if (selected) onChange(arr.filter((s) => s !== opt));
                    else onChange([...arr, opt]);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition-all ${
                    selected
                      ? "border-[hsl(var(--mint))] bg-[hsl(var(--surface-mint-tint))] text-[hsl(var(--text-heading))]"
                      : atMax
                      ? "border-border bg-[hsl(var(--surface-card))] text-[hsl(var(--text-muted))] opacity-50 cursor-not-allowed"
                      : "border-border bg-[hsl(var(--surface-panel))] text-[hsl(var(--text-body))] hover:border-[hsl(var(--mint))]/30"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      selected
                        ? "border-[hsl(var(--mint))] bg-[hsl(var(--mint))] text-white"
                        : "border-border"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "dropdown" && (
          <select
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-4 text-sm text-[hsl(var(--text-body))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--mint))]/40 cursor-pointer"
          >
            <option value="">Select an option…</option>
            {question.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

/* ──────────────────── Email Capture Step ──────────────────── */

function EmailCaptureStep({
  firstName,
  email,
  emailRefused,
  onFirstNameChange,
  onEmailChange,
  onRefuseClick,
}: {
  firstName: string;
  email: string;
  emailRefused: boolean;
  onFirstNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onRefuseClick: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold text-[hsl(var(--text-heading))] leading-snug">
          Where should we send your report?
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--text-muted))] leading-relaxed">
          We'll email your report so you don't lose it.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="first-name"
            className="text-sm font-medium text-[hsl(var(--text-heading))]"
          >
            First name
          </label>
          <Input
            id="first-name"
            type="text"
            placeholder="e.g. Sarah"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            className="bg-[hsl(var(--surface-panel))]"
          />
        </div>

        {!emailRefused && (
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[hsl(var(--text-heading))]"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="bg-[hsl(var(--surface-panel))]"
            />
          </div>
        )}

        {emailRefused && (
          <p className="text-sm text-[hsl(var(--text-muted))] italic">
            Continuing without email. Your report will not be saved.
          </p>
        )}
      </div>

      <p className="text-xs text-[hsl(var(--text-muted))]">
        No marketing. You can delete your data any time.
      </p>

      {!emailRefused && (
        <button
          onClick={onRefuseClick}
          className="text-sm text-[hsl(var(--text-muted))] underline underline-offset-2 hover:text-[hsl(var(--text-body))] transition-colors"
        >
          I'd rather not — continue without email
        </button>
      )}
    </div>
  );
}
