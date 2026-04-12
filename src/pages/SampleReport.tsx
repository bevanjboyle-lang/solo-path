import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import SoloLogo from "@/components/SoloLogo";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const skills = [
  { rank: 1, title: "Regulatory & Compliance Fluency", desc: "You can translate complex requirements into business language. This is rare and valuable outside financial services." },
  { rank: 2, title: "Structured Risk Assessment", desc: "You think in frameworks. Consultants and insurtech firms pay a premium for this." },
  { rank: 3, title: "Senior Stakeholder Management", desc: "Nine years navigating partner-level relationships is a credential in itself." },
  { rank: 4, title: "Process Documentation & Controls", desc: "Undervalued internally. Extremely valuable to scale-ups and ops-heavy businesses." },
  { rank: 5, title: "Project Governance", desc: "You've run enough audits to know what good looks like. That's a consulting superpower." },
  { rank: 6, title: "Data Interpretation (non-technical)", desc: "You can read a dataset and tell a story. Rare in risk roles." },
];

function LockedOverlay({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[10px] bg-surface-panel/70 backdrop-blur-sm">
      <Lock className="h-6 w-6 text-muted-foreground/60" />
      <Button
        size="sm"
        className="rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-[#26B89D]"
        onClick={() => navigate("/auth")}
      >
        {label}
      </Button>
    </div>
  );
}

export default function SampleReport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      {/* HERO */}
      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        <section className="flex flex-col items-center justify-center pb-4">
          <div className="mx-auto max-w-2xl text-center">
            <motion.span className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              Sample Report
            </motion.span>
            <motion.h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.02em" }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}>
              See exactly what you get
            </motion.h1>
            <motion.p className="mx-auto mt-4 max-w-[560px] text-base text-muted-foreground sm:text-lg" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
              This is an edited extract from a real Solo report. Names and some details have been changed. Paid sections are partially shown.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* PROFILE SUMMARY */}
          <motion.div className="rounded-[10px] border border-border bg-surface-card p-6 sm:p-8" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}>
            <div className="mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Profile Summary</span>
            </div>
            <h3 className="font-display mt-3 text-lg font-semibold">Sarah Chen</h3>
            <p className="text-sm text-muted-foreground">Risk Manager · Financial Services · Edinburgh</p>
            <p className="mt-1 text-sm text-muted-foreground">9 years at Big Four · Currently earning: £85k</p>

            <div className="mt-6">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-medium text-muted-foreground">Transferability Score</span>
                <span className="text-sm font-bold text-primary">73 / 100 — Strong</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-inset">
                <div className="h-full rounded-full bg-primary" style={{ width: "73%" }} />
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Your risk management background gives you unusually portable skills. The combination of regulatory knowledge, stakeholder communication, and process documentation places you in a strong position across multiple adjacent markets.
            </p>
          </motion.div>

          {/* SKILLS */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}>
            <h2 className="font-display mb-6 text-xl font-semibold">Your Strongest Skills (Ranked)</h2>
            <div className="flex flex-col gap-3">
              {skills.map((s) => (
                <div key={s.rank} className="flex gap-4 rounded-[10px] border border-border bg-surface-card p-4 transition-all hover:border-primary hover:shadow-card-hover">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-accent text-xs font-bold text-accent-foreground">{s.rank}</span>
                  <div>
                    <h4 className="text-sm font-semibold">{s.title}</h4>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* THREE PATHS */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}>
            <h2 className="font-display mb-6 text-xl font-semibold">Your Three Most Viable Paths</h2>

            {/* Path 1 — full */}
            <div className="mb-4 rounded-[10px] border border-primary/40 bg-surface-mint-tint p-6 sm:p-8">
              <span className="mb-3 inline-block rounded-md bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                Path 1 — Best fit
              </span>
              <h3 className="font-display text-lg font-semibold">Independent Risk Consultant</h3>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-xs text-muted-foreground">Target clients</span>
                  <p className="text-foreground/90">FinTechs, scale-ups, RegTech firms needing fractional risk expertise</p>
                </div>
                <div className="flex gap-6">
                  <div><span className="text-xs text-muted-foreground">Day rate</span><p className="font-medium text-primary">£600–£850</p></div>
                  <div><span className="text-xs text-muted-foreground">First client</span><p className="text-foreground/90">6–10 weeks</p></div>
                  <div><span className="text-xs text-muted-foreground">Confidence</span><p className="font-medium text-primary">High</p></div>
                </div>
              </div>

              <div className="mt-5 rounded-[10px] border border-border bg-surface-panel p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Why it fits</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your Big Four brand plus deep FS regulatory knowledge is exactly what a Series B FinTech needs when hiring their first Head of Risk but can't afford a full-time person yet.
                </p>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">First three moves</p>
                <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-primary">1.</span>Identify 15 FinTechs in your city that have raised Series A/B in the last 18 months.</li>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-primary">2.</span>Write one LinkedIn post about a risk challenge you solved, no jargon.</li>
                  <li className="flex gap-2"><span className="shrink-0 font-bold text-primary">3.</span>DM three founders directly. Skip recruiters at this stage.</li>
                </ol>
              </div>
            </div>

            {/* Path 2 — locked */}
            <div className="relative mb-4 overflow-hidden rounded-[10px] border border-border bg-surface-card p-6 sm:p-8">
              <div className="pointer-events-none select-none blur-[6px]">
                <h3 className="text-lg font-semibold">Risk & Compliance Trainer / Course Creator</h3>
                <p className="mt-2 text-sm text-muted-foreground">Create structured training programmes for mid-market firms…</p>
                <div className="mt-3 flex gap-6 text-sm"><span>Day rate: £400–£650</span><span>First client: 8–12 weeks</span></div>
              </div>
              <LockedOverlay label="Unlock full report — £19.99" />
            </div>

            {/* Path 3 — locked */}
            <div className="relative overflow-hidden rounded-[10px] border border-border bg-surface-card p-6 sm:p-8">
              <div className="pointer-events-none select-none blur-[6px]">
                <h3 className="text-lg font-semibold">Embedded Ops Lead (Scale-up)</h3>
                <p className="mt-2 text-sm text-muted-foreground">Join a fast-growing company part-time as an embedded operational leader…</p>
                <div className="mt-3 flex gap-6 text-sm"><span>Day rate: £500–£750</span><span>First client: 6–10 weeks</span></div>
              </div>
              <LockedOverlay label="Unlock full report — £19.99" />
            </div>
          </motion.div>

          {/* MARKET INTELLIGENCE — locked */}
          <motion.div className="relative overflow-hidden rounded-[10px] border border-border bg-surface-card p-6 sm:p-8" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}>
            <div className="pointer-events-none select-none blur-[6px]">
              <h2 className="mb-4 text-xl font-semibold">Market Intelligence</h2>
              <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                <li>• Day rate benchmarks for Risk Managers going independent in Edinburgh</li>
                <li>• Which sectors are actively hiring fractional risk expertise right now</li>
                <li>• Three firms currently looking for exactly your profile</li>
              </ul>
            </div>
            <LockedOverlay label="Unlock full report — £19.99" />
          </motion.div>

          {/* 90-DAY ACTION PLAN — locked */}
          <motion.div className="relative overflow-hidden rounded-[10px] border border-border bg-surface-card p-6 sm:p-8" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}>
            <div className="pointer-events-none select-none blur-[6px]">
              <h2 className="mb-4 text-xl font-semibold">Your 90-Day Action Plan</h2>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <div className="rounded-[10px] border border-border bg-surface-panel p-4"><span className="font-semibold text-foreground/80">Week 1–2:</span> Foundations</div>
                <div className="rounded-[10px] border border-border bg-surface-panel p-4"><span className="font-semibold text-foreground/80">Week 3–6:</span> First outreach</div>
                <div className="rounded-[10px] border border-border bg-surface-panel p-4"><span className="font-semibold text-foreground/80">Week 7–12:</span> Pipeline building</div>
              </div>
            </div>
            <LockedOverlay label="Get your personalised plan — £19.99" />
          </motion.div>
        </div>
      </PanelLayout>

      {/* FINAL CTA */}
      <PanelLayout className="overflow-hidden">
        <section className="bg-primary py-24 rounded-2xl">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <motion.h2 className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl" style={{ letterSpacing: "-0.02em" }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              Ready for your own report?
            </motion.h2>
            <motion.p className="mt-4 text-base text-primary-foreground/70" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              Takes 12 minutes. Costs £19.99. Changes how you think about your options.
            </motion.p>
            <motion.div className="mt-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <Button size="lg" className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90" onClick={() => navigate("/auth")}>
                Take the test →
              </Button>
            </motion.div>
          </div>
        </section>
      </PanelLayout>

      <Footer />
    </div>
  );
}
