import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useVolunteerSlots } from "../../hooks/useWorkspaceResources";
import type { VolunteerSlot } from "../../types";
import { formatDate } from "../../utils/format";

const columns: ColumnDef<VolunteerSlot>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "eventName", header: "Event", sortable: true },
  { key: "startsAt", header: "Date", sortable: true, render: (slot) => formatDate(slot.startsAt) },
  {
    key: "filled",
    header: "Capacity",
    sortable: true,
    render: (slot) => (
      <span
        style={{
          color:
            slot.filled >= slot.capacity ? "var(--cds-support-error)" : "var(--cds-text-primary)",
          fontWeight: slot.filled >= slot.capacity ? 500 : undefined,
        }}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Card padding="lg">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            Total Slots
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {totalSlots}
          </p>
        </Card>
        <Card padding="lg">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            Filled
          </p>
          <p
            style={{ marginTop: "0.5rem", fontSize: "1.875rem", fontWeight: 600, color: "#0f62fe" }}
          >
            {totalFilled}
          </p>
        </Card>
        <Card padding="lg">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            Volunteer Hours
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {totalHours}
          </p>
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
