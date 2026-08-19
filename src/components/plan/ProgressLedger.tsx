// src/components/plan/ProgressLedger.tsx
//
// Progress Ledger v1 (ADR-025, 2026-06-11). Hands layer: a quiet editorial
// section at the foot of /plan recording real-world milestones: proposals
// sent, first replies, first meetings, first wins, income. All CRUD direct
// via the supabase client against public.ledger_entries under per-user RLS.
//
// Editorial vocabulary per ADR-026: .rule-head section head, hairline rows,
// amounts in mint-ink #15735F, square form chrome, one serif line for the
// empty state.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LedgerEntry {
  id: string;
  entry_type: string;
  label: string;
  amount_text: string | null;
  occurred_on: string;
  created_at: string;
}

const ENTRY_TYPES: { value: string; label: string }[] = [
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "first_reply", label: "First reply" },
  { value: "first_meeting", label: "First meeting" },
  { value: "first_win", label: "First win" },
  { value: "income", label: "Income" },
];

const typeLabel = (value: string) =>
  ENTRY_TYPES.find((t) => t.value === value)?.label ?? value;

// ledger_entries postdates the generated Database types; route around the
// typed client without touching src/integrations/supabase/types.ts.
const ledgerTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from("ledger_entries");

const fmtDate = (iso: string) => {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export default function ProgressLedger() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [entryType, setEntryType] = useState("proposal_sent");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await ledgerTable()
        .select("id, entry_type, label, amount_text, occurred_on, created_at")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setLoadError(true);
      else setEntries((data as LedgerEntry[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleRecord = async () => {
    const trimmed = label.trim();
    if (!trimmed || saving || !user?.id) return;
    setSaving(true);
    setSaveError(false);
    const row = {
      user_id: user.id,
      entry_type: entryType,
      label: trimmed,
      amount_text: amount.trim() || null,
      occurred_on: occurredOn || new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await ledgerTable()
      .insert(row)
      .select("id, entry_type, label, amount_text, occurred_on, created_at")
      .single();
    if (error || !data) {
      setSaveError(true);
    } else {
      setEntries((prev) =>
        [data as LedgerEntry, ...prev].sort((a, b) =>
          b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at),
        ),
      );
      setLabel("");
      setAmount("");
      setFormOpen(false);
    }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    const previous = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error } = await ledgerTable().delete().eq("id", id);
    if (error) setEntries(previous);
  };

  if (!user?.id) return null;

  return (
    <section className="mt-10" id="plan-section-ledger">
      <div className="flex items-end justify-between gap-4">
        <div className="rule-head flex-1">The ledger</div>
      </div>

      {loading && (
        <div className="mt-5 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Loading your ledger…
        </div>
      )}

      {!loading && loadError && (
        <p className="mt-5 text-[13px] text-muted-foreground">
          The ledger couldn't load just now. Refresh to try again.
        </p>
      )}

      {!loading && !loadError && entries.length === 0 && (
        <p
          className="mt-5"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "15.5px", lineHeight: 1.55, color: "#5A5650" }}
        >
          The first entry is usually a proposal. It goes here.
        </p>
      )}

      {!loading && !loadError && entries.length > 0 && (
        <ul>
          {entries.map((e) => (
            <li
              key={e.id}
              className="border-t border-border first:border-t-0 grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-baseline py-3.5 group"
            >
              <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground tabular-nums whitespace-nowrap">
                {fmtDate(e.occurred_on)}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {typeLabel(e.entry_type)}
                </span>
                <span className="block text-[14.5px] font-semibold text-foreground leading-snug">
                  {e.label}
                </span>
              </span>
              <span
                className="text-[14px] font-semibold tabular-nums whitespace-nowrap"
                style={{ color: "#15735F" }}
              >
                {e.amount_text ?? ""}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(e.id)}
                aria-label={`Remove ledger entry: ${e.label}`}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Record a milestone */}
      {!loading && !loadError && !formOpen && (
        <div className={`pt-4 ${entries.length > 0 ? "border-t border-border" : "mt-5"}`}>
          <button type="button" onClick={() => setFormOpen(true)} className="link-edit">
            Record a milestone
          </button>
        </div>
      )}

      {!loading && !loadError && formOpen && (
        <div className="mt-5 p-5" style={{ background: "#F3F1ED", border: "1px solid #D1CEC7" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#15735F" }}>
            Record a milestone
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                What happened
              </span>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="w-full px-3 py-2 text-[14px] text-foreground outline-none"
                style={{ background: "#FAF9F7", border: "1px solid #D1CEC7" }}
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                When
              </span>
              <input
                type="date"
                value={occurredOn}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full px-3 py-2 text-[14px] text-foreground outline-none"
                style={{ background: "#FAF9F7", border: "1px solid #D1CEC7" }}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                The detail
              </span>
              <input
                type="text"
                value={label}
                maxLength={140}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Proposal to Hartley & Co for the Q3 pipeline review"
                className="w-full px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                style={{ background: "#FAF9F7", border: "1px solid #D1CEC7" }}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                Amount (optional)
              </span>
              <input
                type="text"
                value={amount}
                maxLength={40}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="£4,500"
                className="w-full px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                style={{ background: "#FAF9F7", border: "1px solid #D1CEC7" }}
              />
            </label>
          </div>
          {saveError && (
            <p className="mt-3 text-[12px] text-foreground">
              That didn't save. Check the detail line and try again.
            </p>
          )}
          <div className="mt-4 flex items-center gap-5">
            <button
              type="button"
              onClick={handleRecord}
              disabled={!label.trim() || saving}
              className="cta-block inline-flex items-center gap-2 disabled:bg-[#ECEAE4] disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-100"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record it
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setSaveError(false); }}
              className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
