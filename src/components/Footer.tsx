import { Link } from "react-router-dom";
import SoloLogo from "@/components/SoloLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface-panel py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <Link to="/" aria-label="Solo home">
          <SoloLogo width={80} height={22} />
        </Link>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <Link to="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
          <Link to="/faq" className="transition-colors hover:text-foreground">FAQ</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
