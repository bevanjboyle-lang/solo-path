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

  /*
   * Render — Pass 1 v1 (2026-05-18). Utility shell pattern: panel-ivory
   * card on a minimal TopBar surface. Two states: signing-in (default,
   * mint loader) and expired (clear messaging + path forward).
   * Routing logic above is unchanged.
   */
  return (
    <div className="relative min-h-screen flex flex-col text-foreground">
      <TopBar minimal />
      <main className="flex-1 pt-6 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[560px]">
          <div className="py-12 sm:py-14 text-center">
            {expired ? (
              <>
                <div className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-foreground">Sign-in link expired</span>
                </div>
                <h1 className="title-h1">
                  This link's no longer active.
                </h1>
                <p className="mt-4 font-display text-[15px] text-muted-foreground leading-[1.45] max-w-[42ch] mx-auto">
                  Sign-in links are single-use, and only the most recent one works — if you
                  requested a few, the newest email is the one to open. Or just grab a fresh
                  link below; it takes a few seconds.
                </p>
                <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-3">
                  <a href="/auth" className="cta-block">
                    Send me a fresh link →
                  </a>
                  <a
                    href="/"
                    className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                  >
                    Back to home
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-foreground">Signing you in</span>
                </div>
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-[14px]">One moment…</p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
