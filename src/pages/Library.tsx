import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Lock, ChevronRight, X, Check, Clock, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import PanelLayout from "@/components/PanelLayout";
import Banner from "@/components/Banner";
import LibraryCard from "@/components/plan/LibraryCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import GlassCard from "@/components/ui/GlassCard";

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

interface ArticleData {
  module_id: number;
  title: string;
  track: string;
  track_name: string;
  description: string;
  estimated_minutes: number;
  key_questions: string[];
  what_you_get: string;
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

  const isSubscriber = false; // Will be derived from user state later
  const isDay31Plus = false;

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
    if (activeTab === "browse" && !browseData && !browseLoading) {
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
  const openArticle = useCallback((moduleId: number, isUnlocked: boolean) => {
    if (!isUnlocked) {
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
  const startQuestions = useCallback(() => {
    if (!articleData) return;
    const initial: Record<string, string> = {};
    articleData.key_questions.forEach((_, i) => {
      initial[`question_${i + 1}`] = "";
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

  const tabs = [
    { id: "today", label: "Today" },
    { id: "browse", label: "Browse" },
    { id: "modules", label: "Modules" },
  ];

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />

      {isDay31Plus && !isSubscriber && (
        <div className="px-6">
          <Banner variant="info">
            Your 30 days are complete. Subscribe to keep getting new guidance.
          </Banner>
        </div>
      )}

      <PanelLayout className="px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <h1
            className="font-display text-3xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Library
          </h1>

          {/* Tab bar */}
          <div className="mt-6 flex gap-1 rounded-lg bg-[hsl(var(--surface-inset))] p-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => { setTab(t.id); }}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === t.id
                    ? "bg-[hsl(var(--surface-panel))] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-8">
            {activeTab === "today" ? (
              todayLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : todayData ? (
                <TodayTab data={todayData} onOpenArticle={openArticle} onSubscribe={handleSubscribe} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              )
            ) : activeTab === "browse" ? (
              browseLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : browseData ? (
                <BrowseTab
                  tracks={browseData.tracks}
                  completedIds={browseData.completed_module_ids}
                  filter={activeFilter}
                  filterOptions={trackFilters}
                  onFilterChange={setActiveFilter}
                  onOpenArticle={openArticle}
                  onSubscribe={handleSubscribe}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              )
            ) : (
              <ModulesTab onSelectModule={(id) => openArticle(id, true)} />
            )}
          </div>
        </div>
      </PanelLayout>

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
              <OutputView
                moduleName={articleData.title}
                output={moduleOutput}
                onBack={backToModules}
                moduleId={articleData.module_id}
                navigate={navigate}
                onClose={backToModules}
              />
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

      <div className="grid gap-4 sm:grid-cols-2">
        {featured.map((item) => (
          <button
            key={item.module_id}
            onClick={() => onOpenArticle(item.module_id, item.is_unlocked)}
            className="w-full rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-5 text-left transition-colors hover:border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-inset))]">
                {!item.is_unlocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : item.is_completed ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <BookOpen className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                    {item.track_name}
                  </span>
                  {item.tag === "up_next" && (
                    <span className="text-[9px] font-medium uppercase tracking-wider text-accent-foreground bg-accent/20 px-1.5 py-0.5 rounded">
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
              <p className="mt-3 text-[10px] font-medium text-muted-foreground">Subscribe to unlock</p>
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

  // Get display data — either all tracks or single filtered track
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
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-[hsl(var(--surface-inset))] text-muted-foreground hover:text-foreground"
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
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-foreground">{track.name}</h2>
                <span className="text-[10px] text-muted-foreground">
                  {track.completed_count}/{track.total_count} done
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{track.description}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Sort sector-relevant modules first for Track E */}
                {[...track.modules]
                  .sort((a, b) => (b.is_sector_relevant ? 1 : 0) - (a.is_sector_relevant ? 1 : 0))
                  .map((mod) => (
                    <button
                      key={mod.module_id}
                      onClick={() => onOpenArticle(mod.module_id, mod.is_unlocked)}
                      className="w-full rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-5 text-left transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-inset))]">
                          {!mod.is_unlocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : completedSet.has(mod.module_id) ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {mod.is_sector_relevant && (
                            <span className="text-[9px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded mb-1 inline-block">
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
                        <p className="mt-3 text-[10px] font-medium text-muted-foreground">Subscribe to unlock</p>
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

/* ── Modules Tab — fetches browse data to render module cards ── */
function ModulesTab({ onSelectModule }: { onSelectModule: (id: number) => void }) {
  const [modules, setModules] = useState<BrowseModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.functions.invoke("get-library-content", {
      body: { call_type: "browse" },
    }).then(({ data }) => {
      if (data?.tracks) {
        const all = Object.values(data.tracks as Record<string, TrackData>).flatMap((t) => t.modules);
        setModules(all);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {modules.map((mod) => (
        <button
          key={mod.module_id}
          onClick={() => {
            if (!mod.is_unlocked) return;
            onSelectModule(mod.module_id);
          }}
          className={`w-full rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-4 text-left transition-colors ${
            mod.is_unlocked ? "hover:border-primary/30 cursor-pointer" : "opacity-70 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-inset))]">
              {!mod.is_unlocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : mod.is_completed ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <BookOpen className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">{mod.track_name}</span>
                {mod.is_completed && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">Done</span>}
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
            <p className="mt-2 text-[10px] font-medium text-muted-foreground ml-11">Subscribe to unlock</p>
          )}
        </button>
      ))}
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
            <span className="text-[10px] rounded-full bg-[hsl(var(--surface-inset))] px-2 py-0.5 text-muted-foreground flex items-center gap-1">
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
          <GlassCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">You'll get</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.what_you_get}</p>
          </GlassCard>
        )}

        <div className="h-px bg-border" />

        <div className="space-y-5">
          {data.key_questions.map((q, i) => {
            const key = `question_${i + 1}`;
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-foreground mb-2">{q}</label>
                <Textarea
                  value={answers[key] || ""}
                  onChange={(e) => onAnswerChange(key, e.target.value.slice(0, 500))}
                  placeholder="Your answer..."
                  rows={4}
                  maxLength={500}
                  disabled={submitting}
                  className="resize-none"
                />
                <p className="text-right text-[10px] text-muted-foreground/50 mt-1">
                  {(answers[key] || "").length}/500
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

/* ── Output View ── */
function OutputView({
  moduleName, output, onBack, moduleId, navigate, onClose,
}: {
  moduleName: string;
  output: ModuleOutput;
  onBack: () => void;
  moduleId: number;
  navigate: (path: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[hsl(var(--surface-panel))] px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">{moduleName}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 px-6 py-8 space-y-6">
        {output.key_insights && output.key_insights.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Key insights</h3>
            <ul className="space-y-2">
              {output.key_insights.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="h-px bg-border" />

        {output.next_steps && output.next_steps.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Next steps</h3>
            <ol className="space-y-2">
              {output.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-xs font-semibold text-primary">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="h-px bg-border" />

        {output.resources_or_prompts && output.resources_or_prompts.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Prompts and resources</h3>
            <ul className="space-y-2">
              {output.resources_or_prompts.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground">{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack}>Back to modules</Button>
          <button
            onClick={() => navigate("/ask-solo?context=" + moduleId)}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Ask Solo about this
          </button>
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
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
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

        {/* Key questions */}
        {data.key_questions && data.key_questions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Key questions
            </h3>
            <ul className="space-y-2">
              {data.key_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What you get */}
        {data.what_you_get && (
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              What you get
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.what_you_get}</p>
          </GlassCard>
        )}

        {/* Completed state — show output */}
        {data.is_completed && data.completion?.output && (
          <div className="space-y-5">
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
          <div className="rounded-lg border border-border bg-[hsl(var(--surface-inset))] p-6 text-center">
            <Lock className="mx-auto h-5 w-5 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Subscribe to unlock</p>
            <p className="text-xs text-muted-foreground mb-4">
              This module is available with an active subscription.
            </p>
            <Button onClick={onSubscribe} size="sm">Subscribe to unlock</Button>
          </div>
        )}
      </div>
    </div>
  );
}
