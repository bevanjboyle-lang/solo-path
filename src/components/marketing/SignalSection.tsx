// src/components/marketing/SignalSection.tsx
//
// Home-page Signal surface. Single editorial section in the long-scroll home
// layout. Shows the latest published Signal edition: eyebrow + headline +
// subheadline + one key takeaway, then a single mint-accent "Read the full
// edition" link to /signal.
//
// Editorial composition per admin/design-direction.md v1.6: no card grid, no
// tile stack — one column, type-led, quiet. Mint accent only on the read-link.
//
// States:
//   - loading: render nothing (avoids layout shift / placeholder noise)
//   - error or no edition yet: render a single self-respecting line
//   - edition present: render the editorial composition
//
// Use:
//   <SignalSection />
// Slot into the home-page section list once. Recommended: between #why-solo
// and #sample-report per admin/screen-specs/01-home.md §4.

import { Link } from "react-router-dom";
import { useSignal } from "@/hooks/useSignal";

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

export default function SignalSection() {
  const { data, loading, error } = useSignal();

  if (loading) {
    return null; // no skeleton — section appears once data lands
  }

  if (error || !data?.edition) {
    return (
      <section id="signal" className="pb-10 lg:pb-14" aria-label="The Signal">
        <div className="mx-auto max-w-6xl px-6">
          <div className="panel-ivory p-8 text-center sm:p-12 lg:p-16">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              The Signal
            </p>
            <p className="mt-3 text-sm text-foreground">
              A weekly intelligence digest for independent professionals.
              Launches soon.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const edition = data.edition;
  const firstTakeaway =
    Array.isArray(edition.key_takeaways) && edition.key_takeaways.length > 0
      ? edition.key_takeaways[0]
      : null;

  return (
    <section id="signal" className="pb-10 lg:pb-14" aria-label="The Signal">
      <div className="mx-auto max-w-6xl px-6">
        <div className="panel-ivory p-8 sm:p-12 lg:p-16">
          {/* Outer panel matches max-w-6xl + Landing's p-8/12/16 padding so
            * the card visually equates with the hero / accordion / closing CTA
            * panels. Inner reading column is constrained to max-w-2xl so the
            * editorial copy holds a comfortable line length. */}
          <div className="mx-auto max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              The Signal &middot; Week {edition.week_number} &middot;{" "}
              {formatPublishDate(edition.publish_date)}
            </p>

            <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-foreground md:text-2xl">
              {edition.lead_headline}
            </h2>

            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              {edition.lead_subheadline}
            </p>

            {firstTakeaway && (
              <p className="mt-4 border-l-2 border-primary pl-3 text-[13px] italic leading-snug text-foreground/80">
                {firstTakeaway}
              </p>
            )}

            <p className="mt-4">
              <Link
                to="/signal"
                className="text-sm font-medium text-primary underline decoration-1 underline-offset-4 hover:text-primary/80"
              >
                Read the full edition &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
