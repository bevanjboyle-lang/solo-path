import { SAMPLE_TRANSFERABLE_SKILLS, type TransferableSkill } from "@/data/sampleReportData";
import { Progress } from "@/components/ui/progress";

function DemandDot({ demand }: { demand: "high" | "medium" | "low" }) {
  const colors = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-[#9CA3AF]" };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[demand]}`} />
      <span className="text-[10px] text-muted-foreground capitalize">{demand}</span>
    </div>
  );
}

function SkillBar({ skill }: { skill: TransferableSkill }) {
  return (
    <div className="rounded-md bg-[#15191E] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{skill.skill_name}</span>
        <div className="flex items-center gap-3">
          <DemandDot demand={skill.market_demand} />
          <span className="text-sm font-bold text-[#2ECDB0]">{skill.strength}/100</span>
        </div>
      </div>
      <Progress value={skill.strength} className="h-2 bg-[#3B4252] [&>div]:bg-[#2ECDB0]" />
      <p className="mt-2 text-xs text-muted-foreground">{skill.evidence}</p>
    </div>
  );
}

export default function TransferableSkillsSection() {
  const sorted = [...SAMPLE_TRANSFERABLE_SKILLS].sort((a, b) => b.strength - a.strength);
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-white mb-6">Your Transferable Skills</h2>
      <div className="space-y-4">
        {sorted.map((s) => <SkillBar key={s.skill_name} skill={s} />)}
      </div>
    </section>
  );
}
