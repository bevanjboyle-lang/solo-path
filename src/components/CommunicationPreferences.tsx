// CommunicationPreferences.tsx — /account preference centre (ADR-027)
// Drop into src/components/ and render inside src/pages/Account.tsx.
// Self-contained: Tailwind utility classes + the Supabase client only.
// Backend: get-communication-preferences / update-communication-preferences (both live).
//
// If your Supabase client lives somewhere other than the import below, adjust the path.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Prefs {
  email: string;
  signal_opt_in: boolean;
  product_news_opt_in: boolean;
  lifecycle_opt_in: boolean;
  tracker_emails_opt_in: boolean;
  radar_digest_opt_in: boolean;
  checkin_cadence: "daily" | "every_other_day" | "weekly";
  checkin_paused_until: string | null;
  all_marketing_suppressed: boolean;
}

const MINT = "#2ECDB0";
const MINT_TEXT = "#15735F";

const STREAMS: { key: keyof Prefs; label: string; help: string }[] = [
  { key: "tracker_emails_opt_in", label: "Plan check-ins & tracker", help: "Your daily 30-day plan check-ins and weekly reviews. Only while a plan is active." },
  { key: "radar_digest_opt_in", label: "Opportunity Radar digest", help: "The weekly roundup of live openings in your market." },
  { key: "lifecycle_opt_in", label: "Reminders & nudges", help: "Occasional prompts if you start something and don't finish it." },
  { key: "signal_opt_in", label: "The Signal", help: "Our newsletter on where independent work is moving." },
  { key: "product_news_opt_in", label: "Product news & tips", help: "New features and the occasional tip. Rare." },
];

export default function CommunicationPreferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-communication-preferences");
        if (error) throw error;
        setPrefs(data.preferences);
      } catch (_e) {
        setError("We couldn't load your email settings. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("update-communication-preferences", { body: patch });
      if (error) throw error;
      setPrefs(data.preferences);
    } catch (_e) {
      setError("That didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-stone-500 py-6">Loading your email settings…</div>;
  if (!prefs) return <div className="text-sm text-red-600 py-6">{error ?? "Couldn't load settings."}</div>;

  const pausedUntil = prefs.checkin_paused_until ? new Date(prefs.checkin_paused_until) : null;
  const isPaused = pausedUntil !== null && pausedUntil.getTime() > Date.now();

  return (
    <section className="max-w-xl">
      <h2 className="text-lg font-bold text-stone-900">Email preferences</h2>
      <p className="mt-1 text-sm text-stone-500">
        Choose what we send and how often. You can change any of this at any time.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {prefs.all_marketing_suppressed && (
        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          You've unsubscribed from all marketing and nudges. Turn any stream back on below to resume it.
        </div>
      )}

      {/* Per-stream toggles */}
      <div className="mt-6 divide-y divide-stone-100 rounded-xl border border-stone-200">
        {STREAMS.map((s) => {
          const on = prefs[s.key] as boolean;
          return (
            <div key={s.key} className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="text-sm font-semibold text-stone-900">{s.label}</div>
                <div className="mt-0.5 text-xs text-stone-500">{s.help}</div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ [s.key]: !on })}
                aria-pressed={on}
                className="mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
                style={{ backgroundColor: on ? MINT : "#D6D3D1" }}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                  style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Check-in cadence + pause (only relevant while tracker emails are on) */}
      {prefs.tracker_emails_opt_in && (
        <div className="mt-6 rounded-xl border border-stone-200 p-4">
          <div className="text-sm font-semibold text-stone-900">Your daily check-ins</div>

          <label className="mt-3 block text-xs font-medium text-stone-500">How often</label>
          <select
            value={prefs.checkin_cadence}
            disabled={saving}
            onChange={(e) => save({ checkin_cadence: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="daily">Every day</option>
            <option value="every_other_day">Every other day</option>
            <option value="weekly">Once a week</option>
          </select>

          <div className="mt-4">
            <div className="text-xs font-medium text-stone-500">Need a break?</div>
            {isPaused ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm text-stone-700">
                  Paused until {pausedUntil!.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save({ pause_weeks: 0 })}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                  style={{ color: MINT_TEXT, border: `1px solid ${MINT}` }}
                >
                  Resume now
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={saving} onClick={() => save({ pause_weeks: 2 })}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700">
                  Pause 2 weeks
                </button>
                <button type="button" disabled={saving} onClick={() => save({ pause_weeks: 4 })}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700">
                  Pause 4 weeks
                </button>
              </div>
            )}
            <p className="mt-2 text-xs text-stone-400">
              Pausing stops the daily emails without ending your plan. It'll be exactly where you left it.
            </p>
          </div>
        </div>
      )}

      {/* Global stop */}
      {!prefs.all_marketing_suppressed && (
        <div className="mt-6">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (confirm("Stop all marketing and reminder emails? You'll still get sign-in links and receipts.")) {
                save({ stop_all_marketing: true });
              }
            }}
            className="text-sm font-medium text-stone-500 underline underline-offset-2 hover:text-stone-700"
          >
            Stop all marketing and nudges
          </button>
          <p className="mt-1 text-xs text-stone-400">
            You'll still receive essential account email like sign-in links and receipts.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-400">{saving ? "Saving…" : "All changes save automatically."}</p>
    </section>
  );
}
