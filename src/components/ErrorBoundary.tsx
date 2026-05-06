import React, { Component, ErrorInfo, ReactNode } from "react";
import ServerError from "@/pages/ServerError";

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
      return (
        <>
          <ServerError />
          {/* Pre-launch diagnostic — see file header. Remove or gate before production traffic. */}
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
        </>
      );
    }
    return this.props.children;
  }
}
