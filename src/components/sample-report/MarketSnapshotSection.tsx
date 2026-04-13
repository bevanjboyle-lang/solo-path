import GlassCard from "@/components/ui/GlassCard";
import { SAMPLE_MARKET_SNAPSHOT, type MarketItem } from "@/data/sampleReportData";

function SignalDot({ level }: { level: "strong" | "moderate" | "weak" }) {
  const colors = {
    strong: "bg-emerald-500",
    moderate: "bg-amber-400",
    weak: "bg-red-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[level]}`} />;
}

function MarketCard({ item }: { item: MarketItem }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold text-foreground">{item.label}</h4>
        {item.signal && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <SignalDot level={item.signal.level} />
            {item.signal.text}
          </span>
        )}
      </div>
      {item.headline && (
        <p className="text-base font-bold text-foreground mb-1">{item.headline}</p>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
    </div>
  );
}

export default function MarketSnapshotSection() {
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Market Snapshot</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SAMPLE_MARKET_SNAPSHOT.map((item, i) => (
          <MarketCard key={i} item={item} />
        ))}
      </div>
    </GlassCard>
  );
}
