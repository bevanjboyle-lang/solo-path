// src/pages/Pipeline.tsx
//
// /pipeline — Pipeline (CRM-lite) v1 (ADR-025, 2026-06-11). Hands layer: the
// standing workspace where the user's Plan B conversations live, across and
// beyond the 30 days. One row per contact/opportunity; channel mirrors the
// four ADR-007 move types (direct/platform/visibility/community); statuses
// run identified → drafted → sent → replied → meeting → proposal → won, with
// parked as the holding pen. All CRUD goes directly through the supabase
// client under per-user RLS on public.pipeline_items (no edge function).
// Editorial board-as-list per admin/design-direction.md: a .rule-head per
// status group, hairline rows, square chrome. Structural model: Radar.tsx.

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Channel = "direct" | "platform" | "visibility" | "community";
type Status =
  | "identified"
  | "drafted"
  | "sent"
  | "replied"
  | "meeting"
  | "proposal"
  | "won"
  | "parked";

interface PipelineItem {
  id: string;
  strand_label: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_company: string | null;
  channel: Channel | null;
  status: Status;
  next_action: string | null;
  next_action_date: string | null; // yyyy-mm-dd
  notes: string | null;
  value_text: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemFormValues {
  contact_name: string;
  contact_role: string;
  contact_company: string;
  strand_label: string;
  channel: Channel | "";
  status: Status;
  next_action: string;
  next_action_date: string;
  value_text: string;
  notes: string;
}

const EMPTY_FORM: ItemFormValues = {
  contact_name: "",
  contact_role: "",
  contact_company: "",
  strand_label: "",
  channel: "",
  status: "identified",
  next_action: "",
  next_action_date: "",
  value_text: "",
  notes: "",
};

const STATUS_LABELS: Record<Status, string> = {
  identified: "Identified",
  drafted: "Drafted",
  sent: "Sent",
  replied: "Replied",
  meeting: "Meeting booked",
  proposal: "Proposal out",
  won: "Won",
  parked: "Parked",
};

const STATUS_ORDER: Status[] = [
  "identified",
  "drafted",
  "sent",
  "replied",
  "meeting",
  "proposal",
  "won",
  "parked",
];

const CHANNEL_LABELS: Record<Channel, string> = {
  direct: "Direct",
  platform: "Platform",
  visibility: "Visibility",
  community: "Community",
};

// Board-as-list grouping. "Waiting" is the only group where the ball is in
// someone else's court (a message is out, no reply yet). Everything still
// needing the user's next move sits in play.
const GROUPS: { key: string; label: string; statuses: Status[] }[] = [
  { key: "inplay", label: "In play", statuses: ["identified", "drafted", "replied", "meeting", "proposal"] },
  { key: "waiting", label: "Waiting", statuses: ["sent"] },
  { key: "won", label: "Won", statuses: ["won"] },
  { key: "parked", label: "Parked", statuses: ["parked"] },
];

// pipeline_items is newer than the generated Database types; go through an
// untyped handle for this one table (same pattern the codebase already uses
// for post-generation tables, e.g. non_response_catchers).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pipelineTable = () => (supabase as any).from("pipeline_items");

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatActionDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function ChannelBadge({ channel }: { channel: Channel | null }) {
  if (!channel) return null;
  return (
    <span className="inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span aria-hidden className="inline-block h-1 w-1 bg-primary" />
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

const inputClass =
  "w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none";
const labelClass =
  "block text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/70 mb-1.5";

interface ItemFormProps {
  initial: ItemFormValues;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function ItemForm({ initial, submitLabel, busy, onSubmit, onCancel, onDelete }: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const set = (field: keyof ItemFormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  return (
    <form
      className="border border-border px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="pf-name">Contact</label>
          <input id="pf-name" className={inputClass} value={values.contact_name} onChange={set("contact_name")} placeholder="Name" />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-role">Role</label>
          <input id="pf-role" className={inputClass} value={values.contact_role} onChange={set("contact_role")} placeholder="e.g. Head of Operations" />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-company">Company or platform</label>
          <input id="pf-company" className={inputClass} value={values.contact_company} onChange={set("contact_company")} placeholder="Where they work, or the marketplace" />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-strand">Strand</label>
          <input id="pf-strand" className={inputClass} value={values.strand_label} onChange={set("strand_label")} placeholder="Which Plan B path this serves" />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-channel">Move type</label>
          <select id="pf-channel" className={inputClass} value={values.channel} onChange={set("channel")}>
            <option value="">Pick one</option>
            {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
              <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-status">Status</label>
          <select id="pf-status" className={inputClass} value={values.status} onChange={set("status")}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-next">Next action</label>
          <input id="pf-next" className={inputClass} value={values.next_action} onChange={set("next_action")} placeholder="The single next move" />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-date">By when</label>
          <input id="pf-date" type="date" className={inputClass} value={values.next_action_date} onChange={set("next_action_date")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="pf-value">Value</label>
          <input id="pf-value" className={inputClass} value={values.value_text} onChange={set("value_text")} placeholder="e.g. £1,500 retainer, day rate £600" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="pf-notes">Notes</label>
          <textarea id="pf-notes" rows={3} className={inputClass} value={values.notes} onChange={set("notes")} placeholder="What was said, what you offered, anything to remember" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="cta-block disabled:opacity-60 disabled:cursor-not-allowed">
          {busy ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-[13px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirmingDelete) onDelete();
              else setConfirmingDelete(true);
            }}
            className={`ml-auto text-[12px] font-semibold disabled:opacity-60 ${
              confirmingDelete ? "text-[#15735F]" : "text-muted-foreground/70 hover:text-foreground"
            }`}
          >
            {confirmingDelete ? "Click again to remove" : "Remove from pipeline"}
          </button>
        )}
      </div>
    </form>
  );
}

interface RowProps {
  item: PipelineItem;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: Status) => void;
  onSave: (values: ItemFormValues) => void;
  onDelete: () => void;
}

function PipelineRow({ item, busy, expanded, onToggle, onStatusChange, onSave, onDelete }: RowProps) {
  const today = todayIso();
  const overdue = !!item.next_action_date && item.next_action_date < today && item.status !== "won" && item.status !== "parked";
  const who = [item.contact_name, item.contact_company].filter(Boolean).join(", ") || "Unnamed contact";

  return (
    <article className="rule-row py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="text-left text-[15px] font-semibold tracking-tight text-foreground hover:text-primary"
          aria-expanded={expanded}
        >
          {who}
        </button>
        {item.contact_role && (
          <span className="text-[12px] text-muted-foreground">{item.contact_role}</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <ChannelBadge channel={item.channel} />
          <select
            value={item.status}
            disabled={busy}
            onChange={(e) => onStatusChange(e.target.value as Status)}
            aria-label={`Status for ${who}`}
            className="border border-border bg-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground focus:border-foreground focus:outline-none disabled:opacity-60"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </span>
      </div>
      {(item.strand_label || item.value_text) && (
        <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {[item.strand_label, item.value_text].filter(Boolean).join(" · ")}
        </p>
      )}
      {(item.next_action || item.next_action_date) && (
        <p className="mt-1.5 text-[13px] leading-snug text-foreground/85">
          {item.next_action && <span>{item.next_action}</span>}
          {item.next_action_date && (
            <span className={`${item.next_action ? "ml-2 " : ""}text-[12px] font-semibold ${overdue ? "text-[#15735F]" : "text-muted-foreground"}`}>
              {overdue ? "Overdue · " : "By "}
              {formatActionDate(item.next_action_date)}
            </span>
          )}
        </p>
      )}
      {!expanded && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 hover:text-foreground"
        >
          Edit
        </button>
      )}
      {expanded && (
        <div className="mt-3">
          <ItemForm
            initial={{
              contact_name: item.contact_name ?? "",
              contact_role: item.contact_role ?? "",
              contact_company: item.contact_company ?? "",
              strand_label: item.strand_label ?? "",
              channel: item.channel ?? "",
              status: item.status,
              next_action: item.next_action ?? "",
              next_action_date: item.next_action_date ?? "",
              value_text: item.value_text ?? "",
              notes: item.notes ?? "",
            }}
            submitLabel="Save changes"
            busy={busy}
            onSubmit={onSave}
            onCancel={onToggle}
            onDelete={onDelete}
          />
        </div>
      )}
    </article>
  );
}

export default function Pipeline() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<PipelineItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // item id, or "new"

  useEffect(() => {
    const original = document.title;
    document.title = "Pipeline: every conversation behind your Plan B";
    return () => { document.title = original; };
  }, []);

  // Resolve the signed-in user (ProtectedRoute guarantees a session exists).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setUserId(data.user?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchItems = useCallback(async (uid: string) => {
    const { data, error: err } = await pipelineTable()
      .select("id, strand_label, contact_name, contact_role, contact_company, channel, status, next_action, next_action_date, notes, value_text, created_at, updated_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (err) throw err;
    return (data ?? []) as PipelineItem[];
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchItems(userId);
        if (!cancelled) setItems(rows);
      } catch (err) {
        console.error("Pipeline fetch error:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, fetchItems]);

  const valuesToRow = (values: ItemFormValues) => ({
    contact_name: values.contact_name.trim() || null,
    contact_role: values.contact_role.trim() || null,
    contact_company: values.contact_company.trim() || null,
    strand_label: values.strand_label.trim() || null,
    channel: values.channel || null,
    status: values.status,
    next_action: values.next_action.trim() || null,
    next_action_date: values.next_action_date || null,
    value_text: values.value_text.trim() || null,
    notes: values.notes.trim() || null,
  });

  const handleAdd = useCallback(async (values: ItemFormValues) => {
    if (!userId) return;
    if (!values.contact_name.trim() && !values.contact_company.trim()) {
      toast({ title: "Give it a name", description: "Add a contact name or a company so the row means something later.", variant: "destructive" });
      return;
    }
    setBusyId("new");
    try {
      const { data, error: err } = await pipelineTable()
        .insert({ user_id: userId, ...valuesToRow(values) })
        .select()
        .single();
      if (err) throw err;
      setItems((prev) => [...(prev ?? []), data as PipelineItem]);
      setAdding(false);
      toast({ title: "Added to your pipeline." });
    } catch (err) {
      console.error("Pipeline insert error:", err);
      toast({ title: "Couldn't add that", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }, [userId, toast]);

  const handleSave = useCallback(async (id: string, values: ItemFormValues) => {
    setBusyId(id);
    try {
      const { data, error: err } = await pipelineTable()
        .update(valuesToRow(values))
        .eq("id", id)
        .select()
        .single();
      if (err) throw err;
      setItems((prev) => (prev ?? []).map((i) => (i.id === id ? (data as PipelineItem) : i)));
      setExpandedId(null);
      toast({ title: "Saved." });
    } catch (err) {
      console.error("Pipeline update error:", err);
      toast({ title: "Couldn't save that", description: "Please try again in a moment.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }, [toast]);

  const handleStatusChange = useCallback(async (id: string, status: Status) => {
    const prev = items;
    setItems((cur) => (cur ?? []).map((i) => (i.id === id ? { ...i, status } : i)));
    setBusyId(id);
    try {
      const { error: err } = await pipelineTable().update({ status }).eq("id", id);
      if (err) throw err;
      if (status === "won") toast({ title: "Logged as won. That's the whole point of the plan." });
    } catch (err) {
      console.error("Pipeline status update error:", err);
      setItems(prev ?? null);
      toast({ title: "Couldn't update the status", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }, [items, toast]);

  const handleDelete = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      const { error: err } = await pipelineTable().delete().eq("id", id);
      if (err) throw err;
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
      setExpandedId(null);
      toast({ title: "Removed from your pipeline." });
    } catch (err) {
      console.error("Pipeline delete error:", err);
      toast({ title: "Couldn't remove that", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }, [toast]);

  // Group + sort: next_action_date ascending with nulls last, then created_at.
  const grouped = useMemo(() => {
    const all = items ?? [];
    return GROUPS.map((g) => {
      const rows = all
        .filter((i) => g.statuses.includes(i.status))
        .sort((a, b) => {
          if (a.next_action_date && b.next_action_date) {
            if (a.next_action_date !== b.next_action_date) {
              return a.next_action_date < b.next_action_date ? -1 : 1;
            }
          } else if (a.next_action_date) return -1;
          else if (b.next_action_date) return 1;
          return a.created_at < b.created_at ? -1 : 1;
        });
      return { ...g, rows };
    });
  }, [items]);

  const countLine = useMemo(() => {
    if (!items || items.length === 0) return null;
    const inPlay = grouped.find((g) => g.key === "inplay")?.rows.length ?? 0;
    const waiting = grouped.find((g) => g.key === "waiting")?.rows.length ?? 0;
    const won = grouped.find((g) => g.key === "won")?.rows.length ?? 0;
    const parts: string[] = [];
    if (inPlay > 0) parts.push(`${inPlay} in play`);
    if (waiting > 0) parts.push(`${waiting} waiting on ${waiting === 1 ? "a reply" : "replies"}`);
    if (won > 0) parts.push(`${won} won`);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [items, grouped]);

  const isEmpty = !loading && !error && (items?.length ?? 0) === 0;

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <header>
            <p className="eyebrow flex items-center gap-2">
              <span aria-hidden className="inline-block h-1.5 w-1.5 bg-primary" />
              Pipeline
            </p>
            <h1 className="title-h1 mt-3">Every conversation behind your Plan B.</h1>
            <p className="standfirst mt-3">
              Contacts identified, messages out, replies in, meetings, proposals, wins.
              The plan tells you what to do each day; this is where what came of it lives.
            </p>
            {countLine && (
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{countLine}</p>
            )}
          </header>

          {loading && <p className="mt-8 text-sm text-muted-foreground">Loading your pipeline…</p>}

          {!loading && error && (
            <p className="mt-8 text-sm text-foreground">Your pipeline couldn't load just now. Try again in a minute.</p>
          )}

          {!loading && !error && (
            <>
              {isEmpty && !adding && (
                <div className="mt-8 border-t border-stone-200 pt-6">
                  <p className="standfirst max-w-[58ch]">
                    Nothing in the pipeline yet. It fills from your plan's moves: each contact
                    you identify, each message you send, each reply you chase becomes one row
                    here, and it keeps working after the 30 days end. Start with today's move
                    on your plan, then log who it went to.
                  </p>
                  <p className="mt-4 flex flex-wrap items-center gap-4">
                    <Link to="/plan" className="link-edit">Go to your plan</Link>
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="text-[13px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Or add a contact directly
                    </button>
                  </p>
                </div>
              )}

              {!isEmpty && !adding && (
                <p className="mt-7">
                  <button type="button" onClick={() => setAdding(true)} className="cta-block">
                    Add to pipeline
                  </button>
                </p>
              )}

              {adding && (
                <div className="mt-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground mb-3">New pipeline item</p>
                  <ItemForm
                    initial={EMPTY_FORM}
                    submitLabel="Add to pipeline"
                    busy={busyId === "new"}
                    onSubmit={handleAdd}
                    onCancel={() => setAdding(false)}
                  />
                </div>
              )}

              {grouped.map((group) =>
                group.rows.length === 0 ? null : (
                  <section key={group.key} className="mt-10">
                    <h2 className="rule-head">
                      {group.label}
                      <span className="ml-2 font-normal text-muted-foreground">{group.rows.length}</span>
                    </h2>
                    <div>
                      {group.rows.map((item) => (
                        <PipelineRow
                          key={item.id}
                          item={item}
                          busy={busyId === item.id}
                          expanded={expandedId === item.id}
                          onToggle={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
                          onStatusChange={(s) => handleStatusChange(item.id, s)}
                          onSave={(values) => handleSave(item.id, values)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                ),
              )}

              {!isEmpty && (
                <footer className="mt-10 border-t border-stone-200 pt-5">
                  <p className="text-[12px] leading-snug text-muted-foreground">
                    Five days of silence on a sent message and Solo's Catcher will nudge you on
                    your plan. Wins logged here are the record your Plan B is real.
                  </p>
                </footer>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
