import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Tile } from "@carbon/react";
import { Warning } from "@carbon/icons-react";

interface Props {
    children: ReactNode;
    pageName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`Error in ${this.props.pageName || "page"}:`, error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <Tile
                    style={{
                        margin: "2rem",
                        padding: "2rem",
                        textAlign: "center",
                        borderLeft: "4px solid var(--cds-support-error)",
                    }}
                >
                    <Warning
                        size={32}
                        style={{ color: "var(--cds-support-error)" }}
                        aria-hidden="true"
                    />
                    <h2 className="cds--type-heading-02" style={{ marginTop: "1rem" }}>
                        {this.props.pageName || "This page"} encountered an error
                    </h2>
                    <p
                        className="cds--type-body-01"
                        style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}
                    >
                        {this.state.error?.message ||
                            "Something went wrong while loading this page."}
                    </p>
                    <Button
                        kind="tertiary"
                        size="sm"
                        type="button"
                        onClick={this.handleRetry}
                        style={{ marginTop: "1rem" }}
                    >
                        Try Again
                    </Button>
                </Tile>
            );
        }

        return this.props.children;
    }
}
