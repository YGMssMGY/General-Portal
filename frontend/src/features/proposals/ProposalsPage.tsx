import { FileText, Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { workspaceApi } from "../../api/workspaceApi";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useAuth } from "../../context/AuthContext";
import { useProposals } from "../../hooks/useWorkspaceResources";
import type { Proposal } from "../../types";
import { statusBadgeClass } from "../../utils/classes";
import { formatCurrency, formatDateTime, sentenceCase } from "../../utils/format";

export function ProposalsPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useProposals();
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [proposalForm, setProposalForm] = useState({
    title: "",
    type: "Event" as Proposal["type"],
    budget: "0",
    summary: ""
  });

  const filteredProposals = useMemo(() => {
    if (!data) return [];
    return data.filter((proposal) => {
      const matchesQuery = [proposal.title, proposal.summary, proposal.submittedBy, proposal.type].some((value) =>
        value.toLowerCase().includes(query.trim().toLowerCase())
      );
      const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data, query, statusFilter]);

  const selectedProposal = useMemo<Proposal | undefined>(() => {
    if (!filteredProposals.length) return undefined;
    return filteredProposals.find((proposal) => proposal.id === selectedId) ?? filteredProposals[0];
  }, [filteredProposals, selectedId]);

  async function handleCreateProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);

    try {
      await workspaceApi.createProposal({
        title: proposalForm.title,
        type: proposalForm.type,
        submittedBy: user?.name ?? "Demo User",
        budget: Number(proposalForm.budget),
        summary: proposalForm.summary
      });
      setProposalForm({ title: "", type: "Event", budget: "0", summary: "" });
      setIsProposalModalOpen(false);
      refetch();
    } catch (unknownError) {
      setCreateError(unknownError instanceof Error ? unknownError.message : "Could not create proposal");
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Proposals are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Submit, review, and track organization ideas, events, purchases, and projects."
        actions={
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-container"
            onClick={() => setIsProposalModalOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Proposal
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant bg-surface-container-low/60 p-4">
            <input
              className="min-w-64 flex-1 rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Filter proposals..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="under_review">Under Review</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-normal text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Budget</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className={`cursor-pointer hover:bg-surface-container-low/60 ${
                      selectedProposal?.id === proposal.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedId(proposal.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-on-surface">{proposal.title}</div>
                      <div className="text-xs text-on-surface-variant">Submitted by {proposal.submittedBy}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{proposal.type}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(proposal.status)}>{sentenceCase(proposal.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-on-surface">{formatCurrency(proposal.budget)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(proposal.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProposals.length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant">No proposals match the current filters.</p>
            ) : null}
          </div>
        </Card>

        <Card className="p-card-padding">
          {selectedProposal ? (
            <div>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <Badge className={statusBadgeClass(selectedProposal.status)}>{sentenceCase(selectedProposal.status)}</Badge>
                  <h2 className="mt-4 font-display text-xl font-semibold text-on-surface">{selectedProposal.title}</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="text-sm leading-6 text-on-surface-variant">{selectedProposal.summary}</p>
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Owner</dt>
                  <dd className="font-semibold text-on-surface">{selectedProposal.submittedBy}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Type</dt>
                  <dd className="font-semibold text-on-surface">{selectedProposal.type}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Budget</dt>
                  <dd className="font-semibold text-on-surface">{formatCurrency(selectedProposal.budget)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </Card>
      </div>

      <Modal
        title="New Proposal"
        description="Submit a workspace proposal for review."
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleCreateProposal}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-on-surface">Title</span>
            <input
              required
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={proposalForm.title}
              onChange={(event) => setProposalForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Type</span>
              <select
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={proposalForm.type}
                onChange={(event) => setProposalForm((current) => ({ ...current, type: event.target.value as Proposal["type"] }))}
              >
                <option value="Event">Event</option>
                <option value="Purchase">Purchase</option>
                <option value="Project">Project</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Budget</span>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={proposalForm.budget}
                onChange={(event) => setProposalForm((current) => ({ ...current, budget: event.target.value }))}
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-on-surface">Summary</span>
            <textarea
              required
              rows={4}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={proposalForm.summary}
              onChange={(event) => setProposalForm((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>
          {createError ? <p className="rounded border border-error-container bg-error-container/30 px-3 py-2 text-sm text-on-error-container">{createError}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold" onClick={() => setIsProposalModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={isCreating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60">
              {isCreating ? "Submitting..." : "Submit Proposal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
