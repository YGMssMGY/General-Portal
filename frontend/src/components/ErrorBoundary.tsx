import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@carbon/react";
import { Warning } from "@carbon/icons-react";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  label?: string;
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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--cds-background)",
            padding: "1.5rem",
          }}
        >
          <Warning size={48} style={{ color: "var(--cds-support-error)" }} aria-hidden="true" />
          <h1
            style={{
              marginTop: "1.5rem",
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {this.props.label || "Something went wrong"}
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              maxWidth: "28rem",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred. Please try again."}
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <Button onClick={this.handleRetry}>Try Again</Button>
            <Button kind="secondary" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
