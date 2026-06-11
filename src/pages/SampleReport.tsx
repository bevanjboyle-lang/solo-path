import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { startTest } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
// Footer import dropped 2026-05-18 (consistency-sweep), App.tsx renders the Footer.
import { useActiveSection } from "@/hooks/useActiveSection";

import HookInsightSection from "@/components/sample-report/HookInsightSection";
import ArchetypeSection from "@/components/sample-report/ArchetypeSection";
import TransferableValueSection from "@/components/sample-report/TransferableValueSection";
import TransferableSkillsSection from "@/components/sample-report/TransferableSkillsSection";
import BusinessPaths from "@/components/sample-report/BusinessPaths";
import RecommendationSection from "@/components/sample-report/RecommendationSection";
import RealityCheckSection from "@/components/sample-report/RealityCheckSection";
import IncomeOutlookSection from "@/components/sample-report/IncomeOutlookSection";
import AIImpactSection from "@/components/sample-report/AIImpactSection";

import type { SoloCoreReport } from "@/types/canonical";
import { SAMPLE_CORE_REPORT } from "@/data/canonicalSampleReport";

/*
 * SampleReport Pass 1 /sample-report v1 (2026-05-18) eighth and final Phase 2 surface
 *
 * Path B: React render through /report's actual section composites using
 * the canonical SAMPLE_CORE_REPORT data. The sample IS the product.
 *
 * Marketing chrome wraps around the report body:
 *   - Sticky warning-tinted sample-strip at the top (persistent per F3).
 *   - TopBar.anonymous + Footer (anon-facing surface).
 *   - Page-header panel with eyebrow + H1 + subhead + meta-block.
 *   - TOC sidebar (legal-page vocabulary, per F5).
 *   - Mid-content conversion strip between #paths and the brief sections
 *     (mint-rule callout, not dark, per F4 + cadence).
 *   - Editorial closing CTA beneath the report body.
 *
 * Locked decisions from admin/pass-1-sample-report-decisions.md:
 *   Path B, React render through /report composites. Sample IS product.
 *   F1, Plan toggle DROPPED entirely for Pass 1. /sample-plan will
 *     be a separate route later.
 *   F2, Sarah's name in H1 renders in heading colour (NOT mint).
 *     Avoids cross-contamination with /teaser's mint-name-as-personal
 *     vocabulary.
 *   F3, Sample-strip persistent, no dismiss.
 *   F4, One mid-content conversion strip (between #paths and briefs).
 *   F5, TOC sidebar kept on desktop.
 *   F6, Labelled as "example profile" (not "synthetic" / "composite" /
 *     "fictional"). Plain language wins.
 *
 * Cadence: zero NEW dark chrome. The dark #ai-impact section inside
 * the rendered report IS the page's cadence moment, same dark surface
 * a buyer would see on /report. Mid-content conversion uses mint-rule
 * callout; closing CTA stays ivory; sample-strip uses warning vocab.
 *
 * Pass 1 scope: full rewrite from iframe pattern to React render.
 * Reuses /report's section composites + the SAMPLE_CORE_REPORT data
 * + the useActiveSection scroll-spy hook.
 *
 * Drops: iframe + view-toggle state + static-HTML samples are now
 * superseded by Path B for the report side. Static samples remain in
 * public/samples/ for /sample-plan future use.
 */

interface SectionMeta {
  id: string;
  label: string;
  numeral: string;
  readTime: string;
  variant: "full" | "brief" | "dark";
}

const SECTION_DEFS: SectionMeta[] = [
  { id: "edge",           label: "Her edge",            numeral: "01", readTime: "≈ 2 min read", variant: "full"  },
  { id: "archetype",      label: "Archetype",           numeral: "02", readTime: "≈ 3 min read", variant: "full"  },
  { id: "sell",           label: "What she can sell",   numeral: "03", readTime: "≈ 3 min read", variant: "brief" },
  { id: "skills",         label: "Transferable skills", numeral: "04", readTime: "≈ 4 min read", variant: "full"  },
  { id: "paths",          label: "Business paths",      numeral: "05", readTime: "5 of 10 shown", variant: "full"  },
  { id: "recommendation", label: "Recommendation",      numeral: "06", readTime: "≈ 2 min read", variant: "brief" },
  { id: "reality",        label: "Reality check",       numeral: "07", readTime: "≈ 5 min read", variant: "brief" },
  { id: "income",         label: "Income outlook",      numeral: "08", readTime: "≈ 3 min read", variant: "full"  },
  { id: "ai",             label: "AI impact",           numeral: "09", readTime: "≈ 4 min read", variant: "dark"  },
];

export default function SampleReport() {
  const navigate = useNavigate();
  const handleStartTest = () => startTest(navigate);

  const coreReport: SoloCoreReport = SAMPLE_CORE_REPORT;

  /* Brief-collapse state per F3 of /report, same pattern */
  const [expandedBriefs, setExpandedBriefs] = useState<Record<string, boolean>>({});
  const toggleBrief = (id: string) => setExpandedBriefs((p) => ({ ...p, [id]: !p[id] }));

  const visibleSections = SECTION_DEFS;
  const sectionIds = visibleSections.map((s) => s.id);
  const activeSectionId = useActiveSection(sectionIds);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative min-h-screen flex flex-col text-foreground">

      {/*
        ── Sample-strip, persistent band (F3).
        ADR-026 Phase 2 (2026-06-11): flattened from the warning-tint
        band to the FT register — ivory strip, hairline bottom rule,
        amber dot as the "sample" marker. Kept sticky-top-0 z-50 so it
        pins above the masthead on scroll.
      */}
      <div
        className="sticky top-0 z-50 border-b border-border bg-[#FAF9F7] px-6 py-1.5 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-x-4 items-baseline"
      >
        <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#A37500" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#D4940A" }} />
          <span>Sample</span>
        </div>
        <div className="text-[12.5px] text-foreground leading-snug">
          <strong>This is Sarah Okafor's report</strong>, not yours. The report is one piece of the £19.99 bundle, alongside her 30-day activation plan, daily check-ins, and the first three guidance modules.
        </div>
        <button
          onClick={handleStartTest}
          className="text-[12px] font-semibold text-foreground underline underline-offset-[3px] decoration-[#A37500] hover:decoration-foreground whitespace-nowrap"
        >
          Find what works, for you →
        </button>
      </div>

      <TopBar />

      <main className="flex-1">
        <section className="pt-6 pb-8 lg:pb-12">
          <div className="mx-auto max-w-screen-lg px-6">

            {/* ── Page header — flat editorial head (ADR-026 Phase 2) ── */}
            <header className="pt-4 pb-8">
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                <span className="eyebrow">Sample report</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="eyebrow eyebrow--muted">Sarah Okafor</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground/70 text-[11px]">example profile</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end">
                <div>
                  <h1 className="title-h1">
                    This is the report part of Sarah's £19.99.
                  </h1>
                  <p className="standfirst mt-4 max-w-[58ch]">
                    A real example, fractional FD path, 11 years in corporate finance. Ten scored business paths with our top recommendations, archetype analysis, AI defensibility. The same £19.99 also bought Sarah a 30-day activation plan built from this report, daily check-ins to track real progress, and the first three guidance modules from the library. Yours would map to your profile; the details would be yours.
                  </p>
                </div>
                <div className="lg:text-right flex lg:flex-col gap-6 lg:gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                      Generated
                    </div>
                    <div className="text-[13px] font-medium text-foreground tabular-nums">17 May 2026</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                      Profile
                    </div>
                    <div className="text-[13px] font-medium text-foreground">FP&amp;A · 11 yrs</div>
                  </div>
                </div>
              </div>
            </header>

            {/* ── Two-column shell: TOC sidebar + report body ── */}
            <div className="flex gap-8 lg:gap-10">

              {/* TOC sidebar, desktop only (F5) — flat hairline-rule list (ADR-026 Phase 2) */}
              <aside className="hidden lg:block w-[220px] shrink-0">
                <div className="sticky top-6 pt-2">
                  <div className="rule-head">Sarah's report</div>
                  <nav aria-label="Report sections">
                    <ul className="flex flex-col">
                      {visibleSections.map((s) => {
                        const isActive = activeSectionId === s.id;
                        return (
                          <li key={s.id} className="border-b border-border">
                            <button
                              type="button"
                              onClick={() => scrollToSection(s.id)}
                              className={`group w-full flex items-baseline gap-3 pl-3 py-2.5 text-left text-[13px] transition-colors border-l-2 ${
                                isActive
                                  ? "border-primary font-semibold text-foreground"
                                  : "border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`shrink-0 text-[10px] font-bold tabular-nums tracking-[0.08em] ${
                                  isActive ? "text-[#15735F]" : "text-muted-foreground/60"
                                }`}
                              >
                                {s.numeral}
                              </span>
                              <span className="truncate">{s.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                  <div className="pt-4 mt-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      Sample
                    </div>
                    <div className="mt-1 text-[12px] text-foreground">9 sections</div>
                  </div>
                </div>
              </aside>

              {/* ── Report body, /report composites ── */}
              <div className="flex-1 min-w-0">
                <h1 className="sr-only">Sample report, Sarah Okafor</h1>

                {/* Render sections, with the mid-content conversion strip inserted after #paths */}
                {visibleSections.map((s) => {
                  const body = renderSectionBody(s.id, coreReport);
                  if (s.variant === "brief") {
                    return (
                      <BriefSection
                        key={s.id}
                        meta={s}
                        expanded={!!expandedBriefs[s.id]}
                        onToggle={() => toggleBrief(s.id)}
                      >
                        {body}
                      </BriefSection>
                    );
                  }
                  if (s.variant === "dark") {
                    return (
                      <DarkSection key={s.id} meta={s}>
                        {body}
                      </DarkSection>
                    );
                  }
                  // Insert mid-content conversion strip after #paths (F4)
                  const node = (
                    <FullSection key={s.id} meta={s}>
                      {body}
                    </FullSection>
                  );
                  if (s.id === "paths") {
                    return (
                      <div key={s.id}>
                        {node}
                        <MidContentConversion onTake={handleStartTest} />
                      </div>
                    );
                  }
                  return node;
                })}

                {/* ── Closing CTA — flat editorial band on a heavy ink rule (ADR-026 Phase 2) ── */}
                <section className="border-t-[3px] border-foreground py-14 sm:py-16 text-center mt-8">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
                    You've seen Sarah's
                  </div>
                  <h3
                    className="font-display text-[28px] sm:text-[34px] lg:text-[36px] font-extrabold tracking-tight leading-[1.1] text-foreground max-w-[20ch] mx-auto mb-4"
                    style={{ letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}
                  >
                    Eight minutes for yours.
                  </h3>
                  <p className="standfirst max-w-[58ch] mx-auto mb-7">
                    Your archetype, your paths, your income outlook, your AI defensibility, plus a 30-day activation plan, daily check-ins, and the first three guidance modules. Built from your answers, not Sarah's. £19.99 after the free preview.
                  </p>
                  <button onClick={handleStartTest} className="cta-block">
                    Find what works
                  </button>
                  <div className="mt-4 text-[11px] text-muted-foreground/70 tracking-[0.04em]">
                    One-time payment · No subscription required · Free preview before you pay
                  </div>
                </section>

              </div>
            </div>
          </div>
        </section>
      </main>

      {/*
        Footer removed from page render 2026-05-18 (consistency-sweep).
        App.tsx renders <Footer /> for /sample-report (it's not in
        FOOTERLESS_ROUTES). The page-level render was producing a duplicate
        dark bar at the bottom, confirmed via DOM `document.querySelectorAll(
        'footer').length === 2`. App.tsx is now the sole Footer authority
        across the app.
      */}
    </div>
  );
}

/* ─────────────────────────── Section dispatch + composites (mirrors /report) ─────────────────────────── */

function renderSectionBody(id: string, coreReport: SoloCoreReport): ReactNode {
  switch (id) {
    case "edge":
      return coreReport.hook_insight ? <HookInsightSection hook_insight={coreReport.hook_insight} /> : null;
    case "archetype":
      return coreReport.archetype ? <ArchetypeSection archetype={coreReport.archetype} /> : null;
    case "sell":
      return coreReport.transferable_value ? <TransferableValueSection transferable_value={coreReport.transferable_value} /> : null;
    case "skills":
      return coreReport.transferable_skills?.length ? <TransferableSkillsSection transferable_skills={coreReport.transferable_skills} /> : null;
    case "paths":
      return coreReport.options?.length ? (
        <BusinessPaths
          options={coreReport.options}
          recommended_selection={coreReport.recommended_selection ?? undefined}
          locked={false}
        />
      ) : null;
    case "recommendation":
      return coreReport.recommendation ? (
        <RecommendationSection
          recommendation={coreReport.recommendation}
          options={coreReport.options}
        />
      ) : null;
    case "reality":
      return coreReport.reality_check ? <RealityCheckSection reality_check={coreReport.reality_check} /> : null;
    case "income":
      return coreReport.income_outlook ? <IncomeOutlookSection income_outlook={coreReport.income_outlook} /> : null;
    case "ai":
      return coreReport.ai_impact ? <AIImpactSection ai_impact={coreReport.ai_impact} /> : null;
    default:
      return null;
  }
}

function SectionHead({
  meta, tone = "default",
}: {
  meta: SectionMeta;
  tone?: "default" | "dark";
}) {
  const labelColour = tone === "dark" ? "text-[#FAF9F7]" : "text-foreground";
  const metaColour = tone === "dark" ? "text-[rgba(250,249,247,0.55)]" : "text-muted-foreground/80";
  const ruleColour = tone === "dark" ? "border-white/10" : "border-border";
  const numeralColour = tone === "dark" ? "text-[#2ECDB0]" : "text-[#15735F]";
  return (
    <div className={`flex items-baseline justify-between gap-4 pb-4 border-b ${ruleColour} mb-6`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
        <span className={`${numeralColour} mr-3 tabular-nums`}>{meta.numeral}</span>
        <span className={labelColour}>{meta.label}</span>
      </div>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${metaColour} tabular-nums shrink-0`}>
        {meta.readTime}
      </div>
    </div>
  );
}

function FullSection({ meta, children }: { meta: SectionMeta; children: ReactNode }) {
  return (
    <section id={meta.id} className="border-t border-border py-8 sm:py-10 scroll-mt-24">
      <SectionHead meta={meta} />
      <div className="prose-serif">{children}</div>
    </section>
  );
}

function BriefSection({
  meta, expanded, onToggle, children,
}: {
  meta: SectionMeta;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const preview = (() => {
    switch (meta.id) {
      case "sell":
        return "Discrete, scoped engagements with a recognised deliverable. Not 'advisory.'";
      case "recommendation":
        return "Where to start, what to hold, what to ignore.";
      case "reality":
        return "What to know before the first client conversation. Most isn't pleasant.";
      default:
        return "Tap to read.";
    }
  })();

  if (expanded) {
    return (
      <section id={meta.id} className="border-t border-border py-8 sm:py-10 scroll-mt-24">
        <SectionHead meta={meta} />
        <div className="prose-serif">{children}</div>
        <div className="mt-6 pt-5 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onToggle}
            className="text-[12px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
          >
            Collapse
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id={meta.id}
      className="border-t border-border py-5 scroll-mt-24"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-baseline justify-between gap-4 sm:gap-8 text-left"
      >
        <div className="flex items-baseline gap-4 flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] shrink-0">
            <span className="text-[#15735F] mr-2 tabular-nums">{meta.numeral}</span>
            <span className="text-foreground">{meta.label}</span>
          </div>
          <span className="text-[14px] text-muted-foreground truncate hidden sm:inline">
            {preview}
          </span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 tabular-nums shrink-0 flex items-center gap-3">
          {meta.readTime}
          <span aria-hidden className="text-muted-foreground">→</span>
        </span>
      </button>
    </section>
  );
}

function DarkSection({ meta, children }: { meta: SectionMeta; children: ReactNode }) {
  return (
    <section id={meta.id} className="panel-dark px-6 sm:px-10 lg:px-12 py-8 sm:py-10 mt-8 scroll-mt-24">
      <SectionHead meta={meta} tone="dark" />
      <div className="prose-serif text-[#FAF9F7]">{children}</div>
    </section>
  );
}

/* ─────────────────────────── Mid-content conversion strip (F4) ─────────────────────────── */

function MidContentConversion({ onTake }: { onTake: () => void }) {
  return (
    <section
      className="my-8 px-6 sm:px-10 py-6 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-4 lg:gap-8 items-center"
      style={{ background: "#F3F1ED", borderLeft: "3px solid #2ECDB0" }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#15735F" }}>
        What you'd get
      </span>
      <p className="standfirst text-[15.5px]">
        <strong>This report is one piece of what £19.99 buys.</strong>{" "}
        It comes with a 30-day activation plan, daily check-ins, and the first three guidance modules, all built around your archetype, your domains, your day-rate band. Eight minutes; pay only after the preview.
      </p>
      <button onClick={onTake} className="cta-block whitespace-nowrap">
        Find what works
      </button>
    </section>
  );
}
