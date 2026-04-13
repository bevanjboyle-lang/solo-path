import GlassCard from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_OPTIONS, type SampleOption } from "@/data/sampleReportData";

function RatingDot({ rating }: { rating: "good" | "medium" | "hard" }) {
  const colors = {
    good: "bg-emerald-500",
    medium: "bg-amber-400",
    hard: "bg-red-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[rating]}`} />;
}

function OptionCard({ option }: { option: SampleOption }) {
  const isRecommended = option.recommended;
  return (
    <div
      className={`rounded-xl border bg-background/50 p-5 sm:p-6 ${
        isRecommended ? "border-primary/40 border-l-4" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
          style={{ backgroundColor: "#2ECDB0" }}
        >
          {option.rank}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">{option.title}</h3>
        </div>
        {isRecommended && (
          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-widest shrink-0">
            Recommended
          </Badge>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCell label="Day rate" value={option.metrics.day_rate} />
        <MetricCell label="First revenue" value={option.metrics.first_revenue} rating={option.metrics.first_revenue_rating} />
        <MetricCell label="Credibility gap" value={option.metrics.credibility_gap} rating={option.metrics.credibility_gap_rating} />
        <MetricCell label="Sales complexity" value={option.metrics.sales_complexity} rating={option.metrics.sales_complexity_rating} />
      </div>

      {/* What you're selling */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">What you're selling</h4>
        <ul className="space-y-2">
          {option.what_selling.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-muted-foreground pl-3 border-l-2 border-border">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Assessment */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">{option.assessment_title}</h4>
        <ul className="space-y-1.5">
          {option.assessment_points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MetricCell({ label, value, rating }: { label: string; value: string; rating?: "good" | "medium" | "hard" }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground flex items-center gap-1.5">
        {rating && <RatingDot rating={rating} />}
        {value}
      </p>
    </div>
  );
}

export default function OptionsSection() {
  return (
    <GlassCard noHover className="p-6 sm:p-8">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your Options</h2>
      <div className="space-y-5">
        {SAMPLE_OPTIONS.map((o) => (
          <OptionCard key={o.rank} option={o} />
        ))}
      </div>
    </GlassCard>
  );
}
