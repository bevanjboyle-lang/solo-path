// src/components/account/TripwireCard.tsx
//
// Employer Tripwire v1 (ADR-025, 2026-06-11). Sector-level watch managed from
// /account. Solo watches public movement in the sector the user names (real
// radar tender activity, public data only) and folds a quiet "Your sector
// watch" section into their weekly radar email via send-radar-digest v1.2.
// employer_name is captured but NOT watched in v1; reserved for the v2
// employer-level watch. CRUD goes direct via the supabase client under
// per-user RLS on public.tripwire_watches.
//
// Tone rule: this surface informs, never inflames. No urgency, no fear copy.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TripwireWatch {
  id: string;
  sector: string;
  employer_name: string | null;
  active: boolean;
}

// tripwire_watches postdates the generated Database types; route around the
// typed client the same way Pipeline.tsx and ProgressLedger.tsx do.
// deno-lint-ignore no-explicit-any
const tripwireTable = () => (supabase as any).from("tripwire_watches");

export default function TripwireCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [watch, setWatch] = useState<TripwireWatch | null>(null);
  const [sector, setSector] = useState("");
  const [employer, setEmployer] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await tripwireTable()
        .select("id, sector, employer_name, active")
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError(true);
      } else if (data) {
        const w = data as TripwireWatch;
        setWatch(w);
        setSector(w.sector);
        setEmployer(w.employer_name ?? "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleActivate = async () => {
    const trimmed = sector.trim();
    if (!trimmed) {
      toast.error("Name the sector you'd like watched.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data, error } = await tripwireTable()
      .upsert(
        { user_id: user.id, sector: trimmed, employer_name: employer.trim() || null, active: true },
        { onConflict: "user_id" },
      )
      .select("id, sector, employer_name, active")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Couldn't save your watch. Try again.");
      return;
    }
    setWatch(data as TripwireWatch);
    toast.success("Sector watch on. It joins your weekly radar email.");
  };

  const handleDeactivate = async () => {
    if (!watch) return;
    setSaving(true);
    const { error } = await tripwireTable().update({ active: false }).eq("id", watch.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't pause the watch. Try again.");
      return;
    }
    setWatch({ ...watch, active: false });
    toast.success("Sector watch paused.");
  };

  return (
    <div>
      <div className="rule-head mb-4">Sector watch</div>
      <p className="standfirst max-w-[54ch] mb-5">
        Solo watches public movement in your sector and includes it in your weekly radar email.
        Employer-level watching is coming and will only ever use public data.
      </p>

      {loading && (
        <p className="text-[13px] text-muted-foreground">Loading your watch…</p>
      )}

      {!loading && loadError && (
        <p className="text-[13px] text-muted-foreground">
          Couldn't load your watch just now. Refresh to try again.
        </p>
      )}

      {!loading && !loadError && (
        <>
          {/* Current state, plainly. */}
          <p className="text-[12px] text-muted-foreground mb-4">
            {watch?.active ? (
              <>
                Watching <span className="font-semibold text-foreground">{watch.sector}</span>.
                {" "}Updates arrive in your weekly radar email.
              </>
            ) : watch ? (
              "Watch paused. Nothing is being added to your emails."
            ) : (
              "No watch set. Nothing is being added to your emails."
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[560px]">
            <div>
              <label
                htmlFor="tripwire-sector"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5"
              >
                Sector
              </label>
              <Input
                id="tripwire-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g. Legal"
                className="h-10"
              />
            </div>
            <div>
              <label
                htmlFor="tripwire-employer"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5"
              >
                Employer (held for later, not yet watched)
              </label>
              <Input
                id="tripwire-employer"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                placeholder="Optional"
                className="h-10"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={handleActivate}
              disabled={saving}
              className="cta-block disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : watch?.active ? "Update watch" : "Activate watch"}
            </button>
            {watch?.active && (
              <button
                onClick={handleDeactivate}
                disabled={saving}
                className="px-[18px] py-[9px] text-[13px] font-semibold text-foreground bg-transparent border border-border transition-colors hover:bg-[#F3F1ED] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Deactivate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
