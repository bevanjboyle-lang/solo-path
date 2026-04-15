import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import Banner from "@/components/Banner";
import PanelLayout from "@/components/PanelLayout";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { List } from "lucide-react";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  isTBC?: boolean;
}

export default function LegalPage({ title, lastUpdated, sections, isTBC = false }: LegalPageProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Deep-link on mount
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

  const tocNav = (
    <ul className="space-y-1">
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              sectionRefs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="block rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-inset))] hover:text-foreground"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />

      {isTBC && (
        <div className="px-6">
          <Banner variant="info">
            This page is being finalised — check back before launch.
          </Banner>
        </div>
      )}

      <PanelLayout className="px-6 py-16 sm:px-10">
        <main className="mx-auto max-w-[800px]">
          <h1
            className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

          {/* Mobile TOC trigger */}
          <div className="mt-6 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <List className="h-4 w-4" />
                  On this page
                </button>
              </SheetTrigger>
              <SheetContent side="top" className="max-h-[60vh] overflow-y-auto">
                <p className="mb-3 text-sm font-semibold text-foreground">On this page</p>
                {tocNav}
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-10 flex gap-10">
            {/* Desktop TOC sidebar */}
            <nav className="sticky top-24 hidden h-fit w-44 shrink-0 lg:block" aria-label="Table of contents">
              {tocNav}
            </nav>

            {/* Content */}
            <div className="flex-1 space-y-10">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  ref={(el) => { sectionRefs.current[s.id] = el; }}
                  className={`transition-all duration-300 rounded-lg ${
                    highlightedId === s.id ? "bg-[rgba(46,205,176,0.06)] -mx-3 px-3 py-2" : ""
                  }`}
                >
                  <h2 className="mb-3 font-display text-lg font-semibold text-foreground">{s.title}</h2>
                  <div className="text-sm leading-[1.8] text-muted-foreground">{s.content}</div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </PanelLayout>

      {!user && <Footer />}
    </div>
  );
}
