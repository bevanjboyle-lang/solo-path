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
    <header className="sticky top-0 z-50 bg-[hsl(var(--surface-panel))] border-b border-border">
      {/* Mint accent line */}
      <div className="h-1 w-full" style={{ backgroundColor: "#2ECDB0" }} />

      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 lg:px-10">
        {/* Logo */}
        <Link to="/" className="flex items-center" aria-label="Solo home">
          <SoloLogo width={110} height={32} />
        </Link>

        {/* Desktop links */}
        {!minimal && (
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

        {/* Desktop right */}
        {!minimal ? (
          <div className="hidden items-center gap-5 md:flex">
            {user ? (
              <>
                <button
                  onClick={() => navigateAuthed(navigate, "/plan")}
                  className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  My plan
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={handleStartTest}
              className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Take the test
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Mobile hamburger */}
        {!minimal && (
          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      {!minimal && open && (
        <div className="border-t border-border bg-[hsl(var(--surface-panel))] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {anonLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <hr className="border-border" />
            {user ? (
              <>
                <button
                  onClick={() => { navigateAuthed(navigate, "/plan"); setOpen(false); }}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  My plan
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => { handleStartTest(); setOpen(false); }}
              className="w-full rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Take the test
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
