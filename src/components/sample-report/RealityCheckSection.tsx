import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_REALITY_CHECK } from "@/data/sampleReportData";

function TypeDot({ type }: { type: "caution" | "positive" | "neutral" }) {
  const styles = {
    caution: "bg-amber-400",
    positive: "bg-emerald-500",
    neutral: "bg-muted-foreground/40",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 mt-0.5 ${styles[type]}`} />;
}

export default function RealityCheckSection() {
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Reality Check</h2>
      <div className="space-y-5">
        {SAMPLE_REALITY_CHECK.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <TypeDot type={item.type} />
            <div>
              <h4 className="text-sm font-semibold text-foreground">{item.label}</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
