import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  transferable_value: SoloCoreReport["transferable_value"];
}

export default function TransferableValueSection({ transferable_value }: Props) {
  const { what_they_can_sell, why_buyers_would_pay, credibility_assets } = transferable_value;
  return (
    <section>
      <h2 className="report-h2 text-foreground mb-6">What You Can Sell, and Why Buyers Pay</h2>
      <div className="border-t border-border pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#15735F] mb-2">What You Can Sell</h3>
            <p className="text-sm leading-relaxed text-secondary-foreground">{what_they_can_sell}</p>
          </div>
          <div className="md:border-l md:border-border md:pl-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#15735F] mb-2">Why Buyers Would Pay</h3>
            <p className="text-sm leading-relaxed text-secondary-foreground">{why_buyers_would_pay}</p>
          </div>
        </div>
        {credibility_assets && credibility_assets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {credibility_assets.map((asset, i) => (
              <span key={i} className="border border-border px-3 py-1.5 text-xs text-[#15735F]">
                {asset}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
