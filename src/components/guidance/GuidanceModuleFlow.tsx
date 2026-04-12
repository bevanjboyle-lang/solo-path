import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { GuidanceModule } from "@/data/guidanceModules";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  module: GuidanceModule;
  onClose: () => void;
  onComplete: (moduleId: number, output: any) => void;
}

export default function GuidanceModuleFlow({ module, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = module.questions[step];
  const total = module.questions.length;
  const isLast = step === total - 1;
  const selected = question ? answers[question.id] : undefined;

  const handleNext = async () => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    // Generate guidance
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-guidance", {
        body: { module_id: module.id, module_answers: answers },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      onComplete(module.id, data.output);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => !generating && onClose()}>
      <DialogContent className="sm:max-w-xl bg-card border-border text-foreground">
        {generating ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating your personalised guidance…</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground text-base font-semibold">
                {module.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Question {step + 1} of {total}
              </p>
            </DialogHeader>

            <p className="text-[15px] text-foreground/90 leading-relaxed mt-2 mb-4">
              {question.text}
            </p>

            <div className="flex flex-col gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt }))}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                    selected === opt
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleNext}
                disabled={!selected}
                className="bg-primary text-primary-foreground hover:bg-[#1FAF97]"
              >
                {isLast ? "Generate guidance →" : "Next →"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
