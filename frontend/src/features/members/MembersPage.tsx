import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMembers } from "../../hooks/useWorkspaceResources";
import type { Member } from "../../types";

const columns: ColumnDef<Member>[] = [
  {
    key: "name",
    header: "Member",
    sortable: true,
    render: (member) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-carbon-blue-60 text-xs font-semibold text-white">
          {member.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div>
          <p className="font-medium text-text-primary">{member.name}</p>
          <p className="text-xs text-text-secondary">{member.email}</p>
        </div>
      </div>
    ),
  },
  { key: "position", header: "Position", sortable: true },
  {
    key: "accessLabel",
    header: "Access",
    sortable: true,
    render: (member) => (
      <Badge
        className={
          member.accessLabel === "Admin"
            ? "border-carbon-red-30 bg-carbon-red-10 text-carbon-red-60"
            : member.accessLabel === "Officer"
              ? "border-carbon-blue-30 bg-carbon-blue-10 text-carbon-blue-60"
              : "border-border-subtle bg-surface text-text-secondary"
        }
      >
        {member.accessLabel}
      </Badge>
    ),
  },
  { key: "taskCount", header: "Tasks", sortable: true, className: "text-right" },
  { key: "volunteerHours", header: "Hours", sortable: true, className: "text-right" },
];

export function MembersPage() {
  const { data, error, isLoading, refetch } = useMembers();

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Members are unavailable"} onRetry={refetch} />;

  const totalHours = data.reduce((total, m) => total + m.volunteerHours, 0);

  return (
    <div>
      <PageHeader title="Members" description="Manage people, roles, positions, and access." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Total Members
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{data.length}</p>
        </Card>
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Tracked Hours
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{totalHours}</p>
        </Card>
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Access Levels
          </p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {new Set(data.map((m) => m.accessLabel)).size}
          </p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        defaultSort={{ key: "name", direction: "asc" }}
        pageSize={10}
      />
    </div>
  );
}
