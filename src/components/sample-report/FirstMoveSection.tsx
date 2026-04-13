import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { SAMPLE_FIRST_MOVE } from "@/data/sampleReportData";
import { Copy, Check, Mail } from "lucide-react";

export default function FirstMoveSection() {
  const fm = SAMPLE_FIRST_MOVE;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const emailText = `Subject: ${fm.draft_subject}\n\n${fm.draft_body}`;
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your First Move</h2>
      <h3 className="mb-4 text-lg font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.01em" }}>
        {fm.action}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{fm.detail}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{fm.why_first}</p>

      {/* Email draft */}
      <div className="mt-6 rounded-lg border border-border bg-background/60 overflow-hidden">
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
          <p className="text-xs font-semibold text-foreground mb-2">Subject: {fm.draft_subject}</p>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{fm.draft_body}</p>
        </div>
      </div>

      <p className="mt-4 text-xs italic text-muted-foreground">{fm.follow_up}</p>
    </GlassCard>
  );
}
