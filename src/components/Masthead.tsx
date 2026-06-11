// Masthead — the centred editorial brand masthead (ADR-026 v2.0, 2026-06-10).
// Shared by TopBar (anonymous + funnel-minimal) and TopBarAuthed.

import { Link } from "react-router-dom";
import SoloLogo from "@/components/SoloLogo";

export default function Masthead({ right, left }: { right?: React.ReactNode; left?: React.ReactNode }) {
  return (
    <div className="masthead">
      <div className="mx-auto max-w-6xl px-6">
        <div className="masthead-grid">
          <div className="flex items-center text-[12px] text-muted-foreground">{left}</div>
          <Link to="/" className="flex items-center gap-3 justify-self-center" aria-label="Solo home">
            <SoloLogo width={46} height={46} />
            <span className="masthead-word">solo</span>
          </Link>
          <div className="flex items-center justify-end gap-4">{right}</div>
        </div>
      </div>
    </div>
  );
}
