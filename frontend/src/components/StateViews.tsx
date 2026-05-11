import { InlineLoading, Button, Tile } from "@carbon/react";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading data" }: LoadingStateProps) {
  return (
    <Tile
      style={{
        minHeight: "12rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <InlineLoading description={label} />
    </Tile>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Tile style={{ borderLeft: "4px solid var(--cds-support-error)" }}>
      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
        Could not load data
      </p>
      <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
        {message}
      </p>
      {onRetry ? (
        <Button kind="tertiary" size="sm" onClick={onRetry} style={{ marginTop: "0.75rem" }}>
          Try again
        </Button>
      ) : null}
    </Tile>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Tile style={{ textAlign: "center", padding: "2rem" }}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
        {title}
      </h2>
      <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
        {description}
      </p>
    </Tile>
  );
}
