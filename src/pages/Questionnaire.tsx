import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { questions, Question } from "@/data/questions";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function Questionnaire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
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

  const q = questions[current];
  const total = questions.length;
  const progress = ((current + 1) / total) * 100;
  const answer = answers[q.id];

  const setAnswer = useCallback(
    (val: string | string[]) => {
      const updated = { ...answers, [q.id]: val };
      setAnswers(updated);
      saveAnswers(updated);
    },
    [q.id, answers, saveAnswers]
  );

  const canContinue =
    q.type === "text"
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
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={q.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{q.text}</h2>
              {q.type === "multi" && q.maxSelect && (
                <p className="mt-2 text-sm text-muted-foreground">Select up to {q.maxSelect}</p>
              )}
              <div className="mt-8">
                <QuestionInput question={q} value={answer} onChange={setAnswer} />
              </div>
            </motion.div>
          </AnimatePresence>
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

  return null;
}
