import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Mail, ExternalLink, Megaphone, Users } from "lucide-react";
import type { ActivationPlanOutput, Move } from "@/types/canonical";

interface Props {
  first_move: ActivationPlanOutput["first_move"];
}

const moveTypeMeta: Record<
  Move["type"],
  { label: string; icon: typeof Mail }
> = {
  direct: { label: "Direct outreach", icon: Mail },
  platform: { label: "Platform registration", icon: ExternalLink },
  visibility: { label: "Visibility post", icon: Megaphone },
  community: { label: "Community join", icon: Users },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function DirectMoveDraft({ move }: { move: Move }) {
  const text = move.subject ? `Subject: ${move.subject}\n\n${move.draft ?? ""}` : (move.draft ?? "");
  return (
    <div className="rounded-lg border border-border bg-muted overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {move.format ? move.format.replace(/_/g, " ") : "Draft"}
          </span>
        </div>
        <CopyButton text={text} />
      </div>
      <div className="px-4 py-3">
        {move.subject && (
          <p className="text-xs font-semibold text-primary italic mb-2">Subject: {move.subject}</p>
        )}
        {move.draft && (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line font-mono">{move.draft}</p>
        )}
      </div>
    </div>
  );
}

function PlatformMoveDraft({ move }: { move: Move }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
      {move.platform_name && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</span>
          <p className="text-sm font-semibold text-foreground">{move.platform_name}</p>
          {move.platform_url && (
            <a
              href={move.platform_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              {move.platform_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
      {move.profile_setup_guide && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile setup</span>
          <p className="text-sm leading-relaxed text-secondary-foreground whitespace-pre-line">{move.profile_setup_guide}</p>
        </div>
      )}
      {move.inbound_timing && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">When to expect inbound</span>
          <p className="text-sm leading-relaxed text-secondary-foreground">{move.inbound_timing}</p>
        </div>
      )}
    </div>
  );
}

function VisibilityMoveDraft({ move }: { move: Move }) {
  return (
    <div className="rounded-lg border border-border bg-muted overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-card">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Post draft</span>
        </div>
        {move.post_draft && <CopyButton text={move.post_draft} />}
      </div>
      <div className="px-4 py-3">
        {move.post_draft && (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line font-mono">{move.post_draft}</p>
        )}
      </div>
    </div>
  );
}

function CommunityMoveDraft({ move }: { move: Move }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
      {move.communities && move.communities.length > 0 && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Communities</span>
          <ul className="mt-2 space-y-2">
            {move.communities.map((c, i) => (
              <li key={i} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.platform}</span>
                </div>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    {c.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <p className="text-xs text-secondary-foreground mt-2">{c.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {move.first_contribution_prompt && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First contribution</span>
          <p className="text-sm leading-relaxed text-secondary-foreground whitespace-pre-line">{move.first_contribution_prompt}</p>
        </div>
      )}
    </div>
  );
}

function MoveDraft({ move }: { move: Move }) {
  switch (move.type) {
    case "direct": return <DirectMoveDraft move={move} />;
    case "platform": return <PlatformMoveDraft move={move} />;
    case "visibility": return <VisibilityMoveDraft move={move} />;
    case "community": return <CommunityMoveDraft move={move} />;
    default: return null;
  }
}

export default function FirstMoveSection({ first_move }: Props) {
  const fm = first_move;
  const meta = moveTypeMeta[fm.move?.type ?? "direct"] ?? moveTypeMeta.direct;
  const Icon = meta.icon;

  return (
    <section>
      <h2 className="report-h2 text-foreground mb-6">Your First Move</h2>
      <div className="rounded-lg bg-card border-l-[6px] border-primary p-6 sm:p-10">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            {fm.window}
          </span>
          <Badge variant="outline" className="text-[10px] font-medium gap-1.5">
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>
        <h3 className="text-[1.3rem] font-bold text-foreground mb-4">{fm.action}</h3>

        <div className="rounded-md bg-muted p-5 mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why This First</h4>
          <p className="text-sm leading-relaxed text-secondary-foreground">{fm.why_first}</p>
        </div>

        {fm.move && <MoveDraft move={fm.move} />}

        {fm.move?.tone_note && (
          <p className="mt-3 text-xs italic text-muted-foreground">{fm.move.tone_note}</p>
        )}
        {fm.move?.personalisation_instructions && (
          <p className="mt-1 text-xs italic text-muted-foreground">{fm.move.personalisation_instructions}</p>
        )}
        {fm.follow_up_prompt && (
          <p className="mt-4 text-sm text-muted-foreground">{fm.follow_up_prompt}</p>
        )}
      </div>
    </section>
  );
}
