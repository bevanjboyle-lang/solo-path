import { useState } from "react";
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
}

export interface AreaSidebarProps {
  items: SidebarItem[];
  className?: string;
}

/**
 * Reusable per-area sidebar. Desktop (>=1024px) renders a sticky 240px
 * left rail. Mobile (<1024px) renders a hamburger trigger that opens a
 * Sheet containing the same list.
 *
 * Every interactive item must pass either `to` (named navigateAuthed
 * navigation) or `onClick` (named handler). No inline business logic.
 */
export default function AreaSidebar({ items, className }: AreaSidebarProps) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleActivate = (item: SidebarItem, closeSheet?: () => void) => {
    if (item.isHeader) return;
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
          if (item.isHeader) {
            return (
              <li
                key={item.id}
                className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 first:mt-0"
              >
                {item.label}
              </li>
            );
          }
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleActivate(item, closeSheet)}
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "group flex w-full items-center border-l-2 px-3 py-1.5 text-left text-[13px] transition-colors",
                  item.isActive
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:bg-[hsl(var(--surface-panel))]/50 hover:text-foreground",
                )}
              >
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
      {/* Desktop sticky rail */}
      <aside
        className={cn(
          "hidden lg:block w-60 shrink-0 pt-8",
          className,
        )}
      >
        <div className="sticky top-20">
          <div className="rounded-md border border-border/40 bg-[hsl(var(--surface-panel))]/85 p-2 shadow-sm backdrop-blur-md">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
              {renderList()}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile hamburger + sheet */}
      <div className="lg:hidden">
        <div
          className="sticky z-30 border-b border-border/60"
          style={{
            top: 56,
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[hsl(var(--surface-panel))] px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-[hsl(var(--surface-panel))]/70"
                >
                  <Menu className="h-3.5 w-3.5" />
                  <span>Menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="max-w-[80vw] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Sections</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {renderList(() => setSheetOpen(false))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  );
}