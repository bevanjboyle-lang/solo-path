import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SAMPLE_NETWORK_TOOLKIT, type NetworkTemplate } from "@/data/sampleReportData";
import { Copy, Check } from "lucide-react";

function TemplateCard({ template }: { template: NetworkTemplate }) {
  const [copied, setCopied] = useState(false);
  const fullText = template.body.join("\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeBadgeColor: Record<string, string> = {
    Email: "bg-blue-100 text-blue-700 border-blue-200",
    LinkedIn: "bg-sky-100 text-sky-700 border-sky-200",
    Spoken: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <div className="rounded-xl border border-border bg-background/50 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-foreground">{template.title}</h4>
        <Badge variant="outline" className={`text-[10px] font-medium shrink-0 ${typeBadgeColor[template.type]}`}>
          {template.type}
        </Badge>
      </div>
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 relative">
        <div className="space-y-2 pr-14">
          {template.body.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">{para}</p>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-7 text-xs gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-3 text-xs italic text-muted-foreground">{template.note}</p>
    </div>
  );
}

export default function NetworkToolkitSection() {
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Network Toolkit</h2>
      <div className="space-y-4">
        {SAMPLE_NETWORK_TOOLKIT.map((t, i) => (
          <TemplateCard key={i} template={t} />
        ))}
      </div>
    </GlassCard>
  );
}
