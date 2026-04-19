// ADR-013: PKCE callback. With detectSessionInUrl: true + flowType: 'pkce',
// supabase-js exchanges the code automatically on client mount. We just
// poll briefly for the session to materialize, then route.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reportId = params.get("reportId") || params.get("report_id");

    (async () => {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline && !cancelled) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (cancelled) return;
          if (reportId) navigate(`/teaser?reportId=${reportId}`, { replace: true });
          else navigate("/plan", { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (cancelled) return;
      // Still no session after the poll window — link expired or invalid.
      if (reportId) {
        navigate(`/teaser?reportId=${reportId}`, { replace: true });
        return;
      }
      setExpired(true);
    })();

    return () => { cancelled = true; };
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar minimal />
      <div className="flex flex-1 items-center justify-center px-6">
        {expired ? (
          <p className="text-sm text-muted-foreground">
            This sign-in link has expired. Request a new one on the{" "}
            <a href="/" className="text-primary underline underline-offset-2">home page</a>.
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
