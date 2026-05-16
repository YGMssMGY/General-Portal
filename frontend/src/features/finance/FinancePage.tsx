import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Modal } from "../../components/Modal";
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  Form,
  Tag,
  Tile,
  Stack,
  Grid,
  Column,
  InlineNotification,
  NumberInput,
} from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import {
  useFinanceTransactions,
  useFinanceSummary,
  useFinanceTrends,
} from "../../hooks/useWorkspaceResources";
import type { FinanceTransaction, ResourceStatus } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/format";
import {
  Add,
  Edit,
  TrashCan,
  ArrowUp,
  ArrowDown,
  CheckmarkOutline,
  Time,
  Close,
} from "@carbon/icons-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export function FinancePage() {
  const { user } = useAuth();
  const {
    data: txData,
    error: txError,
    isLoading: txLoading,
    refetch: refetchTx,
  } = useFinanceTransactions();
  const { data: summary } = useFinanceSummary();
  const { data: trends } = useFinanceTrends(7);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<FinanceTransaction>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string>();

  const [form, setForm] = useState({
    title: "",
    category: "",
    amount: 0,
    type: "expense" as "revenue" | "expense",
    status: "pending",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const columns: ColumnDef<FinanceTransaction>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        sortable: true,
        render: (tx) => (
          <div>
            <p
              style={{
                fontWeight: 500,
                color: "var(--cds-text-primary)",
              }}
            >
              {tx.title}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--cds-text-secondary)",
              }}
            >
              By {tx.submittedBy}
            </p>
          </div>
        ),
      },
      { key: "category", header: "Category", sortable: true },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        render: (tx) => (
          <span
            style={{
              color: tx.amount >= 0 ? "var(--cds-support-success)" : "var(--cds-support-error)",
              fontWeight: 500,
            }}
          >
            {tx.amount >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(tx.amount))}
          </span>
        ),
        className: "text-right",
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (tx) => <Tag type="outline">{tx.status.replace(/_/g, " ")}</Tag>,
      },
      { key: "submittedBy", header: "Submitted By", sortable: true },
      {
        key: "occurredAt",
        header: "Date",
        sortable: true,
        render: (tx) => formatDateTime(tx.occurredAt),
      },
      {
        key: "actions",
        header: "",
        render: (tx) => (
          <Stack orientation="horizontal" gap={3}>
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
                  amount: Math.abs(tx.amount),
                  type: tx.amount >= 0 ? "revenue" : "expense",
                  status: tx.status,
                  notes: "",
                  date: tx.occurredAt?.slice(0, 10) ?? "",
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
          </Stack>
        ),
      },
    ],
    [],
  );

  const selectedTx = useMemo(() => {
    if (!txData) return undefined;
    return txData.find((tx) => tx.id === selectedTxId);
  }, [txData, selectedTxId]);

  function openCreateModal() {
    setEditingTx(undefined);
    setForm({
      title: "",
      category: "",
      amount: 0,
      type: "expense",
      status: "pending",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      const amount = form.type === "expense" ? -Math.abs(form.amount) : Math.abs(form.amount);
      const payload = {
        title: form.title,
        category: form.category,
        amount,
        status: form.status as ResourceStatus,
        submittedBy: user?.displayName ?? "Demo User",
      };
      if (editingTx) {
        await workspaceApi.updateFinanceTransaction(editingTx.id, payload);
      } else {
        await workspaceApi.createFinanceTransaction(payload);
      }
      setIsModalOpen(false);
      setEditingTx(undefined);
      refetchTx();
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
      refetchTx();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not delete transaction");
    } finally {
      setIsDeleting(false);
    }
  }

  if (txLoading) return <LoadingState />;
  if (txError || !txData)
    return <ErrorState message={txError ?? "Finance data is unavailable"} onRetry={refetchTx} />;

  const chartData = {
    labels: trends?.map((t) => t.date) ?? [],
    datasets: [
      {
        label: "Revenue",
        data: trends?.map((t) => t.revenue) ?? [],
        borderColor: "#24a148",
        backgroundColor: "rgba(36, 161, 72, 0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Expenses",
        data: trends?.map((t) => t.expenses) ?? [],
        borderColor: "#da1e28",
        backgroundColor: "rgba(218, 30, 40, 0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" as const },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

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

      {/* Summary Cards */}
      <Grid style={{ marginBottom: "1.5rem" }}>
        <Column lg={4} md={4} sm={8}>
          <Tile
            style={{
              padding: "1.25rem",
              borderLeft: "4px solid var(--cds-support-success)",
            }}
          >
            <Stack gap={4}>
              <Stack
                orientation="horizontal"
                gap={5}
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    color: "var(--cds-text-secondary)",
                  }}
                >
                  Total Revenue
                </span>
                <ArrowUp
                  size={20}
                  style={{ color: "var(--cds-support-success)" }}
                  aria-hidden="true"
                />
              </Stack>
              <span
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "var(--cds-text-primary)",
                }}
              >
                {formatCurrency(summary?.totalRevenue ?? 0)}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-support-success)",
                  fontWeight: 500,
                }}
              >
                +12% vs last month
              </span>
            </Stack>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={8}>
          <Tile
            style={{
              padding: "1.25rem",
              borderLeft: "4px solid var(--cds-support-error)",
            }}
          >
            <Stack gap={4}>
              <Stack
                orientation="horizontal"
                gap={5}
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    color: "var(--cds-text-secondary)",
                  }}
                >
                  Total Expenses
                </span>
                <ArrowDown
                  size={20}
                  style={{ color: "var(--cds-support-error)" }}
                  aria-hidden="true"
                />
              </Stack>
              <span
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "var(--cds-text-primary)",
                }}
              >
                {formatCurrency(summary?.totalExpenses ?? 0)}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-support-error)",
                  fontWeight: 500,
                }}
              >
                +8% vs last month
              </span>
            </Stack>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={8}>
          <Tile
            style={{
              padding: "1.25rem",
              borderLeft: "4px solid var(--cds-support-info)",
            }}
          >
            <Stack gap={4}>
              <Stack
                orientation="horizontal"
                gap={5}
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    color: "var(--cds-text-secondary)",
                  }}
                >
                  Net Balance
                </span>
                <CheckmarkOutline
                  size={20}
                  style={{ color: "var(--cds-support-info)" }}
                  aria-hidden="true"
                />
              </Stack>
              <span
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "var(--cds-text-primary)",
                }}
              >
                {formatCurrency(summary?.netBalance ?? 0)}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-support-info)",
                  fontWeight: 500,
                }}
              >
                Healthy
              </span>
            </Stack>
          </Tile>
        </Column>
        <Column lg={4} md={4} sm={8}>
          <Tile
            style={{
              padding: "1.25rem",
              borderLeft: "4px solid var(--cds-support-warning)",
            }}
          >
            <Stack gap={4}>
              <Stack
                orientation="horizontal"
                gap={5}
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    color: "var(--cds-text-secondary)",
                  }}
                >
                  Pending Approval
                </span>
                <Time
                  size={20}
                  style={{ color: "var(--cds-support-warning)" }}
                  aria-hidden="true"
                />
              </Stack>
              <span
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "var(--cds-text-primary)",
                }}
              >
                {summary?.pendingCount ?? 0}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-support-warning)",
                  fontWeight: 500,
                }}
              >
                Needs attention
              </span>
            </Stack>
          </Tile>
        </Column>
      </Grid>

      {/* Trend Chart */}
      {trends && trends.length > 0 ? (
        <Tile style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
              marginBottom: "1rem",
            }}
          >
            Revenue vs Expenses (7 days)
          </h3>
          <div style={{ maxHeight: "280px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </Tile>
      ) : null}

      <DataTable
        columns={columns}
        data={txData as unknown as Record<string, unknown>[]}
        defaultSort={{ key: "occurredAt", direction: "desc" }}
        pageSize={10}
        onRowClick={(item) => {
          setSelectedTxId((prev) => (prev === item.id ? undefined : item.id));
        }}
      />

      {/* Detail Drawer */}
      {selectedTx ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }}
            onClick={() => setSelectedTxId(undefined)}
          />
          <Tile
            style={{
              position: "relative",
              width: "480px",
              maxWidth: "100vw",
              height: "100vh",
              overflowY: "auto",
              padding: "1.5rem",
              borderRadius: 0,
              boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
            }}
          >
            <Stack gap={6}>
              <Stack
                orientation="horizontal"
                gap={5}
                style={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <Tag type="outline">{selectedTx.status.replace(/_/g, " ")}</Tag>
                  <h2
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {selectedTx.title}
                  </h2>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Close}
                  iconDescription="Close"
                  hasIconOnly
                  onClick={() => setSelectedTxId(undefined)}
                />
              </Stack>

              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color:
                    selectedTx.amount >= 0
                      ? "var(--cds-support-success)"
                      : "var(--cds-support-error)",
                }}
              >
                {selectedTx.amount >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(selectedTx.amount))}
              </div>

              <Stack gap={4}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ color: "var(--cds-text-secondary)" }}>Category</span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {selectedTx.category}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ color: "var(--cds-text-secondary)" }}>Submitted By</span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {selectedTx.submittedBy}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ color: "var(--cds-text-secondary)" }}>Date</span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {formatDateTime(selectedTx.occurredAt)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ color: "var(--cds-text-secondary)" }}>Type</span>
                  <span
                    style={{
                      fontWeight: 500,
                      color:
                        selectedTx.amount >= 0
                          ? "var(--cds-support-success)"
                          : "var(--cds-support-error)",
                    }}
                  >
                    {selectedTx.amount >= 0 ? "Revenue" : "Expense"}
                  </span>
                </div>
              </Stack>

              <Stack orientation="horizontal" gap={5}>
                <Button
                  kind="primary"
                  onClick={async () => {
                    await workspaceApi.updateFinanceTransaction(selectedTx.id, {
                      status: "approved",
                    });
                    refetchTx();
                  }}
                  disabled={selectedTx.status === "approved"}
                >
                  Approve
                </Button>
                <Button
                  kind="danger"
                  onClick={async () => {
                    await workspaceApi.updateFinanceTransaction(selectedTx.id, {
                      status: "rejected",
                    });
                    refetchTx();
                  }}
                  disabled={selectedTx.status === "rejected"}
                >
                  Reject
                </Button>
              </Stack>
            </Stack>
          </Tile>
        </div>
      ) : null}

      <Modal
        title={editingTx ? "Edit Transaction" : "Add Transaction"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(undefined);
        }}
      >
        <Form onSubmit={handleSave}>
          <Stack gap={5}>
            <TextInput
              id="fin-title"
              labelText="Title"
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
            <Grid>
              <Column lg={8} md={8} sm={16}>
                <Select
                  id="fin-category"
                  labelText="Category"
                  value={form.category}
                  onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                >
                  <SelectItem value="" text="Select category" />
                  <SelectItem value="Events" text="Events" />
                  <SelectItem value="Supplies" text="Supplies" />
                  <SelectItem value="Food" text="Food" />
                  <SelectItem value="Travel" text="Travel" />
                  <SelectItem value="Equipment" text="Equipment" />
                  <SelectItem value="Other" text="Other" />
                </Select>
              </Column>
              <Column lg={8} md={8} sm={16}>
                <NumberInput
                  id="fin-amount"
                  label="Amount"
                  value={form.amount}
                  min={0}
                  onChange={(_e, { value }) => setForm((c) => ({ ...c, amount: Number(value) }))}
                />
              </Column>
            </Grid>
            <Grid>
              <Column lg={8} md={8} sm={16}>
                <Select
                  id="fin-type"
                  labelText="Type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      type: e.target.value as "revenue" | "expense",
                    }))
                  }
                >
                  <SelectItem value="expense" text="Expense" />
                  <SelectItem value="revenue" text="Revenue" />
                </Select>
              </Column>
              <Column lg={8} md={8} sm={16}>
                <Select
                  id="fin-status"
                  labelText="Status"
                  value={form.status}
                  onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
                >
                  <SelectItem value="pending" text="Pending" />
                  <SelectItem value="under_review" text="Under Review" />
                  <SelectItem value="approved" text="Approved" />
                  <SelectItem value="rejected" text="Rejected" />
                </Select>
              </Column>
            </Grid>
            <Grid>
              <Column lg={8} md={8} sm={16}>
                <TextInput
                  id="fin-date"
                  labelText="Date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
                />
              </Column>
              <Column lg={8} md={8} sm={16}>
                <TextInput
                  id="fin-notes"
                  labelText="Notes"
                  value={form.notes}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                />
              </Column>
            </Grid>
            {createError ? (
              <InlineNotification kind="error" subtitle={createError} hideCloseButton lowContrast />
            ) : null}
            <Stack orientation="horizontal" gap={5} style={{ justifyContent: "flex-end" }}>
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
            </Stack>
          </Stack>
        </Form>
      </Modal>

      <Modal
        title="Delete Transaction"
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
