import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Lock, ChevronRight, X, Check, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import GuidanceModuleOutput, { V28Body, isV28 } from "@/components/guidance/GuidanceModuleOutput";

/*
 * Library Pass 1 /library v1 (2026-05-18) second Phase 2 surface
 *
 * Editorial reskin of the guidance library. Two-column app shell
 * inheriting /plan + /report. AreaSidebar with three tabs (Today /
 * Browse / Modules), each carrying numeral + count suffix. Each tab's
 * content rendered inside its own ivory panel. Modules tab carries one
 * dark gate row between Module 03 and Module 04 for buyers (the
 * screen's first cadence moment); Day-31 dark banner above the page
 * header for Day-31 non-subscribers (the screen's second cadence
 * moment). All other surfaces stay ivory.
 *
 * Locked decisions from admin/pass-1-library-decisions.md:
 *   25/3/22 canonical correction applied throughout (was stale '9
 *   modules' in spec §1).
 *   F1 LibraryCard as editorial row (Phase 2 of Phase 2 work the
 *     internal TodayTab/BrowseTab/ModulesTab card render is preserved
 *     as-is for Pass 1, with shell + chrome restyled).
 *   F2, Read-history meta retained on Today rows.
 *   F3 Gate-row body: 'Same authors, same depth 29 more on the
 *     harder things.'
 *   F4, Drop cap in drawer but not in module lessons.
 *   F5, Browse: topic chips inline + More filters drawer (deferred).
 *   F6, Locked-lesson overlay as single block beneath Lesson 01.
 *   F7, Save for later dropped (out of scope per spec §12).
 *   F8, Level taxonomy: Practical / Foundational / Hard truth / Advanced.
 *
 * Cadence: two dark moments, Day-31 banner + single gate row in
 * Modules tab. Both content-earned, both contained. Per v1.4 §8.
 *
 * Contrast safeguard (Bevan flagged 2026-05-18): every text element
 * sits inside an ivory or stone container, nothing floats on the
 * photo background. AreaSidebar wraps items in panel-ivory (already
 * via the component). Page header is its own ivory panel. Tab content
 * panels are ivory. Day-31 banner is opaque panel-dark.
 *
 * Pass 1 scope: shell + chrome + sidebar config + page-header panel +
 * dark gate row in Modules + Day-31 banner. Internal TodayTab /
 * BrowseTab / ModulesTab card renderings preserved.
 *
 * Drops framer-motion. Preserves: tab state in URL, data fetch for
 * Today + Browse (separate edge function calls), drawer state, filter
 * state, reading-progress writes (existing logic untouched).
 */

/* ── Types ── */
interface FeaturedModule {
  module_id: number;
  title: string;
  track: string;
  track_name: string;
  description: string;
  estimated_minutes: number;
  access_tier: "tranche_1" | "subscription";
  tag: "up_next" | "recommended";
  is_completed: boolean;
  is_unlocked: boolean;
}

interface TodayData {
  featured: FeaturedModule[];
  progress: {
    completed: number;
    unlocked: number;
    message: string;
    tracker_day: number | null;
  };
}

interface BrowseModule extends FeaturedModule {
  is_sector_relevant?: boolean;
}

interface TrackData {
  track_id: string;
  name: string;
  description: string;
  modules: BrowseModule[];
  completed_count: number;
  total_count: number;
}

interface BrowseData {
  tracks: Record<string, TrackData>;
  completed_module_ids: number[];
  unlocked_module_ids: number[];
}

// Option B reconciliation (2026-05-25): the article payload now carries the
// rich question set served by get-library-content v17. Each question has a
// canonical id, a display text, a type that controls render (multi-choice
// buttons vs text input), and the option list / placeholder where relevant.
// Answers are submitted keyed by `id` so generate-guidance v28's strawman
// decision_logic can interpret them. The old `key_questions: string[]` shape
// keyed answers `question_1..N` and silently degraded the v28 output.
interface ArticleQuestion {
  id: string;
  text: string;
  type: "text" | "choice" | "number";
  options: string[] | null;
  optional: boolean;
  placeholder: string | null;
}

// v18 (reference layer): full pre-fetched reference items applicable to this
// module. V28Body renders the items in the order picked by v28's
// reference_layer_ids, looking up each id against this list.
export interface ArticleReferenceItem {
  id: number;
  content_type: "template" | "link" | "comparison" | "checklist" | "questions" | "calendar";
  title: string;
  one_line_description: string;
  inline_content: string | null;
  external_url: string | null;
  verified_date: string;
}

interface ArticleData {
  module_id: number;
  title: string;
  track: string;
  track_name: string;
  description: string;
  estimated_minutes: number;
  questions: ArticleQuestion[];
  what_you_get: string | null;
  reference_items: ArticleReferenceItem[];
  is_unlocked: boolean;
  is_completed: boolean;
  completion: {
    output: {
      key_insights?: string[];
      next_steps?: string[];
      resources_or_prompts?: string[];
    };
    completed_at: string;
    module_answers: object;
  } | null;
}

interface ModuleOutput {
  key_insights?: string[];
  next_steps?: string[];
  resources_or_prompts?: string[];
}

type DrawerView = "detail" | "questions" | "output";


export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "today";
  const setTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [browseData, setBrowseData] = useState<BrowseData | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);

  const [todayLoading, setTodayLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [drawerView, setDrawerView] = useState<DrawerView>("detail");
  const [moduleAnswers, setModuleAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [moduleOutput, setModuleOutput] = useState<ModuleOutput | null>(null);

  // Drift 1 fix (2026-05-18, journey-diagnostic): subscription state and
  // day-31 boundary were hardcoded false. Subscribers got no module unlocks,
  // and the day-31 dark banner never fired for buyers. Now derived from
  // tracker_sessions.subscription_status + current_day, same source Plan.tsx
  // already uses. Loads once per user session; held in component state so
  // every gated branch (modules unlocked count, locked-overlay overlay,
  // Day-31 banner, openArticle navigation gate) reads the truth.
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [isDay31Plus, setIsDay31Plus] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tracker_sessions")
        .select("subscription_status, current_day")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) return;
      const row = data as { subscription_status?: string; current_day?: number };
      setIsSubscriber(row.subscription_status === "active");
      setIsDay31Plus(typeof row.current_day === "number" && row.current_day > 30);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Today tab data ──
  useEffect(() => {
    if (activeTab === "today" && !todayData && !todayLoading) {
      setTodayLoading(true);
      supabase.functions.invoke("get-library-content", {
        body: { call_type: "today" },
      }).then(({ data, error }) => {
        if (!error && data) setTodayData(data as TodayData);
        setTodayLoading(false);
      });
    }
  }, [activeTab, todayData, todayLoading]);

  // ── Browse tab data ──
  useEffect(() => {
    if ((activeTab === "browse" || activeTab === "modules") && !browseData && !browseLoading) {
      setBrowseLoading(true);
      supabase.functions.invoke("get-library-content", {
        body: { call_type: "browse" },
      }).then(({ data, error }) => {
        if (!error && data) setBrowseData(data as BrowseData);
        setBrowseLoading(false);
      });
    }
  }, [activeTab, browseData, browseLoading]);

  // ── Open article drawer ──
  // Drift 1 fix: subscribers can open any module regardless of the per-module
  // is_unlocked flag returned by browse (which is the buyer-tier default).
  // For non-subscribers, an isUnlocked=false click still routes to /subscribe.
  const openArticle = useCallback((moduleId: number, isUnlocked: boolean) => {
    if (!isUnlocked && !isSubscriber) {
      navigateAuthed(navigate, "/subscribe");
      return;
    }
    setSelectedModuleId(moduleId);
    setArticleData(null);
    setArticleLoading(true);
    setDrawerOpen(true);
    setDrawerView("detail");
    setModuleAnswers({});
    setModuleOutput(null);

    supabase.functions.invoke("get-library-content", {
      body: { call_type: "article", module_id: moduleId },
    }).then(({ data, error }) => {
      if (!error && data) {
        const article = (data as any).module || data;
        setArticleData(article as ArticleData);
      }
      setArticleLoading(false);
    });
  }, [navigate]);

  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  // ── Start question form ──
  // Option B: initialise answers keyed by canonical question id (matches what
  // generate-guidance v28 reads). Every question gets an empty string so the
  // controlled inputs render — submit-side validation skips entries that are
  // still empty AND optional.
  const startQuestions = useCallback(() => {
    if (!articleData) return;
    const initial: Record<string, string> = {};
    articleData.questions.forEach((q) => {
      initial[q.id] = "";
    });
    setModuleAnswers(initial);
    setDrawerView("questions");
  }, [articleData]);

  // ── Submit module answers ──
  const submitModuleAnswers = useCallback(async () => {
    if (!articleData) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-guidance", {
        body: { module_id: articleData.module_id, module_answers: moduleAnswers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const output = data?.output || data;
      setModuleOutput(output as ModuleOutput);
      setDrawerView("output");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [articleData, moduleAnswers]);

  // ── Back to modules from drawer ──
  const backToModules = useCallback(() => {
    setDrawerOpen(false);
    setDrawerView("detail");
    setModuleOutput(null);
    setArticleData(null);
  }, []);

  // ── Derive browse track list for filter chips ──
  const trackKeys = browseData ? Object.keys(browseData.tracks) : [];
  const trackFilters = ["All", ...trackKeys];

  const filteredBrowseModules: BrowseModule[] = browseData
    ? activeFilter === "All"
      ? Object.values(browseData.tracks).flatMap((t) => t.modules)
      : browseData.tracks[activeFilter]?.modules || []
    : [];

  /*
   * Sidebar config, numeral prefix + label + count suffix per F-block
   * in pass-1-library-decisions.md. Counts derive from live data where
   * available; fall back to bare label until data lands. Per the
   * decisions doc, simplest is to append the count to the label string
   * (rather than extending AreaSidebar's SidebarItem with a separate
   * suffix prop). The mint numeral prop already carries the editorial
   * hierarchy; the count is a quiet trailing fact.
   */
  const totalModulesCount = browseData
    ? Object.values(browseData.tracks).reduce((sum, t) => sum + t.modules.length, 0)
    : 0;
  const unlockedModulesCount = browseData?.unlocked_module_ids.length ?? 0;
  const todayCount = todayData?.featured.length ?? 0;
  const modulesLabelSuffix = isSubscriber
    ? totalModulesCount > 0 ? ` · ${totalModulesCount}` : ""
    : totalModulesCount > 0 ? ` · ${unlockedModulesCount} of ${totalModulesCount}` : "";

  const sidebarItems: SidebarItem[] = [
    {
      id: "today",
      label: `Today${todayCount > 0 ? ` · ${todayCount}` : ""}`,
      numeral: "01",
      onClick: () => setTab("today"),
      isActive: activeTab === "today",
    },
    {
      id: "browse",
      label: `Browse${totalModulesCount > 0 ? ` · ${totalModulesCount}` : ""}`,
      numeral: "02",
      onClick: () => setTab("browse"),
      isActive: activeTab === "browse",
    },
    {
      id: "modules",
      label: `Modules${modulesLabelSuffix}`,
      numeral: "03",
      onClick: () => setTab("modules"),
      isActive: activeTab === "modules",
    },
  ];

  const sidebarHead: ReactNode = (
    <>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      <span>Library</span>
    </>
  );

  const sidebarFooter: ReactNode = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Curriculum
      </div>
      <div className="mt-1 text-[12px] text-foreground">
        32 modules · {isSubscriber ? "all unlocked" : `${unlockedModulesCount || 3} unlocked`}
      </div>
    </>
  );

  /* Per-tab page-header content, H1 + subhead change with the tab. */
  const headerByTab: Record<string, { eyebrow: string; h1: string; sub: string; stat?: string }> = {
    today: {
      eyebrow: "Today",
      h1: "Library.",
      sub: "Chosen for where you are right now, three to six picks against today's check-in signal.",
      // Visual-audit 2026-05-18: pluralise correctly. "1 picks" was reading
      // as a grammar bug in the eyebrow chip on /library.
      stat: todayCount > 0 ? `${todayCount} ${todayCount === 1 ? "pick" : "picks"}` : undefined,
    },
    browse: {
      eyebrow: "Browse",
      h1: "Browse.",
      sub: "Everything we've written, sorted by topic. Filter to narrow the field.",
      // Same pluralisation discipline as Today's "picks".
      stat: totalModulesCount > 0 ? `${totalModulesCount} ${totalModulesCount === 1 ? "article" : "articles"}` : undefined,
    },
    modules: {
      eyebrow: "Modules",
      h1: "Modules.",
      sub: "32 modules. Three included with your report; subscribe to open the other 29.",
      stat: "32 modules",
    },
  };
  const header = headerByTab[activeTab] || headerByTab.today;

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main>
        <section className="pt-6 pb-8 lg:pb-12">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="flex gap-8 lg:gap-10">
              <AreaSidebar
                items={sidebarItems}
                head={sidebarHead}
                footer={sidebarFooter}
              />

              <div className="flex-1 min-w-0">
                <h1 className="sr-only">Library</h1>

                {/* Day-31 dark banner, first cadence moment, mirrors /plan's Day-31 wall. */}
                {isDay31Plus && !isSubscriber && (
                  <Day31Banner onSubscribe={handleSubscribe} />
                )}

                {/* Page-header panel, per-tab eyebrow + H1 + subhead + right-side stat. */}
                <LibraryPageHeader
                  eyebrow={header.eyebrow}
                  h1={header.h1}
                  sub={header.sub}
                  stat={header.stat}
                />

                {/* Tab content, flat on the page, opened by a hairline rule. */}
                <section className="border-t border-border pt-6 mb-6">
                  {activeTab === "today" ? (
                    todayLoading || !todayData ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-24" />
                        ))}
                      </div>
                    ) : (
                      <TodayTab data={todayData} onOpenArticle={openArticle} onSubscribe={handleSubscribe} />
                    )
                  ) : activeTab === "browse" ? (
                    browseLoading || !browseData ? (
                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-24" />
                        ))}
                      </div>
                    ) : (
                      <BrowseTab
                        tracks={browseData.tracks}
                        completedIds={browseData.completed_module_ids}
                        filter={activeFilter}
                        filterOptions={trackFilters}
                        onFilterChange={setActiveFilter}
                        onOpenArticle={openArticle}
                        onSubscribe={handleSubscribe}
                      />
                    )
                  ) : (
                    <ModulesTab
                      browseData={browseData}
                      onSelectModule={(id, unlocked) => openArticle(id, unlocked)}
                      showGateRow={!isSubscriber}
                      onSubscribe={handleSubscribe}
                    />
                  )}
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Reading drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) backToModules(); }}>
        <SheetContent side="right" className="w-full sm:max-w-[70vw] overflow-y-auto p-0">
          {articleLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 w-full mt-6" />
            </div>
          ) : articleData ? (
            drawerView === "questions" ? (
              <QuestionForm
                data={articleData}
                answers={moduleAnswers}
                onAnswerChange={(key, val) => setModuleAnswers((a) => ({ ...a, [key]: val }))}
                onSubmit={submitModuleAnswers}
                onBack={() => setDrawerView("detail")}
                submitting={submitting}
                onClose={backToModules}
              />
            ) : drawerView === "output" && moduleOutput ? (
              <div className="px-6 py-8">
                <GuidanceModuleOutput
                  module={{
                    id: articleData.module_id,
                    name: articleData.title,
                    area: articleData.track_name,
                    minutes: articleData.estimated_minutes,
                    prereq: null,
                    questions: [],
                    description: articleData.description,
                    track: articleData.track,
                  }}
                  output={moduleOutput}
                  referenceItems={articleData.reference_items}
                  moduleAnswers={moduleAnswers}
                  onRegenerated={(response) => {
                    const newOutput = response?.output || response;
                    setModuleOutput(newOutput as ModuleOutput);
                  }}
                  onBack={backToModules}
                />
              </div>
            ) : (
              <ArticleDrawer
                data={articleData}
                onClose={backToModules}
                onSubscribe={handleSubscribe}
                onStartModule={startQuestions}
              />
            )
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Today Tab ── */
function TodayTab({
  data, onOpenArticle, onSubscribe,
}: {
  data: TodayData;
  onOpenArticle: (moduleId: number, isUnlocked: boolean) => void;
  onSubscribe: () => void;
}) {
  const { featured, progress } = data;

  return (
    <div>
      {/* Progress summary */}
      <div className="mb-6 flex items-center gap-3">
        <Progress
          value={progress.unlocked > 0 ? (progress.completed / progress.unlocked) * 100 : 0}
          className="h-1.5 flex-1"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{progress.message}</span>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Chosen for where you are right now.
      </p>

      <div>
        {featured.map((item) => (
          <button
            key={item.module_id}
            onClick={() => onOpenArticle(item.module_id, item.is_unlocked)}
            className="w-full border-t border-border py-5 text-left transition-colors hover:bg-[hsl(var(--surface-card))]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {!item.is_unlocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : item.is_completed ? (
                  <Check className="h-4 w-4 text-[#15735F]" />
                ) : (
                  <BookOpen className="h-4 w-4 text-[#15735F]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#15735F]">
                    {item.track_name}
                  </span>
                  {item.tag === "up_next" && (
                    <span className="text-[9px] font-medium uppercase tracking-wider text-accent-foreground bg-accent/20 px-1.5 py-0.5">
                      Up next
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground/60">{item.estimated_minutes} min</span>
                </div>
              </div>
            </div>
            {!item.is_unlocked && (
              <p className="mt-3 text-[10px] font-medium text-muted-foreground">Subscribe to open</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Browse Tab ── */
function BrowseTab({
  tracks, completedIds, filter, filterOptions, onFilterChange, onOpenArticle, onSubscribe,
}: {
  tracks: Record<string, TrackData>;
  completedIds: number[];
  filter: string;
  filterOptions: string[];
  onFilterChange: (f: string) => void;
  onOpenArticle: (moduleId: number, isUnlocked: boolean) => void;
  onSubscribe: () => void;
}) {
  const completedSet = new Set(completedIds);

  // Get display data, either all tracks or single filtered track
  const displayTracks = filter === "All"
    ? Object.values(tracks)
    : tracks[filter] ? [tracks[filter]] : [];

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((t) => {
          const label = t === "All" ? "All" : tracks[t]?.name || t;
          return (
            <button
              key={t}
              onClick={() => onFilterChange(t)}
              className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === t
                  ? "border-foreground bg-foreground text-[#FAF9F7]"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {displayTracks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">No articles match that filter.</p>
          <Button variant="outline" size="sm" onClick={() => onFilterChange("All")}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {displayTracks.map((track) => (
            <section key={track.track_id}>
              <h2 className="rule-head flex items-baseline justify-between">
                <span>{track.name}</span>
                <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                  {track.completed_count}/{track.total_count} done
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-2 mb-4">{track.description}</p>

              <div>
                {/* Sort sector-relevant modules first for Track E */}
                {[...track.modules]
                  .sort((a, b) => (b.is_sector_relevant ? 1 : 0) - (a.is_sector_relevant ? 1 : 0))
                  .map((mod) => (
                    <button
                      key={mod.module_id}
                      onClick={() => onOpenArticle(mod.module_id, mod.is_unlocked)}
                      className="w-full border-t border-border first:border-t-0 py-5 text-left transition-colors hover:bg-[hsl(var(--surface-card))]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                          {!mod.is_unlocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : completedSet.has(mod.module_id) ? (
                            <Check className="h-4 w-4 text-[#15735F]" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-[#15735F]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {mod.is_sector_relevant && (
                            <span className="text-[9px] font-medium uppercase tracking-wider text-[#15735F] bg-primary/10 px-1.5 py-0.5 mb-1 inline-block">
                              Your sector
                            </span>
                          )}
                          <h3 className="text-sm font-semibold text-foreground leading-snug">{mod.title}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {mod.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground/60" />
                            <span className="text-[10px] text-muted-foreground/60">{mod.estimated_minutes} min</span>
                          </div>
                        </div>
                      </div>
                      {!mod.is_unlocked && (
                        <p className="mt-3 text-[10px] font-medium text-muted-foreground">Subscribe to open</p>
                      )}
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Modules Tab, receives browse data from parent ──
 *
 * Pass 1 (2026-05-18): patches in the single dark gate row (DarkGateRow)
 * between the last unlocked module and the first locked module for
 * buyers (showGateRow = true). This is the screen's second cadence
 * moment per pass-1-library-decisions.md (the first is the Day-31
 * banner above the page header). Subscribers get neither, their
 * library runs all-ivory throughout.
 *
 * Existing module-row rendering preserved as-is for Pass 1; Phase 2 of
 * Phase 2 will rebuild it as the editorial typographic row vocabulary
 * per F1 of the decisions doc.
 */
function ModulesTab({
  browseData,
  onSelectModule,
  showGateRow,
  onSubscribe,
}: {
  browseData: BrowseData | null;
  onSelectModule: (id: number, unlocked: boolean) => void;
  showGateRow: boolean;
  onSubscribe: () => void;
}) {
  if (!browseData) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const modules: BrowseModule[] = Object.values(browseData.tracks).flatMap((t) => t.modules);

  // Find the index where the unlocked/locked boundary sits. The gate row
  // renders after the last unlocked module and before the first locked.
  const firstLockedIndex = modules.findIndex((m) => !m.is_unlocked);

  return (
    <div>
      {modules.map((mod, i) => (
        <div key={mod.module_id}>
          {/* Insert dark gate row before the first locked module (buyer view only). */}
          {showGateRow && i === firstLockedIndex && firstLockedIndex > 0 && (
            <DarkGateRow onSubscribe={onSubscribe} />
          )}

          <button
            onClick={() => onSelectModule(mod.module_id, mod.is_unlocked)}
            className={`w-full border-t border-border py-4 text-left transition-colors hover:bg-[hsl(var(--surface-card))] ${
              mod.is_unlocked ? "cursor-pointer" : "opacity-70 cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {!mod.is_unlocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : mod.is_completed ? (
                  <Check className="h-4 w-4 text-[#15735F]" />
                ) : (
                  <BookOpen className="h-4 w-4 text-[#15735F]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#15735F]">{mod.track_name}</span>
                  {mod.is_completed && <span className="text-[9px] text-[#15735F] bg-primary/10 px-1.5 py-0.5">Done</span>}
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug">{mod.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{mod.description}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                {mod.estimated_minutes} min
              </div>
            </div>
            {!mod.is_unlocked && (
              <p className="mt-2 text-[10px] font-medium text-muted-foreground ml-11">In subscription</p>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── LibraryPageHeader, per-tab page header in its own ivory panel ──
 *
 * Mirrors the /report header pattern: small-caps eyebrow with mint dot
 * + drafted-at meta, large display H1, supporting subhead. The H1 is
 * a `aria-hidden` div (the real H1 is sr-only on the page wrapper) so
 * scale doesn't fight the document outline.
 *
 * Stat pill (right-side) is optional and renders only when present —
 * "32 modules" on the Modules tab, article count on Browse, picks
 * count on Today. Reads as a quiet fact, not a banner.
 */
function LibraryPageHeader({
  eyebrow,
  h1,
  sub,
  stat,
}: {
  eyebrow: string;
  h1: string;
  sub: string;
  stat?: string;
}) {
  return (
    <section className="pt-2 pb-8 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="eyebrow">{eyebrow}</span>
        {stat && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[12px] text-muted-foreground">{stat}</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
        <div className="lg:col-span-9">
          <div aria-hidden className="title-h1">
            {h1}
          </div>
          <p className="standfirst mt-4 max-w-2xl">
            {sub}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── DarkGateRow, the screen's first dark moment ──
 *
 * Single thin dark band inserted once between Module 03 (last unlocked
 * for buyers) and Module 04 (first locked). ~88px tall, full-width of
 * the panel. Mint dot + white small-caps label + short body sentence
 * + inline mint Subscribe CTA. Per pass-1-library-decisions.md F3:
 * "Modules 04 to 25 are in the subscription. Same authors, same
 * depth, 29 more on the harder things."
 *
 * Subscribers don't see this row (showGateRow is false). 22 dark walls
 * would be punitive; a single contained gate row marks the boundary
 * without darkening every locked module.
 */
function DarkGateRow({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <div className="panel-dark px-5 sm:px-8 py-5 my-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#FAF9F7" }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        <span>Included period ends here</span>
      </div>
      <p
        className="flex-1 text-[14px] sm:text-[15px] leading-snug"
        style={{ color: "rgba(250,249,247,0.85)" }}
      >
        Modules 04 to 25 are in the subscription.{" "}
        <span style={{ color: "#FAF9F7" }}>Same authors, same depth, 29 more on the harder things.</span>
      </p>
      <button
        type="button"
        onClick={onSubscribe}
        className="cta-block shrink-0 text-[12px]"
      >
        Subscribe to open
      </button>
    </div>
  );
}

/* ── Day31Banner, the screen's second dark moment ──
 *
 * Appears above the page header for Day-31 non-subscribers. Mirrors
 * /plan's Day-31 wall vocabulary: same panel-dark band, same position
 * above the page content, same "you've reached the end of the
 * included window, keep going on subscription" framing. Cross-surface
 * consistency: the same structural moment renders the same way on
 * both /plan and /library.
 *
 * Subscribers never see this. Buyers within their 30 days never see
 * this either, only buyers past Day 30 with no active subscription.
 */
function Day31Banner({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <div className="panel-dark px-6 sm:px-10 lg:px-12 py-6 sm:py-7 mb-6">
      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "#FAF9F7" }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        <span>Day 31 · Included period complete</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center">
        <div className="lg:col-span-9">
          <h2
            className="text-[22px] sm:text-[26px] font-extrabold tracking-tight leading-tight"
            style={{ color: "#FAF9F7" }}
          >
            Your 30 days are complete.
          </h2>
          <p
            className="mt-2 text-[14.5px] leading-relaxed"
            style={{ color: "rgba(250,249,247,0.85)" }}
          >
            Library is read-only on older items. Subscribe to keep getting new guidance, the 22 deeper modules and weekly Today picks come with the £19/month subscription.
          </p>
        </div>
        <div className="lg:col-span-3 flex lg:justify-end">
          <button
            type="button"
            onClick={onSubscribe}
            className="cta-block"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Question Form ── */
function QuestionForm({
  data, answers, onAnswerChange, onSubmit, onBack, submitting, onClose,
}: {
  data: ArticleData;
  answers: Record<string, string>;
  onAnswerChange: (key: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[hsl(var(--surface-panel))] px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{data.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> ~{data.estimated_minutes} min
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 px-6 py-8 space-y-6">
        {data.what_you_get && (
          <div className="border-t-[3px] border-foreground pt-3">
            <p className="eyebrow mb-1">You'll get</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.what_you_get}</p>
          </div>
        )}

        <div className="h-px bg-border" />

        {/*
          Option B (2026-05-25): render rich questions by type. Choice questions
          render as single-select option buttons (selected = mint border + tint).
          Text and number questions render as a Textarea (max 500 chars) or short
          input (number). Optional questions show "(optional)" in the label.
          Answers are dispatched keyed by canonical id, matching what
          generate-guidance v28 reads against its decision_logic.
        */}
        <div className="space-y-6">
          {data.questions.map((q) => {
            const value = answers[q.id] || "";
            const labelSuffix = q.optional ? (
              <span className="ml-1 text-[11px] font-normal text-muted-foreground/70">(optional)</span>
            ) : null;
            if (q.type === "choice" && q.options && q.options.length > 0) {
              return (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {q.text}{labelSuffix}
                  </label>
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => {
                      const selected = value === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={submitting}
                          onClick={() => onAnswerChange(q.id, opt)}
                          className={
                            "text-left text-sm leading-relaxed px-4 py-3 border transition-colors " +
                            (selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-[hsl(var(--surface-panel))] text-muted-foreground hover:border-primary/40 hover:text-foreground")
                          }
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }
            // text or number — both render as a Textarea (number is rare enough
            // not to warrant a dedicated input; the Textarea accepts numerals).
            return (
              <div key={q.id}>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {q.text}{labelSuffix}
                </label>
                <Textarea
                  value={value}
                  onChange={(e) => onAnswerChange(q.id, e.target.value.slice(0, 500))}
                  placeholder={q.placeholder || "Your answer..."}
                  rows={3}
                  maxLength={500}
                  disabled={submitting}
                  className="resize-none"
                />
                <p className="text-right text-[10px] text-muted-foreground/50 mt-1">
                  {value.length}/500
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={onBack}
            disabled={submitting}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to modules
          </button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Generating…
              </>
            ) : (
              "Get my guidance"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Article Drawer ── */
function ArticleDrawer({
  data, onClose, onSubscribe, onStartModule,
}: {
  data: ArticleData;
  onClose: () => void;
  onSubscribe: () => void;
  onStartModule: () => void;
}) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[hsl(var(--surface-panel))] px-6 py-4">
        <div>
          <span className="eyebrow text-[10px]">
            {data.track_name}
          </span>
          <h2 className="text-lg font-semibold text-foreground">{data.title}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-8 space-y-6">
        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {data.estimated_minutes} min
          </span>
          {data.is_completed && (
            <span className="flex items-center gap-1 text-primary">
              <Check className="h-3 w-3" /> Completed
            </span>
          )}
        </div>

        {/* Description */}
        <div className="text-sm leading-[1.8] text-muted-foreground">
          <p>{data.description}</p>
        </div>

        {/* Key questions — Option B: read question.text from the rich payload */}
        {data.questions && data.questions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Key questions
            </h3>
            <ul className="space-y-2">
              {data.questions.map((q) => (
                <li key={q.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  {q.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What you get */}
        {data.what_you_get && (
          <div className="border-t-[3px] border-foreground pt-3">
            <h3 className="eyebrow mb-2">
              What you get
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.what_you_get}</p>
          </div>
        )}

        {/* Completed state, show output.
            Option B / V28 reconciliation (2026-05-25): for v28 output shapes
            (short_version + playbook + check_in_commitment), delegate to the
            shared V28Body renderer used by the post-submit GuidanceModuleOutput
            view, so the inline-detail view stays consistent with the
            post-submit view. Legacy v25 shape (key_insights / next_steps /
            resources_or_prompts) keeps the old inline list rendering for
            backward compatibility on old completion rows. */}
        {data.is_completed && data.completion?.output && (
          <div className="space-y-5">
            {isV28(data.completion.output) ? (
              <V28Body output={data.completion.output} referenceItems={data.reference_items} />
            ) : (
              <>
                {data.completion.output.key_insights && data.completion.output.key_insights.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Key insights
                    </h3>
                    <ul className="space-y-2">
                      {data.completion.output.key_insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.completion.output.next_steps && data.completion.output.next_steps.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Next steps
                    </h3>
                    <ul className="space-y-2">
                      {data.completion.output.next_steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.completion.output.resources_or_prompts && data.completion.output.resources_or_prompts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Resources
                    </h3>
                    <ul className="space-y-2">
                      {data.completion.output.resources_or_prompts.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <Button variant="outline" size="sm" onClick={onStartModule}>
              Redo this module
            </Button>
          </div>
        )}

        {/* Not completed + unlocked → CTA to start */}
        {!data.is_completed && data.is_unlocked && (
          <Button onClick={onStartModule} className="w-full">
            Get my personalised guidance
          </Button>
        )}

        {/* Not unlocked → subscribe */}
        {!data.is_unlocked && (
          <div className="border border-border p-6 text-center">
            <Lock className="mx-auto h-5 w-5 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Subscribe to open</p>
            <p className="text-xs text-muted-foreground mb-4">
              This module is available with an active subscription.
            </p>
            <Button onClick={onSubscribe} size="sm">Subscribe to open</Button>
          </div>
        )}
      </div>
    </div>
  );
}
