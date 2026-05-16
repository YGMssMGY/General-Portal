import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@carbon/react";
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
            Something went wrong
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
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <Button
            style={{ marginTop: "1.5rem" }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
