import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useFinanceTransactions } from "../../hooks/useWorkspaceResources";
import type { FinanceTransaction } from "../../types";
import { formatCurrency, formatDateTime, sentenceCase } from "../../utils/format";

const columns: ColumnDef<FinanceTransaction>[] = [
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
    render: (tx) => <Badge>{sentenceCase(tx.status)}</Badge>,
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
];

export function FinancePage() {
  const { data, error, isLoading, refetch } = useFinanceTransactions();
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
    </div>
  );
}
