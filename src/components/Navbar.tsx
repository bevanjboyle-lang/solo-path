import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import SoloLogo from "@/components/SoloLogo";

const navLinks = [
  { label: "Sample Report", to: "/sample-report" },
  { label: "Sample Guidance Library", to: "/guidance-library" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Why Solo", to: "/why-solo" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="fixed top-1 left-0 right-0 z-50"
      style={{
        background: "#FAF9F7",
        borderBottom: "1px solid #D1CEC7",
        padding: "0 40px",
      }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
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
              className="nav-link-mint transition-colors hover:text-foreground"
              style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <Link
                to="/guidance"
                className="nav-link-mint transition-colors hover:text-foreground"
                style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
              >
                Guidance
              </Link>
              <Link
                to="/ask-solo"
                className="nav-link-mint inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
              >
                Ask Solo
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: "#e8faf6", color: "#2ECDB0", border: "1px solid #c5f0e8" }}
                >
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
              className="transition-colors hover:text-foreground"
              style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="transition-colors hover:text-foreground"
              style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
            >
              Sign in
            </Link>
          )}
          <button
            className="mint-btn text-white"
            style={{
              background: "#2ECDB0",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.1px",
            }}
            onClick={() => navigate("/auth")}
          >
            Take the test →
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          style={{ color: "#1D2025" }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden"
          style={{
            background: "#FAF9F7",
            borderTop: "1px solid #D1CEC7",
            padding: "16px 24px",
          }}
        >
          <div className="flex flex-col gap-3">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="transition-colors hover:text-foreground"
                style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  to="/guidance"
                  onClick={() => setOpen(false)}
                  className="transition-colors hover:text-foreground"
                  style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
                >
                  Guidance
                </Link>
                <Link
                  to="/ask-solo"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
                >
                  Ask Solo
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: "#e8faf6", color: "#2ECDB0", border: "1px solid #c5f0e8" }}
                  >
                    Beta
                  </span>
                </Link>
              </>
            )}
            <hr style={{ borderColor: "#D1CEC7" }} />
            {user ? (
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="text-left transition-colors hover:text-foreground"
                style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="transition-colors hover:text-foreground"
                style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}
              >
                Sign in
              </Link>
            )}
            <button
              className="mint-btn w-full text-white"
              style={{
                background: "#2ECDB0",
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => { navigate("/auth"); setOpen(false); }}
            >
              Take the test →
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
