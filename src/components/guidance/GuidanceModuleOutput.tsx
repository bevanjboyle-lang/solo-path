import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { GuidanceModule } from "@/data/guidanceModules";

interface Props {
  module: GuidanceModule;
  output: any;
  onBack: () => void;
}

function toTitleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GuidanceModuleOutput({ module, output, onBack }: Props) {
  if (!output) return null;

  const { recommendation, caveat, useful_links, ...rest } = output;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guidance
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white">{module.name}</h2>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider">
          <Check className="h-3 w-3 mr-1" /> Completed
        </Badge>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 px-5 py-4 mb-6">
          <p className="text-primary font-semibold text-[15px] leading-relaxed">{recommendation}</p>
        </div>
      )}

      {/* Dynamic sections */}
      {Object.entries(rest).map(([key, value]) => {
        if (key === "useful_links") return null;
        return (
          <div key={key} className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
              {toTitleCase(key)}
            </h3>
            {Array.isArray(value) ? (
              <ol className="list-decimal list-inside space-y-1.5">
                {(value as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-white/70 leading-relaxed">{item}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-white/70 leading-relaxed">{String(value)}</p>
            )}
          </div>
        );
      })}

      {/* Useful links */}
      {useful_links && Array.isArray(useful_links) && useful_links.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            Useful Links
          </h3>
          <div className="flex flex-col gap-2">
            {useful_links.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Caveat */}
      {caveat && (
        <div className="rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3 mt-6">
          <p className="text-xs text-white/30 italic">{caveat}</p>
        </div>
      )}
    </div>
  );
}
