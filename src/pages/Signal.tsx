// src/pages/Signal.tsx
//
// /signal — The Signal archive index. Lists every published edition (newest
// first), each linking to its permanent /signal/<slug> permalink. Plus email
// capture. The full edition render lives in SignalEdition.tsx.
// Editorial single-column panel per admin/design-direction.md.

import { useEffect } from "react";
import TopBar from "@/components/TopBar";
import { Link } from "react-router-dom";
import { useSignalArchive } from "@/hooks/useSignal";
import SignalSubscribe from "@/components/marketing/SignalSubscribe";

function formatPublishDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

export default function Signal() {
  const { editions, loading, error } = useSignalArchive();

  useEffect(() => {
    const original = document.title;
    document.title = "The Signal — weekly intelligence for independent professionals";
    return () => { document.title = original; };
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16">
      <div className="mx-auto max-w-2xl px-6">
        <div className="panel-ivory p-5 sm:p-6 lg:p-8">
          <header>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">The Signal</p>
            <h1 className="title-h1 mt-3">
              Where independent work is opening up.
            </h1>
            <p className="mt-3 text-base leading-snug text-muted-foreground">
              A weekly read for mid-career professionals weighing an independent path: what's shifting in
              your field, what buyers are commissioning, and where the openings are.
            </p>
          </header>

          {loading && (
            <p className="mt-8 text-sm text-muted-foreground">Loading the archive…</p>
          )}

          {!loading && (error || !editions || editions.length === 0) && (
            <p className="mt-8 text-sm text-foreground">The first editions are publishing soon.</p>
          )}

          {!loading && editions && editions.length > 0 && (
            <section className="mt-8">
              {editions.map((e) => (
                <article key={e.slug} className="border-t border-stone-200 py-5 first:border-t-0 first:pt-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {formatPublishDate(e.publish_date)}
                  </p>
                  <h2 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-foreground">
                    <Link to={`/signal/${e.slug}`} className="hover:text-primary">{e.lead_headline}</Link>
                  </h2>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{e.lead_subheadline}</p>
                  <p className="mt-2">
                    <Link
                      to={`/signal/${e.slug}`}
                      className="text-sm font-medium text-primary underline decoration-1 underline-offset-4 hover:text-primary/80"
                    >
                      Read the full edition &rarr;
                    </Link>
                  </p>
                </article>
              ))}
            </section>
          )}

          <div className="mt-10 border-t border-stone-200 pt-6">
            <SignalSubscribe source="signal_archive" />
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}
