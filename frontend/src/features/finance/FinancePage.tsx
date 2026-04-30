import { WalletCards } from "lucide-react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useFinanceTransactions } from "../../hooks/useWorkspaceResources";
import { statusBadgeClass } from "../../utils/classes";
import { formatCurrency, formatDateTime, sentenceCase } from "../../utils/format";

export function FinancePage() {
  const { data, error, isLoading, refetch } = useFinanceTransactions();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Finance data is unavailable"} onRetry={refetch} />;

  const pending = data.filter((transaction) => transaction.status === "pending" || transaction.status === "under_review");
  const totalPending = pending.reduce((total, transaction) => total + transaction.amount, 0);
  const approved = data.filter((transaction) => transaction.status === "approved").reduce((total, transaction) => total + transaction.amount, 0);

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Track reimbursements, approvals, budgets, and event spending."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-card-padding">
          <p className="text-sm font-medium text-on-surface-variant">Pending Review</p>
          <p className="mt-4 font-display text-3xl font-bold text-on-surface">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-card-padding">
          <p className="text-sm font-medium text-on-surface-variant">Approved Spend</p>
          <p className="mt-4 font-display text-3xl font-bold text-primary">{formatCurrency(approved)}</p>
        </Card>
        <Card className="flex items-center gap-4 p-card-padding">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
            <WalletCards className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant">Open Requests</p>
            <p className="font-display text-3xl font-bold text-on-surface">{pending.length}</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-outline-variant p-card-padding">
          <h2 className="font-display text-lg font-semibold text-on-surface">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-normal text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-surface-container-low/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-on-surface">{transaction.title}</div>
                    <div className="text-xs text-on-surface-variant">By {transaction.submittedBy}</div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{transaction.category}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadgeClass(transaction.status)}>{sentenceCase(transaction.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-on-surface">{formatCurrency(transaction.amount)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(transaction.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
