import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  navigateAuthed,
  startTest,
  triggerStripeCheckout,
  openBillingPortal,
  resumeSubscription,
  confirmDeleteCv,
  requestDataExport,
  confirmDeleteAccount,
  submitForm,
} from "@/lib/handlers";
import TakeAnotherTestCard from "@/components/account/TakeAnotherTestCard";
import TripwireCard from "@/components/account/TripwireCard";
import CommunicationPreferences from "@/components/CommunicationPreferences";
import TopBar from "@/components/TopBar";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

/*
 * Account Pass 1 /account v1 (2026-05-18) third Phase 2 surface
 *
 * Editorial reskin of the account / billing / privacy surface. Two-
 * column app shell inheriting /plan + /report + /library. AreaSidebar
 * with five items (Profile · Subscription · Billing · Privacy &
 * data · Sign out), numerals 01–04 on content sections, Sign out as
 * utility item beneath a hairline. Each section content in its own
 * panel-ivory with editorial section-head.
 *
 * Locked decisions from admin/pass-1-account-decisions.md:
 *   Cadence: zero dark. /account is a calm self-serve utility; the
 *     system carries dark cadence load from /plan's Day-31 wall,
 *     /library's Day-31 banner + gate row, /report's #ai-impact.
 *     Restraint here protects those moments' meaning elsewhere.
 *   F1, Page-header right-side stat: "Member since [date]" only.
 *     Topbar avatar already substantiates identity; full name in
 *     display weight on the page header would be redundant and edge
 *     toward badge-y.
 *   F2, Subscribe CTA on buyer Subscription: inline at standard
 *     weight inside upgrade-block. Mint small-caps framing label +
 *     price-pair beside button (equal weight, not stacked). No
 *     banner, no urgency.
 *   F3, Cancel subscription: ghost link beside Manage billing
 *     button. Honest, available, not promoted.
 *   F4, Billing as its own section: kept separate.
 *   F5, Mobile Danger-zone preview indicator: dropped (CD's own
 *     risk flag landed; hamburger sheet already exposes Privacy).
 *   F6, Account-delete modal "what gets deleted" 5-item inset.
 *     Honesty over abstraction.
 *   F7, Cancel-pending + payment-failed banners: inside Subscription
 *     section panel, above section-head. Contextual placement.
 *
 * Mobile: AreaSidebar's existing hamburger-sheet pattern (inherited
 * from /plan + /report + /library). No tab strip.
 *
 * Pass 1 scope: shell + chrome + sidebar config + page-header panel +
 * per-section panels with editorial heads + Danger zone treatment +
 * state-variant banners + enhanced account-delete modal. Preserves:
 * all handlers, useSubscriptionStatus hook, TakeAnotherTestCard
 * composite, modal state machinery.
 */

export default function Account() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isActive: isSubscriber } = useSubscriptionStatus();
  type AccountSection = "profile" | "subscription" | "billing" | "communications" | "privacy";
  const [activeSection, setActiveSection] = useState<AccountSection>("profile");
  // CV state
  const [cvRemoved, setCvRemoved] = useState(false);

  // Mock subscription state
  const isCancelPending = false;
  const subscriptionPlan = "monthly"; // or "annual"
  const renewDate = "15 May 2026";
  const accessEndDate = "15 May 2026";
  const paymentFailed = false;

  // Profile editing
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [savingName, setSavingName] = useState(false);

  // Modals
  const [showDeleteCv, setShowDeleteCv] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showCancelSub, setShowCancelSub] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleSaveName = async () => {
    setSavingName(true);
    await submitForm("profile", { first_name: firstName });
    setSavingName(false);
    setEditingName(false);
    toast.success("Saved.");
  };

  const handleDeleteCv = async () => {
    const result = await confirmDeleteCv();
    if (result.error) {
      toast.error("Unable to delete CV. Please try again.");
    } else {
      setShowDeleteCv(false);
      setCvRemoved(true);
      toast.success("Your CV has been removed.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    const result = await confirmDeleteAccount(user.id);
    if (result.error) {
      toast.error("Unable to delete account. Please contact support.");
      setDeletingAccount(false);
      return;
    }
    setDeletingAccount(false);
    setShowDeleteAccount(false);
    await signOut();
    navigate("/");
    toast("Your account has been deleted.");
  };

  const handleCancelSub = async () => {
    setShowCancelSub(false);
    toast.success("Subscription cancelled. You'll keep access until " + accessEndDate + ".");
  };

  const handleResumeSub = async () => {
    await resumeSubscription();
    toast.success("Subscription resumed.");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // removed, handled by TakeAnotherTestCard

  const handleSubscribe = () => navigateAuthed(navigate, "/subscribe");

  const handleBillingPortal = async () => {
    try {
      await openBillingPortal();
    } catch {
      toast.error("Unable to open billing portal. Please contact support.");
    }
  };

  const handleDataExport = async () => {
    const result = await requestDataExport();
    if (result.error || !result.blob) {
      toast.error("Unable to export data. Please try again.");
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solo-data-export-" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Your data export is downloading.");
  };

  /* Section-meta strings driving the section-head right-column. */
  const sectionMeta: Record<AccountSection, { eyebrow: string; numeral: string; meta: string; h2: string; lede: string }> = {
    profile: {
      eyebrow: "Profile",
      numeral: "01",
      meta: editingName ? "editing first name" : "two fields · contact us to change your email",
      h2: "Profile.",
      lede: "Name and sign-in email. Email lives in support because magic-link sign-in depends on it.",
    },
    subscription: {
      eyebrow: "Subscription",
      numeral: "02",
      meta: isCancelPending ? `ending ${accessEndDate} · still active until then`
        : paymentFailed ? "payment retry pending"
        : isSubscriber ? `active · ${subscriptionPlan}`
        : "your current plan",
      h2: isSubscriber ? (subscriptionPlan === "annual" ? "Annual subscription." : "Monthly subscription.") : "30-day report.",
      lede: isSubscriber
        ? (isCancelPending
            ? `You've scheduled a cancellation. Nothing else changes until ${accessEndDate}, your library stays unlocked, weekly check-ins continue.`
            : "Renews automatically. Cancel any time, access continues until the end of the paid month.")
        : "One-time purchase. Access to your report and 30-day plan stays until the date below.",
    },
    billing: {
      eyebrow: "Billing",
      numeral: "03",
      meta: "receipts in Stripe",
      h2: "Billing.",
      lede: "Recent charges and the path to formal invoices. Stripe is the source of truth.",
    },
    communications: {
      eyebrow: "Communications",
      numeral: "04",
      meta: "applies immediately",
      h2: "Communications.",
      lede: "Which emails you get, and how often. Pause everything for a fortnight, or switch streams off for good — changes apply immediately.",
    },
    privacy: {
      eyebrow: "Privacy & data",
      numeral: "05",
      meta: "your data is yours",
      h2: "Privacy & data.",
      lede: "Remove individual pieces of your data or export everything we hold. Account deletion is also here, behind a typed confirmation.",
    },
  };

  /* Sidebar: numerals 01–04 on content sections + hairline + Sign out as utility. */
  const sidebarItems: SidebarItem[] = [
    { id: "profile",      label: "Profile",        numeral: "01", onClick: () => setActiveSection("profile"),      isActive: activeSection === "profile" },
    { id: "subscription", label: "Subscription",   numeral: "02", onClick: () => setActiveSection("subscription"), isActive: activeSection === "subscription" },
    { id: "billing",      label: "Billing",        numeral: "03", onClick: () => setActiveSection("billing"),      isActive: activeSection === "billing" },
    { id: "communications", label: "Communications", numeral: "04", onClick: () => setActiveSection("communications"), isActive: activeSection === "communications" },
    { id: "privacy",      label: "Privacy & data", numeral: "05", onClick: () => setActiveSection("privacy"),      isActive: activeSection === "privacy" },
    { id: "sep",          label: "",               isDivider: true },
    { id: "signout",      label: "Sign out",       isUtility: true, onClick: handleSignOut },
  ];

  const sidebarHead: ReactNode = (
    <>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
      <span>Your account</span>
    </>
  );

  /* Member-since date, derived from auth.users.created_at when present. */
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const sidebarFooter: ReactNode = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Plan
      </div>
      <div className="mt-1 text-[12px] text-foreground">
        {isSubscriber
          ? subscriptionPlan === "annual" ? `Annual · Renews ${renewDate}` : `Monthly · Renews ${renewDate}`
          : /*
             * Visual-audit 2026-05-18: previously read "One-time · Day 12 of 30"
             * with the day count HARDCODED as 12 (not computed from
             * tracker_sessions.current_day). That created an off-by-one with
             * /plan's real day counter and turned stale immediately. /plan is
             * the canonical surface for day-of-30 progress; /account just
             * needs to communicate plan tier here. Day count dropped.
             */
            "One-time report"}
      </div>
    </>
  );

  const current = sectionMeta[activeSection];

  return (
    <div className="relative min-h-screen text-foreground">
      <TopBar />

      <main>
        <section className="pt-6 pb-8 lg:pb-12">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">{/* Sprint 1: mobile shell fix */}
              <AreaSidebar
                items={sidebarItems}
                head={sidebarHead}
                footer={sidebarFooter}
              />

              <div className="flex-1 min-w-0">
                <h1 className="sr-only">Account</h1>

                {/* Page-header panel: H1 + subhead + right-side Member-since date only (F1). */}
                <AccountPageHeader memberSince={memberSince} />

                {/* Section: flat editorial block opening on a rule-head (ADR-026 Phase 4). */}
                <section className="mb-6">

                  {/* Cancel-pending / payment-failed banners: contextual inside Subscription section, above section-head (F7). */}
                  {activeSection === "subscription" && isCancelPending && (
                    <CancelPendingBanner accessEndDate={accessEndDate} onResume={handleResumeSub} />
                  )}
                  {activeSection === "subscription" && paymentFailed && (
                    <PaymentFailedBanner onUpdate={handleBillingPortal} />
                  )}

                  <SectionHead numeral={current.numeral} eyebrow={current.eyebrow} meta={current.meta} />
                  <h2 className="font-display text-[24px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-foreground mb-2">
                    {current.h2}
                  </h2>
                  <p className="standfirst max-w-[54ch] mb-6">
                    {current.lede}
                  </p>

                  {/* Profile */}
                  {activeSection === "profile" && (
                    <ProfileSection
                      firstName={firstName}
                      onFirstNameChange={setFirstName}
                      email={user?.email ?? ""}
                      editing={editingName}
                      onEdit={() => setEditingName(true)}
                      onCancelEdit={() => setEditingName(false)}
                      onSave={handleSaveName}
                      saving={savingName}
                    />
                  )}

                  {/* Subscription */}
                  {activeSection === "subscription" && (
                    <>
                      <SubscriptionSection
                        isSubscriber={isSubscriber}
                        isCancelPending={isCancelPending}
                        paymentFailed={paymentFailed}
                        subscriptionPlan={subscriptionPlan}
                        renewDate={renewDate}
                        accessEndDate={accessEndDate}
                        onSubscribe={handleSubscribe}
                        onManageBilling={handleBillingPortal}
                        onCancel={() => setShowCancelSub(true)}
                        onResume={handleResumeSub}
                      />
                      <div className="mt-6 pt-6 border-t border-border">
                        <TakeAnotherTestCard />
                      </div>
                      <div className="mt-6 pt-6 border-t border-border">
                        <TripwireCard />
                      </div>
                    </>
                  )}

                  {/* Billing */}
                  {activeSection === "billing" && (
                    <BillingSection onOpenPortal={handleBillingPortal} />
                  )}

                  {/* Communications (ADR-027 preference centre — Day Zero C0.8 push, 2026-07-16) */}
                  {activeSection === "communications" && (
                    <CommunicationPreferences />
                  )}

                  {/* Privacy & data */}
                  {activeSection === "privacy" && (
                    <PrivacySection
                      onRemoveCv={() => setShowDeleteCv(true)}
                      cvRemoved={cvRemoved}
                      onRequestExport={handleDataExport}
                      onDeleteAccount={() => setShowDeleteAccount(true)}
                    />
                  )}
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Modals ── */}

      {/* CV delete */}
      <AlertDialog open={showDeleteCv} onOpenChange={setShowDeleteCv}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your CV?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll delete the file and any extracted text. Your report stays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCv}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel subscription */}
      <AlertDialog open={showCancelSub} onOpenChange={setShowCancelSub}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep access until {accessEndDate}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSub}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account delete, typed confirmation with "what gets deleted" inset (F6).
       *
       * Pass 1: enhanced from spec four-item sentence to a five-item itemised
       * list inside a stone-tinted inset. Honesty over abstraction.
       * Typed-confirm field is monospaced (it's a literal string match, not
       * prose). Armed-only-when-typed disabled treatment.
       */}
      <AlertDialog open={showDeleteAccount} onOpenChange={(open) => { setShowDeleteAccount(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-3 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#8E2424" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#D94F4F" }} />
              <span>Delete account · confirm</span>
            </div>
            <AlertDialogTitle className="font-display text-[22px] font-extrabold tracking-tight leading-tight text-foreground">
              Delete your Solo account.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This permanently deletes everything we hold about you. It can't be undone, and we can't recover anything from a deleted account.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3 bg-[#F3F1ED] border border-border px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              What gets deleted
            </div>
            <ul className="space-y-1 text-[13px] text-foreground/85 leading-snug">
              <li className="flex gap-2"><span className="text-muted-foreground">·</span>Your Plan B report and 30-day plan.</li>
              <li className="flex gap-2"><span className="text-muted-foreground">·</span>All questionnaire answers and your CV.</li>
              <li className="flex gap-2"><span className="text-muted-foreground">·</span>Check-in history and conversations with Ask Solo.</li>
              <li className="flex gap-2"><span className="text-muted-foreground">·</span>Subscription record (we'll cancel it as part of deletion).</li>
              <li className="flex gap-2"><span className="text-muted-foreground">·</span>Email address and profile.</li>
            </ul>
          </div>

          <div className="mt-4">
            <p className="text-[13px] text-foreground">
              Type{" "}
              <span
                className="font-mono text-[12px] px-1.5 py-0.5"
                style={{ background: "#F3F1ED", color: "#1D2025" }}
              >
                delete
              </span>
              {" "}below to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type here to confirm"
              className="mt-2 font-mono text-sm"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "delete" || deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-transparent disabled:text-destructive disabled:border disabled:border-destructive disabled:opacity-55"
            >
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────────────────────── Helper components ─────────────────────────── */

/* ── AccountPageHeader, H1 + subhead + right-side Member-since (F1) ── */
function AccountPageHeader({ memberSince }: { memberSince: string | null }) {
  return (
    <section className="pb-6 mb-6 border-b border-border">
      <div className="eyebrow mb-4">Account</div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
        <div className="lg:col-span-9">
          <div aria-hidden className="title-h1">
            Account.
          </div>
          <p className="standfirst mt-3 max-w-[52ch]">
            Profile, subscription, billing, and privacy. Self-serve.
          </p>
        </div>
        {memberSince && (
          <div className="lg:col-span-3 lg:text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1">
              Member since
            </div>
            <div className="text-[13px] font-medium text-foreground/80 tabular-nums">
              {memberSince}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── SectionHead, rule-head: mint-ink numeral + small-caps label on a 3px ink rule + right-side state meta ── */
function SectionHead({ numeral, eyebrow, meta }: { numeral: string; eyebrow: string; meta: string }) {
  return (
    <div className="rule-head flex items-baseline justify-between mb-5">
      <span className="inline-flex items-baseline gap-3">
        <span className="text-[#15735F] tabular-nums">{numeral}</span>
        <span>{eyebrow}</span>
      </span>
      <span className="normal-case font-normal text-[11px] text-muted-foreground/70 tracking-[0.04em]">
        {meta}
      </span>
    </div>
  );
}

/* ── ProfileSection, two field rows, inline first-name edit (F1) ── */
function ProfileSection({
  firstName, onFirstNameChange, email, editing, onEdit, onCancelEdit, onSave, saving,
}: {
  firstName: string;
  onFirstNameChange: (v: string) => void;
  email: string;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div>
      {/* First name */}
      <div className="grid grid-cols-[140px_1fr_auto] sm:grid-cols-[180px_1fr_auto] gap-x-6 sm:gap-x-8 items-center py-4 first:pt-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          First name
        </span>
        {editing ? (
          <>
            <Input
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              className="max-w-[340px] h-10"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                onClick={onSave}
                disabled={saving}
                className="cta-block inline-flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={saving}
                className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="font-display text-[15px] font-semibold text-foreground tracking-tight">
              {firstName || "Not set"}
            </span>
            <button
              onClick={onEdit}
              className="text-[13px] font-semibold text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
            >
              Edit
            </button>
          </>
        )}
      </div>

      {/* Sign-in email, read-only */}
      <div className="grid grid-cols-[140px_1fr_auto] sm:grid-cols-[180px_1fr_auto] gap-x-6 sm:gap-x-8 items-start py-4 border-t border-border">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground pt-1">
          Sign-in email
        </span>
        <div>
          <div className="font-display text-[15px] font-medium text-muted-foreground tracking-tight break-all">
            {email}
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground/80 leading-snug">
            This is where we'll send your magic link. Contact us to change it.
          </p>
        </div>
        <span />
      </div>
    </div>
  );
}

/* ── SubscriptionSection, plan-row + upgrade-block (buyer) or actions (subscriber) ── */
function SubscriptionSection({
  isSubscriber, isCancelPending, paymentFailed, subscriptionPlan, renewDate, accessEndDate,
  onSubscribe, onManageBilling, onCancel, onResume,
}: {
  isSubscriber: boolean;
  isCancelPending: boolean;
  paymentFailed: boolean;
  subscriptionPlan: string;
  renewDate: string;
  accessEndDate: string;
  onSubscribe: () => void;
  onManageBilling: () => void;
  onCancel: () => void;
  onResume: () => void;
}) {
  /* Buyer view, plan-row read-only + upgrade-block. */
  if (!isSubscriber) {
    return (
      <div>
        {/* Plan-row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center pt-1 pb-5 border-t border-border">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
              Current plan
            </div>
            <div className="font-display text-[18px] font-bold text-foreground tracking-tight">
              Report, £19.99 paid once
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mr-2">
                  Access until
                </span>
                {accessEndDate}
              </span>
            </div>
          </div>
        </div>

        {/* Upgrade block, F2: inline at standard weight, no urgency. */}
        <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 lg:gap-8 items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#15735F] mb-2">
              Want to keep going?
            </div>
            <p className="font-display text-[15.5px] text-foreground leading-[1.4] max-w-[54ch] tracking-tight">
              <span className="font-bold">Subscribe to keep your plan running past day 30.</span>
              {" "}Weekly check-ins, the full guidance library, fresh tests when you need them.
            </p>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="font-display text-[24px] font-extrabold text-foreground tracking-tight tabular-nums">£19</span>
            <span className="text-[12px] text-muted-foreground">/ month</span>
            <button onClick={onSubscribe} className="cta-block ml-2">Subscribe</button>
          </div>
        </div>
      </div>
    );
  }

  /* Subscriber view, plan-row + Manage primary + Cancel ghost (F3). */
  const priceLine = subscriptionPlan === "annual" ? "£149 / year · Annual" : "£19 / month · Monthly";
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-center pt-1 pb-1 border-t border-border">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
            Current plan
          </div>
          <div className="font-display text-[18px] font-bold text-foreground tracking-tight">
            {isCancelPending ? `${priceLine} · ending ${accessEndDate}` : priceLine}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {isCancelPending ? (
              <span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mr-2">
                  Access ends
                </span>
                {accessEndDate}
              </span>
            ) : paymentFailed ? (
              <span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mr-2">
                  Next retry
                </span>
                in a few days
              </span>
            ) : (
              <span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 mr-2">
                  Renews
                </span>
                {renewDate}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {isCancelPending ? (
            <button onClick={onResume} className="cta-block">Resume subscription</button>
          ) : paymentFailed ? (
            <button onClick={onManageBilling} className="cta-block">Update card</button>
          ) : (
            <>
              <button
                onClick={onManageBilling}
                className="px-[18px] py-[9px] text-[13px] font-semibold text-foreground bg-transparent border border-border transition-colors hover:bg-[#F3F1ED]"
              >
                Manage billing
              </button>
              <button
                onClick={onCancel}
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-[3px] decoration-[#D8D4CC]"
              >
                Cancel subscription
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── BillingSection, invoice list + Stripe portal deferral (F4: kept separate) ── */
function BillingSection({ onOpenPortal }: { onOpenPortal: () => void }) {
  return (
    <div>
      {/* Empty-state for now, invoice fetch is post-Pass 1 wiring.
       * Renders the Stripe deferral footnote as the section's primary content. */}
      <div className="bg-[#F3F1ED] border border-border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80 mb-1">
            Source
          </div>
          <p className="text-[13px] text-foreground leading-snug">
            <span className="font-semibold">Stripe is the source of truth for billing.</span>
            {" "}Update your card, download formal invoices, or view full history in the Stripe portal.
          </p>
        </div>
        <button
          onClick={onOpenPortal}
          className="shrink-0 px-[18px] py-[9px] text-[13px] font-semibold text-foreground bg-transparent border border-border transition-colors hover:bg-[#FAF9F7]"
        >
          Open Stripe portal
        </button>
      </div>
    </div>
  );
}

/* ── PrivacySection, two normal actions + Danger zone sub-panel ── */
function PrivacySection({
  onRemoveCv, cvRemoved, onRequestExport, onDeleteAccount,
}: {
  onRemoveCv: () => void;
  cvRemoved: boolean;
  onRequestExport: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <div>
      {/* Remove CV */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-8 items-center py-4 first:pt-0">
        <div>
          <div className="font-display text-[15px] font-semibold text-foreground tracking-tight mb-1">
            Remove my CV.
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug max-w-[60ch]">
            Deletes your uploaded file and the extracted text. Your report and plan stay, only the source CV is removed.
          </p>
        </div>
        <button
          onClick={onRemoveCv}
          disabled={cvRemoved}
          className="px-[18px] py-[9px] text-[13px] font-semibold text-foreground bg-transparent border border-border transition-colors hover:bg-[#F3F1ED] disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          {cvRemoved ? "Removed" : "Remove CV"}
        </button>
      </div>

      {/* Request export */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-8 items-center py-4 border-t border-border">
        <div>
          <div className="font-display text-[15px] font-semibold text-foreground tracking-tight mb-1">
            Request my data.
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug max-w-[60ch]">
            We'll email a full export of everything we hold about you answers, report, check-ins, library reads within 14 days.
          </p>
        </div>
        <button
          onClick={onRequestExport}
          className="px-[18px] py-[9px] text-[13px] font-semibold text-foreground bg-transparent border border-border transition-colors hover:bg-[#F3F1ED]"
        >
          Request export
        </button>
      </div>

      {/* Danger zone sub-panel, stone-tinted segregation, not red wall. */}
      <div
        className="mt-6 px-6 py-5"
        style={{ background: "#F3F1ED", border: "1px solid #D5D0C8" }}
      >
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-[#D5D0C8]">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#D94F4F" }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#8E2424" }}>
            Danger zone
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground/80 tracking-[0.04em]">
            irreversible
          </span>
        </div>
        <div className="font-display text-[15px] font-semibold text-foreground tracking-tight mb-1">
          Delete my account.
        </div>
        <p className="text-[13px] text-foreground/85 leading-snug mb-4 max-w-[60ch]">
          <span className="font-semibold text-foreground">This deletes your report, plan, check-in history, and conversations.</span>
          {" "}It can't be undone. You'll be asked to type the word "delete" to confirm, no accidental clicks.
        </p>
        <button
          onClick={onDeleteAccount}
          className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold transition-colors border-[1.5px]"
          style={{ borderColor: "#D94F4F", color: "#8E2424", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FDF0F0"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}

/* ── CancelPendingBanner, info-tinted, contextual inside Subscription section (F7) ── */
function CancelPendingBanner({ accessEndDate, onResume }: { accessEndDate: string; onResume: () => void }) {
  return (
    <div
      className="mb-5 px-5 py-3.5 grid grid-cols-[auto_1fr_auto] gap-x-4 items-center"
      style={{ background: "#D6F5EE", borderLeft: "3px solid #2ECDB0" }}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#2ECDB0" }} />
      <div className="text-[13.5px] leading-snug text-foreground">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] mr-2" style={{ color: "#15735F" }}>
          Cancellation scheduled
        </span>
        Your subscription ends on <strong>{accessEndDate}</strong>. You'll keep full access until then.
      </div>
      <button
        onClick={onResume}
        className="text-[12px] font-semibold text-foreground underline underline-offset-[3px] decoration-[#D8D4CC] hover:decoration-foreground whitespace-nowrap"
      >
        Resume →
      </button>
    </div>
  );
}

/* ── PaymentFailedBanner, error-tinted, informational not alarmist (F7) ── */
function PaymentFailedBanner({ onUpdate }: { onUpdate: () => void }) {
  return (
    <div
      className="mb-5 px-5 py-3.5 grid grid-cols-[auto_1fr_auto] gap-x-4 items-center"
      style={{ background: "#FDF0F0", borderLeft: "3px solid #D94F4F" }}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#D94F4F" }} />
      <div className="text-[13.5px] leading-snug text-foreground">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] mr-2" style={{ color: "#D94F4F" }}>
          Payment failed
        </span>
        We couldn't process your last charge. Update your card to keep your subscription active.
      </div>
      <button
        onClick={onUpdate}
        className="text-[12px] font-semibold text-foreground underline underline-offset-[3px] decoration-[#D8D4CC] hover:decoration-foreground whitespace-nowrap"
      >
        Update card →
      </button>
    </div>
  );
}
