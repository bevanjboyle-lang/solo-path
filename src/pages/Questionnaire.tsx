import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { questions, Question } from "@/data/questions";
import { ArrowLeft, Check, LogOut, Upload, FileText, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showCvStep, setShowCvStep] = useState(true);
  const [cvExtract, setCvExtract] = useState<any>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load saved answers on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("questionnaire_responses")
      .select("answers")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.answers && typeof data.answers === "object" && !Array.isArray(data.answers)) {
          const saved: Record<number, string | string[]> = {};
          for (const [k, v] of Object.entries(data.answers as Record<string, unknown>)) {
            saved[Number(k)] = v as string | string[];
          }
          setAnswers(saved);
        }
      });
  }, [user]);

  // Debounced save
  const saveAnswers = useCallback(
    (updated: Record<number, string | string[]>, completed = false) => {
      if (!user) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        await supabase
          .from("questionnaire_responses")
          .upsert(
            { user_id: user.id, answers: updated as any, completed },
            { onConflict: "user_id" }
          );
      }, 500);
    },
    [user]
  );

  const cvWasUploaded = cvExtract !== null;
  const displayTotal = cvWasUploaded ? 12 : questions.length;
  const total = questions.length;
  const progress = ((current + 1) / total) * 100;
  const answer = answers[currentQuestion.id];

  const setAnswer = useCallback(
    (val: string | string[]) => {
      const activeQuestion = questions[current] ?? questions[0]!;

      setAnswers((prev) => {
        const updated = { ...prev, [activeQuestion.id]: val };
        saveAnswers(updated);
        return updated;
      });
    },
    [current, saveAnswers]
  );

  
  const handleCvUpload = useCallback(async (file: File) => {
    if (!file) return;
    setCvUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user?.id) formData.append('user_id', user.id);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://dnnxmjazillhktwttkux.supabase.co/functions/v1/parse-cv`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubnhtamF6aWxsaGt0d3R0a3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjM5NTEsImV4cCI6MjA5MTIzOTk1MX0.kf_6j2W2Vnw01qaxBrtg4yCJUHVs40Es_WG-IFu53YE"}` },
          body: formData,
        }
      );
      const result = await response.json();
      if (result.success && result.cv_extract) {
        const ex = result.cv_extract;
        setCvExtract(ex);
        if (ex.confidence_score >= 50) {
          const prefilled: Record<number, string | string[]> = {};
          if (ex.current_job_title) prefilled[1] = ex.current_job_title;
          if (ex.employer_org_type) prefilled[30] = ex.employer_org_type;
          if (ex.type_of_work) prefilled[4] = ex.type_of_work;
          if (ex.seniority_level) prefilled[5] = ex.seniority_level;
          if (ex.sector_primary) prefilled[3] = ex.sector_primary;
          if (ex.years_experience) {
            const yrs = Number(ex.years_experience);
            if (yrs >= 2 && yrs <= 4) prefilled[2] = '2–4 years';
            else if (yrs >= 5 && yrs <= 7) prefilled[2] = '5–7 years';
            else if (yrs >= 8 && yrs <= 12) prefilled[2] = '8–12 years';
            else if (yrs >= 13 && yrs <= 18) prefilled[2] = '13–18 years';
            else if (yrs >= 19) prefilled[2] = '19+ years';
          }
          setAnswers(prev => ({ ...prev, ...prefilled }));
        }
      }
    } catch (err) {
      console.error('CV parse error:', err);
    } finally {
      setCvUploading(false);
      setShowCvStep(false);
    }
  }, [user]);

  const isRequired = currentQuestion.required !== false;
  const canContinue = !isRequired
    ? true
    : currentQuestion.type === "text"
      ? typeof answer === "string" && answer.trim().length > 0
      : answer !== undefined && (Array.isArray(answer) ? answer.length > 0 : true);

  const next = () => {
    if (!canContinue) return;
    if (current === total - 1) {
      // Final save with completed flag
      saveAnswers(answers, true);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      // Immediate save before navigating
      if (user) {
        supabase
          .from("questionnaire_responses")
          .upsert(
            { user_id: user.id, answers: answers as any, completed: true },
            { onConflict: "user_id" }
          )
          .then(() => navigate("/processing"));
      }
      return;
    }
    setDirection(1);
    setCurrent((c) => c + 1);
  };

  const back = () => {
    if (current === 0) {
      navigate("/");
      return;
    }
    setDirection(-1);
    setCurrent((c) => c - 1);
  };

  // CV upload step — shown before questionnaire starts
  if (showCvStep) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground items-center justify-center px-6">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Before we start</h1>
            <p className="text-muted-foreground">
              Do you have a CV to hand? Uploading it lets us skip most of the basic questions — we'll read your work history directly and only ask the things a CV can't tell us.
            </p>
          </div>
          <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              {cvUploading ? (
                <>
                  <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Reading your CV...</p>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      <Upload className="h-4 w-4" />
                      Upload CV — PDF or Word
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCvUpload(file);
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">PDF or Word, up to 5MB</p>
                </>
              )}
            </div>
          </div>
          {!cvUploading && (
            <button
              onClick={() => setShowCvStep(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Continue without CV →
            </button>
          )}
        </div>
      </div>
    );
  }

  
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <button onClick={back} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-xs text-muted-foreground">
            Question {current + 1} of {total}
          </span>
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Progress */}
        <div className="h-0.5 bg-border/50">
          <motion.div
            className="h-full rounded-r-full"
            style={{ background: "var(--gradient-cta)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="flex flex-1 items-center justify-center px-6 pt-20 pb-32">
        <div className="w-full max-w-xl">
          <motion.div
            key={`question-${currentQuestion.id}`}
            initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{currentQuestion.text}</h2>
              {currentQuestion.required === false && (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Optional</span>
              )}
            </div>
              {currentQuestion.subtext && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{currentQuestion.subtext}</p>
              )}
            {currentQuestion.type === "multi" && currentQuestion.maxSelect && (
              <p className="mt-2 text-sm text-muted-foreground">Select up to {currentQuestion.maxSelect}</p>
            )}
            <div className="mt-8">
              <QuestionInput
                key={`input-${currentQuestion.id}`}
                question={currentQuestion}
                value={answer}
                onChange={setAnswer}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-end px-6">
          <button
            onClick={next}
            disabled={!canContinue}
            className="inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "var(--gradient-cta)" }}
          >
            {current === total - 1 ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  if (question.type === "text") {
    return (
      <textarea
        className="w-full resize-none rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        rows={3}
        placeholder={question.placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "single") {
    return (
      <div className="flex flex-col gap-2.5">
        {question.options?.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`w-full rounded-lg border p-4 text-left text-sm transition-all ${
                selected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-surface text-foreground hover:border-primary/30"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "multi") {
    const selected = (value as string[]) ?? [];
    const max = question.maxSelect ?? Infinity;
    return (
      <div className="flex flex-col gap-2.5">
        {question.options?.map((opt) => {
          const isSelected = selected.includes(opt);
          const atMax = selected.length >= max && !isSelected;
          return (
            <button
              key={opt}
              disabled={atMax}
              onClick={() => {
                if (isSelected) onChange(selected.filter((s) => s !== opt));
                else onChange([...selected, opt]);
              }}
              className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 text-foreground"
                  : atMax
                  ? "border-border bg-surface text-muted-foreground opacity-50 cursor-not-allowed"
                  : "border-border bg-surface text-foreground hover:border-primary/30"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <select
        value={value as string || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
      >
        <option value="">Select an option...</option>
        {question.options?.map((opt: string, i: number) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return null;
}
