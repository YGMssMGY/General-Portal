import { useMemo, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Modal } from "../../components/Modal";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import {
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Form,
  Search,
  Tag,
  Tile,
  Stack,
  InlineNotification,
  Grid,
  Column,
} from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import { useProposals } from "../../hooks/useWorkspaceResources";
import type { Proposal } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { Add, Edit, TrashCan, Document, Checkmark, Close } from "@carbon/icons-react";

const typeTagColors: Record<string, string> = {
  Event: "teal",
  Purchase: "purple",
  Project: "cyan",
};

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
  const [isApproving, setIsApproving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    type: "Event" as Proposal["type"],
    budget: "0",
    summary: "",
    submittedBy: "",
    dateNeeded: "",
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.submittedBy.toLowerCase().includes(q))
          return false;
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      return true;
    });
  }, [data, searchQuery, statusFilter, typeFilter]);

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
      {
        key: "type",
        header: "Type",
        sortable: true,
        render: (p) => (
          <Tag type={typeTagColors[p.type] as "teal" | "purple" | "cyan"}>{p.type}</Tag>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (p) => <Tag type="outline">{p.status.replace(/_/g, " ")}</Tag>,
      },
      {
        key: "submittedBy",
        header: "Submitted By",
        sortable: true,
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
          <Stack orientation="horizontal" gap={3}>
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
                  submittedBy: p.submittedBy,
                  dateNeeded: "",
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
          </Stack>
        ),
      },
    ],
    [],
  );

  const selected = useMemo(() => {
    if (!data) return undefined;
    return data.find((p) => p.id === selectedId);
  }, [data, selectedId]);

  function openCreateModal() {
    setEditingProposal(undefined);
    setForm({
      title: "",
      type: "Event",
      budget: "0",
      summary: "",
      submittedBy: user?.displayName ?? "",
      dateNeeded: "",
    });
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
        submittedBy: (form.submittedBy || user?.displayName) ?? "Demo User",
        budget: Number(form.budget),
        summary: form.summary,
      };
      if (editingProposal) {
        await workspaceApi.updateProposal(editingProposal.id, payload);
        toast.success("Proposal updated");
      } else {
        await workspaceApi.createProposal(payload);
        toast.success("Proposal created");
      }
      setIsModalOpen(false);
      setEditingProposal(undefined);
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save proposal";
      setCreateError(msg);
      toast.error(msg);
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
      toast.success("Proposal deleted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete proposal";
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleApproveReject(id: string, status: "approved" | "rejected") {
    setIsApproving(true);
    try {
      await workspaceApi.updateProposal(id, { status });
      refetch();
      toast.success(`Proposal ${status}`);
    } catch {
      toast.error(`Could not ${status} proposal`);
    } finally {
      setIsApproving(false);
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

      <Stack orientation="horizontal" gap={5} className="cds--data-table-toolbar">
        <Search
          id="search-proposals"
          labelText="Search proposals"
          placeholder="Search by title or submitter"
          size="sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          id="filter-status"
          labelText=""
          hideLabel
          size="sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <SelectItem value="all" text="All Statuses" />
          <SelectItem value="draft" text="Draft" />
          <SelectItem value="submitted" text="Submitted" />
          <SelectItem value="under_review" text="Under Review" />
          <SelectItem value="approved" text="Approved" />
          <SelectItem value="rejected" text="Rejected" />
        </Select>
        <Select
          id="filter-type"
          labelText=""
          hideLabel
          size="sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <SelectItem value="all" text="All Types" />
          <SelectItem value="Event" text="Event" />
          <SelectItem value="Purchase" text="Purchase" />
          <SelectItem value="Project" text="Project" />
        </Select>
        <Button renderIcon={Add} size="sm" onClick={openCreateModal}>
          Add Proposal
        </Button>
      </Stack>

      <Grid>
        <Column lg={selected ? 12 : 16} md={16} sm={4}>
          <Stack gap={6}>
            <DataTable
              columns={columns}
              data={filtered as unknown as Record<string, unknown>[]}
              defaultSort={{ key: "submittedAt", direction: "desc" }}
              pageSize={10}
              onRowClick={(item) => {
                setSelectedId((prev) => (prev === item.id ? undefined : item.id));
              }}
            />
          </Stack>
        </Column>

        {selected ? (
          <Column lg={4} md={0} sm={0}>
            <Tile style={{ padding: "1.5rem" }}>
              <Stack gap={5}>
                <Stack orientation="horizontal" gap={5}>
                  <Tag type="outline">{selected.status.replace(/_/g, " ")}</Tag>
                  <Tag type={typeTagColors[selected.type] as "teal" | "purple" | "cyan"}>
                    {selected.type}
                  </Tag>
                </Stack>

                <div>
                  <h2
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "var(--cds-text-primary)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {selected.title}
                  </h2>
                  <div style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                    <MarkdownRenderer>{selected.summary}</MarkdownRenderer>
                  </div>
                </div>

                <Document
                  size={20}
                  style={{ color: "var(--cds-text-secondary)" }}
                  aria-hidden="true"
                />

                <Stack gap={4}>
                  <Stack
                    orientation="horizontal"
                    gap={5}
                    style={{ justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                      Submitter
                    </span>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--cds-text-primary)",
                      }}
                    >
                      {selected.submittedBy}
                    </span>
                  </Stack>
                  <Stack
                    orientation="horizontal"
                    gap={5}
                    style={{ justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                      Date
                    </span>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--cds-text-primary)",
                      }}
                    >
                      {formatDateTime(selected.submittedAt)}
                    </span>
                  </Stack>
                  <Stack
                    orientation="horizontal"
                    gap={5}
                    style={{ justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                      Budget
                    </span>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--cds-text-primary)",
                      }}
                    >
                      {formatCurrency(selected.budget)}
                    </span>
                  </Stack>
                </Stack>

                <Stack orientation="horizontal" gap={5}>
                  <Button
                    kind="primary"
                    renderIcon={Checkmark}
                    onClick={() => handleApproveReject(selected.id, "approved")}
                    disabled={isApproving || selected.status === "approved"}
                  >
                    Approve
                  </Button>
                  <Button
                    kind="danger"
                    renderIcon={Close}
                    onClick={() => handleApproveReject(selected.id, "rejected")}
                    disabled={isApproving || selected.status === "rejected"}
                  >
                    Reject
                  </Button>
                </Stack>
              </Stack>
            </Tile>
          </Column>
        ) : null}
      </Grid>

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
          <Stack gap={5}>
            <TextInput
              id="prop-title"
              labelText="Title"
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
            <Grid>
              <Column lg={8} md={8} sm={4}>
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
              </Column>
              <Column lg={8} md={8} sm={4}>
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
              </Column>
            </Grid>
            <Grid>
              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="prop-submitted-by"
                  labelText="Submitted By"
                  required
                  value={form.submittedBy}
                  onChange={(e) => setForm((c) => ({ ...c, submittedBy: e.target.value }))}
                />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="prop-date-needed"
                  labelText="Date Needed"
                  type="date"
                  value={form.dateNeeded}
                  onChange={(e) => setForm((c) => ({ ...c, dateNeeded: e.target.value }))}
                />
              </Column>
            </Grid>
            <TextArea
              id="prop-summary"
              labelText="Summary"
              required
              rows={4}
              value={form.summary}
              onChange={(e) => setForm((c) => ({ ...c, summary: e.target.value }))}
            />
            {createError ? (
              <InlineNotification kind="error" subtitle={createError} hideCloseButton lowContrast />
            ) : null}
            <Stack orientation="horizontal" gap={5} style={{ justifyContent: "flex-end" }}>
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
            </Stack>
          </Stack>
        </Form>
      </Modal>

      <Modal
        title="Delete Proposal"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <Stack gap={5}>
          <p style={{ color: "var(--cds-text-secondary)" }}>
            Delete &quot;{deleteTarget?.title}&quot;?
          </p>
          <Stack orientation="horizontal" gap={5} style={{ justifyContent: "flex-end" }}>
            <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </div>
  );
}
