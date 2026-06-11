// TopBar — editorial masthead + section nav (ADR-026 v2.0, 2026-06-10).
//
// Anonymous chrome: centred brand masthead (mark + wordmark) with Sign in +
// the mint CTA at the right edge, over a sticky small-caps section nav with
// an ink active-underline (FT register). `minimal` keeps funnel surfaces
// quiet: masthead only, no nav row, no CTA. Authed users dispatch to
// TopBarAuthed (same masthead, authed nav row).

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { startTest } from "@/lib/handlers";
import Masthead from "@/components/Masthead";
import TopBarAuthed from "@/components/TopBarAuthed";

const SECTIONS = [
  { label: "Home", to: "/" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "The Signal", to: "/signal" },
  { label: "Sample report", to: "/sample-report" },
  { label: "FAQ", to: "/faq" },
];

export default function TopBar({ minimal = false }: { minimal?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // A5 (2026-05-26): authed users get the authed chrome.
  if (user) {
    return <TopBarAuthed />;
  }

  if (minimal) {
    // Funnel surfaces: quiet masthead, no nav, no competing CTA.
    return <Masthead />;
  }

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <header>
      <Masthead
        right={
          <>
            <Link to="/auth" className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <button onClick={() => startTest(navigate)} className="cta-block">
              Find what works
            </button>
          </>
        }
      />
      <nav className="section-nav sticky z-40" style={{ top: 4 }} aria-label="Sections">
        <div className="mx-auto max-w-6xl px-6">
          <div className="section-nav-row">
            {SECTIONS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`section-nav-link ${isActive(s.to) ? "is-active" : ""}`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
