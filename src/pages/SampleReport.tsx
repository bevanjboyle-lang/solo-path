import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import ProfileSummary from "@/components/sample-report/ProfileSummary";
import HookInsight from "@/components/sample-report/HookInsight";
import SkillsRanked from "@/components/sample-report/SkillsRanked";
import BusinessPaths from "@/components/sample-report/BusinessPaths";
import {
  RecommendationTeaser,
  IncomeOutlookTeaser,
  ActivationPlanTeaser,
  FirstMoveTeaser,
  LocalMarketTeaser,
  AIImpactTeaser,
  FullReportGrid,
  BottomCTA,
} from "@/components/sample-report/LockedSections";

export default function SampleReport() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 pb-8 pt-10 sm:px-10">
        <div className="mx-auto max-w-[680px]">
          {/* Hero */}
          <div className="mb-8 text-center">
            <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Sample Report</span>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
              See exactly what Solo finds
            </h1>
            <p className="mx-auto mt-2 max-w-[520px] text-sm text-muted-foreground">
              This is an edited extract from a real Solo report. Sarah is a composite — but the analysis, scoring, and recommendations are exactly what the product generates.
            </p>
          </div>

          {/* All sections flow tightly */}
          <div className="flex flex-col gap-6">
            <ProfileSummary />
            <HookInsight />
            <SkillsRanked />
            <BusinessPaths />
            <RecommendationTeaser />
            <IncomeOutlookTeaser />
            <ActivationPlanTeaser />
            <FirstMoveTeaser />
            <LocalMarketTeaser />
            <AIImpactTeaser />
            <FullReportGrid />
          </div>
        </div>
      </PanelLayout>

      {/* Bottom CTA — outside panel, full width within a panel wrapper */}
      <PanelLayout className="overflow-hidden px-0">
        <BottomCTA />
      </PanelLayout>

      <Footer />
    </div>
  );
}
