import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type SidebarGroup = "today" | "report" | "plan";

export interface SidebarItem {
  /** Matches the <section id="..."> in Plan.tsx */
  id: string;
  /** Human-readable label for the nav button */
  label: string;
  group: SidebarGroup;
  /** When false, the item is rendered disabled (section not on page yet). */
  available: boolean;
}

interface PlanSidebarProps {
  items: SidebarItem[];
  activeId: string | null;
  /**
   * "desktop" renders only the sticky-rail list (parent owns the sticky aside).
   * "mobile"  renders only the sticky chip + sheet.
   * Each variant is internally gated by lg breakpoint utilities so the
   * caller can render both unconditionally and still get correct visibility.
   */
  variant: "desktop" | "mobile";
}

const GROUP_ORDER: SidebarGroup[] = ["today", "report", "plan"];
const GROUP_LABELS: Record<SidebarGroup, string> = {
  today: "Today",
  report: "Your Plan B Report",
  plan: "Your Activation Plan",
};

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Single nav button used in both desktop and mobile lists. Active styling
 * uses a mint left-border + text-primary; disabled items are muted and
 * non-interactive.
 */
function NavButton({
  item,
  active,
  onActivate,
  size = "compact",
}: {
  item: SidebarItem;
  active: boolean;
  onActivate: () => void;
  size?: "compact" | "comfortable";
}) {
  const disabled = !item.available;
  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={disabled}
      aria-current={active ? "location" : undefined}
      className={cn(
        "group relative flex w-full items-center text-left transition-colors",
        size === "compact"
          ? "px-3 py-1.5 text-[13px]"
          : "px-4 py-2.5 text-sm",
        "border-l-2",
        active
          ? "border-primary text-primary font-medium"
          : "border-transparent",
        !active && !disabled
          ? "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-panel))]/50"
          : "",
        disabled
          ? "cursor-not-allowed text-muted-foreground/40"
          : "cursor-pointer",
      )}
    >
      <span className="truncate">{item.label}</span>
    </button>
  );
}

/**
 * Renders the grouped list of sidebar items. Used inside the sticky desktop
 * aside and inside the mobile Sheet.
 */
function GroupedList({
  items,
  activeId,
  onItemClick,
  size = "compact",
}: {
  items: SidebarItem[];
  activeId: string | null;
  onItemClick: (id: string) => void;
  size?: "compact" | "comfortable";
}) {
  return (
    <nav aria-label="Plan sections" className="flex flex-col">
      {GROUP_ORDER.map((group, groupIdx) => {
        const groupItems = items.filter((i) => i.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div
            key={group}
            className={cn(
              groupIdx > 0 && "mt-4 border-t border-border pt-4",
            )}
          >
            <h3
              className={cn(
                "mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                size === "comfortable" && "px-4 text-[11px]",
              )}
            >
              {GROUP_LABELS[group]}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {groupItems.map((item) => (
                <li key={item.id}>
                  <NavButton
                    item={item}
                    active={activeId === item.id}
                    onActivate={() => onItemClick(item.id)}
                    size={size}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/**
 * /plan in-page wayfinding. Desktop renders a sticky left rail; mobile (< lg)
 * renders a sticky chip-style "Jump to" button that opens a Sheet with the
 * same list.
 */
export default function PlanSidebar({ items, activeId, variant }: PlanSidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleDesktopClick = useCallback((id: string) => {
    scrollToId(id);
  }, []);

  const handleMobileClick = useCallback((id: string) => {
    // Close the sheet first so the smooth-scroll target isn't covered by
    // the overlay during the animation.
    setSheetOpen(false);
    // Defer the scroll until the sheet has begun closing — without this the
    // overlay can intercept focus and cancel the smooth-scroll.
    window.setTimeout(() => scrollToId(id), 50);
  }, []);

  if (variant === "desktop") {
    // Caller wraps in a sticky aside; we render only the list.
    //
    // F76 fix: the global office-bg.jpg fixed background sits behind every
    // page (App.tsx adds it at z-index -10). Without a backdrop on this
    // sidebar, inactive nav items (text-muted-foreground) are nearly
    // invisible against the photo and the whole sidebar reads as
    // "missing". A translucent surface-panel backdrop with backdrop-blur
    // gives the sidebar enough surface to make the items readable while
    // staying lightweight against the editorial design direction.
    return (
      <div className="hidden lg:block rounded-md border border-border/40 bg-[hsl(var(--surface-panel))]/85 p-2 shadow-sm backdrop-blur-md">
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <GroupedList
            items={items}
            activeId={activeId}
            onItemClick={handleDesktopClick}
            size="compact"
          />
        </div>
      </div>
    );
  }

  // variant === "mobile"
  const activeItem = items.find((i) => i.id === activeId && i.available);
  const mobileTriggerLabel = activeItem
    ? `Jump to: ${activeItem.label}`
    : "Jump to section";

  return (
    <div className="lg:hidden">
      <div
        className="sticky z-30 border-b border-border/60"
        style={{ top: 56, background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto w-full max-w-3xl px-6 py-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[hsl(var(--surface-panel))] px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-[hsl(var(--surface-panel))]/70"
              >
                <span className="truncate max-w-[60vw]">{mobileTriggerLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Jump to section</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <GroupedList
                  items={items}
                  activeId={activeId}
                  onItemClick={handleMobileClick}
                  size="comfortable"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
