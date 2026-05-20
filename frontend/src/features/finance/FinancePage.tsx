import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { PageLayout } from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
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
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
} from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import { useUIStore } from "../../stores/useUIStore";
import {
    useFinanceTransactions,
    useFinanceSummary,
    useFinanceTrends,
    useBudgetAllocations,
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
    Money,
} from "@carbon/icons-react";
import { LineChart } from "@carbon/charts-react";
import "@carbon/charts/styles.css";

export function FinancePage() {
    const { user } = useAuth();
    const portal = useUIStore((s) => s.portal) || "developers";
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
    const { data: budgetData, refetch: refetchBudget } = useBudgetAllocations();
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [budgetForm, setBudgetForm] = useState({ title: "", amount: 0, linkedProposal: "" });
    const [budgetSaving, setBudgetSaving] = useState(false);

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
                            color:
                                tx.amount >= 0
                                    ? "var(--cds-support-success)"
                                    : "var(--cds-support-error)",
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
                            type="button"
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
                            type="button"
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
                toast.success("Transaction updated");
            } else {
                await workspaceApi.createFinanceTransaction(payload);
                toast.success("Transaction created");
            }
            setIsModalOpen(false);
            setEditingTx(undefined);
            refetchTx();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not save transaction";
            setCreateError(msg);
            toast.error(msg);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleCreateBudget() {
        if (!budgetForm.title.trim()) return;
        setBudgetSaving(true);
        try {
            await workspaceApi.createBudgetAllocation({
                title: budgetForm.title,
                amount: budgetForm.amount,
                linkedProposal: budgetForm.linkedProposal,
            });
            toast.success("Budget allocation created");
            setBudgetModalOpen(false);
            setBudgetForm({ title: "", amount: 0, linkedProposal: "" });
            refetchBudget();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create allocation");
        } finally {
            setBudgetSaving(false);
        }
    }

    async function handleApproveBudget(id: string) {
        try {
            await workspaceApi.approveBudgetAllocation(id);
            toast.success("Allocation approved");
            refetchBudget();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Approval failed");
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await workspaceApi.deleteFinanceTransaction(deleteTarget.id);
            setDeleteTarget(undefined);
            refetchTx();
            toast.success("Transaction deleted");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not delete transaction";
            setCreateError(msg);
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    }

    if (txLoading) return <LoadingState />;
    if (txError || !txData)
        return (
            <ErrorState message={txError ?? "Finance data is unavailable"} onRetry={refetchTx} />
        );
    if (txData.length === 0)
        return (
            <EmptyState
                title="No transactions"
                description="Transactions will appear here once recorded."
            />
        );

    const chartData = (trends ?? []).flatMap((t) => [
        { group: "Revenue", key: t.date, value: t.revenue },
        { group: "Expenses", key: t.date, value: t.expenses },
    ]);

    const chartOptions = {
        title: "Revenue vs Expenses (7 days)",
        axes: {
            bottom: { mapsTo: "key", title: "Date" },
            left: { mapsTo: "value", title: "Amount" },
        },
        legend: { enabled: true },
        height: "280px",
    };

    return (
        <div>
            <Link
                to={`/${portal}/dashboard`}
                style={{
                    fontSize: "0.8125rem",
                    color: "var(--cds-link-primary)",
                    textDecoration: "none",
                    display: "inline-block",
                    marginBottom: "0.5rem",
                }}
            >
                &larr; Back to Dashboard
            </Link>
            <PageLayout
                title="Finance"
                description="Track reimbursements, approvals, budgets, and spending."
                actions={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        New Transaction
                    </Button>
                }
            >
                <Tabs>
                    <TabList aria-label="Finance tabs">
                        <Tab>Transactions</Tab>
                        <Tab>Budget</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            {/* Summary Cards */}
                            <Grid style={{ marginBottom: "1.5rem" }}>
                                <Column lg={4} md={4} sm={4}>
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
                                                Trend data available soon
                                            </span>
                                        </Stack>
                                    </Tile>
                                </Column>
                                <Column lg={4} md={4} sm={4}>
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
                                                Trend data available soon
                                            </span>
                                        </Stack>
                                    </Tile>
                                </Column>
                                <Column lg={4} md={4} sm={4}>
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
                                <Column lg={4} md={4} sm={4}>
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
                            {chartData.length > 0 ? (
                                <Tile style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                                    <LineChart data={chartData} options={chartOptions} />
                                </Tile>
                            ) : null}

                            <DataTable
                                columns={columns}
                                data={txData as unknown as Record<string, unknown>[]}
                                defaultSort={{ key: "occurredAt", direction: "desc" }}
                                pageSize={10}
                                onRowClick={(item) => {
                                    setSelectedTxId((prev) =>
                                        prev === item.id ? undefined : item.id,
                                    );
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
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: "rgba(0,0,0,0.3)",
                                        }}
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
                                        <Stack gap={4}>
                                            <Stack
                                                orientation="horizontal"
                                                gap={4}
                                                style={{
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                }}
                                            >
                                                <div>
                                                    <Tag type="outline">
                                                        {selectedTx.status.replace(/_/g, " ")}
                                                    </Tag>
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
                                                    type="button"
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
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Category
                                                    </span>
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
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Submitted By
                                                    </span>
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
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Date
                                                    </span>
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
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Type
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color:
                                                                selectedTx.amount >= 0
                                                                    ? "var(--cds-support-success)"
                                                                    : "var(--cds-support-error)",
                                                        }}
                                                    >
                                                        {selectedTx.amount >= 0
                                                            ? "Revenue"
                                                            : "Expense"}
                                                    </span>
                                                </div>
                                            </Stack>

                                            <Stack orientation="horizontal" gap={5}>
                                                <Button
                                                    kind="primary"
                                                    type="button"
                                                    onClick={async () => {
                                                        await workspaceApi.updateFinanceTransaction(
                                                            selectedTx.id,
                                                            {
                                                                status: "approved",
                                                            },
                                                        );
                                                        refetchTx();
                                                    }}
                                                    disabled={selectedTx.status === "approved"}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    kind="danger"
                                                    type="button"
                                                    onClick={async () => {
                                                        await workspaceApi.updateFinanceTransaction(
                                                            selectedTx.id,
                                                            {
                                                                status: "rejected",
                                                            },
                                                        );
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
                        </TabPanel>
                        <TabPanel>
                            <div
                                style={{
                                    marginBottom: "1rem",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                }}
                            >
                                <Button
                                    type="button"
                                    renderIcon={Money}
                                    onClick={() => setBudgetModalOpen(true)}
                                >
                                    New Allocation
                                </Button>
                            </div>
                            {!budgetData || budgetData.length === 0 ? (
                                <Tile style={{ textAlign: "center", padding: "2rem" }}>
                                    <p
                                        style={{
                                            fontSize: "0.875rem",
                                            color: "var(--cds-text-secondary)",
                                        }}
                                    >
                                        No budget allocations yet.
                                    </p>
                                </Tile>
                            ) : (
                                <Grid>
                                    {budgetData.map((ba) => {
                                        const statusColors: Record<string, string> = {
                                            requested: "var(--cds-support-warning)",
                                            approved: "var(--cds-support-success)",
                                            spent: "var(--cds-support-info)",
                                            reconciled: "var(--cds-text-secondary)",
                                        };
                                        return (
                                            <Column key={ba.id} lg={8} md={8} sm={4}>
                                                <Tile
                                                    style={{
                                                        padding: "1.25rem",
                                                        borderLeft: `4px solid ${statusColors[ba.status] || "var(--cds-border-subtle)"}`,
                                                        marginBottom: "1rem",
                                                    }}
                                                >
                                                    <Stack gap={4}>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "flex-start",
                                                            }}
                                                        >
                                                            <div>
                                                                <p
                                                                    style={{
                                                                        fontWeight: 600,
                                                                        color: "var(--cds-text-primary)",
                                                                    }}
                                                                >
                                                                    {ba.title}
                                                                </p>
                                                                <p
                                                                    style={{
                                                                        fontSize: "0.75rem",
                                                                        color: "var(--cds-text-secondary)",
                                                                        marginTop: "0.125rem",
                                                                    }}
                                                                >
                                                                    {ba.linkedProposal ||
                                                                        "No linked proposal"}
                                                                </p>
                                                            </div>
                                                            <Tag
                                                                type={
                                                                    ba.status === "reconciled"
                                                                        ? "gray"
                                                                        : ba.status === "spent"
                                                                          ? "blue"
                                                                          : ba.status === "approved"
                                                                            ? "green"
                                                                            : "teal"
                                                                }
                                                                size="sm"
                                                            >
                                                                {ba.status}
                                                            </Tag>
                                                        </div>
                                                        <p
                                                            style={{
                                                                fontSize: "1.5rem",
                                                                fontWeight: 700,
                                                                color: "var(--cds-text-primary)",
                                                            }}
                                                        >
                                                            {formatCurrency(ba.amount)}
                                                        </p>
                                                        {ba.status === "requested" &&
                                                            user &&
                                                            (user.role === "admin" ||
                                                                user.role === "president" ||
                                                                user.role === "officer") && (
                                                                <Button
                                                                    kind="primary"
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleApproveBudget(ba.id)
                                                                    }
                                                                >
                                                                    Approve
                                                                </Button>
                                                            )}
                                                    </Stack>
                                                </Tile>
                                            </Column>
                                        );
                                    })}
                                </Grid>
                            )}

                            <Modal
                                title="New Budget Allocation"
                                isOpen={budgetModalOpen}
                                onClose={() => setBudgetModalOpen(false)}
                            >
                                <Stack gap={5}>
                                    <TextInput
                                        id="budget-title"
                                        labelText="Title"
                                        required
                                        value={budgetForm.title}
                                        onChange={(e) =>
                                            setBudgetForm((f) => ({ ...f, title: e.target.value }))
                                        }
                                    />
                                    <NumberInput
                                        id="budget-amount"
                                        label="Amount"
                                        value={budgetForm.amount}
                                        min={0}
                                        onChange={(_e, { value }) =>
                                            setBudgetForm((f) => ({ ...f, amount: Number(value) }))
                                        }
                                    />
                                    <TextInput
                                        id="budget-proposal"
                                        labelText="Linked Proposal (optional)"
                                        value={budgetForm.linkedProposal}
                                        onChange={(e) =>
                                            setBudgetForm((f) => ({
                                                ...f,
                                                linkedProposal: e.target.value,
                                            }))
                                        }
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "flex-end",
                                            gap: "0.75rem",
                                        }}
                                    >
                                        <Button
                                            kind="secondary"
                                            type="button"
                                            onClick={() => setBudgetModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleCreateBudget}
                                            disabled={budgetSaving || !budgetForm.title.trim()}
                                        >
                                            {budgetSaving ? "Creating..." : "Create Allocation"}
                                        </Button>
                                    </div>
                                </Stack>
                            </Modal>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </PageLayout>

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
                            <Column lg={8} md={8} sm={4}>
                                <Select
                                    id="fin-category"
                                    labelText="Category"
                                    value={form.category}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, category: e.target.value }))
                                    }
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
                            <Column lg={8} md={8} sm={4}>
                                <NumberInput
                                    id="fin-amount"
                                    label="Amount"
                                    value={form.amount}
                                    min={0}
                                    onChange={(_e, { value }) =>
                                        setForm((c) => ({ ...c, amount: Number(value) }))
                                    }
                                />
                            </Column>
                        </Grid>
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
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
                            <Column lg={8} md={8} sm={4}>
                                <Select
                                    id="fin-status"
                                    labelText="Status"
                                    value={form.status}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, status: e.target.value }))
                                    }
                                >
                                    <SelectItem value="pending" text="Pending" />
                                    <SelectItem value="under_review" text="Under Review" />
                                    <SelectItem value="approved" text="Approved" />
                                    <SelectItem value="rejected" text="Rejected" />
                                </Select>
                            </Column>
                        </Grid>
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="fin-date"
                                    labelText="Date"
                                    type="date"
                                    required
                                    value={form.date}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, date: e.target.value }))
                                    }
                                />
                            </Column>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="fin-notes"
                                    labelText="Notes"
                                    value={form.notes}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, notes: e.target.value }))
                                    }
                                />
                            </Column>
                        </Grid>
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
                                    setEditingTx(undefined);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating
                                    ? "Saving..."
                                    : editingTx
                                      ? "Save Changes"
                                      : "Create Transaction"}
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
