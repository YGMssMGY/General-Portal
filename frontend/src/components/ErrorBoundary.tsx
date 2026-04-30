import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
            <AlertTriangle className="h-8 w-8 text-error" />
          </div>
          <h1 className="mt-6 font-display text-xl font-semibold text-on-surface">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-center text-sm text-on-surface-variant">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
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