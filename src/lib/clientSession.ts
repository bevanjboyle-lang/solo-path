// ADR-013: Anonymous-first contract.
// A persistent client_session_id identifies the user across the anonymous
// questionnaire flow until the payment-webhook links the row to a real user_id.
// Never cleared. Never regenerated. Survives sign-in and sign-out.

const KEY = "solo_client_session_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function uuidv4Polyfill(): string {
  // RFC-4122 v4 fallback for environments without crypto.randomUUID
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getClientSessionId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && UUID_RE.test(existing)) return existing;
    const fresh = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : uuidv4Polyfill()
    ).toLowerCase();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Fall back to a per-call ephemeral id if localStorage is unavailable.
    return uuidv4Polyfill();
  }
}
