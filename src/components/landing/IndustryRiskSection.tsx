import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const industries = [
  { name: "Legal", risk: "HIGH RISK" as const, verdict: "Document review, compliance research, and contract drafting are being automated at scale. Law firms are already cutting research teams." },
  { name: "Financial Services & Accounting", risk: "HIGH RISK" as const, verdict: "AI handles bookkeeping, tax prep, and financial analysis faster and cheaper. Goldman Sachs projects up to 200,000 Wall Street roles cut in five years." },
  { name: "Marketing & Advertising", risk: "HIGH RISK" as const, verdict: "Content creation, market research, campaign reporting — all compressible. Mid-level marketing roles are disappearing first." },
  { name: "Middle Management", risk: "MEDIUM RISK" as const, verdict: "Coordination and reporting roles are vulnerable. 20% of organisations are already using AI to flatten hierarchies." },
  { name: "HR & Recruitment", risk: "MEDIUM RISK" as const, verdict: "CV screening, onboarding, policy drafting, and job matching are increasingly automated. The administrative core of HR is under pressure." },
  { name: "Consulting & Strategy", risk: "WATCH" as const, verdict: "Research and slide production are being automated, but senior advisory relationships remain human — for now." },
];

const riskStyles = {
  "HIGH RISK": "bg-destructive/20 text-destructive border-destructive/30",
  "MEDIUM RISK": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "WATCH": "bg-muted text-muted-foreground border-border",
};

export default function IndustryRiskSection() {
  return (
    <section className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          className="mb-16 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Industry Risk
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Which industries are being hit first?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            AI isn't disrupting every profession at the same pace. Here's where the pressure is greatest right now.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.name}
              className="rounded-xl border border-border/60 bg-card p-5"
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: "-60px" }} custom={i}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{ind.name}</h3>
                <Badge variant="outline" className={`shrink-0 text-[10px] font-semibold ${riskStyles[ind.risk]}`}>
                  {ind.risk}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{ind.verdict}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs italic text-muted-foreground">
          Sources: Anthropic (2026), Goldman Sachs, World Economic Forum Future of Jobs Report 2025.
        </p>
      </div>
    </section>
  );
}
