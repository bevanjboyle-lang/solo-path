import { Link } from "react-router-dom";
import SoloLogo from "@/components/SoloLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 bg-surface-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
        <SoloLogo width={80} height={22} />
        <div className="flex gap-6 text-xs text-muted-foreground">
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
