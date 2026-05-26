// src/components/AccountDropdown.tsx
//
// A6 — Account dropdown. Click trigger, right-aligned, 320px wide, quiet
// ivory panel. Shows the user-state snapshot at-a-glance, with a single
// "Manage account" link through to /account.
//
// Dismiss: click outside, Escape, or clicking the trigger again.
// Keyboard: Tab into the panel; Escape closes; focus returns to trigger.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useAccountSnapshot } from "@/hooks/useAccountSnapshot";

interface AccountDropdownProps {
  isActive: boolean; // true when current route is /account (drives underline)
}

export default function AccountDropdown({ isActive }: AccountDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { data, loading } = useAccountSnapshot(open); // only fetch when first opened

  // Click-outside + Escape dismiss
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleManageAccount() {
    setOpen(false);
    navigate("/account");
  }

  const accentClass = isActive
    ? "border-b-[3px] border-[#2ECDB0]"
    : "border-b-[3px] border-transparent";

  return (
    <div className="relative h-full">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-full flex-col items-center justify-center gap-0.5 px-3 text-stone-700 hover:text-stone-900 ${accentClass}`}
      >
        <User className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className="hidden text-[10px] font-medium tracking-wide md:inline">
          Account
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Account snapshot"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-stone-200 bg-[#FAF9F7] shadow-lg"
        >
          {loading || !data ? (
            <div className="px-4 py-4 text-xs text-stone-500">Loading…</div>
          ) : (
            <div className="px-4 py-4">
              {/* Identity */}
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {data.first_name ?? "Signed in"}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{data.email}</p>
                {data.member_since_label && (
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    Member since {data.member_since_label}
                  </p>
                )}
              </div>

              {/* Plan state + progress */}
              <div className="mt-3 border-t border-stone-200 pt-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">
                  Plan
                </p>
                <p className="mt-0.5 text-xs text-stone-800">
                  {data.subscription.label}
                </p>
                {data.tracker.day_x_of_30_label &&
                  data.tracker.day_x_of_30_label !== data.subscription.label && (
                    <p className="mt-0.5 text-xs text-stone-600">
                      {data.tracker.day_x_of_30_label}
                    </p>
                  )}
                {(data.tracker.tasks_label || data.tracker.last_checkin_label) && (
                  <p className="mt-1.5 text-[11px] text-stone-500">
                    {[
                      data.tracker.tasks_label,
                      data.tracker.last_checkin_label,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {data.tracker.focus_strands_count > 0 && (
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {data.tracker.focus_strands_count} active{" "}
                    {data.tracker.focus_strands_count === 1 ? "strand" : "strands"}
                  </p>
                )}
              </div>

              {/* Profile (archetype + model) */}
              {(data.archetype.name || data.recommended_model?.name) && (
                <div className="mt-3 border-t border-stone-200 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">
                    Profile
                  </p>
                  {data.archetype.name && (
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      Archetype:{" "}
                      <span className="text-stone-700">{data.archetype.name}</span>
                    </p>
                  )}
                  {data.recommended_model?.name && (
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      Model:{" "}
                      <span className="text-stone-700">
                        {data.recommended_model.name}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Settings */}
              {data.tracker.notification_label && (
                <div className="mt-3 border-t border-stone-200 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">
                    Settings
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-700">
                    {data.tracker.notification_label}
                  </p>
                </div>
              )}

              {/* Manage link */}
              <div className="mt-4 border-t border-stone-200 pt-3">
                <button
                  type="button"
                  onClick={handleManageAccount}
                  className="text-xs font-medium text-[#2ECDB0] hover:text-[#22a98e]"
                >
                  Manage account &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
