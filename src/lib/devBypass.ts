/**
 * Dev-only bypass flag. Set by /dev/screens for the dev account so the
 * dev can browse any screen without going through auth, payment, or
 * precondition guards. Cleared on signOut.
 *
 * Production behaviour MUST be unchanged for non-bypass users — every
 * call site checks this BEFORE the existing redirect fires and only
 * skips the redirect when true.
 */
export function isDevBypass(): boolean {
  try {
    return localStorage.getItem("solo_dev_bypass") === "1";
  } catch {
    return false;
  }
}