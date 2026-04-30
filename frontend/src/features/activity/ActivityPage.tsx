import { Activity, Boxes, Users } from "lucide-react";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useActivity } from "../../hooks/useWorkspaceResources";
import { formatDateTime } from "../../utils/format";

export function ActivityPage() {
  const { data, error, isLoading, refetch } = useActivity();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Activity is unavailable"} onRetry={refetch} />;

  const resourceCount = new Set(data.map((item) => item.resourceTitle)).size;
  const actorCount = new Set(data.map((item) => item.actorName)).size;

  return (
    <div>
      <PageHeader title="Activity Snapshot" description="Understand contribution, progress, and follow-through." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-card-padding">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Activity Items</span>
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <p className="font-display text-3xl font-bold text-on-surface">{data.length}</p>
        </Card>
        <Card className="p-card-padding">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Resources Updated</span>
            <Boxes className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <p className="font-display text-3xl font-bold text-secondary">{resourceCount}</p>
        </Card>
        <Card className="p-card-padding">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Contributors</span>
            <Users className="h-5 w-5 text-tertiary" aria-hidden="true" />
          </div>
          <p className="font-display text-3xl font-bold text-tertiary">{actorCount}</p>
        </Card>
      </div>

      <Card className="p-card-padding">
        <h2 className="mb-5 font-display text-lg font-semibold text-on-surface">Recent Activity</h2>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-lg border border-outline-variant p-4">
              <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
              <div>
                <p className="font-semibold text-on-surface">
                  {item.actorName} {item.action}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {item.resourceType}: {item.resourceTitle}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">{formatDateTime(item.occurredAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
