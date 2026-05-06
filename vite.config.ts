import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Pre-launch diagnostic — emit source maps so production stack traces are
    // readable in DevTools (otherwise React/minifier names like `Bt`, `jF`,
    // `kD` make blank-page bugs almost impossible to triage). Adds ~30%
    // bundle bytes which is acceptable for our pre-launch traffic. Revisit
    // before public launch — `sourcemap: "hidden"` would keep them out of the
    // browser but still let us upload them to Sentry/etc.
    sourcemap: true,
  },
}));
