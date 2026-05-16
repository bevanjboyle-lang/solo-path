import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
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
import TopBar from "@/components/TopBar";
import Banner from "@/components/Banner";
import AreaSidebar, { type SidebarItem } from "@/components/AreaSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Account() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isActive: isSubscriber } = useSubscriptionStatus();
  type AccountSection = "profile" | "subscription" | "billing" | "privacy";
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

  // removed — handled by TakeAnotherTestCard

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

  const sidebarItems: SidebarItem[] = [
    { id: "profile", label: "Profile", onClick: () => setActiveSection("profile"), isActive: activeSection === "profile" },
    { id: "subscription", label: "Subscription", onClick: () => setActiveSection("subscription"), isActive: activeSection === "subscription" },
    { id: "billing", label: "Billing", onClick: () => setActiveSection("billing"), isActive: activeSection === "billing" },
    { id: "privacy", label: "Privacy & data", onClick: () => setActiveSection("privacy"), isActive: activeSection === "privacy" },
    { id: "signout", label: "Sign out", onClick: handleSignOut },
  ];

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <TopBar />
      <div className="mx-auto w-full max-w-screen-xl px-6">
        <div className="flex gap-10">
          <AreaSidebar items={sidebarItems} />
          <div className="flex-1 min-w-0 mx-auto w-full max-w-xl space-y-8 py-10">
          <h1
            className="font-display text-3xl font-bold tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Account
          </h1>

          {activeSection === "profile" && (
          <Card className="border-border bg-[hsl(var(--surface-panel))]">
            <CardContent className="p-6">
              <h2 className="font-display text-base font-semibold text-foreground mb-5">Profile</h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">First name</Label>
                  {editingName ? (
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-9 text-sm"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                        {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-sm text-foreground">{firstName || "Not set"}</span>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Sign-in email</Label>
                  <p className="mt-1.5 text-sm text-foreground">{user?.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    This is where we'll send your magic link. Contact us to change it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {activeSection === "subscription" && (
          <>
          <Card className="border-border bg-[hsl(var(--surface-panel))]">
            <CardContent className="p-6">
              <h2 className="font-display text-base font-semibold text-foreground mb-5">Your plan</h2>

              {paymentFailed && (
                <Banner variant="error">
                  We couldn't process your last payment. Update your card to keep your subscription active.
                </Banner>
              )}

              {isCancelPending && (
                <Banner variant="info">
                  Your subscription ends on {accessEndDate}. You'll keep full access until then.
                </Banner>
              )}

              {isSubscriber ? (
                <div className="space-y-4">
                  <p className="text-sm text-foreground">
                    Subscription — £{(subscriptionPlan as string) === "annual" ? "149 / year" : "19 / month"} · Renews {renewDate}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => setShowCancelSub(true)}
                    >
                      Cancel subscription
                    </Button>
                  </div>
                  {isCancelPending && (
                    <Button size="sm" onClick={handleResumeSub}>
                      Resume subscription
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-foreground">
                    30-day report — access until {accessEndDate}
                  </p>
                  <Button size="sm" onClick={handleSubscribe}>
                    Subscribe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <TakeAnotherTestCard />
          </>
          )}

          {activeSection === "billing" && (
          <Card className="border-border bg-[hsl(var(--surface-panel))]">
            <CardContent className="p-6">
              <h2 className="font-display text-base font-semibold text-foreground mb-5">Billing</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage payment method, view invoices, and update billing details.
              </p>
              <Button size="sm" variant="outline" onClick={handleBillingPortal}>
                Open billing portal
              </Button>
            </CardContent>
          </Card>
          )}

          {activeSection === "privacy" && (
          <Card className="border-border bg-[hsl(var(--surface-panel))]">
            <CardContent className="p-6">
              <h2 className="font-display text-base font-semibold text-foreground mb-5">Data & privacy</h2>

              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-foreground">Remove my CV</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We'll delete the file and any extracted text. Your report stays.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setShowDeleteCv(true)}
                    disabled={cvRemoved}
                  >
                    {cvRemoved ? "Removed" : "Remove"}
                  </Button>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">Request my data</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={handleDataExport}>
                    Request export
                  </Button>
                </div>

                {/* Danger zone */}
                <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Danger zone
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This permanently deletes your account, report, plan, check-in history, and conversations.
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-4"
                    onClick={() => setShowDeleteAccount(true)}
                  >
                    Delete my account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
          </div>
        </div>
      </div>

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

      {/* Account delete — typed confirmation */}
      <AlertDialog open={showDeleteAccount} onOpenChange={(open) => { setShowDeleteAccount(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes your report, plan, check-in history, and conversations. It can't be undone. Type <strong>delete</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder='Type "delete" to confirm'
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "delete" || deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
