import { ReactNode } from "react";

interface PanelLayoutProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

/**
 * Warm Ivory Panel  - Layer 2 of the three-layer surface model.
 * Sits as a centred ivory panel floating on the grey desk background.
 */
export default function PanelLayout({ children, className = "", wide = false }: PanelLayoutProps) {
  return (
    <div
      className={`mx-auto my-8 w-full rounded-2xl bg-surface-panel shadow-panel ${
        wide ? "max-w-[1060px]" : "max-w-[960px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
