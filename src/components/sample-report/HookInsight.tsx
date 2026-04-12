import { Lock } from "lucide-react";

export default function HookInsight() {
  return (
    <div className="rounded-md border border-border bg-surface-card p-6" style={{ borderLeft: "4px solid hsl(var(--mint))" }}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Your Key Insight</span>
      <p className="mt-3 text-base font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>
        Your Big Four compliance experience is worth more outside financial services than inside it.
      </p>
      <div className="relative mt-3">
        <p className="text-sm leading-relaxed text-muted-foreground" style={{ filter: "blur(4px)" }}>
          The regulatory expertise you've built over nine years commands a premium in sectors that need it but haven't historically had access to Big Four talent. FinTechs, scale-ups, and RegTech firms are actively looking for exactly this profile.
        </p>
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-xs font-medium text-muted-foreground">Full insight in your report</span>
        </div>
      </div>
    </div>
  );
}
