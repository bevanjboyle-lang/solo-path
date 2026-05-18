import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActivationPlanOutput, DayDetail, Task } from "@/types/canonical";

interface Props {
  activation_plan: ActivationPlanOutput["activation_plan"];
}

const strandColors: Record<string, string> = {
  shared: "border-muted-foreground/40 bg-muted text-muted-foreground",
  strand_1: "border-primary/40 bg-primary/10 text-primary",
  strand_2: "border-blue-400/40 bg-blue-50 text-blue-700",
  strand_3: "border-amber-400/40 bg-amber-50 text-amber-700",
};

const strandBorderColors: Record<string, string> = {
  shared: "border-muted-foreground/40",
  strand_1: "border-primary",
  strand_2: "border-blue-400",
  strand_3: "border-amber-400",
};

function strandColorClass(strand_id: string): string {
  return strandColors[strand_id] ?? strandColors.shared;
}

function strandBorderClass(strand_id: string): string {
  return strandBorderColors[strand_id] ?? strandBorderColors.shared;
}

/**
 * `time_allocation` may arrive as either the canonical schema array
 * `Array<{ strand_key, minutes }>` or the legacy adapter object form
 * `Record<string, string>`. Render either by normalising into entries.
 */
function normaliseTimeAllocation(
  ta: DayDetail["time_allocation"]
): Array<{ key: string; minutes: string }> {
  if (!ta) return [];
  if (Array.isArray(ta)) {
    return ta.map((entry) => ({ key: entry.strand_key, minutes: entry.minutes }));
  }
  return Object.entries(ta).map(([key, minutes]) => ({ key, minutes: String(minutes) }));
}

function MoveBlock({ task }: { task: Task }) {
  const [copied, setCopied] = useState(false);
  const move = task.move;
  if (!move) return null;

  const draftText = move.draft ?? move.post_draft ?? "";
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 rounded-md bg-muted p-4 relative">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {move.type}
        {move.format ? ` · ${move.format.replace(/_/g, " ")}` : ""}
      </p>
      {move.subject && (
        <p className="text-xs italic text-primary mb-2">Subject: {move.subject}</p>
      )}
      {draftText && (
        <p className="text-sm text-muted-foreground whitespace-pre-line font-mono pr-14">{draftText}</p>
      )}
      {move.platform_name && (
        <p className="text-sm text-secondary-foreground mt-1">
          <span className="font-semibold">Platform:</span> {move.platform_name}
          {move.platform_url ? ` (${move.platform_url})` : ""}
        </p>
      )}
      {move.communities && move.communities.length > 0 && (
        <ul className="mt-2 space-y-1">
          {move.communities.map((c, i) => (
            <li key={i} className="text-xs text-secondary-foreground">
              {c.name} <span className="text-muted-foreground">({c.platform})</span>
            </li>
          ))}
        </ul>
      )}
      {draftText && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-7 text-xs gap-1"
          onClick={() => handleCopy(draftText)}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
      {move.tone_note && (
        <p className="mt-2 text-[10px] italic text-muted-foreground">{move.tone_note}</p>
      )}
      {move.personalisation_instructions && (
        <p className="text-[10px] italic text-muted-foreground">{move.personalisation_instructions}</p>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [showDraft, setShowDraft] = useState(false);
  const hasMove = !!task.move;

  // F93 (2026-05-07): surface task.status (set by process-checkin's applyPlanUpdates
  // when a check-in marks a task completed/missed/moved). The canonical Task type
  // doesn't carry status today, so we cast through Record to read it safely without
  // touching the type contract.
  const taskExtra = task as unknown as Record<string, unknown>;
  const status = (taskExtra.status as string | undefined) || "pending";
  const updateNotes = taskExtra.update_notes as string | undefined;
  const targetDate = taskExtra.target_date as string | undefined;
  const isCompleted = status === "completed";
  const isMoved = status === "moved";
  const isMissed = status === "missed";
  const hasStatusChange = isCompleted || isMoved || isMissed;

  return (
    <div
      className={`rounded bg-background border-l-[3px] ${strandBorderClass(task.strand_id)} p-4 ${
        hasStatusChange ? "opacity-90" : ""
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className={`text-[10px] font-medium border ${strandColorClass(task.strand_id)}`}>
          {task.strand_id === "shared" ? "Shared" : task.strand_id.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline" className="text-[10px] font-medium bg-muted text-muted-foreground border-border">
          {task.task_type}
        </Badge>
        {task.move_type && (
          <Badge variant="outline" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/30">
            {task.move_type}
          </Badge>
        )}
        {task.outreach_subtype && (
          <Badge variant="outline" className="text-[10px] font-medium bg-muted text-muted-foreground border-border">
            {task.outreach_subtype}
          </Badge>
        )}
        {/* F93: status badges */}
        {isCompleted && (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold bg-[hsl(var(--surface-mint-tint))] text-primary border-primary/40"
          >
            ✓ Completed
          </Badge>
        )}
        {isMoved && (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200"
          >
            → Moved{targetDate ? ` to ${targetDate}` : ""}
          </Badge>
        )}
        {isMissed && (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold bg-rose-50 text-rose-700 border-rose-200"
          >
            Missed
          </Badge>
        )}
      </div>
      <p
        className={`text-sm leading-relaxed text-secondary-foreground ${
          isCompleted ? "line-through decoration-primary/60 decoration-1" : ""
        }`}
      >
        {task.description}
      </p>

      {/* F93: surface update_notes when present (e.g., reason a task was moved). */}
      {updateNotes && hasStatusChange && (
        <p className="mt-2 text-xs italic text-muted-foreground">{updateNotes}</p>
      )}

      {hasMove && (
        <>
          <button
            onClick={() => setShowDraft(!showDraft)}
            className="mt-2 text-xs font-medium text-primary hover:text-primary/80"
          >
            {showDraft ? "Hide draft" : "View draft"}
          </button>
          {showDraft && <MoveBlock task={task} />}
        </>
      )}
    </div>
  );
}

function DayBlock({ day }: { day: DayDetail }) {
  const [open, setOpen] = useState(false);
  const allocations = normaliseTimeAllocation(day.time_allocation);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted px-4 py-3 text-left hover:bg-muted/80 transition-colors">
        <div>
          <p className="text-sm font-semibold text-foreground">{day.day}, {day.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {day.time_required} · {day.tasks.length} task{day.tasks.length === 1 ? "" : "s"}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {allocations.length > 0 && (
          <div className="mt-2 ml-2 flex flex-wrap gap-2">
            {allocations.map(({ key, minutes }) => (
              <span
                key={key}
                className="rounded-md bg-card border border-border px-2.5 py-1 text-[10px] text-muted-foreground"
              >
                {key === "shared" ? "Shared" : key.replace(/_/g, " ")}: {minutes}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 space-y-3 ml-2">
          {day.tasks.map((t) => <TaskCard key={t.task_id} task={t} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PlanSection({ activation_plan }: Props) {
  const { summary, pacing_note, network_note, phases, success_metric } = activation_plan;

  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">Your 30-Day Activation Plan</h2>

      {summary && (
        <p className="text-sm text-secondary-foreground mb-6">{summary}</p>
      )}

      {/* Pacing notes */}
      <div className="space-y-3 mb-6">
        {pacing_note && (
          <div className="rounded bg-muted border-l-4 border-primary px-5 py-3">
            <p className="text-sm text-secondary-foreground">
              <span className="font-semibold text-foreground">Pacing:</span> {pacing_note}
            </p>
          </div>
        )}
        {network_note && (
          <div className="rounded bg-muted border-l-4 border-primary px-5 py-3">
            <p className="text-sm text-secondary-foreground">
              <span className="font-semibold text-foreground">Network:</span> {network_note}
            </p>
          </div>
        )}
      </div>

      {/* Phase tabs */}
      {phases && phases.length > 0 && (
        <Tabs defaultValue="0">
          <TabsList className="bg-card border border-border w-full justify-start flex-wrap h-auto p-1 gap-1">
            {phases.map((p, i) => (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="text-xs data-[state=active]:bg-muted data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                {p.phase}
              </TabsTrigger>
            ))}
          </TabsList>
          {phases.map((phase, i) => (
            <TabsContent key={i} value={String(i)} className="mt-4">
              <div className="mb-4">
                <p className="text-xs text-muted-foreground">{phase.days}</p>
                <p className="text-sm italic text-muted-foreground mt-1">{phase.goal}</p>
                {phase.strand_focus && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">Focus:</span> {phase.strand_focus}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {phase.days_detail.map((d) => <DayBlock key={d.day} day={d} />)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {success_metric && (
        <div className="mt-6 rounded-md bg-card border-l-4 border-primary px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Success metric</p>
          <p className="text-sm text-secondary-foreground">{success_metric}</p>
        </div>
      )}
    </section>
  );
}
