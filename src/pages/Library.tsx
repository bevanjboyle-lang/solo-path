import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Lock, ChevronRight, X, Filter, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { navigateAuthed } from "@/lib/handlers";
import TopBar from "@/components/TopBar";
import PanelLayout from "@/components/PanelLayout";
import Banner from "@/components/Banner";
import LibraryCard from "@/components/plan/LibraryCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import GlassCard from "@/components/ui/GlassCard";

/* ── Types ── */
interface LibraryItem {
  id: string;
  title: string;
  description: string;
  track: string;
  body?: string;
  relatedIds?: string[];
}

interface ModuleData {
  id: number;
  title: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  locked: boolean;
  lessons: { title: string; outcomes: string[]; locked: boolean }[];
}

/* ── Mock data ── */
const STARTER_CARDS: LibraryItem[] = [
  { id: "starter-1", title: "What to say when people ask what you're doing", description: "A simple framework for explaining your move without overselling or underselling.", track: "First steps", body: "[Placeholder article content] This module helps you frame your career move in everyday conversation..." },
  { id: "starter-2", title: "The first three conversations that matter", description: "Who to talk to first, what to ask, and what to listen for.", track: "First steps", body: "[Placeholder article content] Your first conversations shape your direction more than you think..." },
  { id: "starter-3", title: "Setting your opening rate without second-guessing", description: "A method for picking a number you can defend.", track: "Pricing", body: "[Placeholder article content] Most people undercharge at first. Here's how to avoid that..." },
];

const BROWSE_ITEMS: LibraryItem[] = [
  { id: "browse-1", title: "Managing scope creep on your first project", description: "How to keep boundaries clear when you're eager to impress.", track: "Delivery" },
  { id: "browse-2", title: "Building a pipeline before you need one", description: "Start planting seeds in week one, not week twelve.", track: "Growth" },
  { id: "browse-3", title: "When to say no to a client", description: "The signals that a project isn't right for you.", track: "Strategy" },
  { id: "browse-4", title: "Writing proposals that convert", description: "Structure, tone, and the one thing most proposals miss.", track: "Sales" },
  { id: "browse-5", title: "Cash flow in your first year", description: "A realistic model for managing irregular income.", track: "Finance" },
  { id: "browse-6", title: "Positioning yourself against agencies", description: "Why being solo is an advantage, not a weakness.", track: "Strategy" },
];

const MOCK_MODULES: ModuleData[] = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  title: [
    "Understanding your starting position",
    "How to talk about what you're doing",
    "Presenting yourself in the market",
    "Finding your first client conversation",
    "Writing a proposal that converts",
    "Setting your day rate",
    "Managing scope and delivery",
    "Building a sustainable pipeline",
    "Growing beyond solo",
  ][i],
  lessonsTotal: 4,
  lessonsCompleted: i === 0 ? 4 : i === 1 ? 2 : 0,
  locked: i > 2, // Lessons 1-3 unlocked for buyers
  lessons: Array.from({ length: 4 }, (_, j) => ({
    title: `Lesson ${j + 1}`,
    outcomes: ["[Placeholder learning outcome 1]", "[Placeholder learning outcome 2]"],
    locked: i > 2 && j > 0, // Lesson 1 always readable
  })),
}));

const TRACKS = ["All", "First steps", "Pricing", "Delivery", "Growth", "Strategy", "Sales", "Finance"];

/* ── Component ── */
export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "today";
  const setTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<LibraryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeLesson, setActiveLesson] = useState(0);

  const isSubscriber = false; // Mock: buyer state
  const isDay31Plus = false; // Mock

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const openArticle = useCallback((item: LibraryItem) => {
    setActiveArticle(item);
    setDrawerOpen(true);
  }, []);

  const selectModule = useCallback((id: number) => {
    setActiveModuleId(id);
    setActiveLesson(0);
    setTab("modules");
  }, []);

  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  const filteredBrowse = activeFilter === "All"
    ? BROWSE_ITEMS
    : BROWSE_ITEMS.filter((i) => i.track === activeFilter);

  const activeModule = activeModuleId ? MOCK_MODULES.find((m) => m.id === activeModuleId) : null;

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
                onClick={() => { setTab(t.id); setActiveModuleId(null); }}
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
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : activeTab === "today" ? (
              <TodayTab items={STARTER_CARDS} onOpenArticle={openArticle} />
            ) : activeTab === "browse" ? (
              <BrowseTab
                items={filteredBrowse}
                allItems={BROWSE_ITEMS}
                filter={activeFilter}
                onFilterChange={setActiveFilter}
                onOpenArticle={openArticle}
              />
            ) : activeModule ? (
              <ModuleView
                module={activeModule}
                activeLesson={activeLesson}
                onSelectLesson={setActiveLesson}
                onBack={() => setActiveModuleId(null)}
                isSubscriber={isSubscriber}
                onSubscribe={handleSubscribe}
              />
            ) : (
              <ModulesTab
                modules={MOCK_MODULES}
                onSelectModule={selectModule}
                isSubscriber={isSubscriber}
              />
            )}
          </div>
        </div>
      </PanelLayout>

      {/* Reading drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[70vw] overflow-y-auto p-0">
          {activeArticle && (
            <ReadingDrawer
              item={activeArticle}
              onClose={() => setDrawerOpen(false)}
              relatedItems={BROWSE_ITEMS.filter((b) => b.id !== activeArticle.id).slice(0, 3)}
              onOpenRelated={openArticle}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Today Tab ── */
function TodayTab({ items, onOpenArticle }: { items: LibraryItem[]; onOpenArticle: (i: LibraryItem) => void }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        Start here — three pieces for your first few days.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <LibraryCard
            key={item.id}
            title={item.title}
            description={item.description}
            track={item.track}
            onClick={() => onOpenArticle(item)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Browse Tab ── */
function BrowseTab({
  items, allItems, filter, onFilterChange, onOpenArticle,
}: {
  items: LibraryItem[];
  allItems: LibraryItem[];
  filter: string;
  onFilterChange: (f: string) => void;
  onOpenArticle: (i: LibraryItem) => void;
}) {
  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TRACKS.map((t) => (
          <button
            key={t}
            onClick={() => onFilterChange(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-[hsl(var(--surface-inset))] text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">No articles match that filter.</p>
          <Button variant="outline" size="sm" onClick={() => onFilterChange("All")}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <LibraryCard
              key={item.id}
              title={item.title}
              description={item.description}
              track={item.track}
              onClick={() => onOpenArticle(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Modules Tab ── */
function ModulesTab({
  modules, onSelectModule, isSubscriber,
}: {
  modules: ModuleData[];
  onSelectModule: (id: number) => void;
  isSubscriber: boolean;
}) {
  return (
    <div className="space-y-3">
      {modules.map((m) => {
        const pct = m.lessonsTotal > 0 ? (m.lessonsCompleted / m.lessonsTotal) * 100 : 0;
        const done = m.lessonsCompleted === m.lessonsTotal && m.lessonsTotal > 0;

        return (
          <button
            key={m.id}
            onClick={() => onSelectModule(m.id)}
            className="flex w-full items-center gap-4 rounded-lg border border-border bg-[hsl(var(--surface-panel))] p-4 text-left transition-colors hover:border-primary/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--surface-inset))]">
              {m.locked && !isSubscriber ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <BookOpen className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {m.lessonsCompleted}/{m.lessonsTotal}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              {done ? (
                <span className="text-xs font-medium text-primary">View</span>
              ) : m.locked && !isSubscriber ? (
                <span className="text-xs text-muted-foreground">Locked</span>
              ) : m.lessonsCompleted > 0 ? (
                <span className="text-xs font-medium text-primary">Continue</span>
              ) : (
                <span className="text-xs font-medium text-primary">Start</span>
              )}
              <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Module View ── */
function ModuleView({
  module, activeLesson, onSelectLesson, onBack, isSubscriber, onSubscribe,
}: {
  module: ModuleData;
  activeLesson: number;
  onSelectLesson: (i: number) => void;
  onBack: () => void;
  isSubscriber: boolean;
  onSubscribe: () => void;
}) {
  const lesson = module.lessons[activeLesson];
  const isLocked = lesson?.locked && !isSubscriber;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← All modules
      </button>

      <h2 className="font-display text-xl font-semibold text-foreground">{module.title}</h2>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Lesson nav */}
        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:w-48 shrink-0">
          {module.lessons.map((l, i) => (
            <button
              key={i}
              onClick={() => onSelectLesson(i)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeLesson === i
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.locked && !isSubscriber && <Lock className="mr-1.5 inline h-3 w-3" />}
              {l.title}
            </button>
          ))}
        </nav>

        {/* Lesson content */}
        <div className="flex-1">
          {isLocked ? (
            <GlassCard className="p-8 text-center">
              <h3 className="text-sm font-semibold text-foreground mb-2">{lesson.title}</h3>
              <ul className="mb-6 space-y-1">
                {lesson.outcomes.map((o, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{o}</li>
                ))}
              </ul>
              <div className="rounded-lg border border-border bg-[hsl(var(--surface-inset))] p-6">
                <Lock className="mx-auto h-5 w-5 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Subscribe to unlock</p>
                <p className="text-xs text-muted-foreground mb-4">This lesson is available with an active subscription.</p>
                <Button onClick={onSubscribe} size="sm">Subscribe to unlock</Button>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">{lesson.title}</h3>
              <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
                <p>[Placeholder lesson content] This is where the personalised module content will appear.</p>
                <p>Learning outcomes for this lesson:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {lesson.outcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Reading Drawer ── */
function ReadingDrawer({
  item, onClose, relatedItems, onOpenRelated,
}: {
  item: LibraryItem;
  onClose: () => void;
  relatedItems: LibraryItem[];
  onOpenRelated: (i: LibraryItem) => void;
}) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[hsl(var(--surface-panel))] px-6 py-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
            {item.track}
          </span>
          <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-8">
        <div className="text-sm leading-[1.8] text-muted-foreground space-y-4">
          <p>{item.body || "[Placeholder content] This article will contain personalised guidance based on your report and current progress."}</p>
          <p>[Placeholder] The full article content would appear here, covering the topic in depth with specific recommendations tailored to your situation.</p>
        </div>
      </div>

      {/* Related */}
      {relatedItems.length > 0 && (
        <div className="border-t border-border px-6 py-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Related</h3>
          <div className="space-y-3">
            {relatedItems.map((r) => (
              <LibraryCard
                key={r.id}
                title={r.title}
                description={r.description}
                track={r.track}
                onClick={() => onOpenRelated(r)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
