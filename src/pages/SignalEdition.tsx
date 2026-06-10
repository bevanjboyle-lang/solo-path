// src/pages/SignalEdition.tsx
//
// /signal/<slug> — permanent, indexable permalink for one Signal edition.
// Full render (lead + market signals + spotlight + ai watch) via
// useSignalEdition(slug). This is the SEO moat: every edition is a stable page.

import { useEffect } from "react";
import TopBar from "@/components/TopBar";
import { Link, useParams } from "react-router-dom";
import { useSignalEdition, type SignalMarketSignal } from "@/hooks/useSignal";
import SignalSubscribe from "@/components/marketing/SignalSubscribe";

function formatPublishDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

function renderParagraphs(text: string) {
  return text.split(/\n{2,}/g).map((p) => p.trim()).filter((p) => p.length > 0).map((para, i) => (
    <p key={i} className="mb-3 text-sm leading-snug text-foreground last:mb-0">{para}</p>
  ));
}

function MarketSignalBlock({ signal }: { signal: SignalMarketSignal }) {
  return (
    <article className="border-t border-stone-200 py-5 first:border-t-0 first:pt-0">
      <p className="text-sm leading-snug text-foreground">{signal.signal_text}</p>
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {signal.source} &middot; {signal.source_reliability} reliability
      </p>
      <div className="mt-3 border-l-2 border-primary pl-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">What this means</p>
        <p className="mt-1 text-sm leading-snug text-foreground/80">{signal.what_this_means}</p>
      </div>
    </article>
  );
}

export default function SignalEdition() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useSignalEdition(slug);

  useEffect(() => {
    const original = document.title;
    const originalDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
    if (data?.edition) {
      document.title = `${data.edition.lead_headline} — The Signal`;
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
      m.setAttribute("content", data.edition.lead_subheadline ?? "");
    }
    return () => {
      document.title = original;
      if (originalDesc !== null) document.querySelector('meta[name="description"]')?.setAttribute("content", originalDesc);
    };
  }, [data?.edition]);

  if (loading) {
    return (
      <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16"><div className="mx-auto max-w-2xl px-6">
        <div className="panel-ivory p-5 text-center text-sm text-muted-foreground sm:p-6"><p>Loading the edition…</p></div>
      </div></main>
    </div>
    );
  }

  if (error || !data?.edition) {
    return (
      <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16"><div className="mx-auto max-w-2xl px-6">
        <div className="panel-ivory p-5 text-center sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">The Signal</p>
          <p className="mt-3 text-sm text-foreground">We couldn't find that edition.</p>
          <p className="mt-4"><Link to="/signal" className="text-sm font-medium text-primary underline decoration-1 underline-offset-4 hover:text-primary/80">Back to the archive</Link></p>
        </div>
      </div></main>
    </div>
    );
  }

  const { edition, market_signals, spotlight, ai_watch } = data;

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16">
      <div className="mx-auto max-w-2xl px-6">
        <div className="panel-ivory p-5 sm:p-6 lg:p-8">
          <p className="mb-4">
            <Link to="/signal" className="text-[12px] text-muted-foreground hover:text-foreground">&larr; The Signal archive</Link>
          </p>
          <header>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              The Signal &middot; {formatPublishDate(edition.publish_date)}
            </p>
            <h1 className="title-h1 mt-3">{edition.lead_headline}</h1>
            <p className="mt-3 text-base leading-snug text-muted-foreground">{edition.lead_subheadline}</p>
          </header>

          <section className="mt-6">{renderParagraphs(edition.lead_body)}</section>

          {Array.isArray(edition.key_takeaways) && edition.key_takeaways.length > 0 && (
            <aside className="mt-6 border-y border-stone-200 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Key takeaways</p>
              <ul className="mt-2 space-y-1.5">
                {edition.key_takeaways.map((t, i) => (
                  <li key={i} className="text-sm leading-snug text-foreground"><span className="mr-1.5 text-primary">&bull;</span>{t}</li>
                ))}
              </ul>
            </aside>
          )}

          {market_signals.length > 0 && (
            <section className="mt-8">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Market signals</p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">What changed this week</h2>
              <div className="mt-4">{market_signals.map((s, i) => <MarketSignalBlock key={i} signal={s} />)}</div>
            </section>
          )}

          {spotlight && (
            <section className="mt-8 border-t border-stone-200 pt-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Archetype spotlight &middot; {spotlight.archetype_name}</p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">{spotlight.headline}</h2>
              <p className="mt-3 text-sm leading-snug text-foreground">{spotlight.summary}</p>
              <div className="mt-4 border-l-2 border-primary pl-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">First step</p>
                <p className="mt-1 text-sm leading-snug text-foreground/80">{spotlight.first_step}</p>
              </div>
            </section>
          )}

          {ai_watch && (
            <section className="mt-8 border-t border-stone-200 pt-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">AI watch</p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">{ai_watch.headline}</h2>
              <div className="mt-3">{renderParagraphs(ai_watch.body)}</div>
              <div className="mt-3 border-l-2 border-primary pl-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Opportunity</p>
                <p className="mt-1 text-sm leading-snug text-foreground/80">{ai_watch.opportunity}</p>
              </div>
            </section>
          )}

          <footer className="mt-10 border-t border-stone-200 pt-6 text-center">
            <p className="text-base font-semibold leading-snug text-foreground">{edition.lead_cta_text}</p>
            <p className="mt-4">
              <Link to="/cv-upload" className="inline-block rounded bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Find what fits</Link>
            </p>
          </footer>

          <div className="mt-8 border-t border-stone-200 pt-6"><SignalSubscribe source="signal_edition" /></div>
        </div>
      </div>
    </main>
    </div>
  );
}
