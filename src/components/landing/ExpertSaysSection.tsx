import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const articles = [
  {
    pub: "FORTUNE",
    headline: "A 'Great Recession for White-Collar Workers' Is Absolutely Possible",
    desc: "Anthropic's internal research suggests AI could trigger unemployment levels not seen since the 1930s, concentrated in professional roles.",
    link: "https://fortune.com/2026/03/06/ai-job-losses-report-anthropic-research-great-recession-for-white-collar-workers/",
  },
  {
    pub: "CNBC",
    headline: "AI Is Already Taking White-Collar Jobs. Economists Warn There's 'Much More in the Tank'",
    desc: "Economists say we're in the early innings. The real displacement hasn't started yet, and the pace will accelerate sharply.",
    link: "https://www.cnbc.com/2025/10/22/ai-taking-white-collar-jobs-economists-warn-much-more-in-the-tank.html",
  },
  {
    pub: "FORTUNE",
    headline: "Microsoft's AI Chief Gives It 18 Months for All White-Collar Work to Be Automated",
    desc: "Mustafa Suleyman's timeline is aggressive, but it reflects a growing consensus among AI leaders about the pace of change.",
    link: "https://fortune.com/2026/02/13/when-will-ai-kill-white-collar-office-jobs-18-months-microsoft-mustafa-suleyman/",
  },
  {
    pub: "GOLDMAN SACHS",
    headline: "How Will AI Affect the Global Workforce?",
    desc: "Goldman's analysis identifies legal, financial, and administrative professionals as among the most exposed to large-scale automation.",
    link: "https://www.goldmansachs.com/insights/articles/how-will-ai-affect-the-global-workforce",
  },
];

export default function ExpertSaysSection() {
  return (
    <section className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          className="mb-16 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Expert Opinion
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            What the experts are saying
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            The case for acting now is no longer fringe opinion. Here's what major institutions are publishing.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {articles.map((a, i) => (
            <motion.a
              key={a.headline}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/40 hover:bg-card/80"
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: "-60px" }} custom={i}
            >
              <span className="mb-2 inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {a.pub}
              </span>
              <h3 className="mb-2 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                {a.headline}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                Read <ExternalLink className="h-3 w-3" />
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
