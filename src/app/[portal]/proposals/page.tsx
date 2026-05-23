"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
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
import { format } from "date-fns";
import { FileText, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  createdBy: { id: string; name: string | null; email: string; image: string | null };
  createdAt: string;
  updatedAt: string;
}

interface ProposalsResponse {
  proposals: Proposal[];
  total: number;
}

const statusConfig: Record<string, { label: string; variant: "warning" | "success" | "destructive"; icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "warning", icon: Clock },
  approved: { label: "Approved", variant: "success", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function ProposalsPage() {
  const portal = getPortal();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading, isError } = useQuery<ProposalsResponse>({
    queryKey: [portal, "proposals"],
    queryFn: () => fetchJson<ProposalsResponse>(`/api/proposals`),
  });

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      fetchJson<Proposal>(`/api/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/proposals/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/proposals/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
    },
  });

  const deleteProposal = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/proposals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Proposals</h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Submit and review proposals
            </p>
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent style={{ padding: "20px" }}>
              <Skeleton style={{ width: "60%", height: "18px", borderRadius: "5px", marginBottom: "8px" }} />
              <Skeleton style={{ width: "100%", height: "14px", borderRadius: "5px", marginBottom: "8px" }} />
              <Skeleton style={{ width: "80px", height: "22px", borderRadius: "5px" }} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
          Failed to load proposals.
        </p>
      </div>
    );
  }

  const proposals = data.proposals ?? [];

  function handleCreate() {
    if (!newTitle.trim() || !newDescription.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), description: newDescription.trim() });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Proposals</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Submit and review proposals
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New Proposal</span>
        </Button>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
            <FileText size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
              No proposals yet
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
              Create the first proposal for your organization.
            </p>
          </CardContent>
        </Card>
      ) : (
        proposals.map((proposal) => {
          const isExpanded = expandedId === proposal.id;
          const config = statusConfig[proposal.status] ?? statusConfig.pending;
          const Icon = config.icon;

          return (
            <Card key={proposal.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "20px",
                  cursor: "pointer",
                  gap: "12px",
                  borderBottom: isExpanded ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                      {proposal.title}
                    </h3>
                    <Badge variant={config.variant as "default" | "secondary" | "destructive" | "outline"}>
                      <Icon size={12} style={{ marginRight: "4px" }} />
                      {config.label}
                    </Badge>
                  </div>
                  {!isExpanded && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                        margin: "4px 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {proposal.description}
                    </p>
                  )}
                  <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
                    By {proposal.createdBy?.name ?? "Unknown"} &middot;{" "}
                    {format(new Date(proposal.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={18} style={{ flexShrink: 0, color: "var(--color-text-secondary)" }} /> : <ChevronDown size={18} style={{ flexShrink: 0, color: "var(--color-text-secondary)" }} />}
              </div>

              {isExpanded && (
                <div style={{ padding: "20px" }}>
                  <p style={{ fontSize: "14px", color: "var(--color-text)", margin: "0 0 16px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {proposal.description}
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={proposal.status !== "pending" || approveMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        approveMutation.mutate(proposal.id);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={proposal.status !== "pending" || rejectMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectMutation.mutate(proposal.id);
                      }}
                    >
                      Reject
                    </Button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Delete this proposal?")) deleteProposal.mutate(proposal.id); }}
                        style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", border:"1px solid var(--color-destructive)", borderRadius:"5px", background:"var(--color-bg)", cursor:"pointer", fontSize:"13px", fontFamily:"inherit", color:"var(--color-destructive)" }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Proposal</DialogTitle>
            <DialogDescription>
              Submit a new proposal for review.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Title
              </label>
              <Input
                placeholder="Enter proposal title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Description
              </label>
              <Textarea
                placeholder="Describe your proposal in detail"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newDescription.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
