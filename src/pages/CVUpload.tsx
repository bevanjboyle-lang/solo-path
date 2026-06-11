import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { continueFunnel } from "@/lib/handlers";
import { getClientSessionId } from "@/lib/clientSession";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import ProgressHeader from "@/components/ProgressHeader";
import CVUploadZone from "@/components/CVUploadZone";
import SoloLogo from "@/components/SoloLogo";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

/*
 * CVUpload, Pass 1 /cv-upload v1 (2026-05-16)
 *
 * Translates Claude Design's Pass 1 proposal into the live page. Inherits
 * the editorial composition vocabulary established on the home page in
 * Pass 1: single contained ivory panel on the office photo, eyebrow rules
 * + small-caps section labels, asymmetric 8/4 split for the drop zone and
 * "Why we ask" card, stacked action row with hard hierarchical gap
 * between Continue and Skip, footer compressed inside the panel.
 *
 * Locked decisions from admin/pass-1-cv-upload-decisions.md:
 *   F1, Why we ask alongside the drop zone (not beneath)
 *   F2, Skip is single-action; Continue stays "Continue", disabled until
 *        upload completes. Reading B (simpler) locked.
 *   F3, Time chip "≈ 1 min" on the ProgressHeader (funnel-wide pattern)
 *   F6, Encrypted trust line sharpened to specifics:
 *        "Encrypted · EU storage · deletable from /account"
 *   F7, Success Toast dropped; in-surface chip is the success signal
 *
 * Dark-card cadence: zero dark cards on this screen. Operational/
 * transitional surfaces run all-ivory under design-direction.md v1.4 §8.
 *
 * No framer-motion fade, the editorial register should land instantly.
 */

const WHY_BULLETS = [
  {
    lead: "Sharper report.",
    body: "Grounds the analysis in your actual role and history, not a generic archetype match.",
  },
  {
    lead: "Not shared.",
    body: "Used once for your report, then stored encrypted against your account.",
  },
  {
    lead: "Deletable.",
    body: "Remove it any time from /account.",
  },
] as const;

function SectionLabel({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-[#15735F] mr-3 tabular-nums">{num}</span>
      {children}
    </div>
  );
}

function WhyWeAskCard() {
  return (
    <aside className="border-t border-border pt-5">
      <h4 className="rule-head">Why we ask</h4>
      <ul className="pt-5 space-y-5">
        {WHY_BULLETS.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="text-[#15735F] text-[10px] font-semibold tabular-nums tracking-[0.1em] pt-1 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[13.5px] text-foreground leading-relaxed">
              <strong className="font-semibold">{item.lead}</strong>{" "}
              <span className="text-muted-foreground">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function WhyWeAskMobile() {
  return (
    <div className="space-y-5 px-6 pb-8 pt-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
        Why we ask
      </div>
      <ul className="space-y-5">
        {WHY_BULLETS.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="text-[#15735F] text-[10px] font-semibold tabular-nums tracking-[0.1em] pt-1 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[13.5px] text-foreground leading-relaxed">
              <strong className="font-semibold">{item.lead}</strong>{" "}
              <span className="text-muted-foreground">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CVUpload() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [cvPath, setCvPath] = useState<string | null>(null);

  // Drift C fix (2026-05-18, journey-trace audit): guard authed users with an
  // existing complete report. Without this, they can start a fresh test from
  // /cv-upload and either overwrite their report or create a duplicate row
  // that breaks the post-questionnaire flow. The second-report flow is the
  // canonical path for retakes, lives at /account → TakeAnotherTestCard.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const PAID_STATUSES = ["pending_selection", "generating_plan", "complete"];
      const { data } = await supabase
        .from("reports")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", PAID_STATUSES)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        toast.message("You already have a plan.", {
          description:
            "To take a fresh test, open Account → Take another test.",
        });
        navigate("/plan", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const clientSessionId = getClientSessionId();
  const cvExtractKey = `solo.cv_extract.${clientSessionId}`;

  const clearStoredExtract = () => {
    try {
      localStorage.removeItem(cvExtractKey);
    } catch {
      /* no-op */
    }
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

  return (
    <div className="relative min-h-screen text-foreground">
      {/* Funnel mode: TopBar minimal = no centre nav, no "Take the test" CTA.
          The Back affordance is inline at the top of the panel below. */}
      <TopBar minimal />

      <main>
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div>
              {/* ─── Panel top row: Back link + section label + small Solo logo ─── */}
              <div className="pt-8 sm:pt-10 flex items-center justify-between gap-6">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                {/* duplicate Solo logo removed 2026-06-10: the TopBar above already carries the mark (vision diagnosis T5) */}
              </div>

              {/* ─── Page content ─── */}
              <div className="pt-6">
                <SectionLabel num="01">Activation</SectionLabel>
              </div>

              <div className="pt-4">
                <ProgressHeader
                  currentStep={1}
                  totalSteps={3}
                  labels={["CV", "Questionnaire", "Report"]}
                  timeEstimate="≈ 1 min"
                />
              </div>

              {/* ─── H1 + standfirst (asymmetric on desktop, stacked on mobile) ─── */}
              <div className="pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
                <div className="lg:col-span-7">
                  <h1 className="title-h1">
                    Upload your CV{" "}
                    <span className="text-muted-foreground">, we'll tailor the report to your background.</span>
                  </h1>
                </div>
                <div className="lg:col-span-5 lg:pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed lg:text-right">
                    Optional. Skipping is fine. We'll ask about your experience in the next step
                    either way.
                  </p>
                  <p className="mt-3 text-[12px] text-muted-foreground/80 leading-relaxed lg:text-right">
                    Read once, then discarded. We use your CV only to fill in your answers, never
                    store it after that, never share it, and never link it to your employer.
                  </p>
                </div>
              </div>

              {/* ─── Drop zone + Why we ask (asymmetric 8/4 on desktop) ─── */}
              <div className="pb-10">
                {isMobile ? (
                  <div className="space-y-6">
                    <CVUploadZone
                      clientSessionId={clientSessionId}
                      onUploadComplete={(path) => setCvPath(path)}
                      onUploadClear={() => {
                        setCvPath(null);
                        clearStoredExtract();
                      }}
                      onExtractComplete={handleExtractComplete}
                    />
                    <Drawer>
                      <DrawerTrigger asChild>
                        <button className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors">
                          Why we ask
                        </button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <WhyWeAskMobile />
                      </DrawerContent>
                    </Drawer>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8">
                      <CVUploadZone
                        clientSessionId={clientSessionId}
                        onUploadComplete={(path) => setCvPath(path)}
                        onUploadClear={() => {
                          setCvPath(null);
                          clearStoredExtract();
                        }}
                        onExtractComplete={handleExtractComplete}
                      />
                    </div>
                    <div className="col-span-4">
                      <WhyWeAskCard />
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Action row ─── */}
              <div className="pb-12 border-t border-border pt-8">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                  <div className="flex flex-col items-start gap-3">
                    <button
                      onClick={handleContinue}
                      disabled={!cvPath}
                      className={`transition-colors w-full sm:w-auto text-center ${
                        cvPath
                          ? "cta-block"
                          : "px-[18px] py-[9px] text-[13px] font-semibold bg-[#E5E2DC] text-muted-foreground/70 cursor-not-allowed"
                      }`}
                    >
                      Continue
                    </button>
                    <button
                      onClick={handleSkip}
                      className="text-[13px] text-muted-foreground border-b border-[#D8D4CC] hover:text-foreground hover:border-foreground transition-colors self-start"
                    >
                      Skip this step →
                    </button>
                  </div>
                  <div className="text-[12px] text-muted-foreground/80 leading-relaxed max-w-sm sm:text-right">
                    Continue enables once a file has uploaded successfully. Skip is always available.
                  </div>
                </div>
              </div>

              {/* ─── Footer (compressed inside panel) ─── */}
              <div className="border-t border-border py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <SoloLogo width={64} height={18} />
                    <span className="text-muted-foreground/40">·</span>
                    <span>£19.99 one-time</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>No subscription required</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="/privacy"
                      className="hover:text-foreground transition-colors"
                    >
                      Privacy
                    </a>
                    <span className="text-muted-foreground/40">·</span>
                    <a
                      href="/terms"
                      className="hover:text-foreground transition-colors"
                    >
                      Terms
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
