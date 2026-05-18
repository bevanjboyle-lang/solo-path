import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import SoloLogo from "@/components/SoloLogo";

const anonLinks = [
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
];

export default function TopBar({ minimal = false }: { minimal?: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleStartTest = () => startTest(navigate);
  const handleSignOut = () => { signOut(); setOpen(false); };

  return (
    <header
      className="sticky z-40 border-b border-border"
      style={{ top: 4, background: "#FAF9F7" }}
    >
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 lg:px-10">
        {/* Logo */}
        <Link to="/" className="flex items-center" aria-label="Solo home">
          <SoloLogo width={110} height={32} />
        </Link>

        {/* Desktop links — anon nav only renders for anon visitors. Authed
          * users get the authed nav block on the right; showing Pricing/FAQ
          * to a paid user is clutter (Drift A fix, 2026-05-18). The minimal
          * prop still suppresses anon links on funnel surfaces for anon
          * visitors too. */}
        {!minimal && !user && (
          <div className="hidden items-center gap-8 md:flex">
            {anonLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/*
         * Desktop right —
         * Authed nav block (Plan / Report / Library / Account / Sign out)
         * always renders when user is signed in, even in `minimal` mode.
         * This ensures returning authed users on funnel surfaces (e.g.
         * /teaser when unpaid) can still reach Account + Sign out. Route
         * guards handle gating Plan/Report/Library to paid users.
         *
         * Anon chrome (Sign in link + Take the test button) only renders
         * when `!minimal` — keeps funnel surfaces quiet for anon visitors.
         */}
        <div className="hidden items-center gap-5 md:flex">
          {user ? (
            <>
              <button
                onClick={() => navigateAuthed(navigate, "/plan")}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Plan
              </button>
              <button
                onClick={() => navigateAuthed(navigate, "/report")}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Report
              </button>
              <button
                onClick={() => navigateAuthed(navigate, "/library")}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Library
              </button>
              <button
                onClick={() => navigateAuthed(navigate, "/account")}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Account
              </button>
              <button
                onClick={handleSignOut}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : !minimal ? (
            <Link
              to="/auth"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          ) : null}
          {/* Drift A fix (2026-05-18): "Take the test" only renders for anon
            * visitors. Authed users with an existing report use Account →
            * TakeAnotherTestCard for second-report flow; the prominent mint
            * "Take the test" pitch is conceptually wrong for someone who's
            * already paid. */}
          {!minimal && !user && (
            <button
              onClick={handleStartTest}
              className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Find what fits
            </button>
          )}
        </div>

        {/*
         * Mobile hamburger — same logic. Renders when not minimal, OR
         * when minimal but the user is signed in (so authed users on
         * funnel surfaces always have a menu to reach Account + Sign out).
         */}
        {(!minimal || user) && (
          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </nav>

      {/*
       * Mobile menu — opens whenever the hamburger is available. In
       * minimal mode, only the authed nav block renders (no Pricing/FAQ,
       * no Sign in, no Take the test). In full mode, everything renders.
       */}
      {open && (
        <div className="border-t border-border bg-[hsl(var(--surface-panel))] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {/* Drift A fix (2026-05-18): mobile anon links hidden for authed users. */}
            {!minimal && !user && anonLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {!minimal && !user && <hr className="border-border" />}
            {user ? (
              <>
                <button
                  onClick={() => { navigateAuthed(navigate, "/plan"); setOpen(false); }}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Plan
                </button>
                <button
                  onClick={() => { navigateAuthed(navigate, "/report"); setOpen(false); }}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Report
                </button>
                <button
                  onClick={() => { navigateAuthed(navigate, "/library"); setOpen(false); }}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Library
                </button>
                <button
                  onClick={() => { navigateAuthed(navigate, "/account"); setOpen(false); }}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Account
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : !minimal ? (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            ) : null}
            {/* Drift A fix (2026-05-18): mobile "Take the test" hidden for authed users. */}
            {!minimal && !user && (
              <button
                onClick={() => { handleStartTest(); setOpen(false); }}
                className="w-full rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Find what fits
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
