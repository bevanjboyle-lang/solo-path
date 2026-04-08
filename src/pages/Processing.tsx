import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Processing() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/results"), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* Spinner */}
      <motion.div
        className="mb-10 h-10 w-10 rounded-full border-2 border-border border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />

      <motion.h1
        className="text-2xl font-semibold text-foreground sm:text-3xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Building your Plan B report...
      </motion.h1>

      <motion.p
        className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        This takes about 30 seconds. We're analysing your profile against our business model library.
      </motion.p>
    </div>
  );
}
