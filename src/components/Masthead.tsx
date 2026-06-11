// Masthead — the centred editorial brand masthead (ADR-026 v2.0, 2026-06-10).
// Shared by TopBar (anonymous + funnel-minimal) and TopBarAuthed.
// v2.0.1: SoloLogo (a wide full-logo SVG) was being squashed into a square;
// the masthead now renders the dot-burst mark inline (geometry from
// logo/solo-logo-dark.svg) beside a text wordmark, matching the approved mock.

import { Link } from "react-router-dom";

function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 48" aria-hidden>
      <circle cx="29.12" cy="17" r="1.3" fill="#2ECDB0" opacity=".25" />
      <circle cx="17" cy="10" r="1.3" fill="#2ECDB0" opacity=".25" />
      <circle cx="4.88" cy="17" r="1.3" fill="#2ECDB0" opacity=".25" />
      <circle cx="4.88" cy="31" r="1.3" fill="#2ECDB0" opacity=".25" />
      <circle cx="17" cy="38" r="1.3" fill="#2ECDB0" opacity=".25" />
      <circle cx="29.12" cy="31" r="1.3" fill="#2ECDB0" opacity=".25" />
      <circle cx="25.5" cy="24" r="2" fill="#2ECDB0" opacity=".55" />
      <circle cx="21.25" cy="16.64" r="2" fill="#2ECDB0" opacity=".55" />
      <circle cx="12.75" cy="16.64" r="2" fill="#2ECDB0" opacity=".55" />
      <circle cx="8.5" cy="24" r="2" fill="#2ECDB0" opacity=".55" />
      <circle cx="12.75" cy="31.36" r="2" fill="#2ECDB0" opacity=".55" />
      <circle cx="21.25" cy="31.36" r="2" fill="#2ECDB0" opacity=".55" />
      <circle cx="17" cy="24" r="4" fill="#2ECDB0" />
    </svg>
  );
}

export default function Masthead({ right, left }: { right?: React.ReactNode; left?: React.ReactNode }) {
  return (
    <div className="masthead">
      <div className="mx-auto max-w-6xl px-6">
        <div className="masthead-grid">
          <div className="flex items-center text-[12px] text-muted-foreground">{left}</div>
          <Link to="/" className="flex items-center gap-2.5 justify-self-center" aria-label="Solo home">
            <BrandMark />
            <span className="masthead-word">solo</span>
          </Link>
          <div className="flex items-center justify-end gap-4">{right}</div>
        </div>
      </div>
    </div>
  );
}
