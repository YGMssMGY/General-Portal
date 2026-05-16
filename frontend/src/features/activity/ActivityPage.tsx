import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useActivity } from "../../hooks/useWorkspaceResources";
import { formatDateTime } from "../../utils/format";
import { Activity as ActivityIcon } from "@carbon/icons-react";

export function ActivityPage() {
  const { data, error, isLoading, refetch } = useActivity();

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Activity unavailable"} onRetry={refetch} />;

  const resourceCount = new Set(data.map((d) => d.resourceTitle)).size;
  const actorCount = new Set(data.map((d) => d.actorName)).size;

  const metricCardStyle = (_color: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
  });

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Track contributions, progress, and workspace changes."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Card padding="lg">
          <div style={metricCardStyle("#0f62fe")}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--cds-text-secondary)",
              }}
            >
              Items
            </span>
            <ActivityIcon size={20} style={{ color: "#0f62fe" }} aria-hidden="true" />
          </div>
          <p style={{ fontSize: "1.875rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            {data.length}
          </p>
        </Card>
        <Card padding="lg">
          <div style={metricCardStyle("#198038")}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--cds-text-secondary)",
              }}
            >
              Resources
            </span>
            <ActivityIcon size={20} style={{ color: "#198038" }} aria-hidden="true" />
          </div>
          <p style={{ fontSize: "1.875rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            {resourceCount}
          </p>
        </Card>
        <Card padding="lg">
          <div style={metricCardStyle("#007d79")}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--cds-text-secondary)",
              }}
            >
              Contributors
            </span>
            <ActivityIcon size={20} style={{ color: "#007d79" }} aria-hidden="true" />
          </div>
          <p style={{ fontSize: "1.875rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            {actorCount}
          </p>
        </Card>
      </div>

      <Card padding="lg">
        <h2
          style={{
            marginBottom: "1rem",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--cds-text-primary)",
          }}
        >
          Recent Activity
        </h2>
        <div>
          {data.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: "1rem",
                padding: "0.75rem 0",
                borderBottom: i < data.length - 1 ? "1px solid var(--cds-border-subtle)" : "none",
              }}
            >
              <div
                style={{
                  marginTop: "0.25rem",
                  width: "0.5rem",
                  height: "0.5rem",
                  flexShrink: 0,
                  background: "#0f62fe",
                }}
              />
              <div>
                <p
                  style={{
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    color: "var(--cds-text-primary)",
                  }}
                >
                  {item.actorName}{" "}
                  <span style={{ fontWeight: 400, color: "var(--cds-text-secondary)" }}>
                    {item.action}
                  </span>
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                  {item.resourceType}: {item.resourceTitle}
                </p>
                <p
                  style={{
                    marginTop: "0.125rem",
                    fontSize: "0.75rem",
                    color: "var(--cds-text-placeholder)",
                  }}
                >
                  {formatDateTime(item.occurredAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
