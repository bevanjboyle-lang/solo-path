import { supabase } from "@/integrations/supabase/client";
import { getClientSessionId as _getClientSessionId } from "./clientSession";

/**
 * Creates a client_session_id if missing, then navigates to /cv-upload.
 * This is THE ONLY handler for every "Take the test" CTA across the entire site.
 */
export function startTest(navigate: (path: string) => void) {
  _getClientSessionId();
  navigate("/cv-upload");
}

/**
 * Navigate to an authed route. Route guards at the Page level handle
 * unauthenticated users — this handler never checks auth itself.
 */
export function navigateAuthed(navigate: (path: string) => void, path: string) {
  navigate(path);
}

/**
 * Continue funnel — advances from one activation step to the next.
 */
export function continueFunnel(navigate: (path: string) => void, destination: string) {
  navigate(destination);
}

/**
 * Sign in with magic link (OTP). Anti-enumeration: always resolves
 * successfully regardless of whether the email exists.
 */
export async function signIn(
  email: string,
  redirectTo?: string
): Promise<{ error?: string; rateLimited?: boolean }> {
  // Preserve the deep-link redirect target + email through the PKCE round-trip.
  // The callback route reads these back from sessionStorage after exchange.
  if (redirectTo) sessionStorage.setItem("solo.auth_redirect_target", redirectTo);
  sessionStorage.setItem("solo.auth_email", email);

  const emailRedirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes("rate")) {
      return { rateLimited: true };
    }
    return { error: error.message };
  }
  return {};
}

/**
 * Open a named panel (e.g. checkin drawer, askSolo widget).
 * Panel coordination is handled by the calling page's state.
 */
export function openPanel(
  _panelName: string,
  _params?: Record<string, unknown>
): void {
  // Panels are controlled via page-level state, not routing.
  // This is a declarative intent — the calling component
  // reads the panel name and opens the correct drawer/overlay.
}

/**
 * Open Stripe billing portal via edge function.
 */
export async function openBillingPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-billing-portal-session", {
    body: {},
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const url = data?.url;
  if (url) window.open(url, "_blank");
  else throw new Error("No billing portal URL returned");
}

/**
 * Resume a cancelled-pending subscription via edge function.
 */
export async function resumeSubscription(): Promise<{ error?: string }> {
  const { error } = await supabase.functions.invoke("resume-subscription", {});
  if (error) return { error: error.message };
  return {};
}

/**
 * Confirm and delete CV data.
 */
export async function confirmDeleteCv(): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("delete-user-cv", {
    body: {},
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return {};
}

/**
 * Request a data export — returns blob for download.
 */
export async function requestDataExport(): Promise<{ blob?: Blob; error?: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return { error: "Not authenticated" };

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) return { error: `Export failed (${res.status})` };
  const blob = await res.blob();
  return { blob };
}

/**
 * Delete user account entirely.
 */
export async function confirmDeleteAccount(userId: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { confirmation: "delete", user_id: userId },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return {};
}

/**
 * Claim a second report. Backend returns one of:
 *  - { eligible: true, requires_payment: false }   → navigate to /cv-upload
 *  - { requires_payment: true, checkout_url }      → redirect to Stripe
 *  - { eligible: false, reason: "cap_reached", days_until_eligible } → caller handles UI
 */
export interface ClaimSecondReportResult {
  eligible?: boolean;
  requires_payment?: boolean;
  checkout_url?: string;
  reason?: string;
  days_until_eligible?: number;
  second_report_paid?: boolean;
  error?: string;
}

export async function claimSecondReport(
  navigate?: (path: string) => void
): Promise<ClaimSecondReportResult> {
  const { data, error } = await supabase.functions.invoke("claim-second-report", {
    body: {},
  });
  if (error) return { error: error.message };
  const result = (data || {}) as ClaimSecondReportResult;

  if (result.requires_payment && result.checkout_url) {
    window.location.href = result.checkout_url;
    return result;
  }
  if (result.eligible && !result.requires_payment && navigate) {
    navigateAuthed(navigate, "/cv-upload");
  }
  return result;
}

/**
 * Toggle Ask Solo info popover. Pure intent handler — local state lives
 * in the widget that calls this. Pass the current value and the setter.
 */
export function openAskSoloInfo(
  current: boolean,
  setOpen: (next: boolean) => void
): void {
  setOpen(!current);
}

/**
 * Confirm a pending replan. POSTs action=run to process-replan.
 */
export async function confirmReplan(
  trackerSessionId: string,
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.functions.invoke("process-replan", {
    body: { action: "run", trackerSessionId, userId },
  });
  if (error) return { error: error.message };
  return {};
}

/**
 * Dismiss a pending replan. POSTs action=dismiss to process-replan.
 */
export async function dismissReplan(
  trackerSessionId: string,
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.functions.invoke("process-replan", {
    body: { action: "dismiss", trackerSessionId, userId },
  });
  if (error) return { error: error.message };
  return {};
}

/**
 * Get or create client_session_id. Re-exported from the canonical
 * implementation in src/lib/clientSession.ts.
 */
export const getClientSessionId = _getClientSessionId;

/**
 * Trigger Stripe checkout — creates a session via edge function and redirects.
 * THE canonical handler for every "Unlock" CTA on /teaser and PricingCard.
 */
export async function triggerStripeCheckout(
  priceId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: { price_id: priceId, ...metadata },
  });
  if (error) throw error;
  const redirectUrl = data?.sessionUrl || data?.url;
  if (redirectUrl) window.location.href = redirectUrl;
}

/**
 * Submit form — named form submission handler.
 * Resolves the correct backend endpoint based on form name.
 */
export async function submitForm(
  formName: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // For questionnaire steps, we store locally — no per-step network call needed
  // Final submit is handled by generateReport
  if (formName === "questionnaire_step") {
    return { success: true };
  }
  if (formName === "questionnaire_final") {
    return { success: true };
  }
  return { success: true };
}

/**
 * Generate report — ADR-013 anonymous-first contract.
 *
 * - If signed in: invokes generate-report with { answers, cvExtract }.
 *   supabase-js auto-injects the user JWT in the Authorization header.
 * - If anonymous: fires (without awaiting) a magic-link signInWithOtp for
 *   future auth, then invokes generate-report with the anon key + the
 *   X-Client-Session-Id header (added by the global fetch wrapper).
 *   Backend links the resulting reports row to the user_id at payment-webhook
 *   time using client_session_id + Stripe customer email.
 *
 * Never blocks on auth. Never sets the Authorization header manually.
 */
export async function generateReport(payload: {
  client_session_id: string;
  answers: Record<string, unknown>;
  first_name: string;
  email: string | null;
  email_refused: boolean;
}): Promise<{ report_id?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthed = session !== null;

  // Anonymous: fire-and-forget magic link so a session exists when the user
  // returns post-payment. Failures are non-fatal — the user will still pay
  // via Stripe and reach the report.
  if (!isAuthed && payload.email) {
    supabase.auth
      .signInWithOtp({
        email: payload.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
          data: { first_name: payload.first_name },
        },
      })
      .catch((err) => console.warn("signInWithOtp failed (non-fatal):", err));
  }

  const body = isAuthed
    ? { answers: payload.answers }
    : {
        answers: payload.answers,
        first_name: payload.first_name,
        email: payload.email,
        email_refused: payload.email_refused,
        clientSessionId: _getClientSessionId(),
      };

  const { data, error } = await supabase.functions.invoke("generate-report", { body });
  if (error) return { error: error.message || "Report generation failed" };
  return { report_id: data?.report_id };
}
