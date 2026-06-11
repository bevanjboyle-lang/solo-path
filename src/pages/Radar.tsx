// src/pages/Radar.tsx
//
// /radar — Opportunity Radar v1 (ADR-025, 2026-06-10). Eyes layer: Solo watches
// the market so the user doesn't have to. Shows this fortnight's radar items for
// the user's archetype category: real UK procurement notices ('tender', linked,
// sourced) plus Solo's clearly-labelled market read ('analysis') when the week
// is quiet. Paid surface: get-radar gates on a paid report server-side.
// Editorial single-column panel per admin/design-direction.md; hero on .title-h1.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "@/components/TopBar";
import CohortPulse from "@/components/CohortPulse";
import { supabase } from "@/integrations/supabase/client";

interface RadarItem {
  id: string;
  week_start: string;
  category: string;
  source_type: "tender" | "analysis";
  title: string;
  summary: string;
  url: string | null;
  source_name: string | null;
  buyer: string | null;
  value_text: string | null;
  deadline: string | null;
  relevance_tags: string[];
}

interface RadarResponse {
  response_text: string;
  category: string | null;
  archetype: string | null;
  matched: boolean;
  items: RadarItem[];
  gated?: boolean;
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (days < 0) return null;
    return days <= 14 ? `Closes ${date} (${days}d)` : `Closes ${date}`;
  } catch {
    return null;
  }
}

function SourcePill({ item }: { item: RadarItem }) {
  const isTender = item.source_type === "tender";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        isTender ? "bg-primary/10 text-[#15735F]" : "bg-foreground/5 text-muted-foreground"
      }`}
    >
      <span className={`inline-block h-1 w-1 rounded-full ${isTender ? "bg-primary" : "bg-muted-foreground/50"}`} />
      {isTender ? `Live tender · ${item.source_name ?? "sourced"}` : "Solo's read"}
    </span>
  );
}

function RadarRow({ item }: { item: RadarItem }) {
  const deadline = formatDeadline(item.deadline);
  const meta = [item.buyer, item.value_text, deadline].filter(Boolean);
  return (
    <article className="border-t border-stone-200 py-5 first:border-t-0 first:pt-0">
      <SourcePill item={item} />
      <h2 className="mt-2.5 text-[16px] font-semibold leading-snug tracking-tight text-foreground sm:text-[17px]">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline decoration-1 decoration-[#D8D4CC] underline-offset-4 hover:decoration-[#2ECDB0]"
          >
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h2>
      {meta.length > 0 && (
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {meta.join(" · ")}
        </p>
      )}
      <p className="mt-2 text-sm leading-snug text-foreground/85">{item.summary}</p>
    </article>
  );
}

export default function Radar() {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [gated, setGated] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const original = document.title;
    document.title = "Opportunity Radar — where your market is opening";
    return () => { document.title = original; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res, error: fnErr } = await supabase.functions.invoke<RadarResponse>("get-radar", { body: {} });
        if (cancelled) return;
        if (fnErr) {
          // FunctionsHttpError on 403 = paid gate; anything else = real error.
          const status = (fnErr as { context?: { status?: number } }).context?.status;
          if (status === 403) setGated(true);
          else setError(true);
        } else {
          setData(res);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tenders = (data?.items ?? []).filter((i) => i.source_type === "tender");
  const reads = (data?.items ?? []).filter((i) => i.source_type === "analysis");

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16">
        <div className="mx-auto max-w-2xl px-6">
          {/* ADR-026 Phase 4: panel-ivory wrapper dropped — content flows on the flat page. */}
          <div>
            <header>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                Opportunity Radar
                {data?.category && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-foreground">{data.category}</span>
                  </>
                )}
              </p>
              <h1 className="title-h1 mt-3">Where your market opened this fortnight.</h1>
              <p className="mt-3 text-base leading-snug text-muted-foreground">
                Solo scans live UK tender notices and market movement matched to your profile, every Monday.
                Real openings link to the source. Solo's reads are labelled as analysis, not news.
              </p>
            </header>

            {loading && <p className="mt-8 text-sm text-muted-foreground">Scanning your radar…</p>}

            {!loading && gated && (
              <div className="mt-8 border-t border-stone-200 pt-6">
                <p className="text-sm text-foreground">
                  The radar unlocks with your report. It watches your market from the day you buy.
                </p>
                <p className="mt-4">
                  <Link to="/cv-upload" className="cta-block">
                    Find what works
                  </Link>
                </p>
              </div>
            )}

            {!loading && error && !gated && (
              <p className="mt-8 text-sm text-foreground">The radar couldn't load just now. Try again in a minute.</p>
            )}

            {!loading && !gated && !error && data && (
              <>
                {tenders.length > 0 && (
                  <section className="mt-8">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Live openings</p>
                    <div className="mt-4">
                      {tenders.map((i) => <RadarRow key={i.id} item={i} />)}
                    </div>
                  </section>
                )}
                {reads.length > 0 && (
                  <section className="mt-8 border-t border-stone-200 pt-6">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Solo's read on your market</p>
                    <div className="mt-4">
                      {reads.map((i) => <RadarRow key={i.id} item={i} />)}
                    </div>
                  </section>
                )}
                {tenders.length === 0 && reads.length === 0 && (
                  <p className="mt-8 text-sm text-foreground">
                    A quiet fortnight on the public feeds for your market. The radar runs every Monday; check back next week.
                  </p>
                )}
                <footer className="mt-10 border-t border-stone-200 pt-5">
                  <p className="text-[12px] leading-snug text-muted-foreground">
                    Updates every Monday morning. Want one of these unpacked, or a view on whether it's worth your time?
                    Ask Solo knows your plan and your pipeline.
                  </p>
                </footer>
                {/* Cohort Pulse + Asked this week (ADR-025 Peers layer, 2026-06-11). */}
                <CohortPulse archetype={data.archetype} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
