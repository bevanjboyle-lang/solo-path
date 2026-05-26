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
      <section
        id="signal"
        className="mx-auto max-w-3xl px-6 py-20 text-center"
        aria-label="The Signal"
      >
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
          The Signal
        </p>
        <p className="mt-4 text-base text-stone-700">
          A weekly intelligence digest for independent professionals. Launches
          soon.
        </p>
      </section>
    );
  }

  const edition = data.edition;
  const firstTakeaway =
    Array.isArray(edition.key_takeaways) && edition.key_takeaways.length > 0
      ? edition.key_takeaways[0]
      : null;

  return (
    <section
      id="signal"
      className="mx-auto max-w-3xl px-6 py-24"
      aria-label="The Signal"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
        The Signal &middot; Week {edition.week_number} &middot;{" "}
        {formatPublishDate(edition.publish_date)}
      </p>

      <h2 className="mt-5 font-serif text-3xl leading-tight text-stone-900 md:text-4xl">
        {edition.lead_headline}
      </h2>

      <p className="mt-4 text-lg leading-relaxed text-stone-700">
        {edition.lead_subheadline}
      </p>

      {firstTakeaway && (
        <p className="mt-6 border-l-2 border-[#2ECDB0] pl-4 text-base italic leading-relaxed text-stone-600">
          {firstTakeaway}
        </p>
      )}

      <p className="mt-8">
        <Link
          to="/signal"
          className="text-[#2ECDB0] underline decoration-1 underline-offset-4 hover:text-[#22a98e]"
        >
          Read the full edition &rarr;
        </Link>
      </p>
    </section>
  );
}
