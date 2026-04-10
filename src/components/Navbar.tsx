import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "How it works", to: "/how-it-works" },
  { label: "Why Solo", to: "/why-solo" },
  { label: "Pricing", to: "/pricing" },
  { label: "Sample Report", to: "/sample-report" },
  { label: "FAQ", to: "/faq" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="text-base font-semibold tracking-tight text-foreground">
          Solo
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <button
              onClick={signOut}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
          <Button
            size="sm"
            className="rounded-lg text-sm font-medium text-primary-foreground"
            style={{ background: "var(--gradient-cta)" }}
            onClick={() => navigate("/auth")}
          >
            Take the test →
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <hr className="border-border/50" />
            {user ? (
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
            <Button
              size="sm"
              className="w-full rounded-lg text-sm font-medium text-primary-foreground"
              style={{ background: "var(--gradient-cta)" }}
              onClick={() => { navigate("/auth"); setOpen(false); }}
            >
              Take the test →
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
