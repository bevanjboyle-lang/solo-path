import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, LogOut, FileText, Activity, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrackerSession } from "@/hooks/useTrackerSession";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SoloLogo from "@/components/SoloLogo";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    session,
    loading,
    phases,
    totalTasks,
    completedCount,
    progressPct,
    isSubscribed,
  } = useTrackerSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPhase = phases.find((_: any, i: number) => {
    const phaseTasks = _.days_detail?.flatMap((_: any, di: number) =>
      _.tasks?.map((__: any, ti: number) => `${i}-${di}-${ti}`)
    ) || [];
    return phaseTasks.some((k: string) => !session);
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <SoloLogo />
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Your Dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Everything in one place. Track progress, view your report, and manage your plan.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid gap-4 sm:grid-cols-3 mb-10">
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Plan Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{progressPct}%</div>
                <Progress value={progressPct} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {completedCount} of {totalTasks} tasks done
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">
                  {session ? `Day ${session.current_day}` : "Not started"}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {session?.activated_at
                    ? `Started ${new Date(session.activated_at).toLocaleDateString()}`
                    : "Activate to begin"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Your Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={isSubscribed ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isSubscribed ? "Active" : session ? "Free tier" : "No plan"}
                </Badge>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isSubscribed
                    ? "Full access to all features"
                    : "First 30 days included free"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {session && (
              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-colors"
                onClick={() => navigate("/tracker")}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">30-Day Tracker</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      View your daily tasks and check in on progress.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                </CardContent>
              </Card>
            )}

            <Card
              className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-colors"
              onClick={() => navigate("/results")}
            >
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">Your Report</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review your full Solo report with ranked paths and recommendations.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
              </CardContent>
            </Card>

            {!isSubscribed && session && (
              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-colors"
                onClick={() => navigate("/pricing")}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">Upgrade</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Unlock ongoing check-ins, replanning, and extended tracking.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                </CardContent>
              </Card>
            )}

            {!session && (
              <Card
                className="group cursor-pointer bg-card border-border/50 hover:border-primary/30 transition-colors"
                onClick={() => navigate("/questionnaire")}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">Start Questionnaire</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Complete the questionnaire to generate your personalised Solo report.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
