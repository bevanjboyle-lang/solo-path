import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";

export default function NotFound() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthed = !loading && !!user;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar />

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[560px] text-center">
          <p className="font-mono text-sm text-muted-foreground tracking-widest uppercase">404</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            We couldn't find that page.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {isAuthed
              ? "The link might be out of date, or that page isn't part of your plan."
              : "The link you followed might be out of date or mistyped. Head back home and try again."}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            {isAuthed ? (
              <button
                onClick={() => navigateAuthed(navigate, "/plan")}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Back to your plan
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Back to home
              </button>
            )}
            <a
              href="mailto:support@solo-plan.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact support
            </a>
          </div>
        </div>
      </main>

      {!isAuthed && <Footer />}
    </div>
  );
}
