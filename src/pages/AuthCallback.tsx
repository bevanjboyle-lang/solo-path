// PKCE callback — survives Gmail Safe Browsing pre-fetch because code_verifier is in localStorage, not in the URL.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";

type State = "exchanging" | "error";

const REDIRECT_KEY = "solo.auth_redirect_target";
const EMAIL_KEY = "solo.auth_email";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>("exchanging");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    // Errors arrive in the hash from Supabase
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const hashError = hashParams.get("error") || url.searchParams.get("error");

    if (hashError || !code) {
      setState("error");
      return;
    }

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setState("error");
        return;
      }
      const target = sessionStorage.getItem(REDIRECT_KEY) || "/plan";
      sessionStorage.removeItem(REDIRECT_KEY);
      navigate(target, { replace: true });
    })();
  }, [navigate]);

  const handleSendNew = () => {
    const email = sessionStorage.getItem(EMAIL_KEY);
    const target = sessionStorage.getItem(REDIRECT_KEY);
    const params = new URLSearchParams();
    params.set("expired", "true");
    if (target) params.set("redirect", target);
    if (email) params.set("email", email);
    navigate(`/auth?${params.toString()}`, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar minimal />
      <div className="flex flex-1 items-center justify-center px-6">
        {state === "exchanging" ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Signing you in…</p>
          </div>
        ) : (
          <div className="w-full max-w-[420px]">
            <Banner variant="warning">
              That link has expired. Enter your email to get a fresh one.
            </Banner>
            <button
              onClick={handleSendNew}
              className="mt-6 flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-px"
            >
              Send a new link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
