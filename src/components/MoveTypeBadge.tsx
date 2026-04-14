import { Badge } from "@/components/ui/badge";

export const moveTypeStyles: Record<string, { bg: string; label: string }> = {
  leverage: { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Leverage" },
  moonshot: { bg: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Moonshot" },
  anchor: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Anchor" },
  growth: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Growth" },
  pivot: { bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "Pivot" },
};

export default function MoveTypeBadge({ moveType }: { moveType: string | undefined | null }) {
  if (!moveType || !moveTypeStyles[moveType]) return null;
  const style = moveTypeStyles[moveType];
  return (
    <Badge className={`text-[10px] px-2 py-0.5 border ${style.bg}`}>
      {style.label}
    </Badge>
  );
}
