"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  RotateCcw,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  date: string;
  createdBy: { id: string; name: string | null } | null;
  createdAt: string;
}

interface BudgetAllocation {
  id: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  status: "pending" | "active" | "spent" | "reconciled";
  fiscalYear: string;
  description: string | null;
  createdBy: { id: string; name: string | null } | null;
  createdAt: string;
}

interface BudgetOverview {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
}

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  return `\u00A5${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const categories = [
  "Dues",
  "Events",
  "Merchandise",
  "Food & Drinks",
  "Supplies",
  "Equipment",
  "Travel",
  "Donations",
  "Fees",
  "Other",
];

const budgetCategories = [
  "Dues",
  "Events",
  "Merchandise",
  "Food & Drinks",
  "Supplies",
  "Equipment",
  "Travel",
  "Donations",
  "Fees",
  "Operating",
  "Marketing",
  "Other",
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "var(--color-warning)", bg: "rgba(245,158,11,0.1)" },
  active: { label: "Active", color: "var(--color-info)", bg: "rgba(59,130,246,0.1)" },
  spent: { label: "Spent", color: "var(--color-text-secondary)", bg: "rgba(107,114,128,0.1)" },
  reconciled: { label: "Reconciled", color: "var(--color-success)", bg: "rgba(16,185,129,0.1)" },
};

export default function FinancePage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Finance | ${portalName}`);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session.user.role === "admin";

  // Transaction state
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateTx, setShowCreateTx] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Budget state
  const [showCreateAlloc, setShowCreateAlloc] = useState(false);
  const [selectedAlloc, setSelectedAlloc] = useState<BudgetAllocation | null>(null);
  const [allocCategory, setAllocCategory] = useState("");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocFiscalYear, setAllocFiscalYear] = useState(new Date().getFullYear().toString());
  const [allocDescription, setAllocDescription] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendDescription, setSpendDescription] = useState("");

  // Finance queries
  const { data: summary, isLoading: summaryLoading } = useQuery<FinanceSummary>({
    queryKey: [portal, "finance", "summary"],
    queryFn: () => fetchJson<FinanceSummary>("/api/finance/summary"),
  });

  const { data: transactionsData, isLoading: txLoading, isError: txError } = useQuery<Transaction[]>({
    queryKey: [portal, "finance", "transactions"],
    queryFn: () => fetchJson<Transaction[]>("/api/finance/transactions"),
  });

  // Budget queries
  const { data: budgetOverview, isLoading: budgetOverviewLoading } = useQuery<BudgetOverview>({
    queryKey: [portal, "budget", "overview"],
    queryFn: () => fetchJson<BudgetOverview>("/api/budget/overview"),
  });

  const { data: allocationsData, isLoading: allocLoading } = useQuery<BudgetAllocation[]>({
    queryKey: [portal, "budget", "allocations"],
    queryFn: () => fetchJson<BudgetAllocation[]>("/api/budget"),
  });

  // Finance mutations
  const createTxMutation = useMutation({
    mutationFn: (body: {
      amount: number;
      type: "income" | "expense";
      category: string;
      description: string;
    }) =>
      fetchJson<Transaction>("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "finance"] });
      setShowCreateTx(false);
      setNewAmount("");
      setNewType("expense");
      setNewCategory("");
      setNewDescription("");
    },
  });

  // Budget mutations
  const createAllocMutation = useMutation({
    mutationFn: (body: {
      category: string;
      amount: number;
      fiscalYear: string;
      description: string;
    }) =>
      fetchJson<BudgetAllocation>("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
      setShowCreateAlloc(false);
      setAllocCategory("");
      setAllocAmount("");
      setAllocFiscalYear(new Date().getFullYear().toString());
      setAllocDescription("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson<void>(`/api/budget/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
      setSelectedAlloc(null);
    },
  });

  const spendMutation = useMutation({
    mutationFn: ({ id, amount, description }: { id: string; amount: number; description: string }) =>
      fetchJson<void>(`/api/budget/${id}/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
      setSelectedAlloc(null);
      setSpendAmount("");
      setSpendDescription("");
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson<void>(`/api/budget/${id}/reconcile`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "budget"] });
      setSelectedAlloc(null);
    },
  });

  const isLoading = summaryLoading || txLoading;
  const isBudgetLoading = budgetOverviewLoading || allocLoading;

  // Purchase request state and mutations
  const [showCreatePr, setShowCreatePr] = useState(false);
  const [prForm, setPrForm] = useState({ title: "", itemName: "", cost: "", quantity: 1, justification: "" });
  const [prExpanded, setPrExpanded] = useState<string | null>(null);
  const [prReview, setPrReview] = useState<{ id: string; status: string; comment: string } | null>(null);

  const { data: prData, isLoading: prLoading } = useQuery<Record<string, unknown>[]>({
    queryKey: [portal, "purchase-requests"],
    queryFn: () => fetchJson("/api/purchase-requests"),
  });

  const createPr = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetchJson("/api/purchase-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] }); setShowCreatePr(false); setPrForm({ title: "", itemName: "", cost: "", quantity: 1, justification: "" }); },
  });

  const reviewPr = useMutation({
    mutationFn: ({ id, status, reviewComment }: { id: string; status: string; reviewComment?: string }) => fetchJson(`/api/purchase-requests/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reviewComment }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] }); setPrReview(null); },
  });

  // --- Loading state ---
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Finance</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Track income and expenses
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent style={{ padding: "20px" }}>
                <Skeleton style={{ width: "80px", height: "14px", borderRadius: "5px", marginBottom: "8px" }} />
                <Skeleton style={{ width: "120px", height: "28px", borderRadius: "5px" }} />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <Skeleton style={{ width: "100px", height: "16px", borderRadius: "5px", marginBottom: "16px" }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <Skeleton style={{ width: "140px", height: "14px", borderRadius: "5px", marginBottom: "4px" }} />
                  <Skeleton style={{ width: "80px", height: "12px", borderRadius: "5px" }} />
                </div>
                <Skeleton style={{ width: "80px", height: "16px", borderRadius: "5px" }} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (txError) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
          Failed to load financial data.
        </p>
      </div>
    );
  }

  // --- Derived data ---
  const transactions = transactionsData ?? [];
  const filteredTx =
    typeFilter === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === typeFilter);

  const s = summary ?? { totalIncome: 0, totalExpense: 0, balance: 0 };
  const bo = budgetOverview ?? { totalAllocated: 0, totalSpent: 0, totalRemaining: 0 };
  const allocations = allocationsData ?? [];

  // --- Handlers ---
  function handleCreateTx() {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;
    createTxMutation.mutate({
      amount,
      type: newType,
      category: newCategory,
      description: newDescription.trim(),
    });
  }

  function handleCreateAlloc() {
    const amount = parseFloat(allocAmount);
    if (isNaN(amount) || amount <= 0) return;
    createAllocMutation.mutate({
      category: allocCategory,
      amount,
      fiscalYear: allocFiscalYear,
      description: allocDescription.trim(),
    });
  }

  function handleSpend() {
    if (!selectedAlloc) return;
    const amount = parseFloat(spendAmount);
    if (isNaN(amount) || amount <= 0) return;
    spendMutation.mutate({
      id: selectedAlloc.id,
      amount,
      description: spendDescription.trim(),
    });
  }

  const prStatusStyles: Record<string, { color: string; bg: string }> = {
    submitted: { color: "var(--color-primary)", bg: "var(--color-primary-light)" },
    under_review: { color: "var(--color-warning)", bg: "#fff8e1" },
    approved: { color: "var(--color-success)", bg: "#e8f5e9" },
    rejected: { color: "var(--color-destructive)", bg: "#fff5f5" },
    fulfilled: { color: "var(--color-text-secondary)", bg: "var(--color-bg-secondary)" },
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid var(--color-border)", borderRadius: "5px",
    backgroundColor: "var(--color-bg)", color: "var(--color-text)", fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ===== SECTION 1: FINANCE OVERVIEW ===== */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
            Track income and expenses
          </p>
          <Button onClick={() => setShowCreateTx(true)}>
            <Plus size={16} />
            <span>Add Transaction</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: "16px" }}>
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <TrendingUp size={18} style={{ color: "var(--color-success)" }} />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Total Income
                </span>
              </div>
              <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-success)", margin: 0 }}>
                {formatCurrency(s.totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <TrendingDown size={18} style={{ color: "var(--color-destructive)" }} />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Total Expenses
                </span>
              </div>
              <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-destructive)", margin: 0 }}>
                {formatCurrency(s.totalExpense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Wallet size={18} style={{ color: s.balance >= 0 ? "var(--color-success)" : "var(--color-destructive)" }} />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Balance
                </span>
              </div>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: s.balance >= 0 ? "var(--color-text)" : "var(--color-destructive)",
                  margin: 0,
                }}
              >
                {formatCurrency(s.balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => setTypeFilter(v)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={typeFilter}>
            {filteredTx.length === 0 ? (
              <Card>
                <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                  <DollarSign size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                    No transactions
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                    {typeFilter === "all"
                      ? "Add your first transaction."
                      : `No ${typeFilter} transactions recorded.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="hidden md:block">
                  <Card>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 2fr 1fr 1fr auto",
                        gap: "12px",
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--color-border)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                      }}
                    >
                      <span>Date</span>
                      <span>Description</span>
                      <span>Category</span>
                      <span>Type</span>
                      <span>Amount</span>
                    </div>
                    {filteredTx.map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 2fr 1fr 1fr auto",
                          gap: "12px",
                          padding: "14px 20px",
                          borderBottom: "1px solid var(--color-border)",
                          alignItems: "center",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {format(new Date(tx.date), "MMM d, yyyy")}
                        </span>
                        <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                          {tx.description || "No description"}
                        </span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {tx.category ?? "-"}
                        </span>
                        <div>
                          <Badge
                            variant="outline"
                            style={{
                              color: tx.type === "income" ? "var(--color-success)" : "var(--color-destructive)",
                              borderColor: tx.type === "income" ? "var(--color-success)" : "var(--color-destructive)",
                            }}
                          >
                            {tx.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </div>
                        <span
                          style={{
                            fontWeight: 600,
                            color: tx.type === "income" ? "var(--color-success)" : "var(--color-destructive)",
                            textAlign: "right",
                          }}
                        >
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </Card>
                </div>

                <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredTx.map((tx) => (
                    <Card key={tx.id}>
                      <CardContent style={{ padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                              {tx.description || "No description"}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                {format(new Date(tx.date), "MMM d, yyyy")}
                              </span>
                              {tx.category && (
                                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                  {tx.category}
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                style={{
                                  color: tx.type === "income" ? "var(--color-success)" : "var(--color-destructive)",
                                  borderColor: tx.type === "income" ? "var(--color-success)" : "var(--color-destructive)",
                                  fontSize: "10px",
                                }}
                              >
                                {tx.type === "income" ? "Income" : "Expense"}
                              </Badge>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "16px",
                              fontWeight: 700,
                              color: tx.type === "income" ? "var(--color-success)" : "var(--color-destructive)",
                              flexShrink: 0,
                            }}
                          >
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== SECTION 2: BUDGET ALLOCATIONS ===== */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Budget Allocations</h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Manage budget allocations and track spending
            </p>
          </div>
          <Button onClick={() => setShowCreateAlloc(true)}>
            <Plus size={16} />
            <span>New Allocation</span>
          </Button>
        </div>

        {/* Budget overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: "16px" }}>
          <Card>
            <CardContent style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Wallet size={16} style={{ color: "var(--color-text-secondary)" }} />
                <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Total Allocated
                </span>
              </div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                {isBudgetLoading ? (
                  <Skeleton style={{ width: "100px", height: "26px", borderRadius: "5px" }} />
                ) : (
                  formatCurrency(bo.totalAllocated)
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Receipt size={16} style={{ color: "var(--color-destructive)" }} />
                <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Total Spent
                </span>
              </div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-destructive)", margin: 0 }}>
                {isBudgetLoading ? (
                  <Skeleton style={{ width: "100px", height: "26px", borderRadius: "5px" }} />
                ) : (
                  formatCurrency(bo.totalSpent)
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <CheckCircle size={16} style={{ color: "var(--color-success)" }} />
                <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  Total Remaining
                </span>
              </div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-success)", margin: 0 }}>
                {isBudgetLoading ? (
                  <Skeleton style={{ width: "100px", height: "26px", borderRadius: "5px" }} />
                ) : (
                  formatCurrency(bo.totalRemaining)
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Allocations list */}
        {isBudgetLoading ? (
          <Card>
            <CardContent style={{ padding: "20px" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ marginBottom: i < 2 ? "16px" : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <Skeleton style={{ width: "120px", height: "14px", borderRadius: "5px" }} />
                    <Skeleton style={{ width: "60px", height: "14px", borderRadius: "5px" }} />
                  </div>
                  <Skeleton style={{ width: "100%", height: "8px", borderRadius: "4px", marginBottom: "4px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Skeleton style={{ width: "80px", height: "12px", borderRadius: "5px" }} />
                    <Skeleton style={{ width: "60px", height: "12px", borderRadius: "5px" }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : allocations.length === 0 ? (
          <Card>
            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
              <Wallet size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                No budget allocations
              </p>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                Create your first budget allocation to start tracking.
              </p>
              <Button variant="outline" onClick={() => setShowCreateAlloc(true)}>
                <Plus size={14} />
                <span>Create Allocation</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {allocations.map((alloc) => {
              const pct = alloc.amount > 0 ? Math.min((alloc.spent / alloc.amount) * 100, 100) : 0;
              const sc = statusConfig[alloc.status] ?? statusConfig.pending;
              return (
                <Card
                  key={alloc.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedAlloc(alloc)}
                >
                  <CardContent style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>
                            {alloc.category}
                          </span>
                          <Badge
                            style={{
                              backgroundColor: sc.bg,
                              color: sc.color,
                              border: "none",
                              fontSize: "10px",
                              padding: "2px 8px",
                            }}
                          >
                            {sc.label}
                          </Badge>
                        </div>
                        {alloc.description && (
                          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                            {alloc.description}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", flexShrink: 0, marginLeft: "12px" }}>
                        {formatCurrency(alloc.amount)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: "6px", backgroundColor: "var(--color-bg-secondary)", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          backgroundColor: alloc.status === "reconciled" ? "var(--color-success)" : alloc.status === "spent" ? "var(--color-text-secondary)" : "var(--color-info)",
                          borderRadius: "3px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                      <span>{formatCurrency(alloc.spent)} spent</span>
                      <span>{formatCurrency(alloc.remaining)} remaining</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== CREATE TRANSACTION DIALOG ===== */}
      <Dialog open={showCreateTx} onOpenChange={setShowCreateTx}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record a new income or expense entry.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Amount
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Type
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  padding: "4px",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "5px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setNewType("expense")}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "5px",
                    backgroundColor: newType === "expense" ? "var(--color-bg)" : "transparent",
                    color: newType === "expense" ? "var(--color-destructive)" : "var(--color-text-secondary)",
                    fontWeight: 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ArrowDownRight size={14} />
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("income")}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "5px",
                    backgroundColor: newType === "income" ? "var(--color-bg)" : "transparent",
                    color: newType === "income" ? "var(--color-success)" : "var(--color-text-secondary)",
                    fontWeight: 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ArrowUpRight size={14} />
                  Income
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Category
              </label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Description
              </label>
              <Textarea
                placeholder="Enter description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTx(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTx}
              disabled={!newAmount || parseFloat(newAmount) <= 0 || createTxMutation.isPending}
            >
              {createTxMutation.isPending ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE ALLOCATION DIALOG ===== */}
      <Dialog open={showCreateAlloc} onOpenChange={setShowCreateAlloc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Budget Allocation</DialogTitle>
            <DialogDescription>
              Create a budget allocation for a specific category.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Category
              </label>
              <Select value={allocCategory} onValueChange={setAllocCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {budgetCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Amount (¥)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={allocAmount}
                onChange={(e) => setAllocAmount(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Fiscal Year
              </label>
              <Select value={allocFiscalYear} onValueChange={setAllocFiscalYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString()).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Description
              </label>
              <Textarea
                placeholder="Enter description"
                value={allocDescription}
                onChange={(e) => setAllocDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAlloc(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlloc}
              disabled={!allocCategory || !allocAmount || parseFloat(allocAmount) <= 0 || createAllocMutation.isPending}
            >
              {createAllocMutation.isPending ? "Creating..." : "Create Allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ALLOCATION DETAIL DIALOG ===== */}
      <Dialog open={!!selectedAlloc} onOpenChange={(open) => { if (!open) { setSelectedAlloc(null); setSpendAmount(""); setSpendDescription(""); } }}>
        {selectedAlloc && (
          <DialogContent style={{ maxWidth: "480px" }}>
            <DialogHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <DialogTitle>{selectedAlloc.category}</DialogTitle>
                <Badge
                  style={{
                    backgroundColor: statusConfig[selectedAlloc.status]?.bg ?? "transparent",
                    color: statusConfig[selectedAlloc.status]?.color ?? "var(--color-text-secondary)",
                    border: "none",
                    fontSize: "10px",
                    padding: "2px 8px",
                  }}
                >
                  {statusConfig[selectedAlloc.status]?.label ?? selectedAlloc.status}
                </Badge>
              </div>
              <DialogDescription>
                {selectedAlloc.description ?? "No description"} &middot; FY {selectedAlloc.fiscalYear}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4" style={{ marginTop: "8px" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 4px", textTransform: "uppercase" }}>
                  Allocated
                </p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
                  {formatCurrency(selectedAlloc.amount)}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 4px", textTransform: "uppercase" }}>
                  Spent
                </p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-destructive)", margin: 0 }}>
                  {formatCurrency(selectedAlloc.spent)}
                </p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 4px", textTransform: "uppercase" }}>
                  Remaining
                </p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-success)", margin: 0 }}>
                  {formatCurrency(selectedAlloc.remaining)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: "4px" }}>
              <div style={{ height: "8px", backgroundColor: "var(--color-bg-secondary)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${selectedAlloc.amount > 0 ? Math.min((selectedAlloc.spent / selectedAlloc.amount) * 100, 100) : 0}%`,
                    backgroundColor: selectedAlloc.status === "reconciled" ? "var(--color-success)" : selectedAlloc.status === "spent" ? "var(--color-text-secondary)" : "var(--color-info)",
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                  Admin Actions
                </p>

                {selectedAlloc.status === "pending" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      style={{ flex: 1 }}
                      onClick={() => approveMutation.mutate(selectedAlloc.id)}
                      disabled={approveMutation.isPending}
                    >
                      <RotateCcw size={14} />
                      <span>{approveMutation.isPending ? "Approving..." : "Approve"}</span>
                    </Button>
                  </div>
                )}

                {(selectedAlloc.status === "active" || selectedAlloc.status === "pending") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", backgroundColor: "var(--color-bg-secondary)", borderRadius: "5px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                      Record Spend
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Amount"
                        value={spendAmount}
                        onChange={(e) => setSpendAmount(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <Input
                      placeholder="Spend description"
                      value={spendDescription}
                      onChange={(e) => setSpendDescription(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleSpend}
                      disabled={!spendAmount || parseFloat(spendAmount) <= 0 || spendMutation.isPending}
                    >
                      <Receipt size={14} />
                      <span>{spendMutation.isPending ? "Recording..." : "Record Spend"}</span>
                    </Button>
                  </div>
                )}

                {selectedAlloc.status !== "reconciled" && (
                  <Button
                    variant="outline"
                    onClick={() => reconcileMutation.mutate(selectedAlloc.id)}
                    disabled={reconcileMutation.isPending}
                  >
                    <CheckCircle size={14} />
                    <span>{reconcileMutation.isPending ? "Reconciling..." : "Reconcile"}</span>
                  </Button>
                )}
              </div>
            )}

            <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "12px", textAlign: "center" }}>
              Created {format(new Date(selectedAlloc.createdAt), "MMM d, yyyy")}
              {selectedAlloc.createdBy ? ` by ${selectedAlloc.createdBy.name ?? "Unknown"}` : ""}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ===== SECTION 3: PURCHASE REQUESTS ===== */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Purchase Requests</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
            Submit and manage purchase requests
          </p>
          <Button onClick={() => setShowCreatePr(true)}><Plus size={16} /><span>New Request</span></Button>
        </div>

        {showCreatePr && (
          <div style={{ border: "1px solid var(--color-border)", borderRadius: "5px", padding: "16px", marginBottom: "16px", backgroundColor: "var(--color-bg-secondary)" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "var(--color-text)" }}>New Purchase Request</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input style={inputStyle} placeholder="Request title" value={prForm.title} onChange={(e) => setPrForm({ ...prForm, title: e.target.value })} />
              <input style={inputStyle} placeholder="Item name" value={prForm.itemName} onChange={(e) => setPrForm({ ...prForm, itemName: e.target.value })} />
              <div style={{ display: "flex", gap: "10px" }}>
                <input style={{ ...inputStyle, flex: 1 }} type="number" step="0.01" placeholder="Cost" value={prForm.cost} onChange={(e) => setPrForm({ ...prForm, cost: e.target.value })} />
                <input style={{ ...inputStyle, width: "100px" }} type="number" min="1" placeholder="Qty" value={prForm.quantity} onChange={(e) => setPrForm({ ...prForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
              </div>
              <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} placeholder="Justification" value={prForm.justification} onChange={(e) => setPrForm({ ...prForm, justification: e.target.value })} />
              <div style={{ display: "flex", gap: "8px" }}>
                <Button onClick={() => createPr.mutate({ title: prForm.title, itemName: prForm.itemName, cost: parseFloat(prForm.cost) || 0, quantity: prForm.quantity, justification: prForm.justification })} disabled={!prForm.title || !prForm.itemName || !prForm.cost || parseFloat(prForm.cost) <= 0 || createPr.isPending}>{createPr.isPending ? "Submitting..." : "Submit"}</Button>
                <Button variant="outline" onClick={() => setShowCreatePr(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {prLoading ? (
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>Loading...</p>
        ) : !prData || prData.length === 0 ? (
          <Card><CardContent style={{ padding: "40px 20px", textAlign: "center" }}><ShoppingCart size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} /><p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>No purchase requests</p><p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>Submit your first purchase request.</p></CardContent></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {prData.map((pr: Record<string, unknown>) => {
              const ps = prStatusStyles[(pr.status as string) ?? "submitted"] ?? prStatusStyles.submitted;
              const isExpanded = prExpanded === pr.id;
              return (
                <Card key={pr.id as string}>
                  <div onClick={() => setPrExpanded(isExpanded ? null : pr.id as string)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", cursor: "pointer", borderBottom: isExpanded ? "1px solid var(--color-border)" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)" }}>{pr.title as string}</span>
                        <span style={{ padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, color: ps.color, backgroundColor: ps.bg, textTransform: "capitalize" }}>{pr.status as string}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>{pr.itemName as string} &middot; ¥{Number(pr.cost || 0).toFixed(2)} x {String(pr.quantity || "1")}</p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: "16px" }}>
                      <p style={{ fontSize: "13px", color: "var(--color-text)", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{(pr.justification as string) || "No justification provided."}</p>
                      {(pr.reviewComment as string) && <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "0 0 8px", fontStyle: "italic" }}>Review: {pr.reviewComment as string}</p>}
                      {isAdmin && (pr.status as string) === "submitted" && (
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <input style={{ ...inputStyle, fontSize: "12px", padding: "6px 10px" }} placeholder="Review comment (optional)" value={prReview?.id === pr.id ? (prReview?.comment ?? "") : ""} onChange={(e) => setPrReview({ id: pr.id as string, status: (prReview?.status as string) || "", comment: e.target.value })} />
                          </div>
                          <button type="button" onClick={() => reviewPr.mutate({ id: pr.id as string, status: "approved", reviewComment: prReview?.id === pr.id ? (prReview?.comment ?? "") : "" })} style={{ padding: "8px 14px", border: "none", borderRadius: "5px", background: "var(--color-success)", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit" }}>Approve</button>
                          <button type="button" onClick={() => reviewPr.mutate({ id: pr.id as string, status: "rejected", reviewComment: prReview?.id === pr.id ? (prReview?.comment ?? "") : "" })} style={{ padding: "8px 14px", border: "none", borderRadius: "5px", background: "var(--color-destructive)", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "inherit" }}>Reject</button>
                        </div>
                      )}
                      <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "12px" }}>
                        Submitted by {(pr.submittedBy as Record<string, unknown>)?.name as string ?? "Unknown"} &middot; {new Date(pr.createdAt as string).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
