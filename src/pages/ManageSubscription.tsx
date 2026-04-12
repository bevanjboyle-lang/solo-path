import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrackerSession } from "@/hooks/useTrackerSession";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SoloLogo from "@/components/SoloLogo";

export default function ManageSubscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, loading, isSubscribed, refresh } = useTrackerSession();
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleCancel = async () => {
    if (!session?.stripe_subscription_id) return;
    setCancelling(true);
    try {
      await supabase.functions.invoke("stripe-subscription-webhook", {
        body: {
          action: "cancel",
          subscription_id: session.stripe_subscription_id,
        },
      });
      setCancelled(true);
      setShowConfirm(false);
      refresh();
    } catch (err) {
      console.error("Cancel error:", err);
    }
    setCancelling(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-6 pt-20 pb-16">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-8">
            Manage Your Plan
          </h1>

          {cancelled && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Plan cancelled</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll retain access until the end of your current billing period.
                </p>
              </div>
            </div>
          )}

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span>Current Plan</span>
                <Badge variant={isSubscribed ? "default" : "secondary"} className="text-xs">
                  {isSubscribed ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscribed ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Solo Pro</p>
                      <p className="text-xs text-muted-foreground">
                        {session?.activated_at
                          ? `Active since ${new Date(session.activated_at).toLocaleDateString()}`
                          : "Active subscription"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-foreground font-medium">{session?.subscription_status}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Day</span>
                      <span className="text-foreground font-medium">{session?.current_day}</span>
                    </div>
                  </div>

                  {!showConfirm ? (
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowConfirm(true)}
                    >
                    Cancel Subscription
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Are you sure?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You'll lose access to check-ins and replanning at the end of your billing period.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowConfirm(false)}
                        >
                          Keep Plan
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleCancel}
                          disabled={cancelling}
                        >
                          {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Cancel"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    You don't have an active subscription.
                  </p>
                  <Button
                    onClick={() => navigate("/subscribe")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
