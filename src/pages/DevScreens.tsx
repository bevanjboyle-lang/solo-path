import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Developer-only screen index. Self-gated: only renders for the dev account.
// Sets a `solo_dev_bypass` localStorage flag so ProtectedRoute lets us through
// to authed routes without going through /auth. Flag is cleared on signOut.
const DEV_EMAIL = "bevan.j.boyle@gmail.com";

const SECTIONS: { title: string; routes: { label: string; path: string }[] }[] = [
  {
    title: "Discovery",
    routes: [
      { label: "Home", path: "/" },
      { label: "Pricing", path: "/pricing" },
      { label: "FAQ", path: "/faq" },
    ],
  },
  {
    title: "Legal",
    routes: [
      { label: "Privacy", path: "/privacy" },
      { label: "Terms", path: "/terms" },
    ],
  },
  {
    title: "Activation funnel",
    routes: [
      { label: "CV Upload", path: "/cv-upload" },
      { label: "Questionnaire", path: "/questionnaire" },
      { label: "Processing", path: "/processing" },
      { label: "Teaser", path: "/teaser" },
    ],
  },
  {
    title: "Auth",
    routes: [{ label: "Auth", path: "/auth" }],
  },
  {
    title: "Conversion",
    routes: [{ label: "Payment Success", path: "/payment-success" }],
  },
  {
    title: "Core product (authed + paid)",
    routes: [
      { label: "Plan", path: "/plan" },
      { label: "Check-in (mock session)", path: "/checkin/dev-mock-session-id" },
      { label: "Library", path: "/library" },
      { label: "Library module (mock)", path: "/library/modules/dev-mock-module-id" },
      { label: "Ask Solo", path: "/ask-solo" },
      { label: "Account", path: "/account" },
      { label: "Subscribe", path: "/subscribe" },
    ],
  },
  {
    title: "Errors",
    routes: [
      { label: "404", path: "/404" },
      { label: "500", path: "/500" },
    ],
  },
];

export default function DevScreens() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email === DEV_EMAIL) {
      try { localStorage.setItem("solo_dev_bypass", "1"); } catch {}
    }
  }, [user]);

  if (loading) return null;
  if (user?.email !== DEV_EMAIL) return <Navigate to="/404" replace />;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Dev · Screen Index</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
        Auth + paid guards bypassed for this session. Some screens may render blank or in a loading state without real data, that's expected.
      </p>
      {SECTIONS.map((section) => (
        <section key={section.title} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: "#444", marginBottom: 8 }}>
            {section.title}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {section.routes.map((r) => (
              <li key={r.path} style={{ padding: "4px 0" }}>
                <a
                  href={r.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(r.path);
                  }}
                  style={{ color: "#0a58ca", textDecoration: "underline", fontSize: 14 }}
                >
                  {r.label} <span style={{ color: "#999" }}>· {r.path}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}