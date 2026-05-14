import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Top-level React error boundary.
 *
 * In production builds React ships only generic minified error names with no
 * messages, which previously left blank-page bugs almost impossible to
 * diagnose without source maps. To break that cycle this boundary now:
 *
 * 1. Renders the friendly <ServerError /> page (unchanged for end-users).
 * 2. Renders a `<details>` block underneath it containing the raw error
 *    message, stack, and component stack. Hidden by default; one click
 *    expands it. End users will not bother; engineers can read the truth.
 *
 * The diagnostic block is always rendered in production. The reasoning is
 * that we are pre-launch with very low traffic and we deliberately want the
 * error visible if it surfaces. Once the product is in front of paying
 * users we should gate this on `import.meta.env.DEV` or a debug flag.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the console log so DevTools "Uncaught error:" search still finds it.
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    // TODO: Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      // CRITICAL: this fallback must be self-contained. It cannot use any React
      // Router hooks (useNavigate etc.), AuthProvider context, or any component
      // that depends on those — because ErrorBoundary sits ABOVE BrowserRouter
      // in App.tsx. When the boundary catches an error from inside the router
      // tree, the fallback renders OUTSIDE that tree, and any context hook
      // throws, cascading into a blank-screen meta-bug that hides the real
      // error. (We hit this on 2026-05-06 — the previous fallback rendered
      // <ServerError /> which calls useNavigate() on line 9; useNavigate
      // without a BrowserRouter ancestor throws "useNavigate() may be used
      // only in the context of a <Router> component", swallowing the diagnostic
      // block underneath. Hours of bisecting before source maps surfaced the
      // ServerError.tsx:9 frame.)
      //
      // Use plain HTML + window.location for navigation. No imports beyond
      // React. The diagnostic block is the load-bearing debugging surface
      // for the rest of pre-launch.
      return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
            <div className="w-full max-w-[560px] text-center">
              <p className="font-mono text-sm text-muted-foreground tracking-widest uppercase">500</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Something went wrong on our end.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Try refreshing the page. If the problem continues, email{" "}
                <a href="mailto:support@solo-plan.com" className="underline underline-offset-4 hover:text-foreground transition-colors">
                  support@solo-plan.com
                </a>
              </p>

              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                >
                  Refresh
                </button>
                <a
                  href="/"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Go home
                </a>
              </div>
            </div>
          </main>

          {/* V-062 fix (2026-05-14): the diagnostic block is now gated on
              import.meta.env.DEV per the file header's own "remove or gate
              before production traffic" note. Production users see no stack
              traces, no component paths, no internal Solo file structure.
              Engineers in dev / preview still see the full diagnostic block. */}
          {import.meta.env.DEV && (
            <div className="mx-auto w-full max-w-3xl px-6 pb-16 text-left text-xs">
              <details className="rounded-md border border-border bg-[hsl(var(--surface-panel))] p-4">
                <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Diagnostic — error details (engineers only)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Message</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-foreground">
                      {error?.name ? `${error.name}: ` : ""}
                      {error?.message || "(no message)"}
                    </pre>
                  </div>
                  {error?.stack && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Stack</p>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Component stack</p>
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
