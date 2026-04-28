import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  // Dev-only bypass: set by /dev/screens for the dev account. Lets the dev
  // browse authed routes without going through /auth. Cleared on signOut.
  let devBypass = false;
  try { devBypass = localStorage.getItem("solo_dev_bypass") === "1"; } catch {}
  if (!user && !devBypass) return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  return <>{children}</>;
}
