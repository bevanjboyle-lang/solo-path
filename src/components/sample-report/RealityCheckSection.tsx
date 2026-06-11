import { AlertTriangle, Lightbulb, PoundSterling } from "lucide-react";
import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  reality_check: SoloCoreReport["reality_check"];
}

const cards = [
  { key: "most_likely_failure_mode" as const, title: "Biggest Risk", borderColor: "border-red-400", icon: <AlertTriangle className="h-5 w-5 text-red-500" /> },
  { key: "second_failure_mode" as const, title: "Second Risk", borderColor: "border-amber-400", icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
  { key: "what_they_will_find_hard" as const, title: "What You'll Find Hard", borderColor: "border-muted-foreground/40", icon: <Lightbulb className="h-5 w-5 text-muted-foreground" /> },
  { key: "honest_income_outlook" as const, title: "Income Outlook", borderColor: "border-muted-foreground/40", icon: <PoundSterling className="h-5 w-5 text-muted-foreground" /> },
];

export default function RealityCheckSection({ reality_check }: Props) {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">The Real Talk</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((c) => (
          <div key={c.key} className={`bg-card p-5 border-l-[3px] ${c.borderColor}`}>
            <div className="flex items-center gap-2 mb-3">
              {c.icon}
              <h4 className="text-[1.1rem] font-bold text-foreground">{c.title}</h4>
            </div>
            <p className="text-sm leading-relaxed text-secondary-foreground">{reality_check[c.key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
