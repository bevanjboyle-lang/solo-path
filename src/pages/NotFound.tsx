import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
// Footer import dropped 2026-05-18 (consistency-sweep) — App.tsx renders the Footer.

/*
 * NotFound — Pass 1 v1 (2026-05-18) — utility shell direct translation
 *
 * Editorial reskin of the 404 page. Calm panel-ivory card with mint-dot
 * eyebrow + display H1 + supporting text + primary CTA. Inherits the
 * /auth + /payment-success utility-shell pattern.
 *
 * Preserves auth-aware routing: authed users get "Back to your plan",
 * anon users get "Back to home".
 */

export default function NotFound() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthed = !loading && !!user;

  return (
    <div className="relative min-h-screen flex flex-col text-foreground">
      <TopBar />

      <main className="flex-1 pt-[68px] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[600px]">
          <div className="panel-ivory px-8 sm:px-12 py-12 sm:py-14 text-center">
            <div className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-foreground">404 · Page not found</span>
            </div>

            <h1
              className="font-display text-[32px] sm:text-[38px] font-extrabold tracking-tight leading-[1.05] text-foreground"
              style={{ letterSpacing: "-0.03em" }}
            >
              We couldn't find that page.
            </h1>

            <p className="mt-4 font-display text-[15px] sm:text-[16px] text-muted-foreground leading-[1.45] max-w-[44ch] mx-auto">
              {isAuthed
                ? "The link might be out of date, or that page isn't part of your plan."
                : "The link you followed might be out of date or mistyped. Head back home and try again."}
            </p>

            <div className="mt-8 pt-6 border-t border-[#E5E2DC] flex flex-col items-center gap-3">
              <button
                onClick={() =>
                  isAuthed ? navigateAuthed(navigate, "/plan") : navigate("/")
                }
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#2ECDB0" }}
              >
                {isAuthed ? "Back to your plan" : "Back to home"}
              </button>
              <a
                href="mailto:support@solo-plan.com"
                className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </main>

      {/*
        Page-level Footer conditional removed 2026-05-18 (consistency-sweep).
        App.tsx renders the Footer for every non-FOOTERLESS route, including
        NotFound. Before this fix, anon visitors saw two stacked Footers
        (page-level conditional fired + App.tsx unconditional render). Authed
        visitors saw only the App.tsx one (page-level conditional skipped).
        App.tsx is now the sole Footer authority across the app.
      */}
    </div>
  );
}
