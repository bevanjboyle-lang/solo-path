import type { SoloCoreReport } from "@/types/canonical";

interface Props {
  ai_impact: SoloCoreReport["ai_impact"];
}

/*
 * Sprint 3 (2026-08-18): the dark-band grammar reconciled. This section
 * renders inside the report's single ink band on both /report and
 * /sample-report, but its internals were still light bg-card boxes with
 * pastel Tailwind badges floating on the dark panel, the exact mismatch
 * the elevation audit named. It now speaks the landing dark-exhibit
 * language: content directly on the ink, ivory text at two opacities,
 * hairlines at reduced opacity, serif display numerals for the
 * adaptation steps, and risk chips redrawn for the dark register
 * (tinted text + hairline border, no pastel fills). Copy and data
 * untouched.
 */

const IVORY = "#FAF9F7";
const IVORY_78 = "rgba(250,249,247,.78)";
const IVORY_60 = "rgba(250,249,247,.6)";
const HAIRLINE = "rgba(250,249,247,.16)";

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles: Record<string, React.CSSProperties> = {
    low: { color: "#7FE6CF", borderColor: "rgba(46,205,176,.45)" },
    medium: { color: "#FCD34D", borderColor: "rgba(252,211,77,.4)" },
    high: { color: "#FCA5A5", borderColor: "rgba(252,165,165,.45)" },
  };
  return (
    <span
      className="inline-block border px-3 py-1 text-xs font-bold uppercase tracking-wider"
      style={styles[level]}
    >
      {level} risk
    </span>
  );
}

export default function AIImpactSection({ ai_impact }: Props) {
  const ai = ai_impact;
  return (
    <section>
      <h2 className="report-h2" style={{ color: IVORY }}>AI &amp; Your Future</h2>

      {/* Part 1 — How AI is affecting your current role */}
      <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <h3 className="text-[18px] font-bold mb-3" style={{ color: IVORY }}>
          How AI is Affecting Your Current Role
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <RiskBadge level={ai.part_1.displacement_risk} />
          <span className="text-sm" style={{ color: IVORY_60 }}>
            Risk horizon: {ai.part_1.risk_horizon}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: IVORY_78 }}>{ai.part_1.content}</p>
      </div>

      {/* Part 2 — AI resilience of your Plan B */}
      <div className="mt-7 pt-6" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <h3 className="text-[18px] font-bold mb-3" style={{ color: IVORY }}>
          AI Resilience of Your Plan B
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: IVORY_78 }}>{ai.part_2.content}</p>
      </div>

      {/* Part 3 — Adaptation steps: serif display numerals, the dark
        * exhibit's signature, in place of the old rounded pills. */}
      <div className="mt-7 pt-6" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
        <h3 className="text-[18px] font-bold mb-5" style={{ color: IVORY }}>
          Your Adaptation Path: What to Do Next
        </h3>
        <div className="space-y-6">
          {ai.part_3.steps.map((step) => (
            <div key={step.priority} className="flex gap-5">
              <span
                className="font-display shrink-0 text-[30px] font-bold leading-none tabular-nums"
                style={{ color: "#2ECDB0" }}
              >
                {step.priority}
              </span>
              <div className="pt-[3px]">
                <p className="text-sm font-semibold leading-relaxed" style={{ color: IVORY }}>
                  {step.action}
                </p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: IVORY_60 }}>
                  {step.rationale}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
