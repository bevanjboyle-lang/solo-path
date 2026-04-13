import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const testimonials = [
  {
    quote: "I'd been vaguely aware my role was changing for two years. Solo gave me three concrete paths I'd never seriously considered, and I'm already six months into pursuing one of them.",
    name: "James T., 44, Senior Account Director",
  },
  {
    quote: "I assumed my options were 'stay put' or 'go freelance and struggle.' Solo showed me there was a much more specific version of independent work that actually matched what I'd built. I had no idea that was possible.",
    name: "Rachel M., 38, Head of HR, Financial Services",
  },
  {
    quote: "The 30-day plan was the thing that made it real. It wasn't just ideas, it was actual first steps. I sent my first outreach email in week two and had a conversation within days.",
    name: "David K., 51, ex-Director of Strategy, Retail",
  },
];

export default function TestimonialsSection() {
  return (
    <section>
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-16 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Testimonials
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            From people who've built their Plan B
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Real professionals who used Solo to map their options before they needed to.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="rounded-[10px] border border-border bg-surface-card p-6 transition-all hover:border-primary hover:shadow-card-hover"
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: "-60px" }} custom={i}
            >
              <Quote className="mb-3 h-5 w-5 text-primary/40" strokeWidth={1.5} />
              <p className="mb-4 text-sm italic leading-relaxed text-foreground/90">
                "{t.quote}"
              </p>
              <span className="text-xs text-muted-foreground">{t.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
  {
    quote: "I'd been vaguely aware my role was changing for two years. Solo gave me three concrete paths I'd never seriously considered, and I'm already six months into pursuing one of them.",
    name: "James T., 44, Senior Account Director",
  },
  {
    quote: "I assumed my options were 'stay put' or 'go freelance and struggle.' Solo showed me there was a much more specific version of independent work that actually matched what I'd built. I had no idea that was possible.",
    name: "Rachel M., 38, Head of HR, Financial Services",
  },
  {
    quote: "The 30-day plan was the thing that made it real. It wasn't just ideas, it was actual first steps. I sent my first outreach email in week two and had a conversation within days.",
    name: "David K., 51, ex-Director of Strategy, Retail",
  },
  {
    quote: "I'd always thought of myself as 'not entrepreneurial.' Solo reframed what I already knew how to do as something people would pay for. That shift in perspective changed everything.",
    name: "Laura H., 46, Programme Director, Public Sector",
  },
  {
    quote: "What surprised me most was how specific the recommendations were. It wasn't generic career advice — it felt like someone who actually understood my industry had sat down and mapped it out.",
    name: "Tom W., 39, Head of Product, SaaS",
  },
];

export default function TestimonialsSection() {
  return (
    <section>
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-16 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp} custom={0}
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Testimonials
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            From people who've built their Plan B
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Real professionals who used Solo to map their options before they needed to.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className={`rounded-[10px] border p-6 transition-all hover:shadow-card-hover ${
                (t as any).bold
                  ? "border-primary bg-primary/5 hover:border-primary"
                  : "border-border bg-surface-card hover:border-primary"
              }`}
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: "-60px" }} custom={i}
            >
              <Quote className="mb-3 h-5 w-5 text-primary/40" strokeWidth={1.5} />
              <p className={`mb-4 leading-relaxed ${
                (t as any).bold
                  ? "text-sm font-semibold not-italic text-foreground"
                  : "text-sm italic text-foreground/90"
              }`}>
                "{t.quote}"
              </p>
              <span className="text-xs text-muted-foreground">{t.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}