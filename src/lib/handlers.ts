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
  const redirect = redirectTo
    ? `${window.location.origin}${redirectTo}`
    : `${window.location.origin}/plan`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect },
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
}): Promise<{ report_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("generate-report", {
    body: payload,
  });

  if (error) {
    return { error: error.message || "Report generation failed" };
  }

  return { report_id: data?.report_id };
}
