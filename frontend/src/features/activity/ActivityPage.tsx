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

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Track contributions, progress, and workspace changes."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card padding="lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Items
            </span>
            <ActivityIcon size={20} className="text-carbon-blue-60" aria-hidden="true" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">{data.length}</p>
        </Card>
        <Card padding="lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Resources
            </span>
            <ActivityIcon size={20} className="text-carbon-green-60" aria-hidden="true" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">{resourceCount}</p>
        </Card>
        <Card padding="lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Contributors
            </span>
            <ActivityIcon size={20} className="text-carbon-teal-60" aria-hidden="true" />
          </div>
          <p className="text-3xl font-semibold text-text-primary">{actorCount}</p>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="mb-4 text-lg font-semibold text-text-primary font-condensed">
          Recent Activity
        </h2>
        <div className="space-y-0">
          {data.map((item, i) => (
            <div
              key={item.id}
              className={`flex gap-4 py-3 ${i < data.length - 1 ? "border-b border-border-subtle" : ""}`}
            >
              <div className="mt-1 h-2 w-2 shrink-0 bg-carbon-blue-60" />
              <div>
                <p className="font-medium text-sm text-text-primary">
                  {item.actorName}{" "}
                  <span className="font-normal text-text-secondary">{item.action}</span>
                </p>
                <p className="text-sm text-text-secondary">
                  {item.resourceType}: {item.resourceTitle}
                </p>
                <p className="mt-0.5 text-xs text-text-placeholder">
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
