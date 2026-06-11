// TopBarAuthed — editorial masthead + authed section nav (ADR-026 v2.0, 2026-06-10).
//
// Replaces the A5 icon-led bar: signed-in users get the same centred masthead
// as anonymous visitors, over a sticky small-caps nav row (Plan / Report /
// Library / Radar / Ask Solo) with the ink active-underline. The A6 Account
// dropdown keeps its place at the right edge of the masthead. Route guards
// continue to gate the destinations; this is chrome only.

import { NavLink, useLocation } from "react-router-dom";
import Masthead from "@/components/Masthead";
import AccountDropdown from "./AccountDropdown";

const AUTHED_SECTIONS = [
  { label: "Plan", to: "/plan" },
  { label: "Report", to: "/report" },
  { label: "Library", to: "/library" },
  { label: "Radar", to: "/radar" },
  { label: "Pipeline", to: "/pipeline" },
  { label: "Forge", to: "/forge" },
  { label: "Ask Solo", to: "/ask-solo" },
];

export default function TopBarAuthed() {
  const location = useLocation();
  const accountActive = location.pathname.startsWith("/account");

  return (
    <header>
      <Masthead right={<AccountDropdown isActive={accountActive} />} />
      <nav className="section-nav sticky z-40" style={{ top: 4 }} aria-label="Main">
        <div className="mx-auto max-w-6xl px-6">
          <div className="section-nav-row">
            {AUTHED_SECTIONS.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive }) =>
                  `section-nav-link ${isActive ? "is-active" : ""}`
                }
              >
                {s.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
