import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SoloLogo from "@/components/SoloLogo";
import {
  Scale,
  Crosshair,
  Gem,
  Heart,
  Shield,
  Cpu,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const principles = [
  {
    icon: Scale,
    title: "Realism over inspiration",
    desc: "A Plan B you can't actually execute isn't a Plan B. We privilege commercial realism over ideas that sound exciting but don't hold up.",
  },
  {
    icon: Crosshair,
    title: "Specificity over breadth",
    desc: "Generic ideas help no one. Solo tells you who would pay you, for what, why they'd trust you, and how soon the money could realistically come.",
  },
  {
    icon: Gem,
    title: "Your experience is the asset",
    desc: "We don't help you build something new from scratch. We help you translate what you've already spent years building into something independently valuable.",
  },
  {
    icon: Heart,
    title: "The anxious professional deserves better tools",
    desc: "Most career and entrepreneurship content is aimed at people who already want to start something. Solo is for people who aren't sure, but want a credible answer.",
  },
  {
    icon: Shield,
    title: "A Plan B shouldn't feel like giving up",
    desc: "Having a realistic fallback makes you more confident in your current role, not less. It's not about leaving. It's about not being trapped.",
  },
  {
    icon: Cpu,
    title: "Better than asking ChatGPT",
    desc: "Generic AI gives generic answers. Solo's value is in the structure: the questions, the classification, the scoring, the commercial translation. That's the product.",
  },
];

const stats = [
  {
    value: "5–12 years",
    desc: "The experience range where professionals have the most transferable commercial value — but the least practice selling it.",
  },
  {
    value: "£0",
    desc: "What most mid-career professionals have earned outside employment. The translation problem is almost universal.",
  },
  {
    value: "8 minutes",
    desc: "How long it takes Solo to map your background to a realistic independent income path.",
  },
];

export default function WhySolo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            The Solo Manifesto
          </motion.span>
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            Professional independence used to be a niche choice. Increasingly, it is the smart preparation.
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-[580px] text-base leading-relaxed text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            This isn't a prediction. It's already happening. Solo exists to help capable, experienced professionals build a credible path that doesn't depend entirely on an employer.
          </motion.p>
        </div>
      </section>

      {/* THE SHIFT */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            className="mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Why having independent income options matters
            </h2>
          </motion.div>

          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
          >
            <p>
              Artificial intelligence is doing to cognitive work what mechanisation did to physical work over the last two centuries — not eliminating it wholesale, but restructuring it. The middle layers of professional organisations — the managers, analysts, coordinators, and process specialists who translate strategy into execution — are increasingly caught between automation at the task level and consolidation at the organisational level.
            </p>
            <p>
              This doesn't mean these roles disappear overnight. It means they become less predictable, less numerous, and less valuable as a proportion of what organisations need to pay for. The professionals in these roles are often highly capable. They are not, however, well-equipped to work outside the structures that have employed them. Most have never had to sell their services directly. Most couldn't tell you exactly what they'd charge, or who would pay them, or why.
            </p>
            <p>
              That gap — between genuine capability and commercial self-sufficiency — is the problem Solo is built to close.
            </p>
          </motion.div>
        </div>
      </section>

      {/* THE SOLO THESIS */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            className="font-display mb-14 text-2xl font-semibold tracking-tight sm:text-3xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            We believe the direction of travel is clear
          </motion.h2>

          <div className="grid gap-12 lg:grid-cols-2">
            <motion.div
              className="text-sm leading-[1.8] text-muted-foreground sm:text-base"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={0}
            >
              <p className="mb-6">
                The long arc of work points toward more individual agency. Not the gig economy — that model trades security for availability, which helps platforms more than workers. Something different: experienced professionals who work directly with clients, own their relationships, set their terms, and aren't dependent on a single employer for their livelihood.
              </p>
              <p>
                AI doesn't just threaten that path. It enables it. The research, drafting, analysis, and coordination work that used to require support staff or full-time employment can increasingly be done by one capable person with the right tools. The question isn't whether this transition is coming. It's whether you're prepared for it.
              </p>
            </motion.div>

            <div className="flex flex-col gap-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.value}
                  className="rounded-xl border border-border/60 bg-card p-5"
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  custom={i}
                >
                  <span className="mb-1 block font-display text-2xl font-bold text-primary">{s.value}</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OUR PRINCIPLES */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            className="font-display mb-14 text-center text-2xl font-semibold tracking-tight sm:text-3xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            How we think about this
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                className="rounded-xl border border-border/60 bg-card p-6"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
              >
                <p.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="mb-2 text-sm font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </div>
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
            If this resonates, the test takes 8 minutes.
          </motion.h2>
          <motion.p
            className="mt-4 text-base text-primary-foreground/70"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
          >
            You'll get a free preview immediately, and a full report — including your 30-day activation plan — for £19.99.
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
            <span className="cursor-pointer transition-colors hover:text-foreground">Privacy</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
