import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const reportFaqs = [
  {
    q: "What do I actually get for £9.99?",
    a: "A personalised 8-section report based on your 12-minute diagnostic. Covers: transferable skills ranked and explained, your three most viable alternative paths (with day rates, target clients, time-to-revenue estimates), market intelligence for your role and location, and a 90-day action plan with specific first steps. You own it permanently — no subscription required.",
  },
  {
    q: "How long does it take?",
    a: "The diagnostic takes 10–15 minutes. Your report is generated immediately and appears on screen as soon as you complete payment.",
  },
  {
    q: "Do I need to be thinking about leaving my job?",
    a: "No. Most Solo users are not actively looking to leave — they're building optionality. Knowing you have viable routes out changes how you show up at work. It also means that if something changes — redundancy, restructure, burnout — you're not starting from zero.",
  },
  {
    q: "Is this just a ChatGPT wrapper?",
    a: "No. Solo uses a structured diagnostic with profession-specific logic, curated market rate benchmarks, and a multi-step reasoning process built specifically for mid-career transitions. A generic AI prompt gives generic output. Solo is calibrated for your role, experience level, location, and the current market.",
  },
  {
    q: "What's the Adaptive Tracker?",
    a: "The Adaptive Tracker (£12.99/month) is a living version of your report. It sends a weekly check-in — one question, 90 seconds — and uses your answers to update your action plan over time. Includes quarterly re-scoring of your transferability and market positioning.",
  },
  {
    q: "Can I get a refund?",
    a: "Because the report is generated and delivered immediately on purchase, we can't offer refunds on digital reports. If you have a genuine problem — missing sections, technical error, content that seems wrong — email hello@solopath.co and we'll fix it.",
  },
];

const productFaqs = [
  {
    q: "Who is Solo for?",
    a: "Mid-career white-collar professionals — typically 30s or 40s — who have built real expertise but aren't sure how portable it is. Most users are in risk, finance, operations, compliance, transformation, or consulting. If you've been in a proper job for 8+ years and you're vaguely worried about what comes next, Solo is for you.",
  },
  {
    q: "Is my data saved?",
    a: "Your report answers are stored securely so you can return later. We don't sell your data or use it for advertising. Email hello@solopath.co to request deletion.",
  },
  {
    q: "Can I come back to my report later?",
    a: "Yes. Create a free account and your report is saved. Access it any time from any device.",
  },
  {
    q: "Do you use my data to train AI models?",
    a: "No. Your diagnostic responses are used solely to generate your report and are not used to train any AI model.",
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="flex flex-col items-center justify-center px-6 pb-8 pt-32 sm:pt-36">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Questions we get asked a lot
          </motion.h1>
          <motion.p
            className="mt-4 text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            If you don't find what you're looking for, email us at{" "}
            <a href="mailto:hello@solopath.co" className="text-primary hover:text-primary/80">
              hello@solopath.co
            </a>
          </motion.p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-16 px-6 pb-24">
        {/* ABOUT THE REPORT */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <h2 className="font-display mb-6 text-lg font-semibold">About the Report</h2>
          <Accordion type="single" collapsible className="w-full">
            {reportFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`report-${i}`} className="border-border/50">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* ABOUT THE PRODUCT */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <h2 className="font-display mb-6 text-lg font-semibold">About the Product</h2>
          <Accordion type="single" collapsible className="w-full">
            {productFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`product-${i}`} className="border-border/50">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>

      {/* FOOTER CTA */}
      <section className="border-t border-border/50 py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h3 className="font-display text-lg font-semibold">Still have a question?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Email us at{" "}
            <a href="mailto:hello@solopath.co" className="text-primary hover:text-primary/80">
              hello@solopath.co
            </a>{" "}
            — we respond within one business day.
          </p>
          <p className="mt-4 text-sm">
            <Link to="/sample-report" className="text-primary transition-colors hover:text-primary/80">
              Or check out the sample report to see exactly what you get →
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <span className="text-xs font-medium tracking-tight text-muted-foreground">Solo</span>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="cursor-pointer transition-colors hover:text-foreground">Privacy</span>
            <span className="cursor-pointer transition-colors hover:text-foreground">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
