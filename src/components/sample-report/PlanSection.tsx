import { useState } from "react";
import { SAMPLE_PLAN, SAMPLE_PORTFOLIO_SUMMARY, type PlanDay, type PlanTask } from "@/data/sampleReportData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const strandColors: Record<string, string> = {
  shared: "border-[#6B7280] bg-[#6B7280]/15 text-[#9CA3AF]",
  strand_1: "border-[#2ECDB0] bg-[#2ECDB0]/15 text-[#2ECDB0]",
  strand_2: "border-[#3B82F6] bg-[#3B82F6]/15 text-[#3B82F6]",
  strand_3: "border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]",
};

const strandBorderColors: Record<string, string> = {
  shared: "border-[#6B7280]",
  strand_1: "border-[#2ECDB0]",
  strand_2: "border-[#3B82F6]",
  strand_3: "border-[#F59E0B]",
};

function TaskCard({ task }: { task: PlanTask }) {
  const [showDraft, setShowDraft] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded bg-[#0F1117] border-l-[3px] ${strandBorderColors[task.strand_id]} p-4`}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className={`text-[10px] font-medium border ${strandColors[task.strand_id]}`}>
          {task.strand_id === "shared" ? "Shared" : task.strand_id.replace("_", " ")}
        </Badge>
        <Badge variant="outline" className="text-[10px] font-medium bg-[#3B4252]/50 text-muted-foreground border-[#3B4252]">
          {task.task_type}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-[#E8E8E8]">{task.description}</p>

      {task.outreach_draft && (
        <>
          <button
            onClick={() => setShowDraft(!showDraft)}
            className="mt-2 text-xs font-medium text-[#2ECDB0] hover:text-[#2ECDB0]/80"
          >
            {showDraft ? "Hide draft" : "View draft"}
          </button>
          {showDraft && (
            <div className="mt-2 rounded-md bg-[#1F2430] p-4 relative">
              <p className="text-[10px] text-muted-foreground mb-1">{task.outreach_draft.format}</p>
              {task.outreach_draft.subject && (
                <p className="text-xs italic text-[#2ECDB0] mb-2">Subject: {task.outreach_draft.subject}</p>
              )}
              <p className="text-sm text-muted-foreground whitespace-pre-line font-mono pr-14">{task.outreach_draft.body}</p>
              <Button
                variant="ghost" size="sm"
                className="absolute top-2 right-2 h-7 text-xs gap-1"
                onClick={() => handleCopy(task.outreach_draft!.body)}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <p className="mt-2 text-[10px] italic text-muted-foreground">{task.outreach_draft.tone_note}</p>
              <p className="text-[10px] italic text-muted-foreground">{task.outreach_draft.personalisation_instructions}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DayBlock({ day }: { day: PlanDay }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-[#1A1F28] px-4 py-3 text-left hover:bg-[#1F2430] transition-colors">
        <div>
          <p className="text-sm font-semibold text-white">{day.day} — {day.label}</p>
          <p className="text-[11px] text-muted-foreground">{day.time_required} · {day.tasks.length} task{day.tasks.length > 1 ? "s" : ""}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 ml-2">
          {day.tasks.map((t) => <TaskCard key={t.task_id} task={t} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PlanSection() {
  const phases = SAMPLE_PLAN.phases;

  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">Your 30-Day Activation Plan</h2>

      {/* Portfolio summary */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Your Portfolio Strategy</h3>
        <p className="text-sm text-[#E8E8E8] mb-4">{SAMPLE_PORTFOLIO_SUMMARY.strategy}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SAMPLE_PORTFOLIO_SUMMARY.strands.map((s) => (
            <div key={s.strand_id} className="rounded-md bg-[#15191E] border border-[#2ECDB0]/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">Strand {s.rank}</p>
              <p className="text-sm font-bold text-[#2ECDB0]">{s.model_name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{Math.round(s.time_weight * 100)}% of effort</p>
              <p className="text-xs text-[#E8E8E8] mt-2">{s.why_included}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pacing notes */}
      <div className="space-y-3 mb-6">
        <div className="rounded bg-[#1A1F28] border-l-4 border-[#2ECDB0] px-5 py-3">
          <p className="text-sm text-[#E8E8E8]"><span className="font-semibold text-white">Pacing:</span> {SAMPLE_PLAN.pacing_note}</p>
        </div>
        <div className="rounded bg-[#1A1F28] border-l-4 border-[#2ECDB0] px-5 py-3">
          <p className="text-sm text-[#E8E8E8]"><span className="font-semibold text-white">Network:</span> {SAMPLE_PLAN.network_note}</p>
        </div>
      </div>

      {/* Phase tabs */}
      <Tabs defaultValue="0">
        <TabsList className="bg-[#15191E] border border-border w-full justify-start flex-wrap h-auto p-1 gap-1">
          {phases.map((p, i) => (
            <TabsTrigger key={i} value={String(i)} className="text-xs data-[state=active]:bg-[#1A1F28] data-[state=active]:text-[#2ECDB0] data-[state=active]:border-b-2 data-[state=active]:border-[#2ECDB0]">
              {p.phase}
            </TabsTrigger>
          ))}
        </TabsList>
        {phases.map((phase, i) => (
          <TabsContent key={i} value={String(i)} className="mt-4">
            <div className="mb-4">
              <p className="text-xs text-muted-foreground">{phase.days}</p>
              <p className="text-sm italic text-[#E8E8E8]/70 mt-1">{phase.goal}</p>
            </div>
            <div className="space-y-3">
              {phase.days_detail.map((d) => <DayBlock key={d.day} day={d} />)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
