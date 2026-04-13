import { SAMPLE_PORTFOLIO_SUMMARY } from "@/data/sampleReportData";

export default function PortfolioSummarySection() {
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">Your Portfolio at a Glance</h2>
      <div className="rounded-lg bg-[#15191E] border-l-[6px] border-[#2ECDB0] p-6 sm:p-8">
        <h3 className="text-[1.3rem] font-bold text-white mb-3">Your Strategic Approach</h3>
        <p className="text-sm leading-relaxed text-[#E8E8E8] mb-6">{SAMPLE_PORTFOLIO_SUMMARY.strategy}</p>

        <h3 className="text-[1.3rem] font-bold text-white mb-3">How You'll Allocate Your Time</h3>
        <p className="text-sm leading-relaxed text-[#E8E8E8] mb-6">{SAMPLE_PORTFOLIO_SUMMARY.effort_distribution}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SAMPLE_PORTFOLIO_SUMMARY.strands.map((s) => (
            <div key={s.strand_id} className="rounded-md bg-[#0F1117] border border-[#2ECDB0]/40 p-4">
              <p className="text-xs text-muted-foreground mb-1">Strand {s.rank}</p>
              <p className="text-sm font-bold text-[#2ECDB0]">{s.model_name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{Math.round(s.time_weight * 100)}% of effort</p>
              <p className="text-xs text-[#E8E8E8] mt-2">{s.why_included}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
