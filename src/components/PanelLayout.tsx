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
      className={`mx-auto my-8 w-full rounded-xl ${
        wide ? "max-w-[1060px]" : "max-w-[960px]"
      } ${className}`}
      style={{
        background: "#FAF9F7",
        border: "1px solid #D1CEC7",
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  );
}
