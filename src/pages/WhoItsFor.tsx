import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
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

const archetypes = [
  {
    title: "Risk, Audit & Compliance",
    who: "Internal audit managers, Big Four risk/compliance professionals, regulatory specialists, financial crime leads",
    have: "Deep process knowledge, regulatory expertise, structured thinking, institutional credibility",
    insight:
      "Smaller firms, scale-ups, and PE-backed businesses constantly need exactly this expertise but can't justify a full-time hire",
    path: "Independent compliance consultant working with 2–3 SME or fintech clients on a retainer basis.",
    rate: "£500–£800",
    time: "4–8 weeks",
  },
  {
    title: "Finance & Commercial",
    who: "FP&A managers, finance business partners, commercial analysts, CFO-track professionals",
    have: "Financial modelling, commercial narrative, board-level communication, P&L ownership",
    insight:
      "Founders and scale-up businesses desperately need financial rigour but rarely have it. A fractional CFO or FD is one of the most in-demand solo models in the UK market.",
    path: "Fractional Finance Director serving 2–3 growth businesses.",
    rate: "£600–£900",
    time: "6–10 weeks",
  },
  {
    title: "Programme & Transformation",
    who: "PMO leads, change managers, programme directors, transformation consultants, delivery leads",
    have: "Structured delivery, stakeholder management, governance design, cross-functional experience",
    insight:
      "Every mid-size organisation undertaking a significant change project needs this skill set. Most don't want to hire it permanently.",
    path: "Independent transformation consultant or fractional Programme Director.",
    rate: "£550–£850",
    time: "4–8 weeks",
  },
  {
    title: "Operations & Process",
    who: "Operations managers, process improvement leads, business analysts, COO-track professionals",
    have: "Process design, operational efficiency, systems thinking, cross-functional coordination",
    insight:
      "Growing businesses consistently have the same operational problems. Pattern recognition across industries is genuinely valuable to a business owner who's never seen it before.",
    path: "Operational consultant or fractional COO working with SMEs or scale-ups on specific operational challenges.",
    rate: "£450–£750",
    time: "6–10 weeks",
  },
  {
    title: "Generalist Consultant / Interim",
    who: "Management consultants, strategy professionals, interim managers, advisory specialists",
    have: "Problem structuring, stakeholder management, analysis, delivery experience across sectors",
    insight:
      "The jump from employed consultant to independent consultant is shorter than it looks. The main blocker is rarely capability — it's the first introduction.",
    path: "Independent management consultant or advisory professional working with 1–2 clients at a time.",
    rate: "£600–£1,000",
    time: "4–8 weeks",
  },
];

const notFor = [
  "Creators, influencers, or content businesses",
  "E-commerce, dropshipping, or product businesses",
  "Students or early-career professionals without a track record",
  "People looking for passive income or quick-money schemes",
  "Those seeking broad startup ideas rather than a specific professional service path",
];

export default function WhoItsFor() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="flex min-h-[65vh] flex-col items-center justify-center px-6 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Who Solo Is Built For
          </motion.span>
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            Solo is designed for a specific kind of professional.
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Not everyone. If you work in one of these roles, have 5 or more years of experience, and have started wondering what you'd do if your current role became less stable — this is for you.
          </motion.p>
        </div>
      </section>

      {/* 5 ARCHETYPES */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col gap-8">
            {archetypes.map((a, i) => (
              <motion.div
                key={a.title}
                className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i % 3}
              >
                <h3 className="font-display mb-4 text-lg font-semibold">{a.title}</h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Who</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{a.who}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">What they have</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{a.have}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-border/40 bg-background/50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    What they don't realise
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{a.insight}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Example path: </span>
                    <span className="text-foreground/90">{a.path}</span>
                  </div>
                  <div className="flex gap-6">
                    <span>
                      <span className="text-xs text-muted-foreground">Day rate: </span>
                      <span className="font-medium text-primary">{a.rate}</span>
                    </span>
                    <span>
                      <span className="text-xs text-muted-foreground">First client: </span>
                      <span className="font-medium text-foreground/90">{a.time}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S NOT FOR */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display mb-4 text-xl font-semibold">Who Solo isn't designed for</h2>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              Solo is built around a specific model: experienced white-collar professionals with transferable expertise, selling knowledge-based services to business clients. It is not designed for:
            </p>
            <ul className="mb-5 flex flex-col gap-2">
              {notFor.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground/70">
              If that's you, Solo probably isn't the right tool. We'd rather be honest than overpromise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.h2
            className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            Recognise yourself in one of these profiles?
          </motion.h2>
          <motion.p
            className="mt-4 text-base text-primary-foreground/70"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            The assessment takes 8 minutes. Your free preview is immediate.
          </motion.p>
          <motion.div
            className="mt-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={2}
          >
            <Button
              size="lg"
              className="rounded-lg bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate("/auth")}
            >
              Take the test →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <SoloLogo width={80} height={22} />
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
