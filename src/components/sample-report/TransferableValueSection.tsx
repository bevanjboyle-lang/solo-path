import { SAMPLE_TRANSFERABLE_VALUE } from "@/data/sampleReportData";

export default function TransferableValueSection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">What You Can Sell — and Why Buyers Pay</h2>
      <div className="rounded-lg bg-card border border-primary/40 p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">What You Can Sell</h3>
            <p className="text-sm leading-relaxed text-secondary-foreground">{SAMPLE_TRANSFERABLE_VALUE.what_they_can_sell}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Why Buyers Would Pay</h3>
            <p className="text-sm leading-relaxed text-secondary-foreground">{SAMPLE_TRANSFERABLE_VALUE.why_buyers_would_pay}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TRANSFERABLE_VALUE.credibility_assets.map((asset, i) => (
            <span key={i} className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
              {asset}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
