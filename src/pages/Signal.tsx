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
        <div>
          <header>
            <p className="eyebrow">The Signal</p>
            <h1 className="title-h1 mt-3">
              Where independent work is opening up.
            </h1>
            <p className="standfirst mt-3">
              A weekly read for mid-career professionals weighing an independent path: what's shifting in
              your field, what buyers are commissioning, and where the openings are.
            </p>
          </header>

          {loading && (
            <p className="mt-8 text-sm text-muted-foreground">Loading the archive…</p>
          )}

          {/* Sprint 1: house empty state; hairline rule, eyebrow, mint numeral, specimen line, one link to the subscribe box below. */}
          {!loading && (error || !editions || editions.length === 0) && (
            <section className="mt-8 border-t border-border pt-6">
              <p className="eyebrow">The Signal</p>
              <p className="mt-3 font-display text-[2.6rem] font-semibold leading-none text-[#2ECDB0] tabular-nums">01</p>
              <p className="standfirst mt-3">The first editions are publishing soon.</p>
              <p className="mt-4">
                <a href="#signal-subscribe" className="link-edit">Get the Monday briefing &rarr;</a>
              </p>
            </section>
          )}

          {!loading && editions && editions.length > 0 && (
            <section className="mt-8">
              {editions.map((e) => (
                <article key={e.slug} className="border-t border-border py-5 first:border-t-0 first:pt-0">
                  <p className="eyebrow--muted text-[11px] font-semibold uppercase tracking-[0.12em]">
                    {formatPublishDate(e.publish_date)}
                  </p>
                  <h2 className="mt-1.5 font-display text-lg font-bold leading-snug tracking-tight text-foreground">
                    <Link to={`/signal/${e.slug}`} className="hover:text-[#15735F]">{e.lead_headline}</Link>
                  </h2>
                  <p className="standfirst mt-1 text-[14px]">{e.lead_subheadline}</p>
                  <p className="mt-3">
                    <Link
                      to={`/signal/${e.slug}`}
                      className="link-edit"
                    >
                      Read the full edition &rarr;
                    </Link>
                  </p>
                </article>
              ))}
            </section>
          )}

          {/* Sprint 1: id anchors the empty-state link above; scroll-mt clears the sticky chrome. */}
          <div id="signal-subscribe" className="mt-10 scroll-mt-24 border-t border-border pt-6">
            <SignalSubscribe source="signal_archive" />
            <p className="mt-4 text-[13px] text-muted-foreground">
              Or see what the engine says about you:{" "}
              <Link to="/diagnostic" className="link-edit">take the 90-second diagnostic &rarr;</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}
