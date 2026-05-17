// ADR-013: PKCE callback. With detectSessionInUrl: true + flowType: 'pkce',
// supabase-js exchanges the code automatically on client mount. We just
// poll briefly for the session to materialize, then route.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDevBypass } from "@/lib/devBypass";
import TopBar from "@/components/TopBar";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [expired, setExpired] = useState(false);

  // V-066: one-time migration of legacy dot-key localStorage entry
  const dotKey = localStorage.getItem("solo.client_session_id");
  if (dotKey) {
    if (!localStorage.getItem("solo_client_session_id")) {
      localStorage.setItem("solo_client_session_id", dotKey);
    }
    localStorage.removeItem("solo.client_session_id");
  }

  useEffect(() => {
    let cancelled = false;
    const reportIdParam = params.get("reportId") || params.get("report_id");

    (async () => {
      if (isDevBypass()) {
        navigate("/plan", { replace: true });
        return;
      }

      // 1. Wait until the session is definitively readable (with access_token).
      // exchangeCodeForSession resolves before supabase-js finishes propagating
      // the session to localStorage / its internal state, so functions.invoke
      // would otherwise fire without a valid Authorization header → 401.
      const deadline = Date.now() + 5000;
      let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;
      while (Date.now() < deadline && !cancelled) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) { session = data.session; break; }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cancelled) return;

      if (!session) {
        // Magic link expired or invalid.
        if (reportIdParam) {
          navigate(`/teaser?report_id=${reportIdParam}`, { replace: true });
          return;
        }
        setExpired(true);
        return;
      }

      // 2. Best-effort: link any anon-keyed rows to this user before routing.
      const clientSessionId =
        (typeof window !== "undefined" &&
          (localStorage.getItem("solo_client_session_id") ||
            localStorage.getItem("solo.client_session_id"))) ||
        null;
      if (clientSessionId) {
        try {
          // Pass the access token explicitly so the edge function always
          // receives a valid Authorization header, even if supabase-js's
          // internal token state is still settling.
          await supabase.functions.invoke("link-anon-session", {
            body: { client_session_id: clientSessionId },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        } catch (err) {
          console.warn("link-anon-session call failed (non-fatal):", err);
        }
      }
      if (cancelled) return;

      // 3. Honour an explicit reportId in the callback URL first.
      if (reportIdParam) {
        navigate(`/teaser?report_id=${reportIdParam}`, { replace: true });
        return;
      }

      // 4. Find the user's "best" report — prefer paid over unpaid.
      //
      // Previously this picked the user's most-recent report regardless of
      // payment status, which routed paid users with a newer unpaid test
      // run to /teaser instead of their /plan. The fix: fetch all
      // teaser-or-better reports and pick the most recent PAID one. Fall
      // back to the most recent unpaid only if no paid report exists.
      //
      // PAID_STATUSES = anything past payment: pending_selection (paid,
      // hasn't picked path yet), generating_plan (paid, plan running),
      // complete (paid, plan done).
      const PAID_STATUSES = new Set(["pending_selection", "generating_plan", "complete"]);
      const { data: reports, error: reportLookupError } = await supabase
        .from("reports")
        .select("id, status, created_at")
        .eq("user_id", session.user.id)
        .in("status", ["teaser_ready", "pending_selection", "generating_plan", "complete"])
        .order("created_at", { ascending: false });
      if (reportLookupError) {
        console.error("Report lookup after auth failed:", reportLookupError);
      }
      if (cancelled) return;

      // Pick the best report: most recent paid, else most recent unpaid.
      const paidReport = reports?.find((r) => PAID_STATUSES.has(r.status));
      const chosen = paidReport ?? reports?.[0] ?? null;

      // 5. Route based on payment status. Paid → /plan (plan exists or
      // auto-generates). Unpaid → /teaser. NEVER redirect to
      // /questionnaire?resume=true.
      if (chosen?.id) {
        if (PAID_STATUSES.has(chosen.status)) {
          navigate(`/plan?report_id=${chosen.id}`, { replace: true });
        } else {
          navigate(`/teaser?report_id=${chosen.id}`, { replace: true });
        }
        return;
      }
      navigate("/", { replace: true });
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
