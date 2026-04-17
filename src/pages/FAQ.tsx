import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import PanelLayout from "@/components/PanelLayout";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ── FAQ data — placeholder content ── */
interface FAQItem {
  id: string;
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  label: string;
  items: FAQItem[];
}

const categories: FAQCategory[] = [
  {
    id: "about-the-test",
    label: "About the test",
    items: [
      { id: "faq-how-long", q: "How long does the test take?", a: "[Placeholder] The questionnaire takes around 8 minutes. Your report generates immediately after." },
      { id: "faq-cv-required", q: "Do I need to upload my CV?", a: "[Placeholder] No, it's optional. Uploading your CV pre-fills some questions and saves time." },
      { id: "faq-who-for", q: "Who is Solo designed for?", a: "[Placeholder] Mid-career professionals with 8+ years of experience who want to understand their independent options." },
      { id: "faq-ai-worry", q: "Do I need to be worried about AI to use Solo?", a: "No. Solo is for anyone who wants to build independent income — whether you are exploring a career change, planning for greater flexibility, preparing for redundancy, or simply want financial options that don't depend entirely on one employer. AI displacement is one reason people come to Solo. It is not the only one, and you do not need to believe your job is at risk to benefit from having a Plan B." },
    ],
  },
  {
    id: "price-and-refunds",
    label: "Price & refunds",
    items: [
      { id: "faq-cost", q: "What does it cost?", a: "[Placeholder] The full report is £19.99 — a one-time payment. The optional subscription is £19/month or £149/year." },
      { id: "faq-refund", q: "Can I get a refund?", a: "[Placeholder] Because the report is generated instantly and personalised, refunds are not standard. Contact us if something is wrong." },
      { id: "faq-free-preview", q: "What do I get for free?", a: "[Placeholder] Your professional archetype, one hook insight headline, and top-ranked business path headline." },
    ],
  },
  {
    id: "data-and-privacy",
    label: "Data & privacy",
    items: [
      { id: "faq-data-stored", q: "Is my data stored?", a: "[Placeholder] Yes, securely. We don't sell data or use it for advertising." },
      { id: "faq-ai-training", q: "Do you use my data to train AI?", a: "[Placeholder] No. Your responses are used solely to generate your report." },
      { id: "faq-delete", q: "Can I delete my data?", a: "[Placeholder] Yes. Email support@solo.so and we'll delete your account and data within 30 days." },
    ],
  },
  {
    id: "after-the-report",
    label: "After the report",
    items: [
      { id: "faq-come-back", q: "Can I come back to my report later?", a: "[Placeholder] Yes. Sign in any time and your report will be there." },
      { id: "faq-tracker", q: "What's the Adaptive Tracker?", a: "[Placeholder] A 30-day system of daily check-ins that adapts your plan if you fall behind." },
      { id: "faq-guidance", q: "What are the Guidance Modules?", a: "[Placeholder] Structured walkthroughs covering registration, business setup, professional presence, and more." },
    ],
  },
  {
    id: "subscription",
    label: "Subscription",
    items: [
      { id: "faq-sub-required", q: "Do I need a subscription?", a: "[Placeholder] No. The report and 30-day plan are standalone. The subscription continues support after Day 30." },
      { id: "faq-sub-cancel", q: "Can I cancel?", a: "[Placeholder] Yes, any time. Access continues to the end of your billing period." },
      { id: "faq-sub-includes", q: "What does the subscription include?", a: "[Placeholder] Ongoing tracker, full guidance library (25 modules), Ask Solo, and replan engine." },
    ],
  },
];

export default function FAQ() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [openValues, setOpenValues] = useState<Record<string, string | undefined>>({});
  const [mobileCategory, setMobileCategory] = useState(categories[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const handleStartTest = () => startTest(navigate);
  const handleOpenPlan = () => navigateAuthed(navigate, "/plan");

  // Deep-link on mount
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;

    // Find the item and its category
    for (const cat of categories) {
      const item = cat.items.find((i) => i.id === hash);
      if (item) {
        // Open that accordion
        setOpenValues((prev) => ({ ...prev, [cat.id]: item.id }));
        setHighlightedId(item.id);

        // Scroll into view after render
        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        // Clear highlight after 1s
        const timer = setTimeout(() => setHighlightedId(null), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />

      {/* HERO */}
      <PanelLayout className="px-6 py-16 sm:px-10">
        <section className="mx-auto max-w-2xl text-center">
          <motion.h1
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            style={{ letterSpacing: "-0.02em" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Questions people actually ask.
          </motion.h1>
          <motion.p
            className="mt-4 text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            If yours isn't here, email us.
          </motion.p>
        </section>
      </PanelLayout>

      {/* MAIN CONTENT */}
      <PanelLayout wide className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-4xl">
          {/* Mobile category dropdown */}
          <div className="mb-6 lg:hidden">
            <select
              value={mobileCategory}
              onChange={(e) => {
                setMobileCategory(e.target.value);
                const el = sectionRefs.current[e.target.value];
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-full rounded-lg border border-border bg-[hsl(var(--surface-panel))] px-4 py-2.5 text-sm font-medium text-foreground"
              aria-label="Jump to category"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-10">
            {/* Desktop sidebar */}
            <nav className="sticky top-24 hidden h-fit w-48 shrink-0 lg:block" aria-label="FAQ categories">
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        sectionRefs.current[c.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="block rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-inset))] hover:text-foreground"
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* FAQ sections */}
            <div className="flex-1 space-y-12">
              {categories.map((cat) => (
                <section
                  key={cat.id}
                  id={cat.id}
                  ref={(el) => { sectionRefs.current[cat.id] = el; }}
                >
                  <h2 className="font-display mb-4 text-lg font-semibold text-foreground">
                    {cat.label}
                  </h2>
                  <Accordion
                    type="single"
                    collapsible
                    value={openValues[cat.id]}
                    onValueChange={(val) =>
                      setOpenValues((prev) => ({ ...prev, [cat.id]: val }))
                    }
                    className="w-full"
                  >
                    {cat.items.map((item) => (
                      <AccordionItem
                        key={item.id}
                        value={item.id}
                        id={item.id}
                        className={`border-border transition-all duration-300 ${
                          highlightedId === item.id
                            ? "bg-[rgba(46,205,176,0.06)] rounded-lg"
                            : ""
                        }`}
                      >
                        <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ))}
            </div>
          </div>
        </div>
      </PanelLayout>

      {/* CONTACT STRIP */}
      <PanelLayout className="px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">
            Still stuck? Email{" "}
            <a href="mailto:support@solo.so" className="font-medium text-primary hover:text-primary/80">
              support@solo.so
            </a>
          </p>
        </div>
      </PanelLayout>

      {/* CLOSING CTA */}
      <PanelLayout className="overflow-hidden">
        <ScrollReveal>
          <section className="bg-primary py-20 rounded-2xl">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2
                className="font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {user ? "Your plan is waiting." : "See what your Plan B looks like."}
              </h2>
              <div className="mt-8">
                <button
                  onClick={user ? handleOpenPlan : handleStartTest}
                  className="rounded-md bg-primary-foreground px-8 py-3 text-sm font-medium text-primary transition-all hover:bg-primary-foreground/90"
                >
                  {user ? "Open my plan" : "Take the test"}
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </PanelLayout>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[hsl(var(--surface-panel))] p-3 sm:hidden">
        <button
          onClick={user ? handleOpenPlan : handleStartTest}
          className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          {user ? "Open my plan" : "Take the test"}
        </button>
      </div>
    </div>
  );
}
