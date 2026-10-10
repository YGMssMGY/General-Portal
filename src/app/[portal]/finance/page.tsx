"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface FinanceSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    categoryBreakdown: { category: string | null; type: string; total: number; count: number }[];
}

interface Transaction {
    id: string;
    amountCents: number;
    type: "income" | "expense";
    category: string | null;
    description: string | null;
    date: string;
    createdAt: string;
    createdBy: { id: string; name: string | null; image: string | null } | null;
    attachmentCount: number;
}

interface TrendMonth {
    month: string;
    income: number;
    expense: number;
    net: number;
}

interface BudgetOverview {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
}

interface Allocation {
    id: string;
    category: string;
    amountCents: number;
    spentCents: number;
    fiscalYear: number;
    status: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

interface PurchaseRequest {
    id: string;
    title: string;
    itemName: string;
    costCents: number;
    cost: number;
    quantity: number;
    justification: string;
    status: string;
    reviewComment: string | null;
    createdAt: string;
    updatedAt: string;
    submittedBy: { id: string; name: string | null; email: string | null } | null;
    reviewedBy: { id: string; name: string | null } | null;
}

const PR_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "fulfilled"];

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

function formatMoney(cents: number, locale: string | undefined): string {
    return (cents / 100).toLocaleString(locale, { style: "currency", currency: "CNY" });
}

export default function FinancePage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const tF = useTranslations("finance");
    const tB = useTranslations("budget");
    const tP = useTranslations("purchaseRequests");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${tF("title")} | ${wsName}`);
    const canManageBudget =
        user?.role === "admin" || (user?.permissions ?? []).includes("manage_budget");
    const canManageFinance =
        user?.role === "admin" || (user?.permissions ?? []).includes("manage_finance");
    const canReviewPurchases =
        user?.role === "admin" || (user?.permissions ?? []).includes("manage_purchase_requests");

    const [tab, setTab] = useState("transactions");
    const [typeFilter, setTypeFilter] = useState("all");
    const [fiscalYear, setFiscalYear] = useState(() => new Date().getFullYear().toString());
    const [prStatus, setPrStatus] = useState("all");

    const [txOpen, setTxOpen] = useState(false);
    const [txAmount, setTxAmount] = useState("");
    const [txType, setTxType] = useState("expense");
    const [txCategory, setTxCategory] = useState("");
    const [txDescription, setTxDescription] = useState("");
    const [txDate, setTxDate] = useState("");

    const [allocOpen, setAllocOpen] = useState(false);
    const [allocCategory, setAllocCategory] = useState("");
    const [allocAmount, setAllocAmount] = useState("");
    const [allocDescription, setAllocDescription] = useState("");

    const [spendTarget, setSpendTarget] = useState<Allocation | null>(null);
    const [spendAmount, setSpendAmount] = useState("");
    const [spendDescription, setSpendDescription] = useState("");

    const [prOpen, setPrOpen] = useState(false);
    const [prTitle, setPrTitle] = useState("");
    const [prItem, setPrItem] = useState("");
    const [prCost, setPrCost] = useState("");
    const [prQuantity, setPrQuantity] = useState("1");
    const [prJustification, setPrJustification] = useState("");

    const [reviewTarget, setReviewTarget] = useState<PurchaseRequest | null>(null);
    const [reviewStatus, setReviewStatus] = useState("approved");
    const [reviewComment, setReviewComment] = useState("");

    const [budgetDelete, setBudgetDelete] = useState<Allocation | null>(null);
    const [budgetPermanent, setBudgetPermanent] = useState<Allocation | null>(null);
    const [prDelete, setPrDelete] = useState<PurchaseRequest | null>(null);
    const [prPermanent, setPrPermanent] = useState<PurchaseRequest | null>(null);
    const [txDelete, setTxDelete] = useState<Transaction | null>(null);

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: [portal, "finance", "summary"],
        queryFn: () => fetchJson<FinanceSummary>("/api/finance/summary"),
        enabled: portal !== "",
    });

    const { data: trends } = useQuery({
        queryKey: [portal, "finance", "trends"],
        queryFn: () => fetchJson<{ months: TrendMonth[] }>("/api/finance/trends"),
        enabled: portal !== "",
    });

    const { data: overview } = useQuery({
        queryKey: [portal, "budget", "overview"],
        queryFn: () => fetchJson<BudgetOverview>("/api/budget/overview"),
        enabled: portal !== "",
    });

    const { data: txFirst, isLoading: txLoading } = useQuery({
        queryKey: [portal, "finance", "transactions", typeFilter],
        queryFn: () =>
            fetchPage<Transaction>(
                typeFilter === "all"
                    ? "/api/finance/transactions"
                    : `/api/finance/transactions?type=${typeFilter}`,
            ),
        enabled: portal !== "",
    });
    const [txExtra, setTxExtra] = useState<Transaction[]>([]);
    const [txNext, setTxNext] = useState<string | null>(null);
    const [txMoreLoading, setTxMoreLoading] = useState(false);
    const [prevTxFirst, setPrevTxFirst] = useState(txFirst);
    if (txFirst !== prevTxFirst) {
        setPrevTxFirst(txFirst);
        setTxExtra([]);
        setTxNext(txFirst?.nextCursor ?? null);
    }
    const transactions = [...(txFirst?.items ?? []), ...txExtra];

    async function loadMoreTx() {
        if (!txNext || txMoreLoading) return;
        setTxMoreLoading(true);
        try {
            const base =
                typeFilter === "all"
                    ? "/api/finance/transactions"
                    : `/api/finance/transactions?type=${typeFilter}`;
            const page = await fetchPage<Transaction>(
                `${base}${base.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(txNext)}`,
            );
            setTxExtra((prev) => [...prev, ...page.items]);
            setTxNext(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setTxMoreLoading(false);
        }
    }

    const { data: allocFirst, isLoading: allocLoading } = useQuery({
        queryKey: [portal, "budget", fiscalYear],
        queryFn: () => fetchPage<Allocation>(`/api/budget?fiscalYear=${fiscalYear}`),
        enabled: portal !== "",
    });
    const [allocExtra, setAllocExtra] = useState<Allocation[]>([]);
    const [allocNext, setAllocNext] = useState<string | null>(null);
    const [allocMoreLoading, setAllocMoreLoading] = useState(false);
    const [prevAllocFirst, setPrevAllocFirst] = useState(allocFirst);
    if (allocFirst !== prevAllocFirst) {
        setPrevAllocFirst(allocFirst);
        setAllocExtra([]);
        setAllocNext(allocFirst?.nextCursor ?? null);
    }
    const allocations = [...(allocFirst?.items ?? []), ...allocExtra];

    async function loadMoreAlloc() {
        if (!allocNext || allocMoreLoading) return;
        setAllocMoreLoading(true);
        try {
            const page = await fetchPage<Allocation>(
                `/api/budget?fiscalYear=${fiscalYear}&cursor=${encodeURIComponent(allocNext)}`,
            );
            setAllocExtra((prev) => [...prev, ...page.items]);
            setAllocNext(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setAllocMoreLoading(false);
        }
    }

    const { data: prFirst, isLoading: prLoading } = useQuery({
        queryKey: [portal, "purchase-requests", prStatus],
        queryFn: () =>
            fetchPage<PurchaseRequest>(
                prStatus === "all"
                    ? "/api/purchase-requests"
                    : `/api/purchase-requests?status=${prStatus}`,
            ),
        enabled: portal !== "",
    });
    const [prExtra, setPrExtra] = useState<PurchaseRequest[]>([]);
    const [prNext, setPrNext] = useState<string | null>(null);
    const [prMoreLoading, setPrMoreLoading] = useState(false);
    const [prevPrFirst, setPrevPrFirst] = useState(prFirst);
    if (prFirst !== prevPrFirst) {
        setPrevPrFirst(prFirst);
        setPrExtra([]);
        setPrNext(prFirst?.nextCursor ?? null);
    }
    const purchaseRequests = [...(prFirst?.items ?? []), ...prExtra];

    async function loadMorePr() {
        if (!prNext || prMoreLoading) return;
        setPrMoreLoading(true);
        try {
            const base =
                prStatus === "all"
                    ? "/api/purchase-requests"
                    : `/api/purchase-requests?status=${prStatus}`;
            const page = await fetchPage<PurchaseRequest>(
                `${base}${base.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(prNext)}`,
            );
            setPrExtra((prev) => [...prev, ...page.items]);
            setPrNext(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setPrMoreLoading(false);
        }
    }

    const createTx = useMutation({
        mutationFn: (body: {
            amount: number;
            type: string;
            category?: string | null;
            description?: string | null;
            date?: string | null;
        }) =>
            fetchJson<Transaction>("/api/finance/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "finance"] });
            setTxOpen(false);
            setTxAmount("");
            setTxType("expense");
            setTxCategory("");
            setTxDescription("");
            setTxDate("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const deleteTx = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ deleted: boolean }>(`/api/finance/transactions/${id}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "finance"] });
            setTxDelete(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const createAlloc = useMutation({
        mutationFn: (body: {
            category: string;
            amount: number;
            fiscalYear: number;
            description?: string | null;
        }) =>
            fetchJson<Allocation>("/api/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
            setAllocOpen(false);
            setAllocCategory("");
            setAllocAmount("");
            setAllocDescription("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const approveAlloc = useMutation({
        mutationFn: (id: string) =>
            fetchJson<Allocation>(`/api/budget/${id}/approve`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const recordSpend = useMutation({
        mutationFn: (body: { id: string; amount: number; description?: string | null }) =>
            fetchJson(`/api/budget/${body.id}/spend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: body.amount, description: body.description }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
            setSpendTarget(null);
            setSpendAmount("");
            setSpendDescription("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const reconcileAlloc = useMutation({
        mutationFn: (id: string) =>
            fetchJson<Allocation>(`/api/budget/${id}/reconcile`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const deleteAlloc = useMutation({
        mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
            fetchJson<{ deleted: boolean }>(
                permanent ? `/api/budget/${id}?permanent=true` : `/api/budget/${id}`,
                { method: "DELETE" },
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
            setBudgetDelete(null);
            setBudgetPermanent(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const createPr = useMutation({
        mutationFn: (body: {
            title: string;
            itemName: string;
            cost: number;
            quantity: number;
            justification: string;
        }) =>
            fetchJson<PurchaseRequest>("/api/purchase-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] });
            setPrOpen(false);
            setPrTitle("");
            setPrItem("");
            setPrCost("");
            setPrQuantity("1");
            setPrJustification("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const reviewPr = useMutation({
        mutationFn: (body: { id: string; status: string; reviewComment?: string | null }) =>
            fetchJson<PurchaseRequest>(`/api/purchase-requests/${body.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: body.status, reviewComment: body.reviewComment }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] });
            setReviewTarget(null);
            setReviewStatus("approved");
            setReviewComment("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const deletePr = useMutation({
        mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
            fetchJson<{ deleted: boolean }>(
                permanent
                    ? `/api/purchase-requests/${id}?permanent=true`
                    : `/api/purchase-requests/${id}`,
                { method: "DELETE" },
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] });
            setPrDelete(null);
            setPrPermanent(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleCreateTx() {
        const amount = Number.parseFloat(txAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(tE("invalidField", { field: tF("amount") }));
            return;
        }
        createTx.mutate({
            amount,
            type: txType,
            category: txCategory.trim() || null,
            description: txDescription.trim() || null,
            date: txDate || null,
        });
    }

    function handleCreateAlloc() {
        const amount = Number.parseFloat(allocAmount);
        const year = Number.parseInt(fiscalYear, 10);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(tE("invalidField", { field: tF("amount") }));
            return;
        }
        createAlloc.mutate({
            category: allocCategory.trim(),
            amount,
            fiscalYear: Number.isFinite(year) ? year : new Date().getFullYear(),
            description: allocDescription.trim() || null,
        });
    }

    function handleSpend() {
        if (!spendTarget) return;
        const amount = Number.parseFloat(spendAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(tE("invalidField", { field: tF("amount") }));
            return;
        }
        recordSpend.mutate({
            id: spendTarget.id,
            amount,
            description: spendDescription.trim() || null,
        });
    }

    function handleCreatePr() {
        const cost = Number.parseFloat(prCost);
        const quantity = Number.parseInt(prQuantity, 10);
        if (!Number.isFinite(cost) || cost < 0) {
            toast.error(tE("invalidField", { field: tP("cost") }));
            return;
        }
        createPr.mutate({
            title: prTitle.trim(),
            itemName: prItem.trim(),
            cost,
            quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
            justification: prJustification.trim(),
        });
    }

    function budgetStatusLabel(status: string): string {
        if (status === "active") return tB("statusActive");
        if (status === "spent") return tB("statusSpent");
        if (status === "reconciled") return tB("statusReconciled");
        return status;
    }

    function prStatusLabel(status: string): string {
        if (status === "draft") return tP("statusDraft");
        if (status === "submitted") return tP("statusSubmitted");
        if (status === "under_review") return tP("statusUnderReview");
        if (status === "approved") return tP("statusApproved");
        if (status === "rejected") return tP("statusRejected");
        return tP("statusFulffilled");
    }

    const trendRows = (trends?.months ?? []).map((m) => ({
        month: m.month,
        income: m.income / 100,
        expense: m.expense / 100,
        net: m.net / 100,
    }));
    const budgetRows = allocations.map((a) => ({
        category: a.category,
        allocated: a.amountCents / 100,
        spent: a.spentCents / 100,
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--color-text)",
                        margin: 0,
                    }}
                >
                    {tF("title")}
                </h1>
                <p
                    style={{
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                        margin: "4px 0 0",
                    }}
                >
                    {wsName}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent style={{ padding: "20px" }}>
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 8px",
                            }}
                        >
                            {tF("totalIncome")}
                        </p>
                        {summaryLoading ? (
                            <Skeleton className="h-7 w-28" />
                        ) : (
                            <p
                                style={{
                                    fontSize: "24px",
                                    fontWeight: 700,
                                    color: "var(--color-success)",
                                    margin: 0,
                                }}
                            >
                                {formatMoney(summary?.totalIncome ?? 0, locale)}
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent style={{ padding: "20px" }}>
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 8px",
                            }}
                        >
                            {tF("totalExpense")}
                        </p>
                        {summaryLoading ? (
                            <Skeleton className="h-7 w-28" />
                        ) : (
                            <p
                                style={{
                                    fontSize: "24px",
                                    fontWeight: 700,
                                    color: "var(--color-destructive)",
                                    margin: 0,
                                }}
                            >
                                {formatMoney(summary?.totalExpense ?? 0, locale)}
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent style={{ padding: "20px" }}>
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 8px",
                            }}
                        >
                            {tF("netBalance")}
                        </p>
                        {summaryLoading ? (
                            <Skeleton className="h-7 w-28" />
                        ) : (
                            <p
                                style={{
                                    fontSize: "24px",
                                    fontWeight: 700,
                                    color: "var(--color-text)",
                                    margin: 0,
                                }}
                            >
                                {formatMoney(summary?.balance ?? 0, locale)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent style={{ padding: "20px" }}>
                    <h2
                        style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            margin: "0 0 12px",
                        }}
                    >
                        {tF("trends")}
                    </h2>
                    {trendRows.length === 0 ? (
                        <Skeleton className="h-60 w-full" />
                    ) : (
                        <div style={{ height: "260px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendRows}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="income"
                                        name={tF("income")}
                                        stroke="var(--color-success)"
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expense"
                                        name={tF("expense")}
                                        stroke="var(--color-destructive)"
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="net"
                                        name={tF("netBalance")}
                                        stroke="var(--color-primary)"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="transactions">{tF("transactions")}</TabsTrigger>
                    <TabsTrigger value="budget">{tB("title")}</TabsTrigger>
                    <TabsTrigger value="requests">{tP("title")}</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger style={{ width: "160px" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{tC("all")}</SelectItem>
                                <SelectItem value="income">{tF("income")}</SelectItem>
                                <SelectItem value="expense">{tF("expense")}</SelectItem>
                            </SelectContent>
                        </Select>
                        {canManageFinance && (
                            <Button onClick={() => setTxOpen(true)}>{tF("newTransaction")}</Button>
                        )}
                    </div>
                    {txLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {tF("noTransactions")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {transactions.map((tx) => (
                                <Card key={tx.id}>
                                    <CardContent
                                        style={{
                                            padding: "12px 16px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: "12px",
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <p
                                                style={{
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    color: "var(--color-text)",
                                                    margin: 0,
                                                }}
                                            >
                                                {tx.description || tC("unknown")}
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: "2px 0 0",
                                                }}
                                            >
                                                {new Date(tx.date).toLocaleDateString(locale)}
                                                {tx.category ? ` · ${tx.category}` : ""}
                                                {tx.createdBy?.name
                                                    ? ` · ${tx.createdBy.name}`
                                                    : ""}
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Badge
                                                variant={
                                                    tx.type === "income" ? "default" : "secondary"
                                                }
                                            >
                                                {tx.type === "income"
                                                    ? tF("income")
                                                    : tF("expense")}
                                            </Badge>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color:
                                                        tx.type === "income"
                                                            ? "var(--color-success)"
                                                            : "var(--color-destructive)",
                                                }}
                                            >
                                                {formatMoney(tx.amountCents, locale)}
                                            </span>
                                            {canManageFinance && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setTxDelete(tx)}
                                                >
                                                    {tC("delete")}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {txNext && (
                                <Button
                                    variant="outline"
                                    onClick={loadMoreTx}
                                    disabled={txMoreLoading}
                                >
                                    {txMoreLoading ? tC("loading") : tC("showMore")}
                                </Button>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="budget">
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        <Input
                            value={fiscalYear}
                            onChange={(e) => setFiscalYear(e.target.value)}
                            placeholder={tB("fiscalYear")}
                            style={{ width: "140px" }}
                            inputMode="numeric"
                        />
                        {canManageBudget && (
                            <Button onClick={() => setAllocOpen(true)}>
                                {tB("newAllocation")}
                            </Button>
                        )}
                    </div>
                    <div
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                        style={{ marginBottom: "12px" }}
                    >
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {tB("allocated")}
                                </p>
                                <p
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "var(--color-text)",
                                        margin: 0,
                                    }}
                                >
                                    {formatMoney(overview?.totalAllocated ?? 0, locale)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {tB("spent")}
                                </p>
                                <p
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "var(--color-destructive)",
                                        margin: 0,
                                    }}
                                >
                                    {formatMoney(overview?.totalSpent ?? 0, locale)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {tB("remaining")}
                                </p>
                                <p
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "var(--color-success)",
                                        margin: 0,
                                    }}
                                >
                                    {formatMoney(overview?.totalRemaining ?? 0, locale)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                    {budgetRows.length > 0 && (
                        <Card style={{ marginBottom: "12px" }}>
                            <CardContent style={{ padding: "20px" }}>
                                <div style={{ height: "240px" }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={budgetRows}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="allocated"
                                                name={tB("allocated")}
                                                fill="var(--color-primary)"
                                            />
                                            <Bar
                                                dataKey="spent"
                                                name={tB("spent")}
                                                fill="var(--color-warning)"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {allocLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : allocations.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {tB("noAllocations")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {allocations.map((a) => {
                                const remaining = a.amountCents - a.spentCents;
                                const pct =
                                    a.amountCents > 0
                                        ? Math.min(100, (a.spentCents / a.amountCents) * 100)
                                        : 0;
                                return (
                                    <Card key={a.id}>
                                        <CardContent style={{ padding: "16px 20px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <div>
                                                    <p
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text)",
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {a.category}
                                                    </p>
                                                    <p
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "var(--color-text-secondary)",
                                                            margin: "2px 0 0",
                                                        }}
                                                    >
                                                        {tB("allocated")}:{" "}
                                                        {formatMoney(a.amountCents, locale)}
                                                        {` · ${tB("spent")}: ${formatMoney(a.spentCents, locale)}`}
                                                        {` · ${tB("remaining")}: ${formatMoney(remaining, locale)}`}
                                                    </p>
                                                    {a.description && (
                                                        <p
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text-secondary)",
                                                                margin: "2px 0 0",
                                                            }}
                                                        >
                                                            {a.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant={
                                                        remaining < 0 ? "destructive" : "outline"
                                                    }
                                                >
                                                    {remaining < 0
                                                        ? tB("overspend")
                                                        : budgetStatusLabel(a.status)}
                                                </Badge>
                                            </div>
                                            <div
                                                style={{
                                                    height: "6px",
                                                    borderRadius: "5px",
                                                    backgroundColor: "var(--color-bg-secondary)",
                                                    marginTop: "10px",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${pct}%`,
                                                        height: "100%",
                                                        backgroundColor:
                                                            remaining < 0
                                                                ? "var(--color-destructive)"
                                                                : "var(--color-primary)",
                                                    }}
                                                />
                                            </div>
                                            {canManageBudget && (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                        marginTop: "12px",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => approveAlloc.mutate(a.id)}
                                                    >
                                                        {tB("approve")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSpendTarget(a);
                                                            setSpendAmount("");
                                                            setSpendDescription("");
                                                        }}
                                                    >
                                                        {tB("spend")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => reconcileAlloc.mutate(a.id)}
                                                    >
                                                        {tB("reconcile")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setBudgetDelete(a)}
                                                    >
                                                        {tC("delete")}
                                                    </Button>
                                                    {user?.role === "admin" && (
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => setBudgetPermanent(a)}
                                                        >
                                                            {tC("deleteForever")}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            {allocNext && (
                                <Button
                                    variant="outline"
                                    onClick={loadMoreAlloc}
                                    disabled={allocMoreLoading}
                                >
                                    {allocMoreLoading ? tC("loading") : tC("showMore")}
                                </Button>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="requests">
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        <Select value={prStatus} onValueChange={setPrStatus}>
                            <SelectTrigger style={{ width: "180px" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{tC("all")}</SelectItem>
                                {PR_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {prStatusLabel(s)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setPrOpen(true)}>{tP("submit")}</Button>
                    </div>
                    {prLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : purchaseRequests.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {tP("noRequests")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {purchaseRequests.map((pr) => (
                                <Card key={pr.id}>
                                    <CardContent style={{ padding: "16px 20px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                gap: "12px",
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <p
                                                    style={{
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: "var(--color-text)",
                                                        margin: 0,
                                                    }}
                                                >
                                                    {pr.title}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: "2px 0 0",
                                                    }}
                                                >
                                                    {tP("itemName")}: {pr.itemName}
                                                    {` · ${tP("cost")}: ${formatMoney(pr.costCents, locale)}`}
                                                    {` · ${tP("quantity")}: ${pr.quantity}`}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text)",
                                                        margin: "6px 0 0",
                                                    }}
                                                >
                                                    {pr.justification}
                                                </p>
                                                {pr.reviewComment && (
                                                    <p
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "var(--color-text-secondary)",
                                                            margin: "4px 0 0",
                                                        }}
                                                    >
                                                        {tP("reviewComment")}: {pr.reviewComment}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="outline">
                                                {prStatusLabel(pr.status)}
                                            </Badge>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                marginTop: "12px",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            {canReviewPurchases &&
                                                (pr.status === "submitted" ||
                                                    pr.status === "under_review") && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setReviewTarget(pr);
                                                            setReviewStatus("approved");
                                                            setReviewComment("");
                                                        }}
                                                    >
                                                        {tP("review")}
                                                    </Button>
                                                )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setPrDelete(pr)}
                                            >
                                                {tC("delete")}
                                            </Button>
                                            {user?.role === "admin" && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setPrPermanent(pr)}
                                                >
                                                    {tC("deleteForever")}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {prNext && (
                                <Button
                                    variant="outline"
                                    onClick={loadMorePr}
                                    disabled={prMoreLoading}
                                >
                                    {prMoreLoading ? tC("loading") : tC("showMore")}
                                </Button>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={txOpen} onOpenChange={setTxOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tF("newTransaction")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tF("amount")}
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value)}
                            inputMode="decimal"
                        />
                        <Select value={txType} onValueChange={setTxType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="income">{tF("income")}</SelectItem>
                                <SelectItem value="expense">{tF("expense")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder={tF("category")}
                            value={txCategory}
                            onChange={(e) => setTxCategory(e.target.value)}
                        />
                        <Textarea
                            placeholder={tF("summary")}
                            value={txDescription}
                            onChange={(e) => setTxDescription(e.target.value)}
                            rows={2}
                        />
                        <Input
                            type="date"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTxOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreateTx} disabled={createTx.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={allocOpen} onOpenChange={setAllocOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tB("newAllocation")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tF("category")}
                            value={allocCategory}
                            onChange={(e) => setAllocCategory(e.target.value)}
                        />
                        <Input
                            placeholder={tF("amount")}
                            value={allocAmount}
                            onChange={(e) => setAllocAmount(e.target.value)}
                            inputMode="decimal"
                        />
                        <Textarea
                            placeholder={tC("description")}
                            value={allocDescription}
                            onChange={(e) => setAllocDescription(e.target.value)}
                            rows={2}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAllocOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreateAlloc}
                            disabled={!allocCategory.trim() || createAlloc.isPending}
                        >
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={spendTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setSpendTarget(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tB("recordSpend")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tF("amount")}
                            value={spendAmount}
                            onChange={(e) => setSpendAmount(e.target.value)}
                            inputMode="decimal"
                        />
                        <Textarea
                            placeholder={tC("description")}
                            value={spendDescription}
                            onChange={(e) => setSpendDescription(e.target.value)}
                            rows={2}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSpendTarget(null)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleSpend} disabled={recordSpend.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={prOpen} onOpenChange={setPrOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tP("title")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tC("title")}
                            value={prTitle}
                            onChange={(e) => setPrTitle(e.target.value)}
                        />
                        <Input
                            placeholder={tP("itemName")}
                            value={prItem}
                            onChange={(e) => setPrItem(e.target.value)}
                        />
                        <Input
                            placeholder={tP("cost")}
                            value={prCost}
                            onChange={(e) => setPrCost(e.target.value)}
                            inputMode="decimal"
                        />
                        <Input
                            placeholder={tP("quantity")}
                            value={prQuantity}
                            onChange={(e) => setPrQuantity(e.target.value)}
                            inputMode="numeric"
                        />
                        <Textarea
                            placeholder={tP("justification")}
                            value={prJustification}
                            onChange={(e) => setPrJustification(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreatePr}
                            disabled={
                                !prTitle.trim() ||
                                !prItem.trim() ||
                                !prJustification.trim() ||
                                createPr.isPending
                            }
                        >
                            {tP("submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={reviewTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setReviewTarget(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tP("review")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Select value={reviewStatus} onValueChange={setReviewStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="approved">{tP("approve")}</SelectItem>
                                <SelectItem value="rejected">{tP("reject")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder={tP("reviewComment")}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewTarget(null)}>
                            {tC("cancel")}
                        </Button>
                        <Button
                            onClick={() => {
                                if (reviewTarget) {
                                    reviewPr.mutate({
                                        id: reviewTarget.id,
                                        status: reviewStatus,
                                        reviewComment: reviewComment.trim() || null,
                                    });
                                }
                            }}
                            disabled={reviewPr.isPending}
                        >
                            {tC("submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={txDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setTxDelete(null);
                }}
                title={tC("delete")}
                description={tF("deleteConfirm")}
                confirmLabel={tC("delete")}
                destructive
                onConfirm={() => {
                    if (txDelete) deleteTx.mutate(txDelete.id);
                }}
            />
            <ConfirmDialog
                open={budgetDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setBudgetDelete(null);
                }}
                title={tC("delete")}
                description={tB("deleteConfirm")}
                confirmLabel={tC("delete")}
                destructive
                onConfirm={() => {
                    if (budgetDelete) deleteAlloc.mutate({ id: budgetDelete.id, permanent: false });
                }}
            />
            <ConfirmDialog
                open={budgetPermanent !== null}
                onOpenChange={(open) => {
                    if (!open) setBudgetPermanent(null);
                }}
                title={tC("deleteForever")}
                description={budgetPermanent?.category}
                confirmLabel={tC("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={budgetPermanent?.category ?? tC("deleteForever")}
                onConfirm={() => {
                    if (budgetPermanent)
                        deleteAlloc.mutate({ id: budgetPermanent.id, permanent: true });
                }}
            />
            <ConfirmDialog
                open={prDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setPrDelete(null);
                }}
                title={tC("delete")}
                description={prDelete ? `${tP("title")}: ${prDelete.title}` : undefined}
                confirmLabel={tC("delete")}
                destructive
                onConfirm={() => {
                    if (prDelete) deletePr.mutate({ id: prDelete.id, permanent: false });
                }}
            />
            <ConfirmDialog
                open={prPermanent !== null}
                onOpenChange={(open) => {
                    if (!open) setPrPermanent(null);
                }}
                title={tC("deleteForever")}
                description={prPermanent ? `${tP("title")}: ${prPermanent.title}` : undefined}
                confirmLabel={tC("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={prPermanent?.title ?? tC("deleteForever")}
                onConfirm={() => {
                    if (prPermanent) deletePr.mutate({ id: prPermanent.id, permanent: true });
                }}
            />
        </div>
    );
}
