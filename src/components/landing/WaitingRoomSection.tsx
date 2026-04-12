import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const paragraphs = [
  "Most white-collar professionals look secure. Salaried role, pension contributions, a title that means something inside the building. From the outside, it reads as stability.",
  "But look at the structure underneath and something is missing.",
  "One income stream. One employer. One professional identity - defined entirely by an organisation they don't control. No tested route to earning independently. No offer they could take to market next month if they had to.",
  "This is the optionality gap: the distance between how secure a career looks and how few alternatives actually exist if it changes.",
  "Careers change for dozens of reasons. Restructures. New leadership. Sector contraction. Relocation. Burnout. A simple realisation that the next promotion isn't worth what it costs. Most professionals know this. What they haven't done is build anything outside the salaried structure that could generate income independently.",
  "The gap isn't about capability. It's about infrastructure. The skills are there. The route to market isn't.",
  "A professional who has identified two or three realistic independent income paths - and knows concretely how they'd pursue them - negotiates differently. They make career decisions from a position of knowledge rather than dependency.",
  "Optionality doesn't require action. It requires preparation.",
];

export default function WaitingRoomSection() {
  return (
    <section>
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Solo Perspective
          </span>
          <h2 className="font-display mb-10 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            The Optionality Gap
          </h2>
        </motion.div>

        <motion.div
          className="space-y-5"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp} custom={1}
        >
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-[1.8] text-muted-foreground sm:text-base">
              {p}
            </p>
          ))}
        </motion.div>

        <motion.p
          className="mt-10 text-xs" style={{ color: "#A09A92" }}
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={2}
        >
          Solo, April 2026
        </motion.p>
      </div>
    </section>
  );
}
