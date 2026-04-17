import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AskSoloWidgetProps {
  mode?: "floating";
}

/**
 * Floating Ask Solo button — appears bottom-right on authenticated pages.
 * Hidden on /ask-solo (where the full-screen view is already shown) and for
 * unauthenticated users. Clicking navigates to /ask-solo.
 */
export default function AskSoloWidget({ mode = "floating" }: AskSoloWidgetProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (mode !== "floating") return null;
  if (loading || !user) return null;
  if (location.pathname.startsWith("/ask-solo")) return null;

  const open = () => navigate("/ask-solo");

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Ask Solo"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
