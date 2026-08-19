/*
 * EditorialLoading — Sprint 3 (2026-08-18): the art-directed loading
 * state. Built from the system's own parts per the elevation plan:
 * rule-head eyebrow, mint numeral, one specimen line in the serif
 * voice, and three hairlines carrying a slow mint sweep in place of a
 * spinner. Loading stops being a void and starts being the product's
 * own typography warming up.
 *
 * Usage: <EditorialLoading label="Your report" line="Assembling the sections…" />
 */

interface Props {
  /** Small-caps eyebrow, e.g. "Your report". */
  label: string;
  /** One specimen line under the eyebrow, e.g. "Assembling the sections…". */
  line: string;
  /** Mint numeral beside the eyebrow. Defaults to "01". */
  numeral?: string;
}

export default function EditorialLoading({ label, line, numeral = "01" }: Props) {
  return (
    <div className="mx-auto w-full max-w-[520px] px-6 py-16" role="status" aria-live="polite">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
        <span className="mr-2 tabular-nums text-[#15735F]">{numeral}</span>
        <span className="text-foreground">{label}</span>
      </div>
      <p className="prose-serif mt-3 text-[15px] leading-relaxed text-muted-foreground">
        {line}
      </p>
      <div className="mt-6 space-y-3" aria-hidden>
        <div className="load-hairline" />
        <div className="load-hairline w-[82%]" style={{ "--sweep-delay": "180ms" } as React.CSSProperties} />
        <div className="load-hairline w-[64%]" style={{ "--sweep-delay": "360ms" } as React.CSSProperties} />
      </div>
    </div>
  );
}
