'use client';

// ───────────────────────────────────────────────────────────────────────────
// Reusable in-page error boundary. Wrap any widget/section so a render throw in
// one part of a page shows a compact fallback instead of crashing the whole
// route (which is what a bare App-Router error.tsx would do).
//
//   <ErrorBoundary label="Graphique des ventes">
//     <SalesChart />
//   </ErrorBoundary>
//
// Route-level crashes are still caught by app/(group)/error.tsx; this is for
// finer-grained isolation inside a page.
// ───────────────────────────────────────────────────────────────────────────

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { reportError } from '@/lib/observability/report';

interface Props {
  children: ReactNode;
  /** Short human label for the wrapped section, used in the fallback + report. */
  label?: string;
  /** Custom fallback; receives the retry callback. */
  fallback?: (retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    reportError(error, {
      where: `boundary:${this.props.label ?? 'widget'}`,
      extra: { componentStack: info?.componentStack },
    });
  }

  retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.retry);

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <p className="text-sm text-muted-foreground">
          {this.props.label
            ? `Impossible d'afficher « ${this.props.label} ».`
            : "Impossible d'afficher cette section."}
        </p>
        <button
          onClick={this.retry}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
