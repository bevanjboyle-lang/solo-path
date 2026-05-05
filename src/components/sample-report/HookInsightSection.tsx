import { useState } from "react";
import { Lightbulb, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  hook_insight: SoloCoreReport["hook_insight"];
}

export default function HookInsightSection({ hook_insight }: Props) {
  const { headline, paragraph, first_move } = hook_insight;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!first_move) return;
    const text = first_move.draft_subject
      ? `Subject: ${first_move.draft_subject}\n\n${first_move.draft_body}`
      : first_move.draft_body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">Your Market Edge</h2>
      <div className="rounded-lg bg-muted border-l-[6px] border-primary p-6 sm:p-10">
        <div className="flex items-start gap-3 mb-4">
          <Lightbulb className="h-5 w-5 text-primary mt-1 shrink-0" />
          <h3 className="text-[1.5rem] font-bold text-primary leading-snug">{headline}</h3>
        </div>
        <p className="text-base leading-relaxed text-secondary-foreground">{paragraph}</p>

        {/* First move callout */}
        {first_move && (
          <div className="mt-6 rounded-lg border border-primary/30 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              Your single most important early move
            </p>
            <p className="text-base font-semibold text-foreground mb-1">{first_move.action}</p>
            {first_move.target && (
              <p className="text-sm text-muted-foreground mb-4">Target: {first_move.target}</p>
            )}

            {(first_move.draft_subject || first_move.draft_body) && (
              <div className="rounded-md border border-border bg-muted overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Draft</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="px-4 py-3">
                  {first_move.draft_subject && (
                    <p className="text-xs font-semibold text-primary italic mb-2">
                      Subject: {first_move.draft_subject}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line font-mono">
                    {first_move.draft_body}
                  </p>
                </div>
              </div>
            )}

            {first_move.follow_up_prompt && (
              <p className="mt-3 text-sm italic text-muted-foreground">{first_move.follow_up_prompt}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
