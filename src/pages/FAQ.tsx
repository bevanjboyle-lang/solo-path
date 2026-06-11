import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { startTest, navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
// Footer import dropped 2026-05-18, App.tsx renders the Footer for this route.
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/*
 * FAQ Pass 1 /faq v1 (2026-05-18) legal+FAQ paired translation
 *
 * Editorial reskin of the FAQ surface. Two-column layout: 200px
 * category-nav sidebar left, separated category panels right. TopBar
 * with "FAQ" current; Footer rendered by App.tsx (not in
 * FOOTERLESS_ROUTES) so this page does not render its own.
 *
 * Locked decisions from admin/pass-1-legal-faq-decisions.md:
 *   Serif decision, FAQ answers stay in Inter sans (the system UI
 *     font). Answers are short, UI-adjacent, often contain inline
 *     product links, closer to UI register than long-form prose.
 *     Question titles in display-weight sans; answer continuation in
 *     sans body keeps the typographic seam absent.
 *   F4, All questions COLLAPSED by default. No seed example open.
 *     Cleaner scan; chevron + question pattern is universally
 *     understood. Deep-link expansion still works.
 *   F5, Light closing CTA band ("Ready when you are" +
 *     "Eight minutes to a preview." + mint Take-the-test button).
 *     Authed-buyer variant flips to "Open my plan".
 *   F6, Category panels SEPARATED, not continuous. Each of 5
 *     categories as its own ivory panel. Matches the conceptual
 *     model (topical sections, not interlocking clauses).
 *
 * Cadence: zero dark. Reference content surface.
 *
 * Pass 1 scope: shell + chrome + sidebar + per-category panels +
 * inline accordion + contact strip + closing CTA. Preserves: data
 * structures, deep-link hash expansion, all handlers.
 *
 * ADR-026 Phase 2 (2026-06-10): FT-register flatten. Category panels
 * become plain sections separated by hairline rules; sidebar loses the
 * card look (rule-head label, hairline right rule); hero flattened to
 * eyebrow + .title-h1 + .standfirst; answers render in the serif
 * standfirst register; mint CTA squared to .cta-block. No logic or
 * copy changes.
 */

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
    // Internal id kept as "about-the-test", existing deep links (if any) still resolve.
    // The visible label and Q&A bodies use the L04 cascade vocabulary ("test").
    id: "about-the-test",
    label: "About the test",
    items: [
      { id: "faq-how-long", q: "How long does the test take?", a: "About eight minutes. The questionnaire saves your progress, so you can leave and come back if you need to. The CV upload at the start is skippable in one click; skipping doesn't change the test, only adds about thirty seconds of context to the report when included." },
      { id: "faq-cv-required", q: "Do I need to upload my CV?", a: "No, it's optional. Uploading your CV pre-fills some questions and grounds the analysis in your actual role and history. You can skip it and answer everything manually." },
      { id: "faq-who-for", q: "Who is Solo designed for?", a: "Mid-career professionals with 8+ years of experience who want to understand their independent options. The test is calibrated against archetypes that emerge from senior structured roles." },
      { id: "faq-ai-worry", q: "Do I need to be worried about AI to use Solo?", a: "No. Solo is for anyone who wants to build independent income, whether you are exploring a career change, planning for greater flexibility, preparing for redundancy, or simply want financial options that don't depend entirely on one employer. AI displacement is one reason people come to Solo. It is not the only one, and you do not need to believe your job is at risk to benefit from having a Plan B." },
    ],
  },
  {
    id: "price-and-refunds",
    label: "Price & refunds",
    items: [
      { id: "faq-cost", q: "What does it cost?", a: "The full report is £19.99, a one-time payment. The optional subscription is £19/month or £149/year. Both are explained in detail on the pricing page." },
      { id: "faq-refund", q: "Can I get a refund?", a: "Yes. The £19.99 one-time report is fully refundable within 14 days of purchase, no questions asked. Subscriptions are refundable pro-rata within the first 14 days of an annual plan; monthly subscriptions are cancellable any time but not refunded mid-period." },
      { id: "faq-free-preview", q: "What do I get for free?", a: "Your professional archetype, one hook insight headline, and the top-ranked business path headline. Enough to judge whether the full report is worth £19.99 for you." },
    ],
  },
  {
    id: "data-and-privacy",
    label: "Data & privacy",
    items: [
      { id: "faq-data-stored", q: "Is my data stored?", a: "Yes, securely. We don't sell data or use it for advertising. Full processor list and data-handling details in the privacy policy." },
      { id: "faq-ai-training", q: "Do you use my data to train AI?", a: "No. Our AI vendors are on zero-retention or restricted-retention contracts that contractually prohibit training on customer data. Specifics in the privacy policy." },
      { id: "faq-delete", q: "Can I delete my data?", a: "Yes. From /account → Privacy & data. You can delete just your CV (keeping the report) or delete the whole account. Account deletion is irreversible and clears everything within 30 days, including from backups." },
    ],
  },
  {
    id: "after-the-report",
    label: "After the report",
    items: [
      { id: "faq-come-back", q: "Can I come back to my report later?", a: "Yes. Sign in any time with your email magic link, no password and your report will be there. The report is yours permanently whether you subscribe or not." },
      { id: "faq-tracker", q: "What's the 30-day tracker?", a: "Daily check-ins for 30 days. Each one is a two-minute reflection on what you did, what got stuck, what you'd change. The system regenerates the plan if you fall behind on your moves." },
      { id: "faq-guidance", q: "What are the guidance modules?", a: "Structured walkthroughs covering specific situations, discovery calls, proposal writing, recovering difficult engagements, registration, business setup, professional presence. 3 modules are included with the report; the remaining 22 open with the subscription." },
    ],
  },
  {
    id: "subscription",
    label: "Subscription",
    items: [
      { id: "faq-sub-required", q: "Do I need a subscription?", a: "No. The report and 30-day plan are standalone. The subscription is what keeps the tracker running past day 30 and unlocks the remaining 22 guidance modules." },
      { id: "faq-sub-cancel", q: "Can I cancel?", a: "Yes, any time. Access continues to the end of your billing period, no refund mid-period for monthly. Annual subscriptions are pro-rata refundable in the first 14 days." },
      { id: "faq-sub-includes", q: "What does the subscription include?", a: "Ongoing tracker with weekly check-ins past day 30, the remaining 29 guidance modules (32 total), unlimited Ask Solo conversations, and a fresh test whenever your situation changes." },
    ],
  },
];

export default function FAQ() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [openValues, setOpenValues] = useState<Record<string, string | undefined>>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const handleStartTest = () => startTest(navigate);
  const handleOpenPlan = () => navigateAuthed(navigate, "/plan");

  const totalQuestions = categories.reduce((sum, c) => sum + c.items.length, 0);

  /* ── Deep-link on mount ── */
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;

    for (const cat of categories) {
      const item = cat.items.find((i) => i.id === hash);
      if (item) {
        setOpenValues((prev) => ({ ...prev, [cat.id]: item.id }));
        setHighlightedId(item.id);
        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        const timer = setTimeout(() => setHighlightedId(null), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [location.hash]);

  const toggleItem = (catId: string, itemId: string) => {
    setOpenValues((prev) => ({ ...prev, [catId]: prev[catId] === itemId ? undefined : itemId }));
  };

  /* ── Category nav rendered shared between desktop sidebar + mobile sheet ── */
  const categoryNav = (closeSheet?: () => void) => (
    <nav aria-label="FAQ categories">
      <ul className="flex flex-col gap-0.5">
        {categories.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                sectionRefs.current[c.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                closeSheet?.();
              }}
              className="group w-full grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 px-1 py-2 text-left text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="shrink-0 text-[10px] font-bold tabular-nums tracking-[0.08em] text-[#15735F]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{c.label}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums">
                {c.items.length}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="relative min-h-screen flex flex-col text-foreground">
      <TopBar />

      <main className="flex-1">
        <section className="pt-8 pb-8 lg:pb-12">
          <div className="mx-auto max-w-6xl px-6">

            {/* Mobile category trigger */}
            <div className="lg:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-foreground transition-colors bg-[#F3F1ED] border border-border"
                  >
                    <List className="h-4 w-4" style={{ color: "#15735F" }} />
                    <span>Categories</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-6 overflow-y-auto">
                  <div className="rule-head mb-4">Categories</div>
                  {categoryNav(undefined)}
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex gap-8 lg:gap-10">

              {/* ── Category sidebar, desktop only ── */}
              <aside className="hidden lg:block w-[220px] shrink-0 border-r border-border pr-6">
                <div className="sticky top-20">
                  <div className="rule-head mb-3">Categories</div>
                  <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
                    {categoryNav()}
                  </div>
                  <div className="pt-4 mt-2 border-t border-border">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      Total
                    </div>
                    <div className="mt-1 text-[12px] text-foreground tabular-nums">
                      {totalQuestions} questions
                    </div>
                  </div>
                </div>
              </aside>

              {/* ── Main column ── */}
              <div className="flex-1 min-w-0">
                <h1 className="sr-only">Questions, answered</h1>

                {/* Page header, flat on the page */}
                <section className="pb-8">
                  <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    <span className="text-foreground">Help</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground/70">Common questions</span>
                  </div>
                  <div aria-hidden className="title-h1">
                    Questions, answered.
                  </div>
                  <p className="standfirst mt-4 max-w-[54ch]">
                    The questions people actually ask before paying. If yours isn't here, email us, the
                    link is at the bottom.
                  </p>
                </section>

                {/* ── Category sections on hairline rules (panels flattened, ADR-026) ── */}
                <div>
                  {categories.map((cat, i) => (
                    <section
                      key={cat.id}
                      id={cat.id}
                      ref={(el) => { sectionRefs.current[cat.id] = el; }}
                      className="border-t border-border py-7 scroll-mt-24"
                    >
                      {/* Category head */}
                      <div className="flex items-baseline justify-between pb-4 mb-2 border-b border-border">
                        <div className="flex items-baseline gap-3">
                          <span className="text-[11px] font-bold tabular-nums tracking-[0.08em] text-[#15735F]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <h2
                            className="font-display text-[18px] sm:text-[20px] font-bold tracking-tight text-foreground leading-[1.2]"
                            style={{ letterSpacing: "-0.018em" }}
                          >
                            {cat.label}.
                          </h2>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
                          {cat.items.length} questions
                        </span>
                      </div>

                      {/* Accordion items */}
                      {cat.items.map((item, j) => {
                        const isOpen = openValues[cat.id] === item.id;
                        const isHighlighted = highlightedId === item.id;
                        return (
                          <div
                            key={item.id}
                            id={item.id}
                            className={`py-4 transition-colors duration-300 ${
                              j > 0 ? "border-t border-border" : ""
                            } ${
                              isHighlighted ? "bg-[rgba(46,205,176,0.05)] -mx-3 px-3" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(cat.id, item.id)}
                              aria-expanded={isOpen}
                              className="w-full grid grid-cols-[1fr_auto] gap-4 items-start text-left"
                            >
                              <span
                                className={`font-display text-[15.5px] sm:text-[16px] text-foreground leading-[1.4] ${
                                  isOpen ? "font-bold" : "font-semibold"
                                }`}
                                style={{ letterSpacing: "-0.012em" }}
                              >
                                {item.q}
                              </span>
                              <span className="text-[20px] text-muted-foreground/60 font-light leading-none pt-0.5 select-none">
                                {isOpen ? "–" : "+"}
                              </span>
                            </button>
                            {isOpen && (
                              <p className="standfirst mt-3 text-[14px] sm:text-[15px] max-w-[64ch]">
                                {item.a}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </section>
                  ))}
                </div>

                {/* Contact strip */}
                <section
                  className="px-6 sm:px-8 py-5 mb-6 mt-6 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 sm:gap-5 items-baseline"
                  style={{ background: "#F3F1ED", borderLeft: "3px solid #1A1915" }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#15735F" }}>
                    Still stuck?
                  </span>
                  <p className="font-display text-[15px] text-foreground leading-[1.45]" style={{ letterSpacing: "-0.012em" }}>
                    Email us, we read every message.
                  </p>
                  <a
                    href="mailto:support@solo-plan.com"
                    className="font-mono text-[13px] text-foreground underline underline-offset-[3px] decoration-[#2ECDB0] hover:decoration-foreground whitespace-nowrap"
                  >
                    support@solo-plan.com
                  </a>
                </section>

                {/* Light closing CTA (F5 keep), flat on a hairline rule (ADR-026) */}
                <section className="border-t border-border py-12 sm:py-14 text-center mt-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
                    {user ? "Pick up where you left off" : "Ready when you are"}
                  </div>
                  <h3
                    className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-[1.1] text-foreground max-w-[22ch] mx-auto mb-6"
                    style={{ letterSpacing: "-0.03em", textWrap: "balance" } as React.CSSProperties}
                  >
                    {user ? "Your plan is waiting." : "Eight minutes to a preview."}
                  </h3>
                  <button
                    onClick={user ? handleOpenPlan : handleStartTest}
                    className="cta-block"
                  >
                    {user ? "Open my plan" : "Find what works"}
                  </button>
                  {!user && (
                    <div className="mt-4 text-[11px] text-muted-foreground/70 tracking-[0.04em]">
                      £19.99 one-time · or £19/mo with cancel any time
                    </div>
                  )}
                </section>

              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer removed from page render 2026-05-18: App.tsx already
        * renders <Footer /> for /faq (it's not in FOOTERLESS_ROUTES).
        * The page-level render was producing a duplicate dark bar. */}
    </div>
  );
}
