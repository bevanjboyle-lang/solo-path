import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SampleBanner from "@/components/sample-report/SampleBanner";
import PersonaHeader from "@/components/sample-report/PersonaHeader";
import ArchetypeSection from "@/components/sample-report/ArchetypeSection";
import HookInsightSection from "@/components/sample-report/HookInsightSection";
import OptionsSection from "@/components/sample-report/OptionsSection";
import RecommendationSection from "@/components/sample-report/RecommendationSection";
import RealityCheckSection from "@/components/sample-report/RealityCheckSection";
import FirstMoveSection from "@/components/sample-report/FirstMoveSection";
import PlanSection from "@/components/sample-report/PlanSection";
import NetworkToolkitSection from "@/components/sample-report/NetworkToolkitSection";
import MarketSnapshotSection from "@/components/sample-report/MarketSnapshotSection";
import AIImpactSection from "@/components/sample-report/AIImpactSection";
import SampleCTA from "@/components/sample-report/SampleCTA";

export default function SampleReport() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-[720px] flex flex-col gap-6">
          <SampleBanner />

          <ScrollReveal><PersonaHeader /></ScrollReveal>
          <ScrollReveal delay={0.05}><ArchetypeSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><HookInsightSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><OptionsSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><RecommendationSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><RealityCheckSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><FirstMoveSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><PlanSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><NetworkToolkitSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><MarketSnapshotSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><AIImpactSection /></ScrollReveal>
          <ScrollReveal delay={0.05}><SampleCTA /></ScrollReveal>
        </div>
      </PanelLayout>
    </div>
  );
}
