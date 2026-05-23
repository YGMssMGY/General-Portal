"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Plus, DollarSign, CheckCircle, Receipt, RotateCcw, X } from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface Allocation {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  fiscalYear: string;
  description: string;
  status: "pending" | "approved" | "spent" | "reconciled";
}

interface BudgetOverview {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-text)",
  marginBottom: "4px",
  display: "block",
};

const btnBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: "36px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "background-color 100ms ease",
};

const statusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: "var(--color-warning)", bg: "#fff8e1" },
  approved: { color: "var(--color-primary)", bg: "var(--color-primary-light)" },
  spent: { color: "var(--color-success)", bg: "#e8f5e9" },
  reconciled: { color: "var(--color-text-secondary)", bg: "var(--color-bg-secondary)" },
};

export default function BudgetPage() {
  const portal = getPortal();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "", allocated: 0, fiscalYear: "", description: "" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [spendForm, setSpendForm] = useState({ amount: 0, description: "" });

  const { data: allocations, isLoading } = useQuery<Allocation[]>({
    queryKey: [portal, "budget"],
    queryFn: () => fetchJson(`/api/budget`),
  });

  const overviewQuery = useQuery<BudgetOverview>({
    queryKey: [portal, "budget", "overview"],
    queryFn: () => fetchJson(`/api/budget/overview`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetchJson(`/api/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "budget"] });
      qc.invalidateQueries({ queryKey: [portal, "budget", "overview"] });
      setShowForm(false);
      setForm({ category: "", allocated: 0, fiscalYear: "", description: "" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/budget/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "budget"] });
    },
  });

  const spendMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount: number; description: string }) =>
      fetchJson(`/api/budget/${id}/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "budget"] });
      qc.invalidateQueries({ queryKey: [portal, "budget", "overview"] });
      setSpendForm({ amount: 0, description: "" });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/budget/${id}/reconcile`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "budget"] });
    },
  });

  if (isLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  const list = allocations ?? [];
  const overview = overviewQuery.data;

  const detail = detailId ? list.find((a) => a.id === detailId) : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
          Budget
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{ ...btnBase, backgroundColor: "var(--color-primary)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary)")}
        >
          <Plus size={16} /> New Allocation
        </button>
      </div>

      {overview && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div style={statCardStyle}>
            <DollarSign size={18} color="var(--color-primary)" />
            <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)" }}>
              ${overview.totalAllocated.toLocaleString()}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Total Allocated</span>
          </div>
          <div style={statCardStyle}>
            <Receipt size={18} color="var(--color-destructive)" />
            <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)" }}>
              ${overview.totalSpent.toLocaleString()}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Total Spent</span>
          </div>
          <div style={statCardStyle}>
            <DollarSign size={18} color="var(--color-success)" />
            <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)" }}>
              ${overview.totalRemaining.toLocaleString()}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Total Remaining</span>
          </div>
        </div>
      )}

      {showForm && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "16px",
            marginBottom: "20px",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "var(--color-text)" }}>
            New Allocation
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <input
                style={inputStyle}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Amount ($)</label>
              <input
                type="number"
                min={0}
                style={inputStyle}
                value={form.allocated || ""}
                onChange={(e) => setForm({ ...form, allocated: Math.max(0, parseFloat(e.target.value) || 0) })}
              />
            </div>
            <div>
              <label style={labelStyle}>Fiscal Year</label>
              <input
                style={inputStyle}
                placeholder="e.g. 2025-2026"
                value={form.fiscalYear}
                onChange={(e) => setForm({ ...form, fiscalYear: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.category || !form.allocated || createMutation.isPending}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--color-primary)",
                  color: "#fff",
                  opacity: !form.category || !form.allocated || createMutation.isPending ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!createMutation.isPending) e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-primary)"; }}
              >
                {createMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ ...btnBase, backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <DollarSign size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No budget allocations yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {list.map((a) => {
            const pct = a.allocated > 0 ? (a.spent / a.allocated) * 100 : 0;
            const sc = statusColors[a.status] ?? statusColors.pending;
            return (
              <div
                key={a.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                  backgroundColor: "var(--color-bg)",
                  cursor: "pointer",
                }}
                onClick={() => setDetailId(a.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px", color: "var(--color-text)" }}>
                      {a.category}
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
                      FY {a.fiscalYear}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: sc.color,
                      backgroundColor: sc.bg,
                      textTransform: "capitalize",
                    }}
                  >
                    {a.status}
                  </span>
                </div>
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color: "var(--color-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    <span>${a.spent.toLocaleString()} spent of ${a.allocated.toLocaleString()}</span>
                    <span style={{ fontWeight: 600, color: a.remaining < 0 ? "var(--color-destructive)" : "var(--color-text)" }}>
                      ${a.remaining.toLocaleString()} remaining
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: "var(--color-bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        height: "100%",
                        backgroundColor: pct > 90 ? "var(--color-destructive)" : "var(--color-primary)",
                        borderRadius: "var(--radius-sm)",
                        transition: "width 200ms ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setDetailId(null); setSpendForm({ amount: 0, description: "" }); } }}
        >
          <div
            style={{
              backgroundColor: "var(--color-bg)",
              borderRadius: "var(--radius-sm)",
              padding: "24px",
              width: "90%",
              maxWidth: "480px",
              border: "1px solid var(--color-border)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {detail.category}
              </h3>
              <button
                type="button"
                onClick={() => { setDetailId(null); setSpendForm({ amount: 0, description: "" }); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <strong>Fiscal Year:</strong> {detail.fiscalYear}
              </div>
              {detail.description && (
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                  <strong>Description:</strong> {detail.description}
                </div>
              )}
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <strong>Allocated:</strong> ${detail.allocated.toLocaleString()}
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <strong>Spent:</strong> ${detail.spent.toLocaleString()}
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <strong>Remaining:</strong> ${detail.remaining.toLocaleString()}
              </div>
              <div>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: statusColors[detail.status]?.color ?? "var(--color-text-secondary)",
                    backgroundColor: statusColors[detail.status]?.bg ?? "var(--color-bg-secondary)",
                    textTransform: "capitalize",
                  }}
                >
                  {detail.status}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {detail.status === "pending" && (
                <button
                  type="button"
                  onClick={() => approveMutation.mutate(detail.id)}
                  disabled={approveMutation.isPending}
                  style={{
                    ...btnBase,
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                    opacity: approveMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <CheckCircle size={16} /> Approve
                </button>
              )}

              {(detail.status === "approved" || detail.status === "spent") && (
                <div
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px",
                    backgroundColor: "var(--color-bg-secondary)",
                  }}
                >
                  <h4 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-text)" }}>
                    Record Spend
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="number"
                      min={0}
                      style={inputStyle}
                      placeholder="Amount"
                      value={spendForm.amount || ""}
                      onChange={(e) => setSpendForm({ ...spendForm, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Description"
                      value={spendForm.description}
                      onChange={(e) => setSpendForm({ ...spendForm, description: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        spendMutation.mutate({ id: detail.id, amount: spendForm.amount, description: spendForm.description })
                      }
                      disabled={!spendForm.amount || spendMutation.isPending}
                      style={{
                        ...btnBase,
                        backgroundColor: "var(--color-destructive)",
                        color: "#fff",
                        opacity: !spendForm.amount || spendMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      <Receipt size={14} /> Record Spend
                    </button>
                  </div>
                </div>
              )}

              {detail.status === "spent" && (
                <button
                  type="button"
                  onClick={() => reconcileMutation.mutate(detail.id)}
                  disabled={reconcileMutation.isPending}
                  style={{
                    ...btnBase,
                    backgroundColor: "transparent",
                    color: "var(--color-success)",
                    border: "1px solid var(--color-success)",
                    opacity: reconcileMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <RotateCcw size={16} /> Reconcile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  backgroundColor: "var(--color-bg)",
};
