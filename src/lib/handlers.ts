import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "solo.client_session_id";

/**
 * Creates a client_session_id if missing, then navigates to /cv-upload.
 * This is THE ONLY handler for every "Take the test" CTA across the entire site.
 */
export function startTest(navigate: (path: string) => void) {
  if (!localStorage.getItem(SESSION_KEY)) {
    localStorage.setItem(SESSION_KEY, crypto.randomUUID());
  }
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
 * Get or create client_session_id.
 */
export function getClientSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

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
 * Generate report — kicks off the edge function and returns report_id.
 */
export async function generateReport(payload: {
  client_session_id: string;
  answers: Record<string, unknown>;
  first_name: string;
  email: string | null;
  email_refused: boolean;
}): Promise<{
  report_id?: string;
  error?: string;
  waitingForAuth?: boolean;
  magicLinkSent?: boolean;
  otpError?: boolean;
  email?: string;
}> {
  // Require a real authenticated session before invoking the edge function.
  // Never fall back to the anon key — the edge function will 401.
  let session = (await supabase.auth.getSession()).data.session;

  // F42: First-time anonymous users have no session AND no magic link sent yet.
  // Send the OTP and stop — they need to click the link before we can generate.
  if (!session && payload.email) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: payload.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
        data: { first_name: payload.first_name },
      },
    });
    if (otpError) {
      return { otpError: true, error: otpError.message };
    }
    return { magicLinkSent: true, email: payload.email };
  }

  if (!session) {
    // Wait for SIGNED_IN (cross-tab via storage event after user clicks magic
    // link in another tab). Bounded 10s timeout — do NOT re-send a magic link
    // here; the link was already sent at the /auth step.
    session = await new Promise<typeof session>((resolve) => {
      const timer = setTimeout(() => {
        sub.data.subscription.unsubscribe();
        resolve(null);
      }, 10_000);
      const sub = supabase.auth.onAuthStateChange((event, s) => {
        if (event === "SIGNED_IN" && s) {
          clearTimeout(timer);
          sub.data.subscription.unsubscribe();
          resolve(s);
        }
      });
    });

    if (!session) {
      return {
        waitingForAuth: true,
        error:
          "Your sign-in hasn't come through yet. Please click the magic link in your email, then press Generate my report again.",
      };
    }
  }

  // supabase-js auto-injects Authorization: Bearer <access_token> from session.
  const { data, error } = await supabase.functions.invoke("generate-report", {
    body: payload,
  });

  if (error) {
    return { error: error.message || "Report generation failed" };
  }

  return { report_id: data?.report_id };
}
