import { useEffect, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ApolloQuery, ApolloContact } from "@/types/apollo";

interface ApolloContactPickerProps {
  apolloQuery: ApolloQuery;
  onContactSelected: (contact: ApolloContact) => void;
  onClose: () => void;
}

type State =
  | { kind: "loading" }
  | { kind: "success"; contacts: ApolloContact[] }
  | { kind: "error" };

export default function ApolloContactPicker({ apolloQuery, onContactSelected, onClose }: ApolloContactPickerProps) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("find-contacts", {
          body: { apollo_query: apolloQuery },
        });
        if (cancelled) return;
        if (error) {
          setState({ kind: "error" });
          return;
        }
        const contacts: ApolloContact[] = Array.isArray(data?.contacts) ? data.contacts.slice(0, 8) : [];
        setState({ kind: "success", contacts });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [apolloQuery, attempt]);

  return (
    <div
      className="mt-2 rounded-lg border border-border p-3 space-y-2"
      style={{
        borderLeft: "3px solid #2ECDB0",
        background: "hsl(var(--surface-card))",
      }}
    >
      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Finding contacts matching your target profile...</span>
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Could not load contacts right now.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {state.kind === "success" && state.contacts.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            No contacts found for this profile. The draft is still ready to use.
          </p>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {state.kind === "success" && state.contacts.length > 0 && (
        <>
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {state.contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-border bg-background/40 p-2.5 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-foreground/80 truncate">{c.title}</p>
                    {c.company && (
                      <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                    )}
                  </div>
                  {c.linkedin_url && (
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      aria-label="Open LinkedIn profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => onContactSelected(c)}
                  className="w-full text-xs border border-border rounded px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Use this contact
                </button>
              </div>
            ))}
          </div>
          <div className="pt-1 border-t border-border">
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
