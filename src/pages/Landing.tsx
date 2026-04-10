import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Target, Route, CalendarCheck } from "lucide-react";
import Navbar from "@/components/Navbar";

const features = [
  {
    icon: Target,
    title: "Archetype classification",
    desc: "We identify what type of professional you are and what that's worth commercially.",
  },
  {
    icon: Route,
    title: "3 realistic business options",
    desc: "Specific paths matched to your background, with pricing, sales complexity, and time to first revenue.",
  },
  {
    icon: CalendarCheck,
    title: "Your activation plan",
    desc: "A 30-day day-by-day action plan tailored to your network and availability.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h1
            className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Your Plan B, built from your actual experience.
          </motion.h1>
          <motion.p
            className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            A structured report that turns your professional background into a credible independent income path. Specific, realistic, and commercially grounded.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button
              onClick={() => navigate("/auth")}
              className="mt-10 inline-flex items-center rounded-lg px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
              style={{ background: "var(--gradient-cta)" }}
            >
              Build your Plan B →
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 sm:grid-cols-3 sm:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="flex flex-col gap-3"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
            >
              <f.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border/50 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Free teaser</span>
            <span className="mx-3 text-border">·</span>
            <span>Full report £9.99 one-time</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <span className="text-xs font-medium tracking-tight text-muted-foreground">Solo</span>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors">Privacy</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
