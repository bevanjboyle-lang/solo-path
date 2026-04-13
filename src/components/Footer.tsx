import { Link } from "react-router-dom";
import SoloLogo from "@/components/SoloLogo";

export default function Footer() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 py-3"
      style={{
        background: "#FAF9F7",
        borderTop: "1px solid #D1CEC7",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
        <SoloLogo width={80} height={22} />
        <div className="flex gap-6" style={{ fontSize: 12, color: "#6B7280" }}>
          <Link to="/about" className="transition-colors hover:text-foreground">About</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
