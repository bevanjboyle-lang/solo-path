// src/components/TopBarAuthed.tsx
//
// A5 — Icon-led top nav for signed-in users. Four primary items + brand logo
// + Account dropdown (the rightmost item is the dropdown trigger from A6).
//
// Active state: mint 3px bottom underline on the current route's item.
// Single mechanism, no stacking.
//
// Breakpoints:
//   >= 1024px (desktop): icon + small label below
//   640-1023px (tablet): icon only
//   < 640px (mobile): brand + hamburger only; full nav in a MobileNav drawer
//                     (assumes your existing MobileNav handles authed items)
//
// Plug into the existing TopBar dispatch: render <TopBarAuthed /> in the
// authed branch, keep the existing TopBar.anonymous in the anon branch.

import { NavLink, Link, useLocation } from "react-router-dom";
import { Compass, Library, MessageSquare } from "lucide-react";
import SoloLogo from "@/components/SoloLogo";
import AccountDropdown from "./AccountDropdown";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  ariaLabel: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/plan", label: "Plan", icon: Compass, ariaLabel: "Plan" },
  { to: "/library", label: "Library", icon: Library, ariaLabel: "Library" },
  { to: "/ask-solo", label: "Ask Solo", icon: MessageSquare, ariaLabel: "Ask Solo" },
];

export default function TopBarAuthed() {
  const location = useLocation();
  const path = location.pathname;
  const accountActive = path.startsWith("/account");

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#FAF9F7]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9F7]/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand — matches the anonymous TopBar so authed and anon users
          * see the same logo and the same "click logo to go home" behaviour. */}
        <Link to="/" className="flex items-center" aria-label="Solo home">
          <SoloLogo width={110} height={32} />
        </Link>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.ariaLabel}
                className={({ isActive }) =>
                  [
                    "flex flex-col items-center gap-1 px-3 py-2 text-stone-700 hover:text-stone-900",
                    isActive
                      ? "border-b-[3px] border-[#2ECDB0]"
                      : "border-b-[3px] border-transparent",
                  ].join(" ")
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="hidden text-[11px] font-medium tracking-wide md:inline">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* Account dropdown trigger lives inside the nav strip */}
          <AccountDropdown isActive={accountActive} />
        </nav>
      </div>
    </header>
  );
}
