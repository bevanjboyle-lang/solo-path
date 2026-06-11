// src/pages/Forge.tsx
//
// /forge — The Asset Forge v1 (ADR-025 'Hands' layer, 2026-06-11). Generated
// collateral personalised from the user's paid report: positioning one-pager,
// rate card, LinkedIn About. Three asset rows under a .rule-head, generated
// documents typeset below in the serif register. Paid surface: generate-asset
// gates on a paid report server-side; existing assets read directly under RLS.
// Editorial system per admin/design-direction.md v2.0 (flat ivory, hairlines).

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import TopBar from "@/components/TopBar";
import { supabase } from "@/integrations/supabase/client";

type AssetType = "one_pager" | "rate_card" | "linkedin_about";

interface ForgeAsset {
  id: string;
  asset_type: AssetType;
  title: string;
  content_md: string;
  created_at: string;
}

interface GenerateAssetResponse {
  response_text: string;
  asset?: ForgeAsset;
  gated?: boolean;
  rate_limited?: boolean;
}

const ASSET_DEFS: { type: AssetType; name: string; description: string }[] = [
  {
    type: "one_pager",
    name: "Positioning one-pager",
    description:
      "A single page that says who you help, the problem you remove and how an engagement starts. Built from your archetype and your strongest proof points, ready to attach to a first email.",
  },
  {
    type: "rate_card",
    name: "Rate card",
    description:
      "A scoped diagnostic, project work, day rate and retained advisory, grounded in the pricing bands your own report set. Conservative UK numbers you can defend in a first conversation.",
  },
  {
    type: "linkedin_about",
    name: "LinkedIn About",
    description:
      "A first-person About section in your voice: direct, specific, no hype. Written from your archetype's editorial read of where you are strongest.",
  },
];

// forge_assets is not yet in the generated Database types; regeneration of
// src/integrations/supabase/types.ts is deferred to the next types sync.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forgeTable = () => (supabase as any).from("forge_assets");

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// Typeset headings for the generated documents (PJS heads, serif body via .prose-serif).
const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-3 text-[20px] font-bold leading-tight tracking-tight text-foreground">{children}</h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground first:mt-0">{children}</h4>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="mb-2 mt-5 text-[13px] font-semibold text-foreground">{children}</h5>
  ),
};

export default function Forge() {
  const [assets, setAssets] = useState<ForgeAsset[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [forging, setForging] = useState<AssetType | null>(null);
  const [gated, setGated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const original = document.title;
    document.title = "The Forge — collateral built from your report";
    return () => { document.title = original; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await forgeTable()
        .select("id, asset_type, title, content_md, created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setAssets(data as ForgeAsset[]);
      setLoadingList(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Latest asset per type, in the fixed display order.
  const latestByType = new Map<AssetType, ForgeAsset>();
  for (const a of assets) {
    if (!latestByType.has(a.asset_type)) latestByType.set(a.asset_type, a);
  }

  const forge = useCallback(async (type: AssetType) => {
    setNotice(null);
    setForging(type);
    try {
      const { data, error } = await supabase.functions.invoke<GenerateAssetResponse>(
        "generate-asset",
        { body: { asset_type: type } },
      );
      if (error) {
        // FunctionsHttpError carries the response on context; read status + body.
        const ctx = (error as { context?: Response }).context;
        const status = ctx?.status;
        let bodyText: string | null = null;
        try {
          const parsed = ctx ? await ctx.json() : null;
          bodyText = parsed?.response_text ?? null;
        } catch { /* body already consumed or not JSON */ }
        if (status === 403) setGated(true);
        else if (status === 429) setNotice(bodyText ?? "You forged this one less than ten minutes ago. Give it a few minutes.");
        else setNotice(bodyText ?? "The Forge couldn't finish that just now. Try again in a minute.");
        return;
      }
      if (data?.asset) {
        setAssets((prev) => [data.asset as ForgeAsset, ...prev]);
        // Bring the fresh document into view once it renders.
        setTimeout(() => {
          document.getElementById(`asset-${type}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } catch {
      setNotice("The Forge couldn't finish that just now. Try again in a minute.");
    } finally {
      setForging(null);
    }
  }, []);

  const copyAsset = useCallback(async (asset: ForgeAsset) => {
    try {
      await navigator.clipboard.writeText(asset.content_md);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId((c) => (c === asset.id ? null : c)), 2000);
    } catch {
      setNotice("Couldn't copy to the clipboard. Select the text and copy it directly.");
    }
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />
      <main className="pb-12 pt-6 lg:pb-16">
        <div className="mx-auto max-w-2xl px-6">
          <header>
            <p className="eyebrow">The Forge</p>
            <h1 className="title-h1 mt-3">Collateral, built from your report.</h1>
            <p className="standfirst mt-3">
              The documents you need to be taken seriously as an independent: a one-pager, a rate card,
              a LinkedIn About. Solo writes each one from your own report, in your market's terms.
              Copy them out, make them yours, send them.
            </p>
          </header>

          {gated && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <p className="text-sm text-foreground">
                The Forge unlocks with your report. Everything here is written from it.
              </p>
              <p className="mt-4">
                <Link to="/cv-upload" className="cta-block">Find what works</Link>
              </p>
            </div>
          )}

          {!gated && (
            <>
              <section className="mt-10">
                <p className="rule-head">Your independence kit</p>
                {loadingList ? (
                  <p className="mt-5 text-sm text-muted-foreground">Loading your kit…</p>
                ) : (
                  <div>
                    {ASSET_DEFS.map((def) => {
                      const existing = latestByType.get(def.type);
                      const isForging = forging === def.type;
                      return (
                        <div
                          key={def.type}
                          className="flex flex-col gap-4 border-b border-stone-200 py-6 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="sm:max-w-[420px]">
                            <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{def.name}</h2>
                            <p className="standfirst mt-1.5 text-[15px]">{def.description}</p>
                          </div>
                          <div className="shrink-0 pt-1">
                            {isForging ? (
                              <span className="text-[13px] font-semibold text-muted-foreground" role="status">Forging…</span>
                            ) : existing ? (
                              <a href={`#asset-${def.type}`} className="link-edit">View</a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => forge(def.type)}
                                disabled={forging !== null}
                                className="cta-block disabled:opacity-50"
                              >
                                Forge it
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {notice && <p className="mt-4 text-sm text-foreground">{notice}</p>}
              </section>

              {ASSET_DEFS.filter((d) => latestByType.has(d.type)).map((def) => {
                const asset = latestByType.get(def.type)!;
                const isForging = forging === def.type;
                return (
                  <section key={asset.id} id={`asset-${def.type}`} className="mt-12 scroll-mt-24">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="eyebrow eyebrow--muted">{def.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                        Forged {formatDate(asset.created_at)}
                        <span className="mx-2 text-muted-foreground/40">·</span>
                        <button type="button" onClick={() => copyAsset(asset)} className="link-edit text-[11px] uppercase tracking-[0.1em]">
                          {copiedId === asset.id ? "Copied" : "Copy"}
                        </button>
                        <span className="mx-2 text-muted-foreground/40">·</span>
                        <button
                          type="button"
                          onClick={() => forge(def.type)}
                          disabled={forging !== null}
                          className="link-edit text-[11px] uppercase tracking-[0.1em] disabled:opacity-50"
                        >
                          {isForging ? "Forging…" : "Regenerate"}
                        </button>
                      </p>
                    </div>
                    <article className="mt-3 border border-stone-300 bg-white px-6 py-7 sm:px-8 sm:py-9">
                      <div className="prose-serif">
                        <ReactMarkdown components={mdComponents}>{asset.content_md}</ReactMarkdown>
                      </div>
                    </article>
                  </section>
                );
              })}

              {!loadingList && latestByType.size > 0 && (
                <footer className="mt-10 border-t border-stone-200 pt-5">
                  <p className="text-[12px] leading-snug text-muted-foreground">
                    Each document is a working draft built from your report. Fill in the contact line,
                    adjust anything that doesn't sound like you, and regenerate any time your plan moves on.
                  </p>
                </footer>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
