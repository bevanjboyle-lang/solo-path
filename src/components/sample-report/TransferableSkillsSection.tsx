import { Progress } from "@/components/ui/progress";
import type { SoloCoreReport } from "@/types/canonical";

type Skill = SoloCoreReport["transferable_skills"][number];

interface Props {
  transferable_skills: SoloCoreReport["transferable_skills"];
}

function DemandDot({ demand }: { demand: "high" | "medium" | "low" }) {
  const colors = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-muted-foreground/50" };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[demand]}`} />
      <span className="text-[10px] text-muted-foreground capitalize">{demand}</span>
    </div>
  );
}

function SkillBar({ skill }: { skill: Skill }) {
  return (
    <div className="rounded-md bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">{skill.skill_name}</span>
        <div className="flex items-center gap-3">
          <DemandDot demand={skill.market_demand} />
          <span className="text-sm font-bold text-primary">{skill.strength}/100</span>
        </div>
      </div>
      <Progress
        value={skill.strength}
        aria-label={`${skill.skill_name}: strength ${skill.strength} out of 100`}
        className="h-2 bg-muted [&>div]:bg-primary"
      />
      <p className="mt-2 text-xs text-muted-foreground">{skill.evidence}</p>
    </div>
  );
}

export default function TransferableSkillsSection({ transferable_skills }: Props) {
  const sorted = [...(transferable_skills ?? [])].sort((a, b) => b.strength - a.strength);
  return (
    <section>
      <h2 className="text-[1.8rem] font-bold text-foreground mb-6">Your Transferable Skills</h2>
      <div className="space-y-4">
        {sorted.map((s) => <SkillBar key={s.skill_name} skill={s} />)}
      </div>
    </section>
  );
}
