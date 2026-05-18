import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
// Footer import dropped 2026-05-18 (consistency-sweep) — App.tsx renders the Footer.

/*
 * ServerError — Pass 1 v1 (2026-05-18) — utility shell direct translation
 *
 * Editorial reskin of the 500 page. Calm panel-ivory card. Same shell
 * pattern as NotFound, swapped to refresh-first action with secondary
 * route home.
 *
 * Preserves window.location.reload retry + auth-aware secondary nav.
 */

export default function ServerError() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthed = !loading && !!user;

  const handleRetry = () => window.location.reload();

  return (
    <div className="relative min-h-screen flex flex-col text-foreground">
      <TopBar />

      <main className="flex-1 pt-[68px] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[600px]">
          <div className="panel-ivory px-8 sm:px-12 py-12 sm:py-14 text-center">
            <div className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-foreground">500 · Something went wrong</span>
            </div>

            <h1 className="title-h1">
              Something went wrong on our end.
            </h1>

            <p className="mt-4 font-display text-[15px] sm:text-[16px] text-muted-foreground leading-[1.45] max-w-[44ch] mx-auto">
              Try refreshing the page. If the problem continues, email{" "}
              <a
                href="mailto:support@solo-plan.com"
                className="text-foreground underline underline-offset-[3px] decoration-[#D8D4CC] hover:decoration-foreground"
              >
                support@solo-plan.com
              </a>
              .
            </p>

            <div className="mt-8 pt-6 border-t border-[#E5E2DC] flex flex-col items-center gap-3">
              <button
                onClick={handleRetry}
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#2ECDB0" }}
              >
                Refresh
              </button>
              <button
                onClick={() =>
                  isAuthed ? navigateAuthed(navigate, "/plan") : navigate("/")
                }
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
              >
                {isAuthed ? "Back to your plan" : "Go home"}
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
        Same fix as NotFound — App.tsx is now sole Footer authority. The
        anon-only conditional was producing a duplicate stacked Footer for
        unauthenticated visitors hitting /500.
      */}
    </div>
  );
}
