import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { List } from "lucide-react";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/*
 * LegalPage — Pass 1 v1 (2026-05-18) — legal+FAQ paired translation
 *
 * Editorial reskin of the shared shell for /privacy and /terms. Two-
 * column layout: 200px TOC sidebar left, continuous body panel right.
 * TopBar.anonymous + Footer (Footer hides when authed per existing
 * behaviour).
 *
 * Locked decisions from admin/pass-1-legal-faq-decisions.md:
 *   Serif decision — Source Serif 4 on body prose (rule: if user is
 *     reading prose for content not scanning UI for action, use serif).
 *   F1 — Continuous body panel with hairline section breaks (NOT
 *     separated panels). Legal clauses are interlocking, not
 *     substantively independent like /report's sections.
 *   F2 — TOC footer meta shows section count only (no word count).
 *   F3 — No visible monospace anchor labels on section heads.
 *     Hash deep-links still work via section IDs in the DOM.
 *
 * Cadence: zero dark. Reference content surface; no pivot moments.
 *
 * Pass 1 scope: shell + TOC vocabulary + page-header panel + body
 * panel + section heads + serif prose styling. Hash deep-link
 * scroll behaviour + TBC banner mechanism preserved.
 */

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  /** Subhead — one-line framing sentence beneath the H1. */
  subhead?: string;
  /** Eyebrow second clause ("Privacy" / "Terms"). First clause is always "Legal". */
  eyebrow: string;
  lastUpdated: string;
  sections: LegalSection[];
  /** Renders a warning-tinted TBC banner at the top of the body panel. Non-prod use only. */
  isTBC?: boolean;
}

export default function LegalPage({
  title, subhead, eyebrow, lastUpdated, sections, isTBC = false,
}: LegalPageProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  /* ── Deep-link on mount ── */
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightedId(hash);
        const timer = setTimeout(() => setHighlightedId(null), 1500);
        return () => clearTimeout(timer);
      }
    });
  }, [location.hash]);

  /* ── TOC nav rendered shared between desktop sidebar + mobile sheet ── */
  const tocNav = (closeSheet?: () => void) => (
    <nav aria-label="Table of contents">
      <ul className="flex flex-col gap-0.5">
        {sections.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                sectionRefs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                closeSheet?.();
              }}
              className="group w-full flex items-baseline gap-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="shrink-0 text-[10px] font-bold tabular-nums tracking-[0.08em] text-[#15735F]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{s.title}</span>
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
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-screen-lg px-6">

            {/* Mobile TOC trigger — sticky strip beneath top bar */}
            <div className="lg:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[13px] font-semibold text-foreground transition-colors"
                    style={{ background: "#F3F1ED" }}
                  >
                    <List className="h-4 w-4" style={{ color: "#15735F" }} />
                    <span>On this page</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-6 overflow-y-auto">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-4">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>On this page</span>
                  </div>
                  {tocNav(undefined)}
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex gap-8 lg:gap-10">

              {/* ── TOC sidebar — desktop only ── */}
              <aside className="hidden lg:block w-[220px] shrink-0 border-r border-border pr-6">
                <div className="sticky top-20">
                  <div className="rule-head mb-3">
                    On this page
                  </div>
                  <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
                    {tocNav()}
                  </div>
                  <div className="pt-4 mt-1 border-t border-border">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      Sections
                    </div>
                    <div className="mt-1 text-[12px] text-foreground tabular-nums">
                      {sections.length}
                    </div>
                  </div>
                </div>
              </aside>

              {/* ── Main column ── */}
              <div className="flex-1 min-w-0">
                <h1 className="sr-only">{title}</h1>

                {/* Page header — flat, on the page */}
                <section className="pb-8 sm:pb-10 mb-6 border-b border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-8 items-end">
                    <div>
                      <div className="eyebrow flex items-center gap-2.5 mb-4">
                        <span>Legal</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground/70">{eyebrow}</span>
                      </div>
                      <div
                        aria-hidden
                        className="font-display text-[34px] sm:text-[40px] lg:text-[44px] font-extrabold tracking-tight leading-[1.05] text-foreground"
                        style={{ letterSpacing: "-0.028em" }}
                      >
                        {title}.
                      </div>
                      {subhead && (
                        <p className="standfirst mt-4 max-w-[54ch]">
                          {subhead}
                        </p>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
                        Last updated
                      </div>
                      <div className="text-[13px] font-medium text-foreground tabular-nums">
                        {lastUpdated}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Body — continuous column with hairline section breaks */}
                <section className="mb-6">

                  {/* Optional TBC banner — non-prod only */}
                  {isTBC && (
                    <div
                      className="mt-5 mb-2 px-4 py-3 grid grid-cols-[auto_1fr] gap-x-3 items-baseline"
                      style={{ background: "#FDF8E8", borderLeft: "3px solid #D4940A" }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#D4940A" }}>
                        Non-prod
                      </span>
                      <div className="text-[13px] text-foreground/85 leading-snug">
                        This page is being finalised — final review before launch.
                      </div>
                    </div>
                  )}

                  {sections.map((s, i) => (
                    <section
                      key={s.id}
                      id={s.id}
                      ref={(el) => { sectionRefs.current[s.id] = el; }}
                      className={`py-7 sm:py-8 scroll-mt-24 transition-colors duration-300 ${
                        i > 0 ? "border-t border-border" : ""
                      } ${
                        highlightedId === s.id ? "bg-[rgba(46,205,176,0.05)] -mx-4 px-4" : ""
                      }`}
                    >
                      <div className="flex items-baseline gap-4 mb-4">
                        <span className="shrink-0 text-[11px] font-bold tabular-nums tracking-[0.08em]" style={{ color: "#15735F" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h2
                          className="font-display text-[20px] sm:text-[24px] font-bold tracking-tight text-foreground leading-[1.2]"
                          style={{ letterSpacing: "-0.02em" }}
                        >
                          {s.title}.
                        </h2>
                      </div>
                      <div className="prose-serif">
                        {s.content}
                      </div>
                    </section>
                  ))}
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>

      {!user && <Footer sticky={false} />}
    </div>
  );
}
