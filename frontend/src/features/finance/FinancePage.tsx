import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useFinanceTransactions } from "../../hooks/useWorkspaceResources";
import type { FinanceTransaction } from "../../types";
import { statusBadgeClass } from "../../utils/classes";
import { formatCurrency, formatDateTime, sentenceCase } from "../../utils/format";

const columns: ColumnDef<FinanceTransaction>[] = [
  {
    key: "title",
    header: "Request",
    sortable: true,
    render: (tx) => (
      <div>
        <p className="font-medium text-text-primary">{tx.title}</p>
        <p className="text-xs text-text-secondary">By {tx.submittedBy}</p>
      </div>
    ),
  },
  { key: "category", header: "Category", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (tx) => <Badge className={statusBadgeClass(tx.status)}>{sentenceCase(tx.status)}</Badge>,
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
  if (error || !data) return <ErrorState message={error ?? "Finance data is unavailable"} onRetry={refetch} />;

  const pending = data.filter((tx) => tx.status === "pending" || tx.status === "under_review");
  const totalPending = pending.reduce((s, tx) => s + tx.amount, 0);
  const approved = data.filter((tx) => tx.status === "approved").reduce((s, tx) => s + tx.amount, 0);

  return (
    <div>
      <PageHeader title="Finance" description="Track reimbursements, approvals, budgets, and spending." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Pending Review</p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{formatCurrency(totalPending)}</p>
        </Card>
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Approved Spend</p>
          <p className="mt-2 text-3xl font-semibold text-carbon-blue-60">{formatCurrency(approved)}</p>
        </Card>
        <Card padding="lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Open Requests</p>
          <p className="mt-2 text-3xl font-semibold text-text-primary">{pending.length}</p>
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
