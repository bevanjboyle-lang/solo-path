import { Link } from "react-router-dom";
import SoloLogo from "@/components/SoloLogo";

export default function Footer() {
  return (
    <footer
      className="relative z-10 py-10"
      style={{ background: "#1A1915", color: "#FAF9F7" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <Link to="/" aria-label="Solo home" className="opacity-90 hover:opacity-100 transition-opacity">
          <SoloLogo width={80} height={22} />
        </Link>
        <div className="flex gap-6 text-xs" style={{ color: "#FAF9F7" }}>
          <Link to="/pricing" className="opacity-70 hover:opacity-100 transition-opacity">Pricing</Link>
          <Link to="/faq" className="opacity-70 hover:opacity-100 transition-opacity">FAQ</Link>
          <Link to="/privacy" className="opacity-70 hover:opacity-100 transition-opacity">Privacy</Link>
          <Link to="/terms" className="opacity-70 hover:opacity-100 transition-opacity">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
