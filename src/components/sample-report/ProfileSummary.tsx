import { ShieldCheck } from "lucide-react";

export default function ProfileSummary() {
  const score = 73;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-md border border-border bg-surface-card p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Profile Summary</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Sarah Chen</h3>
          <p className="text-sm text-muted-foreground">Risk Manager · Financial Services · Edinburgh</p>
          <p className="mt-0.5 text-sm text-muted-foreground">9 years at Big Four · Currently earning: £85k</p>

          <div className="mt-4 inline-flex items-center rounded-md bg-surface-mint-tint px-3 py-1">
            <span className="text-xs font-medium text-[hsl(var(--mint-text))]">Archetype: Regulatory &amp; Compliance Specialist (Financial Services)</span>
          </div>
        </div>

        {/* Right - Ring */}
        <div className="flex flex-col items-center">
          <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--surface-inset))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--mint))" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="46" textAnchor="middle" className="fill-foreground text-xl font-bold" style={{ fontSize: 22 }}>73</text>
            <text x="50" y="62" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>/ 100</text>
          </svg>
          <span className="mt-1 text-xs font-semibold text-primary">Strong</span>
          <span className="text-[10px] text-muted-foreground">Transferability</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        Your risk management background gives you unusually portable skills. The combination of regulatory knowledge, stakeholder communication, and process documentation places you in a strong position across multiple adjacent markets.
      </p>
    </div>
  );
}
