import { ReactNode } from "react";

interface PanelLayoutProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

/**
 * Brand Kit v2 Panel — ivory surface, 1px border, no shadow.
 */
export default function PanelLayout({ children, className = "", wide = false }: PanelLayoutProps) {
  return (
    <div
      className={`mx-auto my-6 w-full rounded-xl ${className}`}
      style={{
        // Fill most of the viewport, leaving a small gutter on each side.
        maxWidth: wide ? "min(1680px, calc(100vw - 32px))" : "min(1480px, calc(100vw - 32px))",
        background: "#FAF9F7",
        border: "1px solid #D1CEC7",
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  );
}
