import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import MintTopBar from "@/components/MintTopBar";
import PanelLayout from "@/components/PanelLayout";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function AboutSolo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MintTopBar />
      <Navbar />

      <PanelLayout className="mt-20 px-6 py-16 sm:px-10">
        {/* Hero */}
        <section className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              We Built Solo For A Reason
            </motion.span>
            <motion.h1
              className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              style={{ letterSpacing: "-0.02em" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
            >
              Build income outside your job. Before you need to.
            </motion.h1>
          </div>
        </section>
      </PanelLayout>

      {/* Main narrative */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-base font-medium text-foreground sm:text-lg">
              Solo came out of something I couldn't really ignore anymore.
            </p>

            <p>
              I spend my time inside a large, well-known professional services environment, working close to how organisations are changing - particularly where AI, automation, and new ways of delivering work are starting to reshape what people actually do day to day.
            </p>

            <p>
              From the outside, a lot of this still looks stable. The structures are familiar, the roles are recognisable, and careers still appear to move forward in the way they always have.
            </p>

            <p>But when you're closer to it, you start to see something different.</p>
          </motion.div>

          <motion.div
            className="my-10 space-y-2 border-l-2 border-primary/30 pl-6 text-sm text-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
          >
            <p>You see where work is being broken down and reassembled.</p>
            <p>You see where tasks that used to take hours are compressed into minutes.</p>
            <p>You see where expectations are shifting, quietly but decisively.</p>
          </motion.div>

          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={2}
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

            <p>
              But if you ask a very simple question -
              <span className="font-medium text-foreground"> "Could you generate meaningful income independently, if you had to?" </span>
              - the answer is often far less certain.
            </p>
          </motion.div>
        </div>
      </PanelLayout>

      {/* The independent experience */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <p>At the same time, this isn't just a story about risk.</p>

            <p>
              I've also spent periods working independently, building income outside a traditional structure, and experiencing what that actually feels like in practice.
            </p>

            <p>
              It's not easy. There's ambiguity, a lack of structure, and a constant need to create your own momentum.
            </p>

            <p>But there's also something else:</p>
          </motion.div>

          <motion.div
            className="my-10 space-y-2 border-l-2 border-primary/30 pl-6 text-sm font-medium text-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={1}
          >
            <p>A sense of ownership.</p>
            <p>A different kind of confidence.</p>
            <p>And a level of flexibility and control that's very hard to get any other way.</p>
          </motion.div>

          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={2}
          >
            <p>Once you've experienced even a small version of that, it's difficult to ignore.</p>

            <p>So over time, these two things started to sit alongside each other:</p>

            <p>
              On one hand, a growing awareness that traditional career paths are becoming less predictable.
            </p>

            <p>
              On the other, a belief that operating independently - even in a small way - is not just a defensive move, but a genuinely positive one.
            </p>

            <p>Not everyone needs to leave what they're doing.<br />Not everyone wants to.</p>

            <p>
              But having a second path - something you've built yourself, even at a modest level - changes how you relate to your work, your decisions, and your future.
            </p>
          </motion.div>
        </div>
      </PanelLayout>

      {/* The gap */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-base font-medium text-foreground sm:text-lg">
              The problem is that there's no clear way to get there.
            </p>

            <p>
              Most advice is either too abstract ("start a business") or too extreme ("quit your job and go all in").
              Neither is particularly helpful if you're operating in a demanding professional role and just want to start building something alongside it.
            </p>

            <p className="font-medium text-foreground">
              That's the gap Solo is designed to fill.
            </p>

            <p>
              Not by promising anything unrealistic, and not by pushing people into big, risky moves.
            </p>

            <p>But by giving a structured way to start.</p>

            <p>
              A way to take someone who knows they should probably do something, and help them move into actually doing it - step by step, with enough clarity and momentum to get past the initial friction.
            </p>
          </motion.div>
        </div>
      </PanelLayout>

      {/* What Solo does */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <motion.div
            className="space-y-6 text-sm leading-[1.8] text-muted-foreground sm:text-base"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            custom={0}
          >
            <p>
              At its core, Solo generates a set of realistic income paths based on your background, helps you choose what's worth pursuing, and then guides you through the first 30 days of actually taking action.
            </p>

            <p>It's deliberately practical.<br />Deliberately grounded.<br />And designed to fit around a normal working life.</p>

            <p>The goal isn't to transform everything overnight.</p>

            <p className="text-base font-medium text-foreground sm:text-lg">
              It's to help you build something real, alongside what you already have.
            </p>

            <p>
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

      <Footer />
    </div>
  );
}
