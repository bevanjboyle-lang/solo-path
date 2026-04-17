import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";

export default function ServerError() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthed = !loading && !!user;

  const handleRetry = () => window.location.reload();
  const goHome = () => navigate("/");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar />

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[560px] text-center">
          <p className="font-mono text-sm text-muted-foreground tracking-widest uppercase">500</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Something went wrong on our end.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Try refreshing the page. If the problem continues, email{" "}
            <a href="mailto:support@solo-plan.com" className="underline underline-offset-4 hover:text-foreground transition-colors">
              support@solo-plan.com
            </a>
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={handleRetry}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              Refresh
            </button>
            {isAuthed ? (
              <button
                onClick={() => navigateAuthed(navigate, "/plan")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to your plan
              </button>
            ) : (
              <button
                onClick={goHome}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Go home
              </button>
            )}
            <a
              href="mailto:support@solo.so"
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
