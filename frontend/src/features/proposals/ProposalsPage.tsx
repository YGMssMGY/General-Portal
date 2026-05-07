import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import { useProposals } from "../../hooks/useWorkspaceResources";
import type { Proposal } from "../../types";
import { statusBadgeClass } from "../../utils/classes";
import { formatCurrency, formatDateTime, sentenceCase } from "../../utils/format";
import { Add, Document } from "@carbon/icons-react";

const columns: ColumnDef<Proposal>[] = [
  {
    key: "title",
    header: "Title",
    sortable: true,
    render: (p) => (
      <div>
        <p className="font-medium text-text-primary">{p.title}</p>
        <p className="text-xs text-text-secondary">By {p.submittedBy}</p>
      </div>
    ),
  },
  { key: "type", header: "Type", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (p) => <Badge className={statusBadgeClass(p.status)}>{sentenceCase(p.status)}</Badge>,
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
];

export function ProposalsPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useProposals();
  const [selectedId, setSelectedId] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [form, setForm] = useState({
    title: "",
    type: "Event" as Proposal["type"],
    budget: "0",
    summary: "",
  });

  const selected = useMemo(() => {
    if (!data) return undefined;
    return data.find((p) => p.id === selectedId);
  }, [data, selectedId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      await workspaceApi.createProposal({
        title: form.title,
        type: form.type,
        submittedBy: user?.name ?? "Demo User",
        budget: Number(form.budget),
        summary: form.summary,
      });
      setForm({ title: "", type: "Event", budget: "0", summary: "" });
      setIsModalOpen(false);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create proposal");
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Proposals unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Submit, review, and track proposals for events, purchases, and projects."
        actions={
          <button
            type="button"
            className="flex h-9 items-center gap-2 border border-border-interactive bg-carbon-blue-60 px-4 text-sm font-medium text-white hover:bg-carbon-blue-70 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <Add size={16} aria-hidden="true" />
            New Proposal
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DataTable
          columns={columns}
          data={data as unknown as Record<string, unknown>[]}
          defaultSort={{ key: "submittedAt", direction: "desc" }}
          pageSize={10}
        />

        {selected ? (
          <Card padding="lg" className="h-fit">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Badge className={statusBadgeClass(selected.status)}>{sentenceCase(selected.status)}</Badge>
                <h2 className="mt-3 text-lg font-semibold text-text-primary">{selected.title}</h2>
              </div>
              <Document size={24} className="text-text-secondary shrink-0" aria-hidden="true" />
            </div>
            <p className="text-sm text-text-secondary">{selected.summary}</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Owner</dt>
                <dd className="font-medium text-text-primary">{selected.submittedBy}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Type</dt>
                <dd className="font-medium text-text-primary">{selected.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Budget</dt>
                <dd className="font-medium text-text-primary">{formatCurrency(selected.budget)}</dd>
              </div>
            </dl>
          </Card>
        ) : null}
      </div>

      <Modal title="New Proposal" description="Submit a proposal for review." isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleCreate}>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-text-primary">Title</span>
            <input required className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Type</span>
              <select className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive" value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as Proposal["type"] }))}>
                <option value="Event">Event</option>
                <option value="Purchase">Purchase</option>
                <option value="Project">Project</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Budget</span>
              <input required min="0" step="0.01" type="number" className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive" value={form.budget} onChange={(e) => setForm((c) => ({ ...c, budget: e.target.value }))} />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-text-primary">Summary</span>
            <textarea required rows={4} className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive resize-y" value={form.summary} onChange={(e) => setForm((c) => ({ ...c, summary: e.target.value }))} />
          </label>
          {createError ? <p className="border-l-4 border-danger bg-carbon-red-10 px-3 py-2 text-sm text-carbon-red-70">{createError}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" className="border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={isCreating} className="bg-carbon-blue-60 px-4 py-2 text-sm font-medium text-white hover:bg-carbon-blue-70 disabled:opacity-60 transition-colors">{isCreating ? "Submitting..." : "Submit Proposal"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
