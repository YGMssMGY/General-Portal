"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

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

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  return `¥${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function FinancePage() {
  const portal = getPortal();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: summary, isLoading: summaryLoading } = useQuery<FinanceSummary>({
    queryKey: [portal, "finance", "summary"],
    queryFn: () => fetchJson<FinanceSummary>(`/api/finance/summary`),
  });

  const { data: transactionsData, isLoading: txLoading, isError } = useQuery<Transaction[]>({
    queryKey: [portal, "finance", "transactions"],
    queryFn: () => fetchJson<Transaction[]>(`/api/finance/transactions`),
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      amount: number;
      type: "income" | "expense";
      category: string;
      description: string;
    }) =>
      fetchJson<Transaction>(`/api/finance/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "finance"] });
      setShowCreate(false);
      setNewAmount("");
      setNewType("expense");
      setNewCategory("");
      setNewDescription("");
    },
  });

  const isLoading = summaryLoading || txLoading;

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

  if (isError) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
          Failed to load financial data.
        </p>
      </div>
    );
  }

  const transactions = transactionsData ?? [];
  const filteredTx =
    typeFilter === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === typeFilter);

  const s = summary ?? { totalIncome: 0, totalExpense: 0, balance: 0 };

  function handleCreate() {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;
    createMutation.mutate({
      amount,
      type: newType,
      category: newCategory,
      description: newDescription.trim(),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Finance</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Track income and expenses
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>Add Transaction</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          )}

          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredTx.length === 0 ? null : (
              filteredTx.map((tx) => (
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
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
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
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !newAmount ||
                parseFloat(newAmount) <= 0 ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
