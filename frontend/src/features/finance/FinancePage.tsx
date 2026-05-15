import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, TextInput, Select, SelectItem, Form, NumberInput } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useFinanceTransactions } from "../../hooks/useWorkspaceResources";
import { useAuth } from "../../context/AuthContext";
import type { FinanceTransaction, ResourceStatus } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { Add, Edit, TrashCan } from "@carbon/icons-react";

export function FinancePage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useFinanceTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<FinanceTransaction>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "",
    amount: 0,
    status: "pending" as ResourceStatus,
  });

  const columns: ColumnDef<FinanceTransaction>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Request",
        sortable: true,
        render: (tx) => (
          <div>
            <p style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>{tx.title}</p>
            <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
              By {tx.submittedBy}
            </p>
          </div>
        ),
      },
      { key: "category", header: "Category", sortable: true },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (tx) => (
          <Select
            id={`fin-status-${tx.id}`}
            labelText=""
            hideLabel
            size="sm"
            value={tx.status}
            onChange={async (e) => {
              const newStatus = e.target.value as ResourceStatus;
              try {
                await workspaceApi.updateFinanceTransaction(tx.id, { status: newStatus });
                refetch();
              } catch {}
            }}
          >
            <SelectItem value="pending" text="Pending" />
            <SelectItem value="under_review" text="Under Review" />
            <SelectItem value="approved" text="Approved" />
            <SelectItem value="rejected" text="Rejected" />
          </Select>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        render: (tx) => formatCurrency(tx.amount),
        className: "text-right font-medium",
      },
      {
        key: "occurredAt",
        header: "Submitted",
        sortable: true,
        render: (tx) => formatDateTime(tx.occurredAt),
      },
      {
        key: "actions",
        header: "",
        render: (tx) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              iconDescription="Edit"
              hasIconOnly
              onClick={() => {
                setEditingTx(tx);
                setForm({
                  title: tx.title,
                  category: tx.category,
                  amount: tx.amount,
                  status: tx.status,
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
              onClick={() => setDeleteTarget(tx)}
            />
          </div>
        ),
      },
    ],
    [refetch],
  );

  function openCreateModal() {
    setEditingTx(undefined);
    setForm({ title: "", category: "", amount: 0, status: "pending" });
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      const payload = { ...form, submittedBy: user?.displayName ?? "Demo User" };
      if (editingTx) {
        await workspaceApi.updateFinanceTransaction(editingTx.id, payload);
      } else {
        await workspaceApi.createFinanceTransaction(payload);
      }
      setIsModalOpen(false);
      setEditingTx(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not save transaction");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.deleteFinanceTransaction(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not delete transaction");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Finance data is unavailable"} onRetry={refetch} />;
  const pending = data.filter((tx) => tx.status === "pending" || tx.status === "under_review");
  const totalPending = pending.reduce((s, tx) => s + tx.amount, 0);
  const approved = data
    .filter((tx) => tx.status === "approved")
    .reduce((s, tx) => s + tx.amount, 0);

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Track reimbursements, approvals, budgets, and spending."
        actions={
          <Button renderIcon={Add} onClick={openCreateModal}>
            New Transaction
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
            Pending Review
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {formatCurrency(totalPending)}
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
            Approved Spend
          </p>
          <p
            style={{ marginTop: "0.5rem", fontSize: "1.875rem", fontWeight: 600, color: "#0f62fe" }}
          >
            {formatCurrency(approved)}
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
            Open Requests
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {pending.length}
          </p>
        </Card>
      </div>
      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        selectable
        defaultSort={{ key: "occurredAt", direction: "desc" }}
        pageSize={10}
      />

      <Modal
        title={editingTx ? "Edit Transaction" : "Add Transaction"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(undefined);
        }}
      >
        <Form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="fin-title"
              labelText="Title"
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <TextInput
                id="fin-category"
                labelText="Category"
                required
                value={form.category}
                onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
              />
              <NumberInput
                id="fin-amount"
                label="Amount"
                value={form.amount}
                min={0}
                onChange={(_e, { value }) => setForm((c) => ({ ...c, amount: Number(value) }))}
              />
            </div>
            <Select
              id="fin-type"
              labelText="Status"
              value={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ResourceStatus }))}
            >
              <SelectItem value="pending" text="Pending" />
              <SelectItem value="under_review" text="Under Review" />
              <SelectItem value="approved" text="Approved" />
              <SelectItem value="rejected" text="Rejected" />
            </Select>
            {createError ? (
              <p
                style={{
                  borderLeft: "4px solid var(--cds-support-error)",
                  backgroundColor: "var(--cds-layer)",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--cds-support-error)",
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
                  setEditingTx(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : editingTx ? "Save Changes" : "Create Transaction"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Transaction"
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
