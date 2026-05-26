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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex flex-col items-center gap-1 px-3 py-2 text-stone-700 hover:text-stone-900 ${accentClass}`}
      >
        <User className="h-5 w-5" aria-hidden="true" />
        <span className="hidden text-[11px] font-medium tracking-wide md:inline">
          Account
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Account snapshot"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-stone-200 bg-[#FAF9F7] shadow-lg"
        >
          {loading || !data ? (
            <div className="px-5 py-6 text-sm text-stone-500">Loading…</div>
          ) : (
            <div className="px-5 py-5">
              <div>
                <p className="text-base font-semibold text-stone-900">
                  {data.first_name ?? "Signed in"}
                </p>
                <p className="mt-0.5 text-sm text-stone-500">{data.email}</p>
              </div>

              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">
                  Plan
                </p>
                <p className="mt-1 text-sm text-stone-800">
                  {data.subscription.label}
                </p>
                {data.tracker.day_x_of_30_label &&
                  data.tracker.day_x_of_30_label !== data.subscription.label && (
                    <p className="mt-1 text-sm text-stone-600">
                      {data.tracker.day_x_of_30_label}
                    </p>
                  )}
              </div>

              {(data.archetype.name || data.recommended_model?.name) && (
                <div className="mt-4 border-t border-stone-200 pt-4">
                  {data.archetype.name && (
                    <p className="text-xs text-stone-500">
                      Archetype:{" "}
                      <span className="text-stone-700">{data.archetype.name}</span>
                    </p>
                  )}
                  {data.recommended_model?.name && (
                    <p className="mt-1 text-xs text-stone-500">
                      Plan:{" "}
                      <span className="text-stone-700">
                        {data.recommended_model.name}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={handleManageAccount}
                  className="text-sm font-medium text-[#2ECDB0] hover:text-[#22a98e]"
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
