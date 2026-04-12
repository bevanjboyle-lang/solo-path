import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import SoloLogo from "@/components/SoloLogo";

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
    <nav className="fixed top-1 left-0 right-0 z-50 border-b bg-surface-panel/95 backdrop-blur-lg" style={{ borderColor: "#D5D0C8" }}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <a href="/" className="flex items-center no-underline">
          <SoloLogo width={140} height={40} />
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm transition-colors hover:text-foreground"
              style={{ color: "#5A5650" }}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <Link
                to="/guidance"
                className="text-sm transition-colors hover:text-foreground"
                style={{ color: "#5A5650" }}
              >
                Guidance
              </Link>
              <Link
                to="/ask-solo"
                className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-foreground"
                style={{ color: "#5A5650" }}
              >
                Ask Solo
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
                  Beta
                </span>
              </Link>
            </>
          )}
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
            className="rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-[#26B89D]"
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
        <div className="border-t bg-surface-panel px-6 py-4 md:hidden" style={{ borderColor: "#D5D0C8" }}>
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
            {user && (
              <>
                <Link
                  to="/guidance"
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Guidance
                </Link>
                <Link
                  to="/ask-solo"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ask Solo
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
                    Beta
                  </span>
                </Link>
              </>
            )}
            <hr style={{ borderColor: "#D5D0C8" }} />
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
              className="w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-[#26B89D]"
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
