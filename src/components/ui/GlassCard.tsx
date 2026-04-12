import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn("rounded-2xl", className)}
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(250,249,247,0.7)",
        border: "1px solid rgba(229,226,220,0.5)",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
