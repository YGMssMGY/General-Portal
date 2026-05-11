import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, TextInput, TextArea, Select, SelectItem, Form } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import { useProposals } from "../../hooks/useWorkspaceResources";
import type { Proposal, ResourceStatus } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { Add, Document, Edit, TrashCan } from "@carbon/icons-react";

export function ProposalsPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useProposals();
  const [selectedId, setSelectedId] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<Proposal>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "Event" as Proposal["type"],
    budget: "0",
    summary: "",
  });

  const columns: ColumnDef<Proposal>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        sortable: true,
        render: (p) => (
          <div>
            <p style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>{p.title}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
              By {p.submittedBy}
            </p>
          </div>
        ),
      },
      { key: "type", header: "Type", sortable: true },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (p) => (
          <Select
            id={`prop-status-${p.id}`}
            labelText=""
            hideLabel
            size="sm"
            value={p.status}
            onChange={async (e) => {
              const newStatus = e.target.value as ResourceStatus;
              try {
                await workspaceApi.updateProposal(p.id, { status: newStatus });
                refetch();
              } catch {}
            }}
          >
            <SelectItem value="draft" text="Draft" />
            <SelectItem value="submitted" text="Submitted" />
            <SelectItem value="under_review" text="Under Review" />
            <SelectItem value="approved" text="Approved" />
            <SelectItem value="rejected" text="Rejected" />
          </Select>
        ),
      },
      {
        key: "budget",
        header: "Budget",
        sortable: true,
        render: (p) => formatCurrency(p.budget),
        className: "text-right font-medium",
      },
      {
        key: "submittedAt",
        header: "Date",
        sortable: true,
        render: (p) => formatDateTime(p.submittedAt),
      },
      {
        key: "actions",
        header: "",
        render: (p) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              iconDescription="Edit"
              hasIconOnly
              onClick={() => {
                setEditingProposal(p);
                setForm({
                  title: p.title,
                  type: p.type,
                  budget: String(p.budget),
                  summary: p.summary,
                });
                setIsModalOpen(true);
              }}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Delete"
              hasIconOnly
              onClick={() => setDeleteTarget(p)}
            />
          </div>
        ),
      },
    ],
    [refetch],
  );

  const selected = useMemo(() => {
    if (!data) return undefined;
    return data.find((p) => p.id === selectedId);
  }, [data, selectedId]);

  function openCreateModal() {
    setEditingProposal(undefined);
    setForm({ title: "", type: "Event", budget: "0", summary: "" });
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      const payload = {
        title: form.title,
        type: form.type,
        submittedBy: user?.displayName ?? "Demo User",
        budget: Number(form.budget),
        summary: form.summary,
      };
      if (editingProposal) {
        await workspaceApi.updateProposal(editingProposal.id, payload);
      } else {
        await workspaceApi.createProposal(payload);
      }
      setIsModalOpen(false);
      setEditingProposal(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not save proposal");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.deleteProposal(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not delete proposal");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Proposals unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Submit, review, and track proposals for events, purchases, and projects."
        actions={
          <Button renderIcon={Add} onClick={openCreateModal}>
            New Proposal
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        <DataTable
          columns={columns}
          data={data as unknown as Record<string, unknown>[]}
          defaultSort={{ key: "submittedAt", direction: "desc" }}
          pageSize={10}
        />

        {selected ? (
          <Card padding="lg" className="h-fit">
            <div
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <Badge>{selected.status}</Badge>
                <h2
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--cds-text-primary)",
                  }}
                >
                  {selected.title}
                </h2>
              </div>
              <Document
                size={24}
                style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }}
                aria-hidden="true"
              />
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
              {selected.summary}
            </p>
            <dl
              style={{
                marginTop: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                fontSize: "0.875rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <dt style={{ color: "var(--cds-text-secondary)" }}>Owner</dt>
                <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {selected.submittedBy}
                </dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <dt style={{ color: "var(--cds-text-secondary)" }}>Type</dt>
                <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {selected.type}
                </dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <dt style={{ color: "var(--cds-text-secondary)" }}>Budget</dt>
                <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {formatCurrency(selected.budget)}
                </dd>
              </div>
            </dl>
          </Card>
        ) : null}
      </div>

      <Modal
        title={editingProposal ? "Edit Proposal" : "New Proposal"}
        description={editingProposal ? "Update proposal details." : "Submit a proposal for review."}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProposal(undefined);
        }}
      >
        <Form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="prop-title"
              labelText="Title"
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Select
                id="prop-type"
                labelText="Type"
                value={form.type}
                onChange={(e) =>
                  setForm((c) => ({ ...c, type: e.target.value as Proposal["type"] }))
                }
              >
                <SelectItem value="Event" text="Event" />
                <SelectItem value="Purchase" text="Purchase" />
                <SelectItem value="Project" text="Project" />
              </Select>
              <TextInput
                id="prop-budget"
                labelText="Budget"
                type="number"
                required
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm((c) => ({ ...c, budget: e.target.value }))}
              />
            </div>
            <TextArea
              id="prop-summary"
              labelText="Summary"
              required
              rows={4}
              value={form.summary}
              onChange={(e) => setForm((c) => ({ ...c, summary: e.target.value }))}
            />
            {createError ? (
              <p
                style={{
                  borderLeft: "4px solid var(--cds-support-error)",
                  backgroundColor: "#fff1f1",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "#a2191f",
                }}
              >
                {createError}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button
                kind="secondary"
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProposal(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : editingProposal ? "Save Changes" : "Submit Proposal"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Proposal"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Delete &quot;{deleteTarget?.title}&quot;?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
