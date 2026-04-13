import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, Zap, TrendingUp, Lightbulb } from "lucide-react";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeChild = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutSolo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      {/* Hero */}
      <PanelLayout className="mt-20 px-6 py-20 sm:px-10">
        <section className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Our Mission Comes From Experience
            </motion.span>
            <motion.h1
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: "-0.02em" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
            >
              We Built Solo For A Reason
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-md text-base text-muted-foreground sm:text-lg"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              Build income outside your job. Before you need to.
            </motion.p>
          </div>
        </section>
      </PanelLayout>

      {/* ALL narrative content in one continuous panel */}
      <PanelLayout className="px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-16">

          {/* Opening quote */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="font-display text-xl font-semibold leading-relaxed tracking-tight text-foreground sm:text-2xl lg:text-3xl" style={{ letterSpacing: "-0.01em" }}>
              "Solo came out of something I couldn't really ignore anymore."
            </p>
          </motion.div>

          {/* Context paragraphs */}
          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <p>
              I spend my time inside a large, well-known professional services environment, working close to how organisations are changing - particularly where AI, automation, and new ways of delivering work are starting to reshape what people actually do day to day.
            </p>
            <p>
              From the outside, a lot of this still looks stable. The structures are familiar, the roles are recognisable, and careers still appear to move forward in the way they always have.
            </p>
          </motion.div>

          {/* Dramatic transition */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
              But when you're closer to it, you start to see something different.
            </p>
          </motion.div>

          {/* Observation cards */}
          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerChildren}
          >
            {[
              { icon: Eye, text: "Work is being broken down and reassembled." },
              { icon: Zap, text: "Tasks that took hours are compressed into minutes." },
              { icon: TrendingUp, text: "Expectations are shifting, quietly but decisively." },
            ].map((item) => (
              <motion.div
                key={item.text}
                className="rounded-xl border border-border bg-surface-card p-5 text-center transition-all hover:border-primary hover:shadow-card-hover"
                variants={fadeChild}
              >
                <item.icon className="mx-auto mb-3 h-6 w-6 text-primary" strokeWidth={1.5} />
                <p className="text-sm font-medium leading-relaxed text-foreground">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Continuation */}
          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
          >
            <p>
              Not in a dramatic, overnight way. But steadily, and in a way that's very hard to reverse.
            </p>
            <p>
              And the thing that struck me most wasn't just that change is happening - it's that almost no one is really prepared for what it means at an individual level.
            </p>
            <p>
              Most people I come across are highly capable. They've built strong careers, developed valuable skills, and operate at a high level within their organisations.
            </p>
          </motion.div>

          {/* Highlighted question */}
          <motion.div
            className="rounded-xl border-2 border-primary/20 bg-primary/5 px-8 py-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm uppercase tracking-[0.15em] text-primary mb-3 font-semibold">The real question</p>
            <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
              "Could you generate meaningful income independently, if you had to?"
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              The answer is often far less certain than you'd expect.
            </p>
          </motion.div>

          {/* Section heading: not just risk */}
          <motion.h2
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ letterSpacing: "-0.02em" }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            This isn't just a story about risk.
          </motion.h2>

          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
          >
            <p>
              I've also spent periods working independently, building income outside a traditional structure, and experiencing what that actually feels like in practice.
            </p>
            <p>
              It's not easy. There's ambiguity, a lack of structure, and a constant need to create your own momentum.
            </p>
            <p>But there's also something else:</p>
          </motion.div>

          {/* Three feelings */}
          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerChildren}
          >
            {[
              "A sense of ownership.",
              "A different kind of confidence.",
              "Flexibility and control you can't get any other way.",
            ].map((text, i) => (
              <motion.div
                key={text}
                className="rounded-xl bg-primary/8 border border-primary/15 px-5 py-6 text-center"
                variants={fadeChild}
              >
                <span className="mb-2 inline-block font-display text-2xl font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm font-medium leading-relaxed text-foreground">{text}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={2}
          >
            <p>Once you've experienced even a small version of that, it's difficult to ignore.</p>
            <p>So over time, these two things started to sit alongside each other:</p>
          </motion.div>

          {/* Two-column tension */}
          <motion.div
            className="grid gap-4 sm:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerChildren}
          >
            <motion.div className="rounded-xl border border-border bg-surface-card p-6" variants={fadeChild}>
              <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">On one hand</span>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                A growing awareness that traditional career paths are becoming less predictable.
              </p>
            </motion.div>
            <motion.div className="rounded-xl border border-primary/20 bg-primary/5 p-6" variants={fadeChild}>
              <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary">On the other</span>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                A belief that operating independently - even in a small way - is not just a defensive move, but a genuinely positive one.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={3}
          >
            <p>Not everyone needs to leave what they're doing. Not everyone wants to.</p>
            <p>
              But having a second path - something you've built yourself, even at a modest level - changes how you relate to your work, your decisions, and your future.
            </p>
          </motion.div>

          {/* The gap Solo fills */}
          <motion.h2
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ letterSpacing: "-0.02em" }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
          >
            The problem is there's no clear way to get there.
          </motion.h2>

          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
          >
            <p>
              Most advice is either too abstract ("start a business") or too extreme ("quit your job and go all in").
              Neither is particularly helpful if you're operating in a demanding professional role and just want to start building something alongside it.
            </p>
          </motion.div>

          {/* Solo's answer */}
          <motion.div
            className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <Lightbulb className="mb-4 h-7 w-7 text-primary" strokeWidth={1.5} />
            <p className="font-display text-lg font-semibold text-foreground sm:text-xl mb-4">
              That's the gap Solo is designed to fill.
            </p>
            <p className="text-sm leading-[1.85] text-muted-foreground">
              Not by promising anything unrealistic, and not by pushing people into big, risky moves. But by giving a structured way to start - a way to take someone who knows they should probably do something, and help them move into actually doing it, step by step.
            </p>
          </motion.div>

          {/* What Solo does */}
          <motion.div
            className="space-y-5 text-[15px] leading-[1.85] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <p>
              At its core, Solo generates a set of realistic income paths based on your background, helps you choose what's worth pursuing, and then guides you through the first 30 days of actually taking action.
            </p>
          </motion.div>

          {/* Three attributes */}
          <motion.div
            className="flex flex-col gap-3 sm:flex-row sm:gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerChildren}
          >
            {["Deliberately practical.", "Deliberately grounded.", "Designed to fit around a normal working life."].map((text) => (
              <motion.div
                key={text}
                className="flex-1 rounded-lg border border-border bg-surface-card px-5 py-4 text-center"
                variants={fadeChild}
              >
                <p className="text-sm font-semibold text-foreground">{text}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Closing */}
          <motion.div
            className="text-center pb-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-muted-foreground text-[15px] sm:text-base mb-2">The goal isn't to transform everything overnight.</p>
            <p className="font-display text-lg font-semibold text-foreground sm:text-xl">
              It's to help you build something real, alongside what you already have.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Because the earlier you start, the more options you create for yourself - whether you ever need them or not.
            </p>
          </motion.div>

        </div>
      </PanelLayout>

      {/* CTA */}
      <PanelLayout className="overflow-hidden">
        <section className="rounded-2xl bg-primary py-24">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <motion.h2
              className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
              style={{ letterSpacing: "-0.02em" }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              Start your 30-day plan
            </motion.h2>
            <motion.p
              className="mt-4 text-base text-primary-foreground/70"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              Build your second path, one step at a time.
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
                className="rounded-md bg-primary-foreground px-8 py-4 text-base font-medium text-primary hover:bg-primary-foreground/90"
                onClick={() => navigate("/auth")}
              >
                Take the test →
              </Button>
            </motion.div>
          </div>
        </section>
      </PanelLayout>

    </div>
  );
}
