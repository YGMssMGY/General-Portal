"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface PurchaseRequest {
  id: string;
  title: string;
  itemName: string;
  cost: number;
  quantity: number;
  justification: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "fulfilled";
  createdBy: { id: string; name: string | null; email: string };
  createdAt: string;
  adminComment?: string | null;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "default" },
  under_review: { label: "Under Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  fulfilled: { label: "Fulfilled", variant: "default" },
};

export default function PurchaseRequestsPage() {
  const portal = usePortal();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newJustification, setNewJustification] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adminComment, setAdminComment] = useState("");

  const { data, isLoading, isError } = useQuery<PurchaseRequest[]>({
    queryKey: [portal, "purchase-requests"],
    queryFn: () => fetchJson<PurchaseRequest[]>(`/api/purchase-requests`),
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      itemName: string;
      cost: number;
      quantity: number;
      justification: string;
      title: string;
    }) =>
      fetchJson<PurchaseRequest>(`/api/purchase-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] });
      setShowCreate(false);
      setNewItemName("");
      setNewCost("");
      setNewQuantity("1");
      setNewJustification("");
      setNewTitle("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: string;
      comment?: string;
    }) =>
      fetchJson(`/api/purchase-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminComment: comment }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "purchase-requests"] });
      setAdminComment("");
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              Purchase Requests
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                margin: "4px 0 0",
              }}
            >
              Request and approve purchases
            </p>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent style={{ padding: "20px" }}>
              <Skeleton
                style={{
                  width: "50%",
                  height: "16px",
                  borderRadius: "5px",
                  marginBottom: "8px",
                }}
              />
              <Skeleton
                style={{
                  width: "30%",
                  height: "14px",
                  borderRadius: "5px",
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-destructive)",
            margin: 0,
          }}
        >
          Failed to load purchase requests.
        </p>
      </div>
    );
  }

  const requests = data ?? [];

  function handleCreate() {
    if (!newItemName.trim() || !newCost || !newTitle.trim()) return;
    createMutation.mutate({
      itemName: newItemName.trim(),
      cost: Number.parseFloat(newCost),
      quantity: Number.parseInt(newQuantity, 10) || 1,
      justification: newJustification.trim(),
      title: newTitle.trim(),
    });
  }

  const statusStyle = (status: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      submitted: "var(--color-primary)",
      under_review: "var(--color-warning)",
      approved: "var(--color-success)",
      rejected: "var(--color-destructive)",
      fulfilled: "var(--color-primary)",
      draft: "var(--color-text-secondary)",
    };
    const bg = status === "draft" ? "transparent" : `${colors[status]}15`;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 8px",
      borderRadius: "5px",
      fontSize: "12px",
      fontWeight: 600,
      color: colors[status] ?? "var(--color-text-secondary)",
      background: bg,
      border: status === "draft" ? "1px solid var(--color-border)" : "none",
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Purchase Requests
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Request and approve purchases
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New Request</span>
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
            <ShoppingCart
              size={32}
              style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }}
            />
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-text)",
                margin: "0 0 4px",
              }}
            >
              No purchase requests yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              Create the first purchase request.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block" style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Cost</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const total = req.cost * req.quantity;
                  return (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setExpandedId(expandedId === req.id ? null : req.id)
                      }
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--color-bg-secondary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                          {req.title}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {req.itemName}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "var(--color-text)" }}>
                          ${req.cost.toFixed(2)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {req.quantity}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                          ${total.toFixed(2)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={statusStyle(req.status)}>
                          {statusConfig[req.status]?.label ?? req.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
                          {format(new Date(req.createdAt), "MMM d")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {requests.map((req) => {
              const isExpanded = expandedId === req.id;
              const total = req.cost * req.quantity;
              return (
                <Card key={req.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    style={{
                      padding: "16px",
                      cursor: "pointer",
                      borderBottom: isExpanded ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            margin: 0,
                          }}
                        >
                          {req.title}
                        </h3>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-secondary)",
                            margin: "2px 0 0",
                          }}
                        >
                          {req.itemName} &times; {req.quantity}
                        </p>
                      </div>
                      <span style={statusStyle(req.status)}>
                        {statusConfig[req.status]?.label ?? req.status}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "var(--color-text)",
                        }}
                      >
                        ${total.toFixed(2)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} style={{ color: "var(--color-text-secondary)" }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: "var(--color-text-secondary)" }} />
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            Item:{" "}
                          </span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {req.itemName}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            Cost per unit:{" "}
                          </span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            ${req.cost.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            Quantity:{" "}
                          </span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {req.quantity}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            Total:{" "}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: "var(--color-text)",
                            }}
                          >
                            ${total.toFixed(2)}
                          </span>
                        </div>
                        {req.justification && (
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              Justification:{" "}
                            </span>
                            <span
                              style={{
                                color: "var(--color-text-secondary)",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {req.justification}
                            </span>
                          </div>
                        )}
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            Requested by:{" "}
                          </span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {req.createdBy?.name ?? "Unknown"}{" "}
                            {format(new Date(req.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        {req.adminComment && (
                          <div
                            style={{
                              padding: "8px",
                              border: "1px solid var(--color-border)",
                              borderRadius: "5px",
                              background: "var(--color-bg-secondary)",
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              Admin comment:{" "}
                            </span>
                            <span style={{ color: "var(--color-text-secondary)" }}>
                              {req.adminComment}
                            </span>
                          </div>
                        )}
                      </div>

                      {isAdmin && req.status !== "approved" && req.status !== "rejected" && (
                        <div style={{ marginTop: "16px" }}>
                          <div style={{ marginBottom: "8px" }}>
                            <Input
                              placeholder="Admin comment (optional)"
                              value={adminComment}
                              onChange={(e) => setAdminComment(e.target.value)}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: req.id,
                                  status: "approved",
                                  comment: adminComment || undefined,
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle size={14} />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: req.id,
                                  status: "rejected",
                                  comment: adminComment || undefined,
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle size={14} />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
            <DialogDescription>
              Submit a request to purchase items.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Title
              </label>
              <Input
                placeholder="Request title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Item Name
              </label>
              <Input
                placeholder="What do you need?"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Cost per unit ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Justification
              </label>
              <Textarea
                placeholder="Why is this needed?"
                value={newJustification}
                onChange={(e) => setNewJustification(e.target.value)}
                rows={3}
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
                !newItemName.trim() ||
                !newCost ||
                !newTitle.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "middle",
};
