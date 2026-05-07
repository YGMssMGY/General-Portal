import { Component, type ErrorInfo, type ReactNode } from "react";
import { Warning } from "@carbon/icons-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
          <Warning size={48} className="text-danger" aria-hidden="true" />
          <h1 className="mt-6 text-xl font-semibold text-text-primary">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <button
            type="button"
            className="mt-6 border border-border-subtle bg-surface px-5 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
