import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SAMPLE_NETWORK_TOOLKIT, type NetworkTemplate } from "@/data/sampleReportData";
import { Copy, Check } from "lucide-react";

const strandColors: Record<string, string> = {
  shared: "bg-muted text-muted-foreground border-border",
  strand_1: "bg-primary/10 text-primary border-primary/30",
  strand_2: "bg-blue-50 text-blue-700 border-blue-200",
  strand_3: "bg-amber-50 text-amber-700 border-amber-200",
};

const typeLabels: Record<string, string> = {
  reconnect_email: "Reconnection Email",
  linkedin_dm: "LinkedIn DM",
  referral_ask_email: "Referral Ask",
  verbal_positioning_statement: "Verbal Statement",
};

function TemplateCard({ template }: { template: NetworkTemplate }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-card p-5">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className="text-[10px] font-medium bg-muted text-muted-foreground border-border">
          {typeLabels[template.type] || template.type}
        </Badge>
        <Badge variant="outline" className={`text-[10px] font-medium ${strandColors[template.strand_id]}`}>
          {template.strand_id === "shared" ? "All Strands" : template.strand_id.replace("_", " ")}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{template.use_case}</p>

      <div className="rounded-md bg-muted px-4 py-3 relative">
        {template.subject && (
          <p className="text-xs italic text-primary mb-2">Subject: {template.subject}</p>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line font-mono pr-14">{template.body}</p>
        <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-7 text-xs gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export default function NetworkToolkitSection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-2">Network Activation Toolkit</h2>
      <p className="text-sm text-muted-foreground mb-6">Ready-to-use email and messaging templates for different outreach scenarios.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SAMPLE_NETWORK_TOOLKIT.map((t, i) => (
          <TemplateCard key={i} template={t} />
        ))}
      </div>
    </section>
  );
}
