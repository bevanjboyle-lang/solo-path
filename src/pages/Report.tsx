import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isDevBypass } from "@/lib/devBypass";
import { navigateAuthed, startTest } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import SoloLogo from "@/components/SoloLogo";
import Banner from "@/components/Banner";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { useToast } from "@/hooks/use-toast";
import { useActiveSection } from "@/hooks/useActiveSection";
import RefineReportPanel from "@/components/plan/RefineReportPanel";

import HookInsightSection from "@/components/sample-report/HookInsightSection";
import ArchetypeSection from "@/components/sample-report/ArchetypeSection";
import TransferableValueSection from "@/components/sample-report/TransferableValueSection";
import TransferableSkillsSection from "@/components/sample-report/TransferableSkillsSection";
import BusinessPaths from "@/components/sample-report/BusinessPaths";
import RecommendationSection from "@/components/sample-report/RecommendationSection";
import RealityCheckSection from "@/components/sample-report/RealityCheckSection";
import IncomeOutlookSection from "@/components/sample-report/IncomeOutlookSection";
import AIImpactSection from "@/components/sample-report/AIImpactSection";

import type { SoloCoreReport, ReportRow } from "@/types/canonical";
import { SAMPLE_CORE_REPORT } from "@/data/canonicalSampleReport";
import {
  fetchLatestEvidenceRefresh,
  formatRefreshDate,
  buildDevRefresh,
  type EvidenceRefresh,
} from "@/lib/evidenceRefresh";

/*
 * Report Pass 1 /report v1 (2026-05-18) first Phase 2 surface
 *
 * Editorial reskin of the full unlocked report. Two-column app shell
 * inheriting /plan (AreaSidebar + flexible main column). 9 sections in
 * canonical order, each on its own ivory panel, except the dark #ai
 * section at the bottom which is the screen's single dark moment per
 * cadence rule v1.4 §8.
 *
 * Locked decisions from admin/pass-1-report-decisions.md:
 *   F1, Report added to TopBar.authed centre nav (Plan · Report ·
 *        Library · Account · Sign out).
 *   F2, Page-header H1 sources from archetype name, falls back to
 *        "Your Plan B Report" if missing.
 *   F3, Brief-collapse for Sell, Recommendation, Reality sections:
 *        single-row preview, click to expand to full content in place.
 *   F4, Page-header CTAs: secondary button "Download as PDF" +
 *        tertiary text link "Refine your report". Different weights
 *        match different frequencies of use.
 *   F5, Body prose in Source Serif 4 (real exception to the locked
 *        two-typeface rule). Scoped to .prose-serif p inside section
 *        bodies. Everything else stays sans.
 *   F6, Drop cap on the first paragraph of #edge. The page's one
 *        typographic flourish.
 *   F7, Business Paths as stacked list, not chart. Existing
 *        BusinessPaths composite handles the rendering.
 *
 *   Cadence: one dark section, #ai-impact at the bottom of the read.
 *   Closing weight, not mid-scroll interruption. Per v1.4 §8.
 *
 * Pass 1 scope: shell + chrome + sidebar + page-header + section heads
 * + brief-collapse + dark wrapper + serif + drop cap. Internal section
 * composites (HookInsightSection, ArchetypeSection, BusinessPaths, etc.)
 * preserved as-is, Phase 2 of Phase 2 may reskin them.
 *
 * Drops framer-motion. Editorial register lands instantly per the spine
 * precedent. Preserves: data fetch, refinement state + limit, PDF export,
 * scroll-spy via useActiveSection, RefineReportPanel drawer.
 */

interface SectionMeta {
  id: string;
  label: string;
  numeral: string;
  readTime: string;
  // 'brief' = collapsed by default (Sell, Recommendation, Reality)
  // 'full'  = always expanded
  // 'dark'  = always expanded, dark-section wrapper
  variant: "full" | "brief" | "dark";
}

const SECTION_DEFS: SectionMeta[] = [
  { id: "edge",           label: "Your edge",             numeral: "01", readTime: "≈ 2 min read", variant: "full"  },
  { id: "archetype",      label: "Archetype",             numeral: "02", readTime: "≈ 3 min read", variant: "full"  },
  { id: "sell",           label: "What you can sell",     numeral: "03", readTime: "≈ 3 min read", variant: "brief" },
  { id: "skills",         label: "Transferable skills",   numeral: "04", readTime: "≈ 4 min read", variant: "full"  },
  { id: "paths",          label: "The paths that fit",    numeral: "05", readTime: "your options", variant: "full"  },
  { id: "recommendation", label: "Recommendation",        numeral: "06", readTime: "≈ 2 min read", variant: "brief" },
  { id: "reality",        label: "Reality check",         numeral: "07", readTime: "≈ 5 min read", variant: "brief" },
  { id: "income",         label: "Income outlook",        numeral: "08", readTime: "≈ 3 min read", variant: "full"  },
  { id: "ai",             label: "AI impact",             numeral: "09", readTime: "≈ 4 min read", variant: "dark"  },
];

export default function Report() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reportId, setReportId] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<ReportRow["status"] | null>(null);
  const [coreReport, setCoreReport] = useState<SoloCoreReport | null>(null);
  const [refinementCount, setRefinementCount] = useState(0);
  const [refineLimitReached, setRefineLimitReached] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // Brief-collapse state per section (F3), defaults all to collapsed; user can expand any.
  const [expandedBriefs, setExpandedBriefs] = useState<Record<string, boolean>>({});
  // Phase D: this week's evidence refresh overlay (weekly-heartbeat).
  const [refresh, setRefresh] = useState<EvidenceRefresh | null>(null);

  /* ─── Load report ─── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (isDevBypass()) {
        setReportId("dev-bypass-sample");
        setReportStatus("complete");
        setCoreReport(SAMPLE_CORE_REPORT);
        setRefresh(buildDevRefresh(SAMPLE_CORE_REPORT));
        setLoading(false);
        return;
      }
      navigate("/auth?redirect=/report", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("reports")
          .select("id, status, core_report")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        if (!data) {
          setLoading(false);
          return;
        }
        setReportId(data.id as string);
        setReportStatus(data.status as ReportRow["status"]);
        const cr = (data.core_report as SoloCoreReport | null) ?? null;
        setCoreReport(cr);
        const rc = Number(((cr as unknown) as Record<string, unknown>)?.refinement_count as number) || 0;
        setRefinementCount(rc);
        if (rc >= 3) setRefineLimitReached(true);
        setLoading(false);
        // Phase D: overlay this week's evidence refresh, non-blocking. A
        // dossier with no refresh row renders exactly as before.
        if (data.status === "complete") {
          fetchLatestEvidenceRefresh(data.id as string).then((r) => {
            if (!cancelled && r) setRefresh(r);
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Report: fetch failed", err);
        setLoadError(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  /* ─── Visible sections (filter SECTION_DEFS by data presence) ─── */
  const visibleSections = useMemo(() => {
    if (!coreReport) return [] as SectionMeta[];
    return SECTION_DEFS.filter((s) => {
      switch (s.id) {
        case "edge": return !!coreReport.hook_insight;
        case "archetype": return !!coreReport.archetype;
        case "sell": return !!coreReport.transferable_value;
        case "skills": return !!coreReport.transferable_skills?.length;
        case "paths": return !!coreReport.options?.length;
        case "recommendation": return !!coreReport.recommendation;
        case "reality": return !!coreReport.reality_check;
        case "income": return !!coreReport.income_outlook;
        case "ai": return !!coreReport.ai_impact;
        default: return false;
      }
    });
  }, [coreReport]);

  /* ─── Word count estimate for sidebar footer ─── */
  const wordCount = useMemo(() => {
    if (!coreReport) return 0;
    const text = JSON.stringify(coreReport);
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.round(words / 50) * 50; // round to nearest 50 for a cleaner display number
  }, [coreReport]);

  const activeSectionId = useActiveSection(visibleSections.map((s) => s.id));

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleBrief = useCallback((id: string) => {
    setExpandedBriefs((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openRefinePanel = useCallback(() => {
    if (refineLimitReached || refinementCount >= 3) return;
    setRefineOpen(true);
  }, [refineLimitReached, refinementCount]);

  const handleRefined = useCallback((updatedReport: unknown, newCount: number) => {
    const r = updatedReport as { core_report?: SoloCoreReport } | null;
    if (r?.core_report) setCoreReport(r.core_report);
    setRefinementCount(newCount);
    if (newCount >= 3) setRefineLimitReached(true);
  }, []);

  const exportPdf = useCallback(async () => {
    if (!reportId || exportingPdf) return;
    setExportingPdf(true);
    setPdfError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No auth session");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-pdf`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `Solo-Report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Report exportPdf error", err);
      setPdfError("Couldn't generate PDF. Please try again.");
      setTimeout(() => setPdfError(null), 5000);
    } finally {
      setExportingPdf(false);
    }
  }, [reportId, exportingPdf]);

  /* ─── Sidebar items (above conditional returns per Rules of Hooks) ─── */
  const sidebarItems: SidebarItem[] = visibleSections.map((s) => ({
    id: s.id,
    label: s.label,
    onClick: () => scrollToSection(s.id),
    isActive: activeSectionId === s.id,
    // Numeral renders as a small mint-coloured prefix per F3 of the AreaSidebar v1.3 update.
    // The AreaSidebar component renders the numeral when present on the item.
    numeral: s.numeral,
  } as SidebarItem & { numeral?: string }));

  const sidebarHead: ReactNode = (
    <span>Your report</span>
  );

  const sidebarFooter: ReactNode = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Report
      </div>
      <div className="mt-1 text-[12px] text-foreground">
        {visibleSections.length} sections{wordCount > 0 ? ` · ~${wordCount.toLocaleString()} words` : ""}
      </div>
    </>
  );

  /* ─── Early returns ─── */

  if (loadError) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main>
          <section className="py-10 lg:py-14">
            <div className="mx-auto max-w-3xl px-6">
              <Banner variant="error">
                We couldn't load your report. Try refreshing, or contact support if this keeps happening.
              </Banner>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main>
          <section className="py-12">
            <div className="mx-auto max-w-3xl px-6 flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-[13px]">Loading your report…</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!coreReport) {
    return (
      <div className="relative min-h-screen text-foreground">
        <TopBar />
        <main>
          <section className="py-12 lg:py-20">
            <div className="mx-auto max-w-[640px] px-6">
              <div className="eyebrow mb-5">No report yet</div>
              <h1 className="title-h1">
                No report yet.
              </h1>
              <p className="standfirst mt-4">
                Complete the test to generate yours. About eight minutes; you'll see your warmest path inside the first read.
              </p>
              <div className="mt-7 flex flex-col items-start gap-3 border-t border-border pt-7">
                <button
                  type="button"
                  onClick={() => startTest(navigate)}
                  className="cta-block"
                >
                  Find what works →
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors"
                >
                  Go back home
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ─── Page-header H1 source per F2 ─── */
  const archetypeName = (coreReport.archetype as { name?: string } | null)?.name;
  const h1Title = archetypeName ? `${archetypeName}.` : "Your Plan B Report.";
  const subhead =
    (coreReport.archetype as { short_description?: string; description?: string } | null)
      ?.short_description ||
    (coreReport.archetype as { short_description?: string; description?: string } | null)
      ?.description ||
    "Your full analysis. Read in any order; the sidebar tracks where you are.";
  // Phase D recency: when the weekly heartbeat has refreshed this dossier,
  // the header says so with the date; otherwise the old quiet placeholder.
  const updatedStamp = refresh ? formatRefreshDate(refresh.weekStart) : null;

  /* ─── Render ─── */
  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <MobileWayfinder
        sections={visibleSections}
        activeId={activeSectionId}
        onSelect={scrollToSection}
      />

      <main>
        <section className="pt-6 pb-8 lg:pb-12">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">{/* Sprint 1: mobile shell fix */}
              <AreaSidebar
                items={sidebarItems}
                head={sidebarHead}
                footer={sidebarFooter}
              />

              <div className="flex-1 min-w-0">
                <h1 className="sr-only">{h1Title}</h1>

                {/* ─── Page header — flat editorial head (ADR-026 Phase 4) ─── */}
                <header className="pt-2 pb-8">
                  <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                    <span className="eyebrow">Your Plan B report</span>
                    <span className="text-muted-foreground/40">·</span>
                    {updatedStamp ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#15735F]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                        Updated {updatedStamp}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70 text-[11px]">
                        drafted recently
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
                    <div className="lg:col-span-8">
                      <div aria-hidden className="title-h1">
                        {h1Title}
                      </div>
                      <p className="standfirst mt-4 max-w-2xl">
                        {subhead}
                      </p>
                    </div>

                    <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={exportPdf}
                          disabled={exportingPdf}
                          className="cta-block--outline transition-colors"
                        >
                          {exportingPdf ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Preparing…
                            </span>
                          ) : (
                            "Download full PDF"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={openRefinePanel}
                          disabled={refineLimitReached || refinementCount >= 3}
                          className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Refine your report
                        </button>
                      </div>
                      {(refineLimitReached || refinementCount >= 3) && (
                        <p className="text-[11px] text-muted-foreground">Refinement limit reached.</p>
                      )}
                      {pdfError && (
                        <p className="text-[11px] text-red-600">{pdfError}</p>
                      )}
                    </div>
                  </div>
                </header>

                {/* ─── Sections, render in canonical order ─── */}
                {visibleSections.map((s) => {
                  if (s.variant === "brief") {
                    return (
                      <BriefSection
                        key={s.id}
                        meta={s}
                        expanded={!!expandedBriefs[s.id]}
                        onToggle={() => toggleBrief(s.id)}
                      >
                        {renderSectionBody(s.id, coreReport, refresh)}
                      </BriefSection>
                    );
                  }
                  if (s.variant === "dark") {
                    return (
                      <DarkSection key={s.id} meta={s}>
                        {renderSectionBody(s.id, coreReport, refresh)}
                      </DarkSection>
                    );
                  }
                  return (
                    <FullSection key={s.id} meta={s} dropCap={s.id === "edge"}>
                      {renderSectionBody(s.id, coreReport, refresh)}
                    </FullSection>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {reportId && (
        <RefineReportPanel
          open={refineOpen}
          onOpenChange={setRefineOpen}
          reportId={reportId}
          refinementCount={refinementCount}
          onRefined={handleRefined}
          onLimitReached={() => setRefineLimitReached(true)}
          onToast={(message) => toast({ title: message })}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Mobile wayfinder ───────────────────────────
 * Sprint 2: sticky current-section strip on <lg with a progress hairline;
 * tapping opens the full section list. Desktop keeps AreaSidebar. */

function MobileWayfinder({
  sections,
  activeId,
  onSelect,
}: {
  sections: SectionMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (sections.length === 0) return null;
  const idx = Math.max(0, sections.findIndex((s) => s.id === activeId));
  const current = sections[idx];
  const progress = ((idx + 1) / sections.length) * 100;
  return (
    <div className="wayfinder lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-6 py-2.5 text-left"
      >
        <span className="text-[10px] font-semibold tabular-nums text-[#15735F]">
          {current.numeral}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground">
          {current.label}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {idx + 1} / {sections.length}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className="h-[2px] bg-[#ECEAE4]">
        <div
          className="h-full bg-[#2ECDB0] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto border-t border-border bg-[#FAF9F7]">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.id);
                setOpen(false);
              }}
              className={`flex w-full items-baseline gap-3 border-b border-border/60 px-6 py-3 text-left ${
                s.id === activeId ? "bg-surface-mint-tint" : ""
              }`}
            >
              <span className="text-[10px] font-semibold tabular-nums text-[#15735F]">
                {s.numeral}
              </span>
              <span className="flex-1 text-[13px] font-medium text-foreground">{s.label}</span>
              <span className="text-[10.5px] text-muted-foreground">{s.readTime}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Section-body dispatch ─────────────────────────── */

function renderSectionBody(
  id: string,
  coreReport: SoloCoreReport,
  refresh?: EvidenceRefresh | null,
): ReactNode {
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
          refreshedEvidence={refresh?.byOption}
          refreshWeekStart={refresh?.weekStart}
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

/* ─────────────────────────── Section head ─────────────────────────── */

function SectionHead({
  meta,
  tone = "default",
}: {
  meta: SectionMeta;
  tone?: "default" | "dark";
}) {
  const labelColour = tone === "dark" ? "text-[#FAF9F7]" : "text-foreground";
  const metaColour = tone === "dark" ? "text-[rgba(250,249,247,0.55)]" : "text-muted-foreground/80";
  const ruleColour = tone === "dark" ? "border-white/10" : "border-border";
  const numColour = tone === "dark" ? "text-[#2ECDB0]" : "text-[#15735F]";
  return (
    <div className={`flex items-baseline justify-between gap-4 pb-4 border-b ${ruleColour} mb-6`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
        <span className={`${numColour} mr-3 tabular-nums`}>{meta.numeral}</span>
        <span className={labelColour}>{meta.label}</span>
      </div>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${metaColour} tabular-nums shrink-0`}>
        {meta.readTime}
      </div>
    </div>
  );
}

/* ─────────────────────────── Full section (ivory) ─────────────────────────── */

function FullSection({
  meta,
  dropCap = false,
  children,
}: {
  meta: SectionMeta;
  dropCap?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={meta.id} className="border-t border-border py-8 sm:py-10 scroll-mt-24">
      <SectionHead meta={meta} />
      {/*
       * Body wrapped in .prose-serif per F5. Internal section composites
       * render their own H2/lede/structure in sans (the component's own
       * styling); the serif scopes to <p> tags inside .prose-serif.
       * The drop-cap (per F6) is applied via the .has-dropcap class
       * on the wrapper, the index.css rule targets the first <p>
       * inside that wrapper at any nesting depth.
       */}
      <div className={`prose-serif ${dropCap ? "has-dropcap" : ""}`}>
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────────── Brief section (collapse / expand) ─────────────────────────── */

function BriefSection({
  meta,
  expanded,
  onToggle,
  children,
}: {
  meta: SectionMeta;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  // One-line preview text per section. The canonical ledes live inside the
  // sample-report section components; we use generic but on-tone fallbacks here
  // since the brief preview shouldn't depend on the section's internal copy.
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
        <div className="prose-serif">
          {children}
        </div>
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

/* ─────────────────────────── Dark section (panel-dark, the cadence moment) ─────────────────────────── */

function DarkSection({
  meta,
  children,
}: {
  meta: SectionMeta;
  children: ReactNode;
}) {
  return (
    <section
      id={meta.id}
      className="panel-dark px-6 sm:px-10 lg:px-12 py-8 sm:py-10 mt-8 scroll-mt-24"
    >
      <SectionHead meta={meta} tone="dark" />
      {/*
       * Internal sample-report sections render in their own colours; for the
       * dark wrapper to read as dark we'd need to either rewrite the
       * AIImpactSection internal styling (deferred to Phase 2 per the scope
       * decision) or override colours here. For Pass 1 we wrap the existing
       * component as-is; the section header + panel background carry the
       * dark moment, and the internal content reads in its existing chrome.
       * Phase 2 will reskin AIImpactSection for the dark variant.
       */}
      <div className="prose-serif text-[#FAF9F7]">
        {children}
      </div>
    </section>
  );
}
