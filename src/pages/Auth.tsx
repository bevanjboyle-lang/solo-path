import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2 } from "lucide-react";
import MintTopBar from "@/components/MintTopBar";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    if (data.session) { navigate("/questionnaire", { replace: true }); }
  };

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <MintTopBar />
      <nav className="fixed left-0 right-0 top-1 z-50 border-b bg-surface-panel/95 backdrop-blur-lg" style={{ borderColor: "#D5D0C8" }}>
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
          <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the email and password linked to your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">Email address</label>
              <input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border bg-surface-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ borderColor: "#D5D0C8" }}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <input
                id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-md border bg-surface-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ borderColor: "#D5D0C8" }}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit" disabled={submitting || !email || !password}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-[#26B89D] hover:-translate-y-px hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
