import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Global error boundary. Catches render errors (including errors thrown by
 * Convex's useQuery when a server function fails) and surfaces them visibly
 * rather than silently leaving the app in a broken loading state.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[100dvh] bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ink-muted mb-4">
          pressure test · render error
        </p>
        <h1 className="font-display text-3xl text-ink mb-3">Something went wrong</h1>
        <p className="text-ink-muted text-sm mb-6 max-w-sm leading-relaxed">
          An error was caught before it could freeze the page. Check the browser
          console for the full stack trace.
        </p>

        <div className="w-full max-w-sm rounded-xl bg-white border border-cream-deep p-4 text-left mb-6">
          <p className="font-mono text-xs text-red-600 break-words">{error.message}</p>
        </div>

        <button
          onClick={() => window.location.assign("/")}
          className="rounded-full bg-ink text-cream px-6 py-3 text-sm font-medium"
        >
          back to home
        </button>
      </div>
    );
  }
}
