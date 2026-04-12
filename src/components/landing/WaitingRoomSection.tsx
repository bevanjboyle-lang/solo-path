import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const paragraphs = [
  "There's a particular kind of anxiety that comes from knowing something is probably coming, but not knowing exactly when.",
  "I've been talking to mid-career professionals about their Plan B. What strikes me isn't their panic. It's their paralysis.",
  "They know AI is changing their industry. They've seen the articles. They've watched colleagues' roles get restructured. They've sat through town halls about 'digital transformation.' And then they go back to their desks and do exactly the same job, in exactly the same way, hoping their particular niche holds out a bit longer.",
  "This is the waiting room problem.",
  "The professionals who'll be fine aren't the ones in the right sector. They're the ones who got uncomfortable early, the ones who asked 'what would I do if this role disappeared tomorrow?' before it became an emergency.",
  "Most people can't answer that question. Not because they're not talented. They are. But because they've never needed to think commercially about their own experience before. An employer always did that translation for them.",
  "The question isn't whether AI is coming for your role. The better question is: what do you already have that an employer was paying for, and who else would pay for it directly?",
  "A solicitor with 15 years in employment law doesn't just 'do legal work.' They have judgment, relationships, and specialist knowledge that smaller companies can't afford to keep in-house, but would pay for by the day.",
  "A senior marketing director who's overseen £40m in media spend isn't just 'a marketer.' They're someone who can walk into a founder-led business and immediately diagnose why their customer acquisition is broken.",
  "The experience is there. The capability is there. What's missing is the map.",
  "The people who'll look back on this period most calmly are the ones who built something before the emergency. Not because they were certain something was coming. But because they didn't want to still be in the waiting room when it did.",
];

export default function WaitingRoomSection() {
  return (
    <section className="border-t border-border/50 bg-[hsl(var(--card))] py-24">
      <div className="mx-auto max-w-2xl px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Solo Perspective
          </span>
          <h2 className="font-display mb-10 text-2xl font-semibold tracking-tight sm:text-3xl">
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
          className="mt-10 text-xs text-muted-foreground/60"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={2}
        >
          Solo, April 2026
        </motion.p>
      </div>
    </section>
  );
}
