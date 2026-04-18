import { Link } from "react-router-dom";
import SoloLogo from "@/components/SoloLogo";

interface FooterProps {
  /** When true, footer is fixed to the bottom of the viewport (always visible). */
  sticky?: boolean;
}

export default function Footer({ sticky = true }: FooterProps) {
  return (
    <>
      <footer
        className={
          sticky
            ? "fixed bottom-0 left-0 right-0 z-40 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.25)]"
            : "relative z-10 py-10"
        }
        style={{ background: "#1A1915", color: "#FAF9F7" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 sm:flex-row sm:justify-between">
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
      {/* Spacer prevents content being hidden behind the fixed footer */}
      {sticky && <div aria-hidden="true" className="h-[72px]" />}
    </>
  );
}
