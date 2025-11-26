import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log for debugging
    console.error("UI ErrorBoundary caught: ", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    try { localStorage.removeItem('active_household_id'); } catch {}
    this.props.onRetry?.();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-serif font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">The page crashed while rendering. You can try again.</p>
            {this.state.error?.message && (
              <pre className="text-xs text-muted-foreground/80 bg-muted/40 p-3 rounded border border-border overflow-auto text-left whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            {this.state.error?.stack && (
              <pre className="text-[10px] text-muted-foreground/70 bg-muted/30 p-2 rounded border border-border/60 overflow-auto text-left whitespace-pre-wrap max-h-40">
                {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
              </pre>
            )}
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground shadow transition-colors hover:opacity-90"
              onClick={this.handleRetry}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
