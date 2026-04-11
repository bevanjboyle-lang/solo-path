import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen } from "lucide-react";

const modules: Record<string, string> = {
  "1": "Positioning Your Expertise",
  "2": "Finding Your First Clients",
  "3": "Pricing Your Services",
  "4": "Building Your Pipeline",
  "5": "Outreach That Converts",
  "6": "Managing Client Relationships",
  "7": "Creating Scalable Offers",
  "8": "Building Your Online Presence",
  "9": "From Freelancer to Business",
};

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const title = id ? modules[id] : undefined;

  if (!title) {
    navigate("/modules", { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <button
            onClick={() => navigate("/modules")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Modules
          </button>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
              {id}
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-8">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Module {id} of 9
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Content for this module is coming soon. Check back shortly for guided exercises, frameworks, and actionable steps to help you master{" "}
              <span className="text-foreground font-medium">{title.toLowerCase()}</span>.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
