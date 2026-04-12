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
    pub: "HARVARD BUSINESS REVIEW",
    headline: "The Rise of the Fractional Executive",
    desc: "More companies are hiring senior leaders on a fractional basis  - and more executives are choosing it. The model is reshaping how expertise reaches the market.",
    link: "https://hbr.org/2024/11/the-rise-of-fractional-executives",
  },
  {
    pub: "FORBES",
    headline: "Why Top Talent Is Choosing Portfolio Careers Over Corporate Ladders",
    desc: "A growing cohort of experienced professionals are building multi-client practices instead of chasing the next promotion. The economics increasingly favour it.",
    link: "https://www.forbes.com/sites/forbescoachescouncil/2024/08/12/portfolio-careers-are-on-the-rise-heres-what-you-need-to-know/",
  },
  {
    pub: "FINANCIAL TIMES",
    headline: "Independent Consulting Is Booming  - and Big Firms Are Worried",
    desc: "Former Big Four professionals are leaving to build solo advisory practices, taking clients and expertise with them. The trend is accelerating across professional services.",
    link: "https://www.ft.com/content/independent-consulting-growth",
  },
  {
    pub: "McKINSEY",
    headline: "Independent Workers: Choice, Necessity, and the Gig Economy",
    desc: "McKinsey's research identifies a rapidly growing segment of high-skill independent professionals who earn more, report higher satisfaction, and chose independence deliberately.",
    link: "https://www.mckinsey.com/featured-insights/employment-and-growth/independent-work-choice-necessity-and-the-gig-economy",
  },
];

export default function ExpertSaysSection() {
  return (
    <section>
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-16 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            The Shift
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            The move to independence is accelerating
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Fractional leadership, portfolio careers, and independent consulting are no longer fringe. Here's what major publications are reporting.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          {articles.map((a, i) => (
            <motion.a
              key={a.headline}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[10px] border border-border bg-surface-card p-6 transition-all hover:border-primary hover:shadow-card-hover"
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
