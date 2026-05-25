import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, AlertTriangle, Loader2 } from "lucide-react";
import { GuidanceModule } from "@/data/guidanceModules";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  module: GuidanceModule;
  output: any;
  validationPassed?: boolean;
  moduleAnswers?: Record<string, string>;
  onRegenerated?: (response: any) => void;
  onBack: () => void;
}

const UPPERCASE_TOKENS = new Set([
  "ICO", "IR35", "GDPR", "NHS", "VAT", "FCA", "HMRC", "SOW", "DPA", "CV",
  "PI", "SIPP", "CFA", "CIMA", "CIPD", "CMI", "ICAEW", "IIA", "IRM", "FP&A",
  "ABPI", "GMC", "NMC", "HCPC", "GPhC", "DBS", "CPD", "KPI", "ROI",
]);

function formatHeading(key: string): string {
  const words = key.split("_");
  const formatted = words.map((w, i) => {
    const upper = w.toUpperCase();
    if (UPPERCASE_TOKENS.has(upper)) return upper;
    if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    return w.toLowerCase();
  });
  return formatted.join(" ");
}

function formatPillValue(v: string): string {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v: any): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function RenderValue({ value }: { value: any }) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    return <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-line">{value}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1.5">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-foreground/70 leading-relaxed">
            {typeof item === "string" ? item : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    return (
      <div className="space-y-3">
        {Object.entries(value).map(([k, v]) => {
          if (v === null || v === undefined || v === "") return null;
          return (
            <div key={k}>
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 mb-1">
                {formatHeading(k)}
              </h4>
              <RenderValue value={v} />
            </div>
          );
        })}
      </div>
    );
  }
  return <p className="text-sm text-foreground/70">{String(value)}</p>;
}

function isLegacyV25(output: any): boolean {
  return (
    isPlainObject(output) &&
    "key_insights" in output &&
    !("artefact_summary" in output)
  );
}

// v28 (Option B reconciliation, 2026-05-25): generate-guidance v28 returns a
// canonical ModuleOutputV3 shape — short_version + playbook[] +
// reference_layer_ids[] + check_in_commitment + caveat. Detect by the presence
// of an array `playbook` whose items are objects (vs. the V26Body shape which
// has recommendation/artefact_summary). The fallback V26Body renderer treats
// the playbook array generically and JSON.stringify's each item, which is the
// raw-JSON output the smoke surfaced. V28Body renders each playbook step as
// a structured card and lays out the check-in commitments.
export function isV28(output: any): boolean {
  return (
    isPlainObject(output) &&
    Array.isArray(output.playbook) &&
    output.playbook.length > 0 &&
    isPlainObject(output.playbook[0]) &&
    typeof output.playbook[0].title === "string"
  );
}

export default function GuidanceModuleOutput({
  module,
  output,
  validationPassed,
  moduleAnswers,
  onRegenerated,
  onBack,
}: Props) {
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  if (!output) return null;

  const handleRegenerate = async () => {
    if (!moduleAnswers) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-guidance", {
        body: { module_id: module.id, module_answers: moduleAnswers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onRegenerated?.(data);
    } catch (e: any) {
      setRegenError(e.message || "Could not regenerate. Try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const legacy = isLegacyV25(output);
  const caveat: string | undefined = output?.caveat;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to guidance
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-foreground">{module.name}</h2>
        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px] uppercase tracking-wider">
          <Check className="h-3 w-3 mr-1" /> Completed
        </Badge>
      </div>

      {/* Validation warning */}
      {validationPassed === false && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-amber-800 leading-relaxed">
                This output may be incomplete. Some quality checks did not pass on this generation.
              </p>
              {moduleAnswers && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="h-7 text-xs"
                  >
                    {regenerating ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Regenerating…</>
                    ) : (
                      "Regenerate"
                    )}
                  </Button>
                  {regenError && <p className="text-[11px] text-red-600 mt-1">{regenError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {legacy ? (
        <LegacyV25Body output={output} />
      ) : isV28(output) ? (
        <V28Body output={output} />
      ) : (
        <V26Body output={output} />
      )}

      {/* Caveat */}
      {caveat && (
        <div
          className="mt-6 rounded-lg px-5 py-4"
          style={{ background: "#F5F5F5" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Caveat
          </p>
          <p className="text-sm italic text-foreground/70 leading-relaxed">{caveat}</p>
        </div>
      )}
    </div>
  );
}

function V26Body({ output }: { output: any }) {
  const { recommendation, artefact_summary, caveat, ...rest } = output;

  return (
    <>
      {recommendation && typeof recommendation === "string" && (
        <div className="mb-4">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ background: "#2ECDB0" }}
          >
            {formatPillValue(recommendation)}
          </span>
        </div>
      )}

      {artefact_summary && typeof artefact_summary === "string" && (
        <p className="text-[17px] italic text-muted-foreground leading-relaxed mb-6">
          {artefact_summary}
        </p>
      )}

      {Object.entries(rest).map(([key, value]) => {
        if (value === null || value === undefined || value === "") return null;
        return (
          <div key={key} className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {formatHeading(key)}
            </h3>
            <RenderValue value={value} />
          </div>
        );
      })}
    </>
  );
}

// v28 ModuleOutputV3 renderer. Mirrors the canonical shape from
// supabase/functions/generate-guidance/guidance-output-schemas.ts. Reference
// layer items (reference_layer_ids) are deliberately not surfaced here yet —
// the integer ids alone are not user-readable, and resolving them needs a
// follow-up fetch against the module_reference_items table. Tracked as a
// post-Option-B enrichment item.
export function V28Body({ output }: { output: any }) {
  const shortVersion: string | undefined = output.short_version;
  const playbook: any[] = Array.isArray(output.playbook) ? output.playbook : [];
  const checkIn = output.check_in_commitment;

  return (
    <>
      {shortVersion && (
        <div className="mb-7">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Short version
          </h3>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
            {shortVersion}
          </p>
        </div>
      )}

      {playbook.length > 0 && (
        <div className="mb-7">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Playbook
          </h3>
          <div className="space-y-4">
            {playbook.map((step, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-[hsl(var(--surface-panel))] px-5 py-4"
              >
                {step.title && (
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    {step.title}
                  </h4>
                )}
                {step.personalised_lead && (
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    {step.personalised_lead}
                  </p>
                )}
                <dl className="grid grid-cols-1 gap-3">
                  {([
                    ["what_it_is", "What it is"],
                    ["how", "How"],
                    ["cost", "Cost"],
                    ["pitfall", "Pitfall"],
                    ["what_to_expect_next", "What to expect next"],
                  ] as const).map(([key, label]) => {
                    const val = step[key];
                    if (!val || typeof val !== "string") return null;
                    return (
                      <div key={key}>
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 mb-0.5">
                          {label}
                        </dt>
                        <dd className="text-sm text-foreground/70 leading-relaxed">
                          {val}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      {checkIn && isPlainObject(checkIn) && (
        <div className="mb-7">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            How Solo will follow up
          </h3>
          {typeof checkIn.summary_prose === "string" && checkIn.summary_prose && (
            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              {checkIn.summary_prose}
            </p>
          )}
          {Array.isArray(checkIn.commitments) && checkIn.commitments.length > 0 && (
            <ul className="space-y-2">
              {checkIn.commitments.map((c: any, i: number) => (
                <li
                  key={i}
                  className="text-sm text-foreground/70 leading-relaxed flex items-start gap-2"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span>
                    <span className="font-medium text-foreground">
                      Day {c?.target_day ?? "—"}:
                    </span>{" "}
                    {c?.verification_question || c?.action || ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function LegacyV25Body({ output }: { output: any }) {
  const sections: Array<[string, any]> = [
    ["Key insights", output.key_insights],
    ["Next steps", output.next_steps],
    ["Resources or prompts", output.resources_or_prompts],
  ];
  return (
    <>
      {sections.map(([label, value]) => {
        if (!value) return null;
        return (
          <div key={label} className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {label}
            </h3>
            <RenderValue value={value} />
          </div>
        );
      })}
    </>
  );
}
