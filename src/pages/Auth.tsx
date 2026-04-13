import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2 } from "lucide-react";
import MintTopBar from "@/components/MintTopBar";

type Mode = "signin" | "signup";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/questionnaire", { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/questionnaire" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (error) { setError(error.message); return; }
      if (data.session) { navigate("/questionnaire", { replace: true }); }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setSubmitting(false);
      if (error) { setError(error.message); return; }
      setSignupSuccess(true);
    }
  };

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
    setSignupSuccess(false);
  };

  const isSignin = mode === "signin";

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <MintTopBar />
      <nav className="fixed left-0 right-0 top-1 z-50 border-b bg-surface-panel/95 backdrop-blur-lg" style={{ borderColor: "#D1CEC7" }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 pt-20">
        <motion.div
          className="w-full max-w-sm rounded-2xl bg-surface-panel p-8 shadow-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            {isSignin ? "Sign in to continue" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignin
              ? "Enter the email and password linked to your account."
              : "Sign up with your email to get started."}
          </p>

          {signupSuccess ? (
            <div className="mt-8 rounded-md border p-4 text-center" style={{ borderColor: "#D1CEC7" }}>
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
              </p>
              <button
                onClick={switchMode}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">Email address</label>
                <input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border bg-surface-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ borderColor: "#D1CEC7" }}
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
                <input
                  id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignin ? "Enter your password" : "At least 8 characters"}
                  className="w-full rounded-md border bg-surface-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ borderColor: "#D1CEC7" }}
                />
              </div>
              {!isSignin && (
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
                  <input
                    id="confirm-password" type="password" required value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-md border bg-surface-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ borderColor: "#D1CEC7" }}
                  />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit" disabled={submitting || !email || !password || (!isSignin && !confirmPassword)}
                className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-[#26B89D] hover:-translate-y-px hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isSignin ? "Sign in" : "Create account")}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {isSignin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={switchMode} className="font-medium text-primary hover:underline">
                  {isSignin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
