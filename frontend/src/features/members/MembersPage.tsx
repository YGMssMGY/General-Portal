import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, TextInput, Select, SelectItem, Form } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useMembers } from "../../hooks/useWorkspaceResources";
import type { Member } from "../../types";
import { Add, TrashCan } from "@carbon/icons-react";

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

export function MembersPage() {
  const { data, error, isLoading, refetch } = useMembers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({ email: "", position: "", accessLabel: "Member" });

  const columns: ColumnDef<Member>[] = useMemo(
    () => [
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
      {
        key: "position",
        header: "Position",
        sortable: true,
        render: (member) => (
          <Select
            id={`mem-pos-${member.id}`}
            labelText=""
            hideLabel
            size="sm"
            value={member.position}
            onChange={async (e) => {
              try {
                await workspaceApi.updateMember(member.id, { position: e.target.value });
                refetch();
              } catch {}
            }}
          >
            <SelectItem value="President" text="President" />
            <SelectItem value="Vice President" text="Vice President" />
            <SelectItem value="Treasurer" text="Treasurer" />
            <SelectItem value="Secretary" text="Secretary" />
            <SelectItem value="Officer" text="Officer" />
            <SelectItem value="Member" text="Member" />
          </Select>
        ),
      },
      {
        key: "accessLabel",
        header: "Access",
        sortable: true,
        render: (member) => <Badge>{member.accessLabel}</Badge>,
      },
      { key: "taskCount", header: "Tasks", sortable: true, className: "text-right" },
      { key: "volunteerHours", header: "Hours", sortable: true, className: "text-right" },
      {
        key: "actions",
        header: "",
        render: (member) => (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={TrashCan}
            iconDescription="Remove"
            hasIconOnly
            onClick={() => setDeleteTarget(member)}
          />
        ),
      },
    ],
    [refetch],
  );

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setIsModalOpen(false);
    setForm({ email: "", position: "", accessLabel: "Member" });
    refetch();
  }

  async function handleRemove() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.removeMember(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch {
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Members are unavailable"} onRetry={refetch} />;
  const totalHours = data.reduce((total, m) => total + m.volunteerHours, 0);

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage people, roles, positions, and access."
        actions={
          <Button renderIcon={Add} onClick={() => setIsModalOpen(true)}>
            Add Member
          </Button>
        }
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

      <Modal title="Add Member" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Form onSubmit={handleAdd}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="mem-email"
              labelText="Email"
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            />
            <TextInput
              id="mem-position"
              labelText="Position"
              required
              value={form.position}
              onChange={(e) => setForm((c) => ({ ...c, position: e.target.value }))}
            />
            <Select
              id="mem-access"
              labelText="Access Label"
              value={form.accessLabel}
              onChange={(e) => setForm((c) => ({ ...c, accessLabel: e.target.value }))}
            >
              <SelectItem value="Admin" text="Admin" />
              <SelectItem value="Officer" text="Officer" />
              <SelectItem value="Member" text="Member" />
            </Select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button kind="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Member</Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Remove Member"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Remove {deleteTarget?.user.displayName} ({deleteTarget?.user.email})?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleRemove} disabled={isDeleting}>
            {isDeleting ? "Removing..." : "Remove"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
