import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_PLAN, type PlanPhase, type PlanTask } from "@/data/sampleReportData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tagColors: Record<string, string> = {
  outreach: "bg-primary/15 text-primary border-primary/30",
  foundational: "bg-blue-100 text-blue-700 border-blue-200",
  visibility: "bg-purple-100 text-purple-700 border-purple-200",
  prep: "bg-muted text-muted-foreground border-border",
};

function CopyableTemplate({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 px-4 py-3 relative">
      <p className="text-xs leading-relaxed text-muted-foreground italic pr-16">{text}</p>
      <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] gap-1" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function TaskItem({ task }: { task: PlanTask }) {
  return (
    <div className="pl-4 border-l-2 border-primary/20 py-2">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-xs font-bold text-primary">Task {task.number}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tagColors[task.tag_type]}`}>
          {task.tag}
        </span>
      </div>
      <h4 className="mt-1 text-sm font-semibold text-foreground">{task.title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.detail}</p>
      {task.outreach_draft && <CopyableTemplate text={task.outreach_draft} />}
    </div>
  );
}

function PhaseBlock({ phase, defaultOpen }: { phase: PlanPhase; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <div>
          <p className="text-sm font-semibold text-foreground">Phase {phase.phase}: {phase.title}</p>
          <p className="text-[11px] text-muted-foreground">{phase.days} · {phase.tasks.length} tasks</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-4 ml-2">
          {phase.tasks.map((t) => (
            <TaskItem key={t.number} task={t} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PlanSection() {
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">30-Day Activation Plan</h2>
      <div className="space-y-3">
        {SAMPLE_PLAN.map((phase) => (
          <PhaseBlock key={phase.phase} phase={phase} defaultOpen={phase.phase === 1} />
        ))}
      </div>
    </GlassCard>
  );
}
