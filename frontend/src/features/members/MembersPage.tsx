import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMembers } from "../../hooks/useWorkspaceResources";
import type { Member } from "../../types";

const avatarStyle: React.CSSProperties = {
  width: "2rem",
  height: "2rem",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0043ce",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#ffffff",
};

const columns: ColumnDef<Member>[] = [
  {
    key: "name",
    header: "Member",
    sortable: true,
    render: (member) => (
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={avatarStyle}>
          {member.user.displayName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div>
          <p style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
            {member.user.displayName}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
            {member.user.email}
          </p>
        </div>
      </div>
    ),
  },
  { key: "position", header: "Position", sortable: true },
  {
    key: "accessLabel",
    header: "Access",
    sortable: true,
    render: (member) => <Badge>{member.accessLabel}</Badge>,
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
            Total Members
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {data.length}
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
            Tracked Hours
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
            Access Levels
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {new Set(data.map((m) => m.accessLabel)).size}
          </p>
        </Card>
      </div>
      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        defaultSort={{ key: "position", direction: "asc" }}
        pageSize={10}
      />
    </div>
  );
}
