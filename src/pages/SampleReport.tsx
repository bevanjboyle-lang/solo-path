import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SampleBanner from "@/components/sample-report/SampleBanner";
import PersonaHeader from "@/components/sample-report/PersonaHeader";
import ArchetypeSection from "@/components/sample-report/ArchetypeSection";
import TransferableValueSection from "@/components/sample-report/TransferableValueSection";
import TransferableSkillsSection from "@/components/sample-report/TransferableSkillsSection";
import HookInsightSection from "@/components/sample-report/HookInsightSection";
import OptionsSection from "@/components/sample-report/OptionsSection";
import RecommendationSection from "@/components/sample-report/RecommendationSection";
import RealityCheckSection from "@/components/sample-report/RealityCheckSection";
import IncomeOutlookSection from "@/components/sample-report/IncomeOutlookSection";
import AIImpactSection from "@/components/sample-report/AIImpactSection";
import FirstMoveSection from "@/components/sample-report/FirstMoveSection";
import PlanSection from "@/components/sample-report/PlanSection";
import TractionSignalsSection from "@/components/sample-report/TractionSignalsSection";
import PortfolioReviewSection from "@/components/sample-report/PortfolioReviewSection";
import NetworkToolkitSection from "@/components/sample-report/NetworkToolkitSection";
import MarketSnapshotSection from "@/components/sample-report/MarketSnapshotSection";
import PortfolioSummarySection from "@/components/sample-report/PortfolioSummarySection";
import SampleCTA from "@/components/sample-report/SampleCTA";
import Footer from "@/components/Footer";

export default function SampleReport() {
  return (
    <div className="min-h-screen text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-[720px] flex flex-col gap-12">
          <SampleBanner />

          {/* Phase 1: Report Sections 1–9 */}
          <ScrollReveal><PersonaHeader /></ScrollReveal>
          <ScrollReveal delay={0.05}><ArchetypeSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><TransferableValueSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><TransferableSkillsSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><HookInsightSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><OptionsSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><RecommendationSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><RealityCheckSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><IncomeOutlookSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><AIImpactSection /></ScrollReveal>

          {/* Phase 2: Activation Plan Sections 10–16 */}
          <ScrollReveal delay={0.05}><FirstMoveSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><PlanSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><TractionSignalsSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><PortfolioReviewSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><NetworkToolkitSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><MarketSnapshotSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><PortfolioSummarySection /></ScrollReveal>

          <ScrollReveal delay={0.05}><SampleCTA /></ScrollReveal>
        </div>
      </PanelLayout>

      
    </div>
  );
}
