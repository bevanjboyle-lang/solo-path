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
      <p key={i} className="mb-3 text-sm leading-snug text-foreground last:mb-0">
        {para}
      </p>
    ));
}

function MarketSignalBlock({ signal }: { signal: SignalMarketSignal }) {
  return (
    <article className="border-t border-stone-200 py-5 first:border-t-0 first:pt-0">
      <p className="text-sm leading-snug text-foreground">
        {signal.signal_text}
      </p>
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {signal.source} &middot; {signal.source_reliability} reliability
      </p>
      <div className="mt-3 border-l-2 border-primary pl-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          What this means
        </p>
        <p className="mt-1 text-sm leading-snug text-foreground/80">
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
      <main className="pb-12 pt-6 lg:pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <div className="panel-ivory p-5 text-center text-sm text-muted-foreground sm:p-6">
            <p>Loading the Signal…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data?.edition) {
    return (
      <main className="pb-12 pt-6 lg:pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <div className="panel-ivory p-5 text-center sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              The Signal
            </p>
            <p className="mt-3 text-sm text-foreground">
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
    <main className="pb-12 pt-6 lg:pb-16">
      <div className="mx-auto max-w-2xl px-6">
        <div className="panel-ivory p-5 sm:p-6 lg:p-8">
          {/* Lead piece */}
          <header>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              The Signal &middot; {formatPublishDate(edition.publish_date)}
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-foreground md:text-3xl">
              {edition.lead_headline}
            </h1>
            <p className="mt-3 text-base leading-snug text-muted-foreground">
              {edition.lead_subheadline}
            </p>
          </header>

          <section className="mt-6">{renderParagraphs(edition.lead_body)}</section>

          {Array.isArray(edition.key_takeaways) && edition.key_takeaways.length > 0 && (
            <aside className="mt-6 border-y border-stone-200 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Key takeaways
              </p>
              <ul className="mt-2 space-y-1.5">
                {edition.key_takeaways.map((t, i) => (
                  <li key={i} className="text-sm leading-snug text-foreground">
                    <span className="mr-1.5 text-primary">&bull;</span>
                    {t}
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {/* Market signals */}
          {market_signals.length > 0 && (
            <section className="mt-8">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Market signals
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">
                What changed this week
              </h2>
              <div className="mt-4">
                {market_signals.map((s, i) => (
                  <MarketSignalBlock key={i} signal={s} />
                ))}
              </div>
            </section>
          )}

          {/* Archetype spotlight */}
          {spotlight && (
            <section className="mt-8 border-t border-stone-200 pt-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Archetype spotlight &middot; {spotlight.archetype_name}
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">
                {spotlight.headline}
              </h2>
              <p className="mt-3 text-sm leading-snug text-foreground">
                {spotlight.summary}
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Day rate range
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {spotlight.day_rate_range}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Demand signal
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {spotlight.demand_signal}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-l-2 border-primary pl-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  First step
                </p>
                <p className="mt-1 text-sm leading-snug text-foreground/80">
                  {spotlight.first_step}
                </p>
              </div>
              <p className="mt-4">
                <a
                  href="/cv-upload"
                  className="text-sm font-medium text-primary underline decoration-1 underline-offset-4 hover:text-primary/80"
                >
                  {spotlight.cta_text}
                </a>
              </p>
            </section>
          )}

          {/* AI watch */}
          {ai_watch && (
            <section className="mt-8 border-t border-stone-200 pt-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                AI watch
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">
                {ai_watch.headline}
              </h2>
              <div className="mt-3">{renderParagraphs(ai_watch.body)}</div>
              <div className="mt-3 border-l-2 border-primary pl-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Opportunity
                </p>
                <p className="mt-1 text-sm leading-snug text-foreground/80">
                  {ai_watch.opportunity}
                </p>
              </div>
            </section>
          )}

          {/* CTA band */}
          <footer className="mt-10 border-t border-stone-200 pt-6 text-center">
            <p className="text-base font-semibold leading-snug text-foreground">
              {edition.lead_cta_text}
            </p>
            <p className="mt-4">
              <a
                href="/cv-upload"
                className="inline-block rounded bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
