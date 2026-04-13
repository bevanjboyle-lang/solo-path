import { Info } from "lucide-react";

export default function SampleBanner() {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 px-5 py-3 flex items-start gap-3">
      <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        This is a sample report for a fictional professional. Your report will be personalised to your specific experience and goals.
      </p>
    </div>
  );
}
