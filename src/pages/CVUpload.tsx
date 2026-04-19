import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Sparkles, Trash2 } from "lucide-react";
import { continueFunnel } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import ProgressHeader from "@/components/ProgressHeader";
import CVUploadZone from "@/components/CVUploadZone";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

const SESSION_KEY = "solo.client_session_id";

const WHY_BULLETS = [
  {
    icon: Sparkles,
    text: "It makes your report sharper. We ground the analysis in your actual role and history.",
  },
  {
    icon: Shield,
    text: "We don't share your CV. It's used once, then stored encrypted against your account.",
  },
  {
    icon: Trash2,
    text: "You can delete it any time from your account page.",
  },
];

export default function CVUpload() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [cvPath, setCvPath] = useState<string | null>(null);

  // Ensure client_session_id exists
  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, crypto.randomUUID());
    }
  }, []);

  const clientSessionId = localStorage.getItem(SESSION_KEY) || "";
  const cvExtractKey = `solo.cv_extract.${clientSessionId}`;

  const clearStoredExtract = () => {
    try {
      localStorage.removeItem(cvExtractKey);
    } catch {}
  };

  const handleExtractComplete = (
    cv_extract: Record<string, unknown>,
    cv_confidence_score?: number,
    cv_uploaded?: boolean
  ) => {
    try {
      localStorage.setItem(
        cvExtractKey,
        JSON.stringify({
          cv_extract,
          cv_confidence_score,
          cv_uploaded,
          ts: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.warn("Failed to persist cv_extract (non-fatal):", err);
    }
  };

  const handleContinue = () => continueFunnel(navigate, "/questionnaire");
  const handleSkip = () => {
    clearStoredExtract();
    continueFunnel(navigate, "/questionnaire");
  };

  const WhyWeAskContent = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[hsl(var(--text-heading))] tracking-tight">
        Why we ask
      </h3>
      <ul className="space-y-3">
        {WHY_BULLETS.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-[hsl(var(--text-body))] leading-relaxed">
            <item.icon className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--text-muted))]" />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <ProgressHeader currentStep={1} totalSteps={3} labels={["CV", "Questions", "Report"]} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-[hsl(var(--text-heading))] tracking-tight leading-tight">
              Upload your CV
            </h1>
            <p className="text-[hsl(var(--text-body))] text-base leading-relaxed">
              Optional. Skipping is fine — we'll ask about your experience in the next step either way.
            </p>
          </div>

          {/* Upload zone */}
          <CVUploadZone
            clientSessionId={clientSessionId}
            onUploadComplete={(path) => setCvPath(path)}
            onUploadClear={() => {
              setCvPath(null);
              clearStoredExtract();
            }}
            onExtractComplete={handleExtractComplete}
          />

          {/* Why we ask — desktop: inline, mobile: drawer */}
          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <button className="text-sm text-[hsl(var(--text-muted))] underline underline-offset-2 hover:text-[hsl(var(--text-body))] transition-colors">
                  Why do we ask for this?
                </button>
              </DrawerTrigger>
              <DrawerContent className="px-6 pb-8 pt-4">
                <WhyWeAskContent />
              </DrawerContent>
            </Drawer>
          ) : (
            <div className="border border-border rounded-lg p-5 bg-[hsl(var(--surface-panel))]">
              <WhyWeAskContent />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              onClick={handleContinue}
              disabled={!cvPath}
              className="w-full sm:w-auto bg-[hsl(var(--mint))] hover:bg-[hsl(var(--mint-hover))] text-white font-medium px-8"
            >
              Continue
            </Button>
            <button
              onClick={handleSkip}
              className="text-sm text-[hsl(var(--text-muted))] underline underline-offset-2 hover:text-[hsl(var(--text-body))] transition-colors"
            >
              Skip this step
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
