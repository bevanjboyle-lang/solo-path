// F94 v25 (2026-05-08): /auth/confirm — non-PKCE magic-link entry point.
//
// Daily check-in emails (and any other server-minted magic-link via
// supabase.auth.admin.generateLink) land here with a token_hash + type
// query param. We call supabase.auth.verifyOtp({ token_hash, type })
// directly, which performs a single POST to /auth/v1/verify and stores the
// resulting session in localStorage — no PKCE code_verifier required, no
// redirect roundtrip, works regardless of the client's flowType setting.
//
// Why not /auth/callback? AuthCallback.tsx is the PKCE callback. With
// flowType: 'pkce', supabase-js expects ?code=... in the URL and tries to
// call exchangeCodeForSession with a code_verifier from localStorage.
// Server-minted magic links have no client-side verifier, so the exchange
// fails silently and the user sees "expired".
//
// Per Supabase docs (Magic Link, "If you're using PKCE flow, edit the Magic
// Link email template to send a token hash"), the canonical fix is the
// token_hash + verifyOtp pattern implemented here.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokenHash = params.get("token_hash");
      const typeParam = params.get("type") || "magiclink";

      if (!tokenHash) {
        setErrorMessage("This sign-in link is missing a token. Please request a new one.");
        return;
      }

      try {
        // verifyOtp accepts the hashed token and exchanges it directly for a
        // session. supabase-js stores the resulting access_token + refresh_token
        // in localStorage and fires onAuthStateChange.
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          // Supabase's TS types only accept a fixed enum here; cast the string
          // we received in the URL. "magiclink" is the canonical value used by
          // admin.generateLink({ type: "magiclink" }).
          type: typeParam as "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email",
        });
        if (cancelled) return;

        if (error || !data?.session) {
          console.error("verifyOtp failed:", error);
          setErrorMessage(
            "This sign-in link has expired or has already been used. Request a new one from your last check-in email."
          );
          return;
        }

        // Best-effort link any anon-keyed rows to this user (mirror of
        // AuthCallback's behaviour so check-in emails don't lose anon work).
        const clientSessionId =
          (typeof window !== "undefined" &&
            (localStorage.getItem("solo_client_session_id") ||
              localStorage.getItem("solo.client_session_id"))) ||
          null;
        if (clientSessionId) {
          try {
            await supabase.functions.invoke("link-anon-session", {
              body: { client_session_id: clientSessionId },
              headers: { Authorization: `Bearer ${data.session.access_token}` },
            });
          } catch (linkErr) {
            console.warn("link-anon-session failed (non-fatal):", linkErr);
          }
        }
        if (cancelled) return;

        // For check-in emails the user always wants /plan. (We could mirror
        // AuthCallback's report-status routing here, but the email is only
        // sent to users with active tracker_sessions, so /plan is correct.)
        navigate("/plan", { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error("AuthConfirm threw:", err);
        setErrorMessage(
          "Something went wrong signing you in. Please try opening the email link again."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar minimal />
      <div className="flex flex-1 items-center justify-center px-6">
        {errorMessage ? (
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {errorMessage}{" "}
            <a href="/" className="text-primary underline underline-offset-2">
              Go home
            </a>
            .
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Signing you in…</p>
          </div>
        )}
      </div>
    </div>
  );
}
