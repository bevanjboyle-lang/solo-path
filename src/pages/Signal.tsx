// src/pages/Signal.tsx
//
// /signal route. Renders the full latest Signal edition: lead piece, market
// signals (4), archetype spotlight, AI watch. Single editorial column. No
// archive, no per-date detail — those land in C4.
//
// Editorial composition per admin/design-direction.md v1.6: single column,
// generous vertical rhythm, type-led, ivory background panel over the office
// photo. Mint accent on key links / quote rules only. No card grid.
//
// SEO meta tags are intentionally minimal here; the full SEO treatment
// (per signal-design-doc §8 Page 2) lands when C4 expands the route surface.

import { useEffect } from "react";
import { useSignal, type SignalMarketSignal } from "@/hooks/useSignal";

function formatPublishDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function renderParagraphs(text: string) {
  return text
    .split(/\n{2,}/g)
    .map((para) => para.trim())
    .filter((p) => p.length > 0)
    .map((para, i) => (
      <p key={i} className="mb-5 text-lg leading-relaxed text-stone-800 last:mb-0">
        {para}
      </p>
    ));
}

function MarketSignalBlock({ signal }: { signal: SignalMarketSignal }) {
  return (
    <article className="border-t border-stone-200 py-8 first:border-t-0 first:pt-0">
      <p className="text-base leading-relaxed text-stone-900">
        {signal.signal_text}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-stone-500">
        {signal.source} &middot; {signal.source_reliability} reliability
      </p>
      <div className="mt-4 border-l-2 border-[#2ECDB0] pl-4">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
          What this means
        </p>
        <p className="mt-1 text-base leading-relaxed text-stone-700">
          {signal.what_this_means}
        </p>
      </div>
    </article>
  );
}

export default function Signal() {
  const { data, loading, error } = useSignal();

  // Minimal SEO title update for the route. Full meta-tag treatment is C4.
  useEffect(() => {
    const original = document.title;
    if (data?.edition) {
      document.title = `${data.edition.lead_headline} — The Signal`;
    } else {
      document.title = "The Signal";
    }
    return () => {
      document.title = original;
    };
  }, [data?.edition]);

  if (loading) {
    return (
      <main className="pb-12 pt-6 lg:pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="panel-ivory p-8 text-center text-muted-foreground sm:p-12">
            <p>Loading the Signal…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data?.edition) {
    return (
      <main className="pb-12 pt-6 lg:pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="panel-ivory p-8 text-center sm:p-12">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              The Signal
            </p>
            <p className="mt-4 text-base text-foreground">
              A weekly intelligence digest for independent professionals.
              Launches soon.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { edition, market_signals, spotlight, ai_watch } = data;

  return (
    <main className="pb-12 pt-6 lg:pb-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="panel-ivory p-8 sm:p-12 lg:p-16">
      {/* Lead piece */}
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
          The Signal &middot; Week {edition.week_number} &middot;{" "}
          {formatPublishDate(edition.publish_date)}
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight text-stone-900 md:text-5xl">
          {edition.lead_headline}
        </h1>
        <p className="mt-5 text-xl leading-relaxed text-stone-700">
          {edition.lead_subheadline}
        </p>
      </header>

      <section className="mt-10">{renderParagraphs(edition.lead_body)}</section>

      {Array.isArray(edition.key_takeaways) && edition.key_takeaways.length > 0 && (
        <aside className="mt-12 border-y border-stone-200 py-8">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Key takeaways
          </p>
          <ul className="mt-4 space-y-3">
            {edition.key_takeaways.map((t, i) => (
              <li key={i} className="text-base leading-relaxed text-stone-800">
                <span className="mr-2 text-[#2ECDB0]">&bull;</span>
                {t}
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* Market signals */}
      {market_signals.length > 0 && (
        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Market signals
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-stone-900 md:text-3xl">
            What changed this week
          </h2>
          <div className="mt-8">
            {market_signals.map((s, i) => (
              <MarketSignalBlock key={i} signal={s} />
            ))}
          </div>
        </section>
      )}

      {/* Archetype spotlight */}
      {spotlight && (
        <section className="mt-16 border-t border-stone-200 pt-12">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Archetype spotlight &middot; {spotlight.archetype_name}
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-stone-900 md:text-3xl">
            {spotlight.headline}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-stone-800">
            {spotlight.summary}
          </p>
          <dl className="mt-8 grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">
                Day rate range
              </dt>
              <dd className="mt-1 text-base text-stone-900">
                {spotlight.day_rate_range}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">
                Demand signal
              </dt>
              <dd className="mt-1 text-base text-stone-800">
                {spotlight.demand_signal}
              </dd>
            </div>
          </dl>
          <div className="mt-6 border-l-2 border-[#2ECDB0] pl-4">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
              First step
            </p>
            <p className="mt-1 text-base leading-relaxed text-stone-700">
              {spotlight.first_step}
            </p>
          </div>
          <p className="mt-8">
            <a
              href="/cv-upload"
              className="text-[#2ECDB0] underline decoration-1 underline-offset-4 hover:text-[#22a98e]"
            >
              {spotlight.cta_text}
            </a>
          </p>
        </section>
      )}

      {/* AI watch */}
      {ai_watch && (
        <section className="mt-16 border-t border-stone-200 pt-12">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            AI watch
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-stone-900 md:text-3xl">
            {ai_watch.headline}
          </h2>
          <div className="mt-6">{renderParagraphs(ai_watch.body)}</div>
          <div className="mt-6 border-l-2 border-[#2ECDB0] pl-4">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
              Opportunity
            </p>
            <p className="mt-1 text-base leading-relaxed text-stone-700">
              {ai_watch.opportunity}
            </p>
          </div>
        </section>
      )}

      {/* CTA band */}
      <footer className="mt-20 border-t border-stone-200 pt-12 text-center">
        <p className="font-serif text-2xl leading-tight text-stone-900">
          {edition.lead_cta_text}
        </p>
        <p className="mt-6">
          <a
            href="/cv-upload"
            className="inline-block rounded bg-[#2ECDB0] px-6 py-3 text-sm font-medium text-white hover:bg-[#22a98e]"
          >
            Take the test
          </a>
        </p>
      </footer>
        </div>
      </div>
    </main>
  );
}
