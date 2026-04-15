import { AlertCircle, Info, AlertTriangle } from "lucide-react";

type BannerVariant = "warning" | "info" | "error";

interface BannerProps {
  variant: BannerVariant;
  children: React.ReactNode;
}

const config: Record<BannerVariant, { icon: typeof AlertCircle; bg: string; border: string; text: string }> = {
  warning: {
    icon: AlertTriangle,
    bg: "bg-[hsl(var(--warning-bg))]",
    border: "border-[hsl(var(--warning))]",
    text: "text-[hsl(var(--text-heading))]",
  },
  info: {
    icon: Info,
    bg: "bg-[hsl(var(--success-bg))]",
    border: "border-[hsl(var(--success))]",
    text: "text-[hsl(var(--text-heading))]",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-[hsl(var(--error-bg))]",
    border: "border-[hsl(var(--error))]",
    text: "text-[hsl(var(--text-heading))]",
  },
};

export default function Banner({ variant, children }: BannerProps) {
  const c = config[variant];
  const Icon = c.icon;
  return (
    <div className={`w-full ${c.bg} border-l-4 ${c.border} px-4 py-3 ${c.text}`} role="alert">
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
        <p className="text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
