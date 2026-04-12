import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedOverlayProps {
  label?: string;
}

export default function LockedOverlay({ label = "Unlock full report - £19.99" }: LockedOverlayProps) {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-surface-panel/60 backdrop-blur-[1px]">
      <Lock className="h-5 w-5 text-muted-foreground/50" />
      <Button
        size="sm"
        className="rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-[hsl(var(--mint-hover))]"
        onClick={() => navigate("/auth")}
      >
        {label}
      </Button>
    </div>
  );
}
