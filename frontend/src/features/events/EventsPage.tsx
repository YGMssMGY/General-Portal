import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useEvents } from "../../hooks/useWorkspaceResources";
import type { EventItem } from "../../types";
import { formatDate, sentenceCase } from "../../utils/format";

const columns: ColumnDef<EventItem>[] = [
  {
    key: "startsAt",
    header: "Date",
    sortable: true,
    render: (event) => formatDate(event.startsAt),
  },
  { key: "title", header: "Event", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (event) => <Badge>{sentenceCase(event.status)}</Badge>,
  },
  {
    key: "progress",
    header: "Progress",
    sortable: true,
    render: (event) => `${event.progress}%`,
    className: "text-right",
  },
];

export function EventsPage() {
  const { data, error, isLoading, refetch } = useEvents();
  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Events are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Plan and track events, assign volunteers, and manage budgets."
      />
      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        selectable
        defaultSort={{ key: "startsAt", direction: "asc" }}
        pageSize={10}
      />
    </div>
  );
}
