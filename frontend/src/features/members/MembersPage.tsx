import { useMemo, useState, useEffect, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  Form,
  Grid,
  Column,
  Tile,
  Tag,
  InlineNotification,
} from "@carbon/react";
import { Add, TrashCan, UserMultiple, UserRole, Incomplete } from "@carbon/icons-react";
import { workspaceApi } from "../../api/workspaceApi";
import { useMembers } from "../../hooks/useWorkspaceResources";
import type { Member } from "../../types";

interface RoleInfo {
  id: string;
  name: string;
  description: string;
  count: number;
  permissions: string[];
}

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
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [formEmail, setFormEmail] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formRole, setFormRole] = useState("Member");
  const [addError, setAddError] = useState<string>();

  useEffect(() => {
    workspaceApi
      .getRoles()
      .then(setRoles)
      .catch(() => {});
  }, [data]);

  const columns: ColumnDef<Member>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
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

  const totalMembers = data?.length ?? 0;
  const activeOfficers = data?.filter((m) => m.position !== "Member").length ?? 0;
  const pendingInvites = data?.filter((m) => m.accessLabel === "Pending").length ?? 0;

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setAddError(undefined);
    try {
      await workspaceApi.updateMember("new", {
        user: {
          id: "",
          email: formEmail,
          displayName: formPosition || formEmail.split("@")[0],
          role: formRole.toLowerCase() as "admin" | "president" | "officer" | "member",
          workspaceName: "",
        },
        position: formPosition,
        accessLabel: formRole,
        taskCount: 0,
        volunteerHours: 0,
      });
      setIsModalOpen(false);
      setFormEmail("");
      setFormPosition("");
      setFormRole("Member");
      refetch();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add member");
    }
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

      <Grid style={{ marginBottom: "1.5rem" }}>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", opacity: 0.12 }}>
              <UserMultiple size={48} />
            </div>
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
              {totalMembers}
            </p>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", opacity: 0.12 }}>
              <UserRole size={48} />
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--cds-text-secondary)",
              }}
            >
              Active Officers
            </p>
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "1.875rem",
                fontWeight: 600,
                color: "var(--cds-text-primary)",
              }}
            >
              {activeOfficers}
            </p>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={4}>
          <Tile style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", opacity: 0.12 }}>
              <Incomplete size={48} />
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--cds-text-secondary)",
              }}
            >
              Pending Invites
            </p>
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "1.875rem",
                fontWeight: 600,
                color: "var(--cds-text-primary)",
              }}
            >
              {pendingInvites}
            </p>
          </Tile>
        </Column>
      </Grid>

      <Grid>
        <Column lg={12} md={8} sm={4}>
          <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            defaultSort={{ key: "position", direction: "asc" }}
            pageSize={10}
          />
        </Column>

        <Column lg={4} md={8} sm={4}>
          <Tile style={{ padding: "1.25rem" }}>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--cds-text-primary)",
                marginBottom: "1rem",
              }}
            >
              Role Management
            </h2>
            {roles.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {(["Admin", "President", "Officer", "Member"] as const).map((role) => {
                  const count = data.filter(
                    (m) => m.accessLabel.toLowerCase() === role.toLowerCase(),
                  ).length;
                  const perms =
                    role === "Admin"
                      ? ["Full Access", "Settings", "Members"]
                      : role === "President"
                        ? ["Manage Events", "Finance", "Members"]
                        : role === "Officer"
                          ? ["Create Events", "Manage Tasks", "View Finance"]
                          : ["View Events", "Volunteer"];
                  return (
                    <div
                      key={role}
                      style={{
                        border: "1px solid var(--cds-border-subtle)",
                        borderRadius: "4px",
                        padding: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--cds-text-primary)",
                            fontSize: "0.875rem",
                          }}
                        >
                          {role}
                        </span>
                        <Tag type="blue">{count}</Tag>
                      </div>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--cds-text-secondary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {role === "Admin"
                          ? "Full system access"
                          : role === "President"
                            ? "Executive leadership"
                            : role === "Officer"
                              ? "Day-to-day operations"
                              : "General access"}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {perms.map((perm) => (
                          <Tag key={perm} type="outline" style={{ fontSize: "0.6875rem" }}>
                            {perm}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {roles.map((role) => (
                  <div
                    key={role.id}
                    style={{
                      border: "1px solid var(--cds-border-subtle)",
                      borderRadius: "4px",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--cds-text-primary)",
                          fontSize: "0.875rem",
                        }}
                      >
                        {role.name}
                      </span>
                      <Tag type="blue">{role.count}</Tag>
                    </div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--cds-text-secondary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {role.description}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {role.permissions.map((perm) => (
                        <Tag key={perm} type="outline" style={{ fontSize: "0.6875rem" }}>
                          {perm}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        </Column>
      </Grid>

      <Modal title="Add Member" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Form onSubmit={handleAdd}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="mem-email"
              labelText="Email"
              required
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <TextInput
              id="mem-position"
              labelText="Position"
              required
              value={formPosition}
              onChange={(e) => setFormPosition(e.target.value)}
            />
            <Select
              id="mem-access"
              labelText="Access Label"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
            >
              <SelectItem value="Admin" text="Admin" />
              <SelectItem value="President" text="President" />
              <SelectItem value="Officer" text="Officer" />
              <SelectItem value="Member" text="Member" />
            </Select>
            {addError ? (
              <InlineNotification kind="error" subtitle={addError} hideCloseButton lowContrast />
            ) : null}
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
