import { SAMPLE_TRANSFERABLE_VALUE } from "@/data/sampleReportData";

export default function TransferableValueSection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">What You Can Sell — and Why Buyers Pay</h2>
      <div className="rounded-lg bg-[#15191E] border border-[#2ECDB0]/40 p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#2ECDB0] mb-2">What You Can Sell</h3>
            <p className="text-sm leading-relaxed text-[#E8E8E8]">{SAMPLE_TRANSFERABLE_VALUE.what_they_can_sell}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#2ECDB0] mb-2">Why Buyers Would Pay</h3>
            <p className="text-sm leading-relaxed text-[#E8E8E8]">{SAMPLE_TRANSFERABLE_VALUE.why_buyers_would_pay}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TRANSFERABLE_VALUE.credibility_assets.map((asset, i) => (
            <span key={i} className="rounded-md border border-[#2ECDB0]/30 bg-[#2ECDB0]/10 px-3 py-1.5 text-xs text-[#2ECDB0]">
              {asset}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
