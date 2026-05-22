import { useMemo, useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { PageLayout } from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
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
    ProgressIndicator,
    ProgressStep,
} from "@carbon/react";
import { MemberSelect } from "../../components/MemberSelect/MemberSelect";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import { useProposals } from "../../hooks/useWorkspaceResources";
import { useUIStore } from "../../stores/useUIStore";
import type { ApprovalHistoryEntry, Proposal } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { Add, Edit, TrashCan, Document, Checkmark, Close } from "@carbon/icons-react";

const typeTagColors: Record<string, string> = {
    Event: "teal",
    Purchase: "purple",
    Project: "cyan",
};

export function ProposalsPage() {
    const { user } = useAuth();
    const portal = useUIStore((s) => s.portal) || "developers";
    const { data, error, isLoading, refetch } = useProposals();
    const [selectedId, setSelectedId] = useState<string>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState<Proposal>();
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string>();
    const [deleteTarget, setDeleteTarget] = useState<Proposal>();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);
    const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    const [form, setForm] = useState({
        title: "",
        type: "Event" as Proposal["type"],
        budget: "0",
        summary: "",
        submittedBy: "",
        submittedById: undefined as string | undefined,
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
                        <p style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                            {p.title}
                        </p>
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
                            type="button"
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
                                    submittedById: p.submittedById,
                                    dateNeeded: "",
                                });
                                setIsModalOpen(true);
                            }}
                        />
                        <Button
                            kind="ghost"
                            type="button"
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

    useEffect(() => {
        if (selected && selected.status !== "draft") {
            workspaceApi
                .getApprovalHistory(selected.id)
                .then(setApprovalHistory)
                .catch(() => setApprovalHistory([]));
        } else {
            setApprovalHistory([]);
        }
    }, [selected?.id]);

    function openCreateModal() {
        setEditingProposal(undefined);
        setForm({
            title: "",
            type: "Event",
            budget: "0",
            summary: "",
            submittedBy: user?.displayName ?? "",
            submittedById: undefined,
            dateNeeded: "",
        });
        setIsModalOpen(true);
    }

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateError(undefined);
        setIsCreating(true);
        try {
            const payload: Record<string, unknown> = {
                title: form.title,
                type: form.type,
                submittedBy: (form.submittedBy || user?.displayName) ?? "Demo User",
                budget: Number(form.budget),
                summary: form.summary,
            };
            if (form.submittedById) {
                payload.submittedById = form.submittedById;
            }
            if (editingProposal) {
                await workspaceApi.updateProposal(editingProposal.id, payload as any);
                toast.success("Proposal updated");
            } else {
                await workspaceApi.createProposal(payload as any);
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

    async function handleApprove(id: string) {
        setIsApproving(true);
        try {
            await workspaceApi.approveProposal(id);
            refetch();
            toast.success("Proposal approved");
        } catch {
            toast.error("Could not approve proposal");
        } finally {
            setIsApproving(false);
        }
    }

    async function handleReject() {
        if (!selected || !rejectReason.trim()) return;
        setIsRejecting(true);
        try {
            await workspaceApi.rejectProposal(selected.id, rejectReason.trim());
            setRejectModalOpen(false);
            setRejectReason("");
            refetch();
            toast.success("Proposal rejected");
        } catch {
            toast.error("Could not reject proposal");
        } finally {
            setIsRejecting(false);
        }
    }

    function getStepStates(status: string) {
        const states = [
            { complete: false, current: false, invalid: false },
            { complete: false, current: false, invalid: false },
            { complete: false, current: false, invalid: false },
            { complete: false, current: false, invalid: false },
        ];
        switch (status) {
            case "submitted":
                states[0].complete = true;
                states[1].current = true;
                break;
            case "under_review":
                states[0].complete = true;
                states[1].complete = true;
                states[2].current = true;
                break;
            case "approved":
                states[0].complete = true;
                states[1].complete = true;
                states[2].complete = true;
                states[3].complete = true;
                break;
            case "rejected":
                states[0].complete = true;
                states[1].complete = true;
                states[2].invalid = true;
                break;
        }
        return states;
    }

    const stepLabels = ["Submitted", "Officer Review", "President Review", "Approved"];

    const canAct =
        selected &&
        (user?.role === "admin" ||
            (selected.status === "submitted" && user?.role === "officer") ||
            (selected.status === "submitted" && user?.role === "president") ||
            (selected.status === "under_review" && user?.role === "president"));

    if (isLoading) return <LoadingState />;
    if (error || !data)
        return <ErrorState message={error ?? "Proposals unavailable"} onRetry={refetch} />;
    if (data.length === 0)
        return (
            <EmptyState
                title="No proposals"
                description="Proposals will appear here once created."
                action={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        Create Proposal
                    </Button>
                }
            />
        );

    return (
        <div>
            <Link
                to={`/${portal}/dashboard`}
                style={{
                    fontSize: "0.8125rem",
                    color: "var(--cds-link-primary)",
                    textDecoration: "none",
                    display: "inline-block",
                    marginBottom: "0.75rem",
                }}
            >
                &larr; Back to Dashboard
            </Link>
            <PageLayout
                title="Proposals"
                description="Submit, review, and track proposals for events, purchases, and projects."
                actions={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        New Proposal
                    </Button>
                }
            >
                <Stack orientation="horizontal" gap={4} className="cds--data-table-toolbar">
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
                    <Button type="button" renderIcon={Add} size="sm" onClick={openCreateModal}>
                        Add Proposal
                    </Button>
                </Stack>

                <Grid>
                    <Column lg={selected ? 12 : 16} md={16} sm={4}>
                        <Stack gap={4}>
                            <DataTable
                                columns={columns}
                                data={filtered as unknown as Record<string, unknown>[]}
                                defaultSort={{ key: "submittedAt", direction: "desc" }}
                                pageSize={10}
                                onRowClick={(item) => {
                                    setSelectedId((prev) =>
                                        prev === item.id ? undefined : item.id,
                                    );
                                }}
                            />
                        </Stack>
                    </Column>

                    {selected ? (
                        <Column lg={4} md={0} sm={0}>
                            <Tile style={{ padding: "1.5rem" }}>
                                <Stack gap={5}>
                                    <Stack orientation="horizontal" gap={5}>
                                        <Tag type="outline">
                                            {selected.status.replace(/_/g, " ")}
                                        </Tag>
                                        <Tag
                                            type={
                                                typeTagColors[selected.type] as
                                                    | "teal"
                                                    | "purple"
                                                    | "cyan"
                                            }
                                        >
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
                                        <div
                                            style={{
                                                fontSize: "0.875rem",
                                                color: "var(--cds-text-secondary)",
                                            }}
                                        >
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
                                            <span
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "var(--cds-text-secondary)",
                                                }}
                                            >
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
                                            <span
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "var(--cds-text-secondary)",
                                                }}
                                            >
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
                                            <span
                                                style={{
                                                    fontSize: "0.875rem",
                                                    color: "var(--cds-text-secondary)",
                                                }}
                                            >
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

                                    {/* Progress Indicator */}
                                    {selected.status !== "draft" && (
                                        <ProgressIndicator>
                                            {stepLabels.map((label, i) => {
                                                const state = getStepStates(selected.status)[i];
                                                return (
                                                    <ProgressStep
                                                        key={label}
                                                        label={label}
                                                        complete={state.complete}
                                                        current={state.current}
                                                        invalid={state.invalid}
                                                        disabled={false}
                                                    />
                                                );
                                            })}
                                        </ProgressIndicator>
                                    )}

                                    {/* Rejection reason */}
                                    {selected.status === "rejected" && selected.rejectionReason && (
                                        <InlineNotification
                                            kind="error"
                                            title="Rejected"
                                            subtitle={selected.rejectionReason}
                                            hideCloseButton
                                            lowContrast
                                        />
                                    )}

                                    {/* Approve / Reject buttons */}
                                    {canAct && (
                                        <Stack orientation="horizontal" gap={5}>
                                            <Button
                                                kind="primary"
                                                type="button"
                                                renderIcon={Checkmark}
                                                onClick={() => handleApprove(selected.id)}
                                                disabled={isApproving}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                kind="danger"
                                                type="button"
                                                renderIcon={Close}
                                                onClick={() => {
                                                    setRejectReason("");
                                                    setRejectModalOpen(true);
                                                }}
                                                disabled={isApproving}
                                            >
                                                Reject
                                            </Button>
                                        </Stack>
                                    )}

                                    {/* Approval history timeline */}
                                    {approvalHistory.length > 0 && (
                                        <div>
                                            <p
                                                style={{
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    textTransform: "uppercase",
                                                    color: "var(--cds-text-secondary)",
                                                    marginBottom: "0.5rem",
                                                    letterSpacing: "0.025em",
                                                }}
                                            >
                                                Approval History
                                            </p>
                                            <Stack gap={3}>
                                                {approvalHistory.map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        style={{
                                                            display: "flex",
                                                            gap: "0.5rem",
                                                            padding: "0.25rem 0",
                                                            borderLeft:
                                                                "2px solid var(--cds-border-subtle)",
                                                            paddingLeft: "0.75rem",
                                                        }}
                                                    >
                                                        <div>
                                                            <p
                                                                style={{
                                                                    fontSize: "0.8125rem",
                                                                    fontWeight: 500,
                                                                    color: "var(--cds-text-primary)",
                                                                }}
                                                            >
                                                                {entry.step}
                                                            </p>
                                                            <p
                                                                style={{
                                                                    fontSize: "0.75rem",
                                                                    color: "var(--cds-text-secondary)",
                                                                }}
                                                            >
                                                                {entry.approver} —{" "}
                                                                {formatDateTime(entry.createdAt)}
                                                            </p>
                                                            {entry.comment && (
                                                                <p
                                                                    style={{
                                                                        fontSize: "0.75rem",
                                                                        color:
                                                                            entry.action ===
                                                                            "rejected"
                                                                                ? "var(--cds-support-error)"
                                                                                : "var(--cds-text-secondary)",
                                                                        fontStyle: "italic",
                                                                    }}
                                                                >
                                                                    {entry.comment}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </Stack>
                                        </div>
                                    )}
                                </Stack>
                            </Tile>

                            {/* Reject modal */}
                            <Modal
                                title="Reject Proposal"
                                description="Provide a reason for rejection."
                                isOpen={rejectModalOpen}
                                onClose={() => setRejectModalOpen(false)}
                            >
                                <Stack gap={5}>
                                    <TextArea
                                        id="reject-reason"
                                        labelText="Reason (required)"
                                        placeholder="Explain why this proposal is being rejected..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        invalid={isRejecting && !rejectReason.trim()}
                                        invalidText="Reason is required"
                                    />
                                    <Stack
                                        orientation="horizontal"
                                        gap={5}
                                        style={{ justifyContent: "flex-end" }}
                                    >
                                        <Button
                                            kind="secondary"
                                            onClick={() => {
                                                setRejectModalOpen(false);
                                                setRejectReason("");
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            kind="danger"
                                            type="button"
                                            onClick={handleReject}
                                            disabled={!rejectReason.trim() || isRejecting}
                                        >
                                            {isRejecting ? "Rejecting..." : "Reject"}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Modal>
                        </Column>
                    ) : null}
                </Grid>
            </PageLayout>

            <Modal
                title={editingProposal ? "Edit Proposal" : "New Proposal"}
                description={
                    editingProposal ? "Update proposal details." : "Submit a proposal for review."
                }
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
                                        setForm((c) => ({
                                            ...c,
                                            type: e.target.value as Proposal["type"],
                                        }))
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
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, budget: e.target.value }))
                                    }
                                />
                            </Column>
                        </Grid>
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="prop-submitted-by"
                                    labelText="Submitted By (name)"
                                    value={form.submittedBy}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, submittedBy: e.target.value }))
                                    }
                                />
                            </Column>
                            <Column lg={8} md={8} sm={4}>
                                <MemberSelect
                                    value={form.submittedById}
                                    onChange={({ id, label }) => {
                                        setForm((c) => ({
                                            ...c,
                                            submittedById: id,
                                            submittedBy: label ?? c.submittedBy,
                                        }));
                                    }}
                                    label="Or select a member"
                                    placeholder="Search members..."
                                />
                            </Column>
                        </Grid>
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="prop-date-needed"
                                    labelText="Date Needed"
                                    type="date"
                                    value={form.dateNeeded}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, dateNeeded: e.target.value }))
                                    }
                                />
                            </Column>
                            <Column lg={8} md={8} sm={4} />
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
                            <InlineNotification
                                kind="error"
                                subtitle={createError}
                                hideCloseButton
                                lowContrast
                            />
                        ) : null}
                        <Stack
                            orientation="horizontal"
                            gap={5}
                            style={{ justifyContent: "flex-end" }}
                        >
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
                                {isCreating
                                    ? "Saving..."
                                    : editingProposal
                                      ? "Save Changes"
                                      : "Submit Proposal"}
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
                        <Button
                            kind="secondary"
                            type="button"
                            onClick={() => setDeleteTarget(undefined)}
                        >
                            Cancel
                        </Button>
                        <Button
                            kind="danger"
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </Stack>
                </Stack>
            </Modal>
        </div>
    );
}
