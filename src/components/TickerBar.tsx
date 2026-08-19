// TickerBar — the always-on Radar ticker (ADR-026, 2026-06-10).
// A 34px ink strip above the masthead on every non-funnel page: real tender
// openings from radar_items (category, title, mint value, closing date) plus
// the latest Signal headline. Content is genuinely live (weekly cron); the
// ticker never shows fabricated items — if the feed is empty it renders only
// the engine line. Marquee pauses on hover; disabled for reduced-motion users
// (CSS). The label deep-links to /radar (paid surface; route guard handles it).

import { Link } from "react-router-dom";
import { useTicker } from "@/hooks/useTicker";

function formatDue(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return "closes " + new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

export default function TickerBar() {
  const { items, signal, loaded } = useTicker();

  // Build the run of ticker entries; the engine line anchors the loop so the
  // strip is never empty even before load / on feed failure.
  const entries: React.ReactNode[] = [];
  items.forEach((i, idx) => {
    const due = formatDue(i.deadline);
    entries.push(
      <span className="ticker-item" key={`t${idx}`}>
        <span className="ticker-cat">{i.category}</span>
        <span>{i.title}</span>
        {i.value_text && <span className="ticker-val">{i.value_text}</span>}
        {due && <span className="ticker-due">{due}</span>}
      </span>,
    );
  });
  if (signal) {
    entries.push(
      <span className="ticker-item" key="sig">
        <span className="ticker-cat">The Signal</span>
        <span>{signal.headline}</span>
      </span>,
    );
  }
  entries.push(
    <span className="ticker-item" key="eng">
      <span className="ticker-cat">Engine</span>
      <span><span className="ticker-val">2,159</span> combinations scored weekly</span>
    </span>,
  );

  // Sprint 3: the low-data state. With fewer than two real feed entries a
  // marquee is one line chasing itself, which reads thin and slightly
  // fake. Below that threshold the strip goes static and states the
  // schedule instead; the marquee resumes the moment the feed does.
  const realCount = items.length + (signal ? 1 : 0);
  const lowData = realCount < 2;
  if (lowData) {
    entries.push(
      <span className="ticker-item" key="next">
        <span className="ticker-cat">Next sweep</span>
        <span>Monday 07:30</span>
      </span>,
    );
  }

  // Duplicate the run so the -50% scroll loops seamlessly (skipped when
  // static; a static strip shows each line once).
  return (
    <div className="ticker" role="complementary" aria-label="The Radar: live market openings">
      <div className="ticker-row">
        <Link to="/radar" className="ticker-label">
          <span className="ticker-dot" aria-hidden />
          The Radar · Live
        </Link>
        <div className="ticker-window" aria-hidden={!loaded}>
          <div className={`ticker-track ${lowData ? "ticker-track--static" : ""}`}>
            {entries}
            {!lowData &&
              entries.map((e, i) => (
                <span key={`dup${i}`}>{e}</span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
