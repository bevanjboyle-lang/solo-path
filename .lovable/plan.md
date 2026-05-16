# Solo — Canonical Conformance Update (2026-05-16)

Structural refactor of the signed-in experience: hybrid nav (top bar + per-area sidebar), extract report to its own route, add check-in history route, segment Library and Account.

## Approach

Build a reusable `AreaSidebar` primitive, then refactor each authed page to use it. Extract report sections out of `/plan` into a new `/report` page. Add `/checkin/history`. No backend or edge function changes.

## Files

**New**
- `src/components/AreaSidebar.tsx` — reusable left sidebar (240px desktop, mobile drawer)
- `src/pages/Report.tsx` — extracted report view with section sidebar + scroll-spy
- `src/pages/CheckinHistory.tsx` — timeline of check-ins
- `src/components/plan/CheckinHistoryList.tsx` — timeline rendering

**Edited**
- `src/components/TopBar.tsx` — authed branch: Logo · Plan · Library · Account · Sign out (desktop + mobile)
- `src/pages/Plan.tsx` — remove all `sample-report/*` section imports + JSX; remove PlanSidebar; remove PDF button; add AreaSidebar; slim main to TodayCard + TrackerGrid + strand summary + guidance teaser; keep CheckInPanel, ActivationDialog, ReplanPromptCard, RefineReportPanel, StrandSelector
- `src/pages/Library.tsx` — add AreaSidebar with Today's pick / Browse / Modules tab control
- `src/pages/Account.tsx` — add AreaSidebar; segment into Profile / Subscription / Billing / Privacy & data sections via `activeSection` state; Sign out sidebar item fires handler directly
- `src/App.tsx` — add `/report` and `/checkin/history` routes (history declared **before** `/checkin/:sessionId`); extend FOOTERLESS_ROUTES
- `src/lib/handlers.ts` — confirm `navigateAuthed` covers `/report` and `/checkin/history` (no new handlers expected); add any handlers referenced by new components

**Deleted**
- `src/components/plan/PlanSidebar.tsx` — replaced by AreaSidebar

## AreaSidebar contract

```ts
interface SidebarItem {
  id: string; label: string;
  to?: string;             // Link via navigateAuthed
  onClick?: () => void;    // named handler
  isActive?: boolean;
  isHeader?: boolean;
}
interface AreaSidebarProps { items: SidebarItem[]; className?: string; }
```

- Desktop ≥1024px: sticky 240px left rail beneath TopBar, translucent surface-panel backdrop (consistent with current PlanSidebar fix).
- Mobile <1024px: hamburger trigger beneath TopBar opens a `Sheet` (side="left") with same list.
- Active: mint left-border + semibold; inactive: muted-foreground hover→foreground.
- Pure presentation. Caller owns state. No inline logic — items pass named handlers.

## /plan sidebar items

```ts
[
  { id: "today",   label: "Today",              to: "/plan" },
  { id: "strands", label: "Strands",            to: "/plan?view=strands" },
  { id: "history", label: "Check-in history",   to: "/checkin/history" },
  { id: "report",  label: "Report",             to: "/report" },
  { id: "refine",  label: "Refine your report", onClick: () => setShowRefinePanel(true) },
]
```

## /report

- Loads same paid-report row currently used on /plan, passes `core_report` to the canonical sample-report sections.
- Section sidebar with `useActiveSection` scroll-spy. Section IDs: edge, archetype, sell, skills, paths, recommendation, reality, income, ai.
- Header: title + "Download as PDF" (handler `downloadReportPdf` — reuse the existing handler currently on /plan) + "Refine your report" (opens RefineReportPanel locally).
- Empty state: no report → CTA back to `/` or `/plan`.

## /checkin/history

- Route declared **before** `/checkin/:sessionId` in App.tsx.
- AreaSidebar mirrors /plan items with `history` flagged `isActive`.
- Loads `checkin_history` rows + `tracker_sessions` to derive 30-day window.
- For each day in [start, start+29]: Completed (mint pill + 2-line excerpt, click row → read-only CheckInPanel drawer), Today (mint outline), Missed (grey), Future (muted).
- Subheader: "{N} check-ins · Days 1–30".

## /library segmentation

- Internal `activeTab` state ("today" | "browse" | "modules"), default "today".
- Sidebar items drive it. Existing module content/featured logic untouched.

## /account segmentation

- Internal `activeSection` state, default "profile".
- Profile (read-only name/email), Subscription (TakeAnotherTestCard, resume, cancel), Billing (openBillingPortal + history), Privacy & data (deleteCv, exportData, deleteAccount), Sign out (direct handler).

## Style & discipline

- Editorial DNA, mint #2ECDB0 sole accent, no new colors/fonts.
- Every interactive element calls a named handler from `src/lib/handlers.ts`. No inline `onClick` logic except trivial local state setters (`setActiveSection`, `setActiveTab`, `setShowRefinePanel`) — these are not handlers per spec since they don't navigate or call backend.
- No route guards in components; `ProtectedRoute` wraps in App.tsx.

## Out of scope

- No supabase/, edge function, or backend changes.
- No restyling of report section components or module cards.
- No changes to anon TopBar branch.
