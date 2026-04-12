const skills = [
  { rank: 1, title: "Regulatory & Compliance Fluency", desc: "You can translate complex requirements into business language. This is rare and valuable outside financial services.", pct: 95 },
  { rank: 2, title: "Structured Risk Assessment", desc: "You think in frameworks. Consultants and insurtech firms pay a premium for this.", pct: 88 },
  { rank: 3, title: "Senior Stakeholder Management", desc: "Nine years navigating partner-level relationships is a credential in itself.", pct: 82 },
  { rank: 4, title: "Process Documentation & Controls", desc: "Undervalued internally. Extremely valuable to scale-ups and ops-heavy businesses.", pct: 75 },
  { rank: 5, title: "Project Governance", desc: "You've run enough audits to know what good looks like. That's a consulting superpower.", pct: 70 },
  { rank: 6, title: "Data Interpretation (non-technical)", desc: "You can read a dataset and tell a story. Rare in risk roles.", pct: 65 },
];

export default function SkillsRanked() {
  return (
    <div>
      <h2 className="mb-5 text-lg font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Your Strongest Skills (Ranked)</h2>
      <div className="flex flex-col gap-3">
        {skills.map((s) => (
          <div key={s.rank} className="rounded-md border border-border bg-surface-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.rank}</span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
