import { SAMPLE_REALITY_CHECK } from "@/data/sampleReportData";
import { AlertTriangle, Lightbulb, PoundSterling } from "lucide-react";

const cards = [
  { key: "most_likely_failure_mode" as const, title: "Biggest Risk", borderColor: "border-red-500", icon: <AlertTriangle className="h-5 w-5 text-red-400" /> },
  { key: "second_failure_mode" as const, title: "Second Risk", borderColor: "border-amber-500", icon: <AlertTriangle className="h-5 w-5 text-amber-400" /> },
  { key: "what_they_will_find_hard" as const, title: "What You'll Find Hard", borderColor: "border-[#6B7280]", icon: <Lightbulb className="h-5 w-5 text-[#6B7280]" /> },
  { key: "honest_income_outlook" as const, title: "Income Outlook", borderColor: "border-[#6B7280]", icon: <PoundSterling className="h-5 w-5 text-[#6B7280]" /> },
];

export default function RealityCheckSection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">The Real Talk</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((c) => (
          <div key={c.key} className={`rounded-md bg-[#15191E] p-5 border-l-4 ${c.borderColor}`}>
            <div className="flex items-center gap-2 mb-3">
              {c.icon}
              <h4 className="text-[1.1rem] font-bold text-white">{c.title}</h4>
            </div>
            <p className="text-sm leading-relaxed text-[#E8E8E8]">{SAMPLE_REALITY_CHECK[c.key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
