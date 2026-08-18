import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigateAuthed } from "@/lib/handlers";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface SidebarItem {
  id: string;
  label: string;
  /** If set, renders as a link and navigates via navigateAuthed. */
  to?: string;
  /** If set, renders as a button calling this handler. */
  onClick?: () => void;
  /** Controls active styling. */
  isActive?: boolean;
  /** Renders as a non-interactive section divider header. */
  isHeader?: boolean;
  /** Renders as a 1px hairline rule between items (Pass 1 /plan: separates utility items). */
  isDivider?: boolean;
  /** Marks an item as utility (subordinate styling — muted, no weight bump on hover). */
  isUtility?: boolean;
  /**
   * Optional small-caps numeral prefix (Pass 1 /report v1: '01'…'09' on
   * scroll-spy sidebar items). Mint coloured, tabular numerals, used to
   * cross-reference with section-head numerals inside the main content.
   * Not used on /plan's route sidebar (the 5 items there don't need numerals).
   */
  numeral?: string;
}

export interface AreaSidebarProps {
  items: SidebarItem[];
  className?: string;
  /** Optional small-caps eyebrow at the top of the sidebar (Pass 1 /plan: "Your plan" with mint dot). */
  head?: ReactNode;
  /** Optional footer slot — small-caps label + status pair (Pass 1 /plan: "Plan · One-time · Day 7 of 30"). */
  footer?: ReactNode;
}

/*
 * AreaSidebar — Pass 1 /plan v1 (2026-05-17)
 *
 * Editorial nav rail for authed area surfaces. 220px sticky on desktop;
 * hamburger Sheet on mobile.
 *
 * v1 changes (Pass 1 /plan decisions doc):
 *   - Active state restyled: 2px mint left rule + ivory background +
 *     heading-coloured text + 600 weight bump. No mint text colour on
 *     active (the rule + weight do the work; mint text would compete).
 *   - Hover state: ivory background + heading-coloured text. Does NOT
 *     add the mint rule — hover must not impersonate active.
 *   - Head slot (optional): for the small-caps eyebrow at the top.
 *   - Footer slot (optional): for the stat block at the bottom.
 *   - Divider items (isDivider: true): render as a 1px hairline rule
 *     with breathing room, marking utility items as a separate group.
 *   - Utility items (isUtility: true): subordinate styling, muted text
 *     colour, no weight bump.
 *
 * Pattern inherits from /questionnaire's progress-header active step
 * (mint underline as wayfinding signal) and from /cv-upload's Skip-
 * beneath-Continue hierarchy (utility items beneath a hairline rule).
 */
export default function AreaSidebar({ items, className, head, footer }: AreaSidebarProps) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleActivate = (item: SidebarItem, closeSheet?: () => void) => {
    if (item.isHeader || item.isDivider) return;
    if (item.to) {
      navigateAuthed(navigate, item.to);
    } else if (item.onClick) {
      item.onClick();
    }
    closeSheet?.();
  };

  const renderList = (closeSheet?: () => void) => (
    <nav aria-label="Section navigation" className="flex flex-col">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          if (item.isDivider) {
            return (
              <li key={item.id} aria-hidden className="my-3 h-px bg-border mx-3" />
            );
          }
          if (item.isHeader) {
            return (
              <li
                key={item.id}
                className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 first:mt-0"
              >
                {item.label}
              </li>
            );
          }
          const isUtility = item.isUtility;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleActivate(item, closeSheet)}
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "group flex w-full items-baseline gap-3 border-l-2 pl-4 pr-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  item.isActive
                    ? "border-[#15735F] font-bold text-foreground"
                    : isUtility
                    ? "border-transparent text-muted-foreground/80 hover:text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.numeral && (
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-semibold tabular-nums tracking-[0.1em] transition-colors",
                      item.isActive ? "text-[#15735F]" : "text-muted-foreground/60",
                    )}
                  >
                    {item.numeral}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop sticky rail.
        * Consistency-sweep 2026-05-18 (v1.6): pt-8 removed. The sidebar
        * top edge now sits at the same Y as the title card top edge —
        * both columns start at the top of the shared flex container.
        * Previously pt-8 pushed the sidebar 32px down, creating a
        * visible mis-alignment that Bevan flagged. The visible top
        * offset is now entirely provided by the outer section's pt-6
        * (24px), which is also Gap B (title card → next card), so the
        * three vertical gaps (TopBar→title, title→card, sidebar top
        * vs title top) are all consistent. */}
      <aside
        className={cn(
          "hidden lg:block w-[220px] shrink-0 border-r border-border",
          className,
        )}
      >
        {/* Sprint 1: offset tracks the sticky nav (4px house rule + 42px nav + breathing). */}
        <div className="sticky top-[62px]">
          <div className="pb-4 flex flex-col gap-4">
            {head && (
              <div className="px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground flex items-center gap-3">
                {head}
              </div>
            )}
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              {renderList()}
            </div>
            {footer && (
              <div className="px-5 pt-3 border-t border-border text-[11px] text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile hamburger + sheet */}
      <div className="lg:hidden">
        <div
          className="sticky z-30 border-b border-border"
          style={{
            // Sprint 1: pins directly beneath the house rule (4px) + nav (42px).
            top: 46,
            background: "hsl(var(--background) / 0.95)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="mx-auto w-full max-w-3xl px-6 py-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open section menu"
                  className="inline-flex items-center gap-1.5 border border-border bg-[#FAF9F7] px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-[#F3F1ED] transition-colors"
                >
                  <Menu className="h-3.5 w-3.5" />
                  <span>Menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="max-w-[80vw] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Your plan</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {renderList(() => setSheetOpen(false))}
                </div>
                {footer && (
                  <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground px-2">
                    {footer}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  );
}
