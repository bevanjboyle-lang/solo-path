import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, Check, UserSearch, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActivationPlanOutput, DayDetail, Task } from "@/types/canonical";
import type { ApolloContact } from "@/types/apollo";
import ApolloContactPicker from "@/components/ApolloContactPicker";

/**
 * Personalise a draft by substituting common placeholder patterns with the
 * selected Apollo contact's fields. Conservative on purpose — we only
 * replace patterns we can be confident about (name, company). Domain-specific
 * placeholders like [Trust name] or [transformation focus] are left for the
 * user to fill in. The original `[Name]` etc. patterns come from P3's
 * outreach_draft templates.
 */
function personaliseDraft(draft: string, contact: ApolloContact): string {
  let out = draft;
  const first = contact.first_name?.trim();
  const company = contact.company?.trim();
  if (first) {
    // Replace [Name] / [name] / [NAME] — case-insensitive, exact bracket match.
    out = out.replace(/\[name\]/gi, first);
    out = out.replace(/\[their name\]/gi, first);
    out = out.replace(/\[contact name\]/gi, first);
  }
  if (company) {
    out = out.replace(/\[their company\]/gi, company);
    out = out.replace(/\[company\]/gi, company);
    out = out.replace(/\[company name\]/gi, company);
  }
  return out;
}

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

function MoveBlock({ task, draftOverride }: { task: Task; draftOverride?: string | null }) {
  const [copied, setCopied] = useState(false);
  const move = task.move;
  if (!move) return null;

  // When `draftOverride` is supplied (e.g. after Apollo contact substitution),
  // render that text instead of the original draft from the move.
  const baseDraft = move.draft ?? move.post_draft ?? "";
  const draftText = draftOverride && draftOverride.length > 0 ? draftOverride : baseDraft;
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [personalisedContact, setPersonalisedContact] = useState<ApolloContact | null>(null);
  const [personalisedDraft, setPersonalisedDraft] = useState<string | null>(null);

  const hasMove = !!task.move;
  // Apollo "Find named contacts" affordance is only offered for cold outreach
  // tasks that carry an apollo_query payload. Warm tasks use the user's own
  // network and don't benefit from contact discovery.
  const canFindContacts =
    task.outreach_subtype === "cold" &&
    !!task.apollo_query &&
    Array.isArray(task.apollo_query.person_titles) &&
    task.apollo_query.person_titles.length > 0;

  const handleContactSelected = (contact: ApolloContact) => {
    const baseDraft = task.move?.draft ?? task.move?.post_draft ?? "";
    const personalised = baseDraft ? personaliseDraft(baseDraft, contact) : "";
    setPersonalisedContact(contact);
    setPersonalisedDraft(personalised || null);
    setPickerOpen(false);
  };

  const handleResetContact = () => {
    setPersonalisedContact(null);
    setPersonalisedDraft(null);
  };

  return (
    <div className={`rounded bg-background border-l-[3px] ${strandBorderClass(task.strand_id)} p-4`}>
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
      </div>
      <p className="text-sm leading-relaxed text-secondary-foreground">{task.description}</p>

      {personalisedContact && (
        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
          <span className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-medium text-primary">
            Personalised for {personalisedContact.name}
            {personalisedContact.company ? ` · ${personalisedContact.company}` : ""}
          </span>
          {personalisedContact.linkedin_url && (
            <a
              href={personalisedContact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              aria-label="Open LinkedIn profile"
            >
              LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            onClick={handleResetContact}
            className="text-muted-foreground hover:text-foreground"
          >
            Use a different contact
          </button>
        </div>
      )}

      {hasMove && (
        <>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowDraft(!showDraft)}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              {showDraft ? "Hide draft" : "View draft"}
            </button>
            {canFindContacts && showDraft && !pickerOpen && !personalisedContact && (
              <button
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
              >
                <UserSearch className="h-3 w-3" />
                Find named contacts
              </button>
            )}
          </div>
          {showDraft && <MoveBlock task={task} draftOverride={personalisedDraft} />}
          {showDraft && pickerOpen && task.apollo_query && (
            <ApolloContactPicker
              apolloQuery={task.apollo_query}
              onContactSelected={handleContactSelected}
              onClose={() => setPickerOpen(false)}
            />
          )}
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
          <p className="text-sm font-semibold text-foreground">{day.day} — {day.label}</p>
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
