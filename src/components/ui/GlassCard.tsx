import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noHover?: boolean;
}

/**
 * Brand Kit v2 card: ivory bg, 1px border, no shadows, no glassmorphism.
 */
export default function GlassCard({ className, children, noHover, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 ease-out",
        !noHover && "hover:-translate-y-[2px]",
        className
      )}
      style={{
        background: "#FAF9F7",
        borderColor: "#D1CEC7",
        borderRadius: 12,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
