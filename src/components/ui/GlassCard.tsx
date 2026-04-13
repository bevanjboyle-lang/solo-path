import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noHover?: boolean;
}

export default function GlassCard({ className, children, noHover, ...props }: GlassCardProps) {
  return (
    <div
      className={cn("rounded-2xl transition-all duration-200 ease-out", !noHover && "hover:-translate-y-[2px]", className)}
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(250,249,247,0.7)",
        border: "1px solid rgba(229,226,220,0.5)",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        if (!noHover) e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)";
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!noHover) e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
        props.onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </div>
  );
}
