import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useVolunteerSlots } from "../../hooks/useWorkspaceResources";
import type { VolunteerSlot } from "../../types";
import { formatDate } from "../../utils/format";

const columns: ColumnDef<VolunteerSlot>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "eventName", header: "Event", sortable: true },
  {
    key: "startsAt",
    header: "Date",
    sortable: true,
    render: (slot) => formatDate(slot.startsAt),
  },
  {
    key: "filled",
    header: "Capacity",
    sortable: true,
    render: (slot) => (
      <span
        className={slot.filled >= slot.capacity ? "text-danger font-medium" : "text-text-primary"}
      >
        {slot.filled}/{slot.capacity}
      </span>
    ),
    className: "text-right",
  },
  { key: "hours", header: "Hours", sortable: true, className: "text-right" },
];

export function VolunteersPage() {
  const { data, error, isLoading, refetch } = useVolunteerSlots();

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Volunteer data unavailable"} onRetry={refetch} />;

  const totalSlots = data.length;
  const totalFilled = data.reduce((s, slot) => s + slot.filled, 0);
  const totalHours = data.reduce((s, slot) => s + slot.hours * slot.filled, 0);

  return (
    <div>
      <PageHeader title="Volunteers" description="Manage volunteer slots, sign-ups, and hours." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Total Slots
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{totalSlots}</p>
        </Card>
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Filled
          </p>
          <p className="mt-2 text-3xl font-semibold text-carbon-blue-60">{totalFilled}</p>
        </Card>
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Volunteer Hours
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{totalHours}</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        defaultSort={{ key: "startsAt", direction: "asc" }}
        pageSize={10}
      />
    </div>
  );
}
