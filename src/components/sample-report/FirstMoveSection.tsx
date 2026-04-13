import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SAMPLE_FIRST_MOVE } from "@/data/sampleReportData";
import { Copy, Check, Mail } from "lucide-react";

export default function FirstMoveSection() {
  const fm = SAMPLE_FIRST_MOVE;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const emailText = fm.outreach_draft.subject
      ? `Subject: ${fm.outreach_draft.subject}\n\n${fm.outreach_draft.body}`
      : fm.outreach_draft.body;
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">Your First Move</h2>
      <div className="rounded-lg bg-[#15191E] border-l-[6px] border-[#2ECDB0] p-6 sm:p-10">
        <span className="inline-block rounded-full bg-[#2ECDB0] px-4 py-1.5 text-xs font-bold text-[#0F1117] mb-4">
          {fm.window}
        </span>
        <h3 className="text-[1.3rem] font-bold text-white mb-4">{fm.action}</h3>

        <div className="rounded-md bg-[#1A1F28] p-5 mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why This First</h4>
          <p className="text-sm leading-relaxed text-[#E8E8E8]">{fm.why_first}</p>
        </div>

        {/* Email draft */}
        <div className="rounded-lg border border-border bg-[#1F2430] overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/30">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Draft Email</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="px-4 py-3">
            {fm.outreach_draft.subject && (
              <p className="text-xs font-semibold text-[#2ECDB0] italic mb-2">Subject: {fm.outreach_draft.subject}</p>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line font-mono">{fm.outreach_draft.body}</p>
          </div>
        </div>

        <p className="mt-3 text-xs italic text-muted-foreground">{fm.outreach_draft.tone_note}</p>
        <p className="mt-1 text-xs italic text-muted-foreground">{fm.outreach_draft.personalisation_instructions}</p>
        <p className="mt-4 text-sm text-muted-foreground">{fm.follow_up_prompt}</p>
      </div>
    </section>
  );
}
