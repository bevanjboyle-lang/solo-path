import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isDevBypass } from "@/lib/devBypass";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { Button } from "@/components/ui/button";
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

  // ── Load report ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (isDevBypass()) {
        setReportId("dev-bypass-sample");
        setReportStatus("complete");
        setCoreReport(SAMPLE_CORE_REPORT);
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

  // ── Section ids that actually have data ──
  const visibleSections = useMemo(() => {
    if (!coreReport) return [] as { id: string; label: string }[];
    const present: { id: string; label: string }[] = [];
    if (coreReport.hook_insight) present.push({ id: "edge", label: "Your edge" });
    if (coreReport.archetype) present.push({ id: "archetype", label: "Your archetype" });
    if (coreReport.transferable_value) present.push({ id: "sell", label: "What you can sell" });
    if (coreReport.transferable_skills?.length) present.push({ id: "skills", label: "Your transferable skills" });
    if (coreReport.options?.length) present.push({ id: "paths", label: "Your 10 paths" });
    if (coreReport.recommendation) present.push({ id: "recommendation", label: "Our recommendation" });
    if (coreReport.reality_check) present.push({ id: "reality", label: "Reality check" });
    if (coreReport.income_outlook) present.push({ id: "income", label: "Income outlook" });
    if (coreReport.ai_impact) present.push({ id: "ai", label: "AI & your future" });
    return present;
  }, [coreReport]);

  const activeSectionId = useActiveSection(visibleSections.map((s) => s.id));

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const goToPlan = useCallback(() => navigateAuthed(navigate, "/plan"), [navigate]);
  const goHome = useCallback(() => navigateAuthed(navigate, "/"), [navigate]);

  // Sidebar items — section navigation
  const sidebarItems: SidebarItem[] = visibleSections.map((s) => ({
    id: s.id,
    label: s.label,
    onClick: () => scrollToSection(s.id),
    isActive: activeSectionId === s.id,
  }));

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <Banner variant="error">
          We couldn't load your report. Try refreshing, or contact support if this keeps happening.
        </Banner>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading your report…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!coreReport) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-2xl px-6 pt-20 pb-24 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">No report yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Complete the test to generate your Plan B report.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={goToPlan}>Back to Plan</Button>
            <Button size="sm" onClick={goHome}>Take the test</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="mx-auto w-full max-w-screen-xl px-6">
        <div className="flex gap-10">
          {sidebarItems.length > 0 && <AreaSidebar items={sidebarItems} />}

          <main className="flex-1 min-w-0 mx-auto w-full max-w-3xl pt-8 pb-24">
            <header className="mb-8">
              <h1
                className="font-display text-3xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                Your Plan B report
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPdf}
                  disabled={exportingPdf}
                  className="text-xs font-medium"
                >
                  {exportingPdf ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating PDF...
                    </span>
                  ) : (
                    "Download as PDF"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openRefinePanel}
                  disabled={refineLimitReached || refinementCount >= 3}
                  className="text-xs font-medium"
                >
                  Refine your report
                </Button>
              </div>
              {(refineLimitReached || refinementCount >= 3) && (
                <p className="mt-2 text-[11px] text-muted-foreground">Refinement limit reached.</p>
              )}
              {pdfError && (
                <p className="mt-2 text-[11px] text-red-500">{pdfError}</p>
              )}
            </header>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {coreReport.hook_insight && (
                <section id="edge" className="mb-10 scroll-mt-24">
                  <HookInsightSection hook_insight={coreReport.hook_insight} />
                </section>
              )}
              {coreReport.archetype && (
                <section id="archetype" className="mb-10 scroll-mt-24">
                  <ArchetypeSection archetype={coreReport.archetype} />
                </section>
              )}
              {coreReport.transferable_value && (
                <section id="sell" className="mb-10 scroll-mt-24">
                  <TransferableValueSection transferable_value={coreReport.transferable_value} />
                </section>
              )}
              {coreReport.transferable_skills?.length ? (
                <section id="skills" className="mb-10 scroll-mt-24">
                  <TransferableSkillsSection transferable_skills={coreReport.transferable_skills} />
                </section>
              ) : null}
              {coreReport.options?.length ? (
                <section id="paths" className="mb-10 scroll-mt-24">
                  <BusinessPaths
                    options={coreReport.options}
                    recommended_selection={coreReport.recommended_selection ?? undefined}
                    locked={false}
                  />
                </section>
              ) : null}
              {coreReport.recommendation && (
                <section id="recommendation" className="mb-10 scroll-mt-24">
                  <RecommendationSection
                    recommendation={coreReport.recommendation}
                    options={coreReport.options}
                  />
                </section>
              )}
              {coreReport.reality_check && (
                <section id="reality" className="mb-10 scroll-mt-24">
                  <RealityCheckSection reality_check={coreReport.reality_check} />
                </section>
              )}
              {coreReport.income_outlook && (
                <section id="income" className="mb-10 scroll-mt-24">
                  <IncomeOutlookSection income_outlook={coreReport.income_outlook} />
                </section>
              )}
              {coreReport.ai_impact && (
                <section id="ai" className="mb-10 scroll-mt-24">
                  <AIImpactSection ai_impact={coreReport.ai_impact} />
                </section>
              )}
            </motion.div>
          </main>
        </div>
      </div>

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