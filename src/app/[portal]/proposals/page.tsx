"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    CheckCircle,
    ChevronDown,
    ChevronUp,
    File,
    FileText,
    Plus,
    Trash2,
    XCircle,
} from "lucide-react";

interface Proposal {
    id: string;
    title: string;
    description: string;
    status: "pending" | "approved" | "rejected";
    createdBy: { id: string; name: string | null; email: string; image: string | null };
    createdAt: string;
    updatedAt: string;
}

interface ProposalTemplate {
    id: string;
    title: string;
    description: string;
    category: string | null;
    createdBy: { id: string; name: string | null; image: string | null };
    createdAt: string;
}

const PAGE_SIZE = 20;

export default function ProposalsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("proposals");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [activeTab, setActiveTab] = useState("proposals");
    const [statusFilter, setStatusFilter] = useState("all");
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [showCreateTemplate, setShowCreateTemplate] = useState(false);
    const [templateTitle, setTemplateTitle] = useState("");
    const [templateDescription, setTemplateDescription] = useState("");
    const [templateCategory, setTemplateCategory] = useState("");
    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        title: string;
        kind: "proposal" | "template";
    } | null>(null);
    const [permanent, setPermanent] = useState(false);

    const isAdmin = user?.role === "admin";
    const cursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : null;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "proposals", statusFilter, cursor ?? ""],
        queryFn: () =>
            fetchPage<Proposal>(
                `/api/proposals?limit=${PAGE_SIZE}` +
                    (statusFilter !== "all" ? `&status=${statusFilter}` : "") +
                    (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
            ),
        enabled: portal !== "",
    });

    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: [portal, "proposals", "templates"],
        queryFn: () => fetchJson<ProposalTemplate[]>("/api/proposals/templates"),
        enabled: portal !== "" && activeTab === "templates",
    });

    const proposals = data?.items ?? [];
    const nextCursor = data?.nextCursor ?? null;

    const createMutation = useMutation({
        mutationFn: (body: { title: string; description: string }) =>
            fetchJson<Proposal>("/api/proposals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
            setShowCreate(false);
            setNewTitle("");
            setNewDescription("");
            toast.success(t("new"), {
                action: {
                    label: tCommon("undo"),
                    onClick: () => deleteProposal.mutate({ id: created.id, permanent: false }),
                },
            });
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/proposals/${id}/approve`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
            toast.success(t("statusApproved"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/proposals/${id}/reject`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
            toast.success(t("statusRejected"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const deleteProposal = useMutation({
        mutationFn: ({ id, permanent: perm }: { id: string; permanent: boolean }) =>
            fetchJson(`/api/proposals/${id}${perm ? "?permanent=true" : ""}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "proposals"] });
            setPendingDelete(null);
            setPermanent(false);
            toast.success(tCommon("delete"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const createTemplateMutation = useMutation({
        mutationFn: (body: { title: string; description: string; category?: string }) =>
            fetchJson<ProposalTemplate>("/api/proposals/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "proposals", "templates"] });
            setShowCreateTemplate(false);
            setTemplateTitle("");
            setTemplateDescription("");
            setTemplateCategory("");
            toast.success(tCommon("create"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: ({ id, permanent: perm }: { id: string; permanent: boolean }) =>
            fetchJson(`/api/proposals/templates/${id}${perm ? "?permanent=true" : ""}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "proposals", "templates"] });
            setPendingDelete(null);
            setPermanent(false);
            toast.success(tCommon("delete"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    function applyTemplate(tmpl: ProposalTemplate) {
        setNewTitle(tmpl.title);
        setNewDescription(tmpl.description);
        setActiveTab("proposals");
        setShowCreate(true);
    }

    function handleCreate() {
        if (!newTitle.trim() || !newDescription.trim()) return;
        createMutation.mutate({ title: newTitle.trim(), description: newDescription.trim() });
    }

    function statusLabel(status: Proposal["status"]): string {
        if (status === "approved") return t("statusApproved");
        if (status === "rejected") return t("statusRejected");
        return t("statusPending");
    }

    const statusTabs = [
        { value: "all", label: tCommon("all") },
        { value: "pending", label: t("statusPending") },
        { value: "approved", label: t("statusApproved") },
        { value: "rejected", label: t("statusRejected") },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
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
                        {t("title")}
                    </h1>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: "4px 0 0",
                        }}
                    >
                        {t("justification")}
                    </p>
                </div>
                {activeTab === "proposals" && (
                    <Button onClick={() => setShowCreate(true)}>
                        <Plus size={16} />
                        <span>{t("new")}</span>
                    </Button>
                )}
                {activeTab === "templates" && isAdmin && (
                    <Button onClick={() => setShowCreateTemplate(true)}>
                        <Plus size={16} />
                        <span>{t("newTemplate")}</span>
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="proposals">{t("title")}</TabsTrigger>
                    <TabsTrigger value="templates">{t("templates")}</TabsTrigger>
                </TabsList>

                <TabsContent value="proposals">
                    <Tabs
                        value={statusFilter}
                        onValueChange={(v) => {
                            setStatusFilter(v);
                            setCursorStack([]);
                        }}
                    >
                        <TabsList>
                            {statusTabs.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value}>
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value={statusFilter}>
                            {isLoading ? (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                    }}
                                >
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Card key={i}>
                                            <CardContent style={{ padding: "20px" }}>
                                                <Skeleton
                                                    style={{
                                                        width: "60%",
                                                        height: "18px",
                                                        marginBottom: "8px",
                                                    }}
                                                />
                                                <Skeleton
                                                    style={{ width: "80px", height: "22px" }}
                                                />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : isError ? (
                                <div style={{ textAlign: "center", padding: "48px 24px" }}>
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            color: "var(--color-destructive)",
                                            margin: 0,
                                        }}
                                    >
                                        {tErrors("internal")}
                                    </p>
                                    <Button
                                        variant="outline"
                                        style={{ marginTop: "16px" }}
                                        onClick={() => refetch()}
                                    >
                                        {tCommon("retry")}
                                    </Button>
                                </div>
                            ) : proposals.length === 0 ? (
                                <EmptyState
                                    icon={<FileText size={24} />}
                                    title={t("noProposals")}
                                />
                            ) : (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                    }}
                                >
                                    {proposals.map((proposal) => {
                                        const isExpanded = expandedId === proposal.id;
                                        return (
                                            <Card key={proposal.id}>
                                                <div
                                                    onClick={() =>
                                                        setExpandedId(
                                                            isExpanded ? null : proposal.id,
                                                        )
                                                    }
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        justifyContent: "space-between",
                                                        padding: "20px",
                                                        cursor: "pointer",
                                                        gap: "12px",
                                                        borderBottom: isExpanded
                                                            ? "1px solid var(--color-border)"
                                                            : "none",
                                                    }}
                                                >
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "8px",
                                                                flexWrap: "wrap",
                                                            }}
                                                        >
                                                            <h3
                                                                style={{
                                                                    fontSize: "15px",
                                                                    fontWeight: 600,
                                                                    color: "var(--color-text)",
                                                                    margin: 0,
                                                                }}
                                                            >
                                                                {proposal.title}
                                                            </h3>
                                                            <Badge
                                                                variant={
                                                                    proposal.status === "approved"
                                                                        ? "default"
                                                                        : proposal.status ===
                                                                            "rejected"
                                                                          ? "destructive"
                                                                          : "secondary"
                                                                }
                                                            >
                                                                {statusLabel(proposal.status)}
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
                                                        <p
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text-secondary)",
                                                                margin: "6px 0 0",
                                                            }}
                                                        >
                                                            {proposal.createdBy?.name ??
                                                                tCommon("unknown")}{" "}
                                                            &middot;{" "}
                                                            {format(
                                                                new Date(proposal.createdAt),
                                                                "MMM d, yyyy",
                                                            )}
                                                        </p>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp
                                                            size={18}
                                                            style={{
                                                                flexShrink: 0,
                                                                color: "var(--color-text-secondary)",
                                                            }}
                                                        />
                                                    ) : (
                                                        <ChevronDown
                                                            size={18}
                                                            style={{
                                                                flexShrink: 0,
                                                                color: "var(--color-text-secondary)",
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {isExpanded && (
                                                    <div
                                                        style={{
                                                            padding: "20px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "16px",
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <p
                                                            style={{
                                                                fontSize: "14px",
                                                                color: "var(--color-text)",
                                                                margin: 0,
                                                                lineHeight: 1.6,
                                                                whiteSpace: "pre-wrap",
                                                            }}
                                                        >
                                                            {proposal.description}
                                                        </p>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "8px",
                                                                flexWrap: "wrap",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            {proposal.status === "pending" && (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled={
                                                                            approveMutation.isPending
                                                                        }
                                                                        onClick={() =>
                                                                            approveMutation.mutate(
                                                                                proposal.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <CheckCircle size={14} />
                                                                        {t("approve")}
                                                                    </Button>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        disabled={
                                                                            rejectMutation.isPending
                                                                        }
                                                                        onClick={() =>
                                                                            rejectMutation.mutate(
                                                                                proposal.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <XCircle size={14} />
                                                                        {t("reject")}
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setPendingDelete({
                                                                        id: proposal.id,
                                                                        title: proposal.title,
                                                                        kind: "proposal",
                                                                    })
                                                                }
                                                            >
                                                                <Trash2 size={14} />
                                                                {tCommon("delete")}
                                                            </Button>
                                                            {isAdmin && (
                                                                <div
                                                                    style={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "8px",
                                                                    }}
                                                                >
                                                                    <Checkbox
                                                                        id={`permanent-${proposal.id}`}
                                                                        checked={permanent}
                                                                        onCheckedChange={(v) =>
                                                                            setPermanent(v === true)
                                                                        }
                                                                    />
                                                                    <Label
                                                                        htmlFor={`permanent-${proposal.id}`}
                                                                        style={{
                                                                            fontSize: "13px",
                                                                            cursor: "pointer",
                                                                        }}
                                                                    >
                                                                        {tCommon(
                                                                            "permanentlyDelete",
                                                                        )}
                                                                    </Label>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}

                                    {(nextCursor || cursorStack.length > 0) && (
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (cursorStack.length > 0)
                                                                setCursorStack((s) =>
                                                                    s.slice(0, -1),
                                                                );
                                                        }}
                                                        style={
                                                            cursorStack.length === 0
                                                                ? {
                                                                      opacity: 0.4,
                                                                      pointerEvents: "none",
                                                                  }
                                                                : undefined
                                                        }
                                                    />
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (nextCursor)
                                                                setCursorStack((s) => [
                                                                    ...s,
                                                                    nextCursor,
                                                                ]);
                                                        }}
                                                        style={
                                                            !nextCursor
                                                                ? {
                                                                      opacity: 0.4,
                                                                      pointerEvents: "none",
                                                                  }
                                                                : undefined
                                                        }
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="templates">
                    {templatesLoading ? (
                        <Card>
                            <CardContent style={{ padding: "20px" }}>
                                <Skeleton
                                    style={{ width: "60%", height: "16px", marginBottom: "8px" }}
                                />
                                <Skeleton style={{ width: "40%", height: "14px" }} />
                            </CardContent>
                        </Card>
                    ) : !templates || templates.length === 0 ? (
                        <EmptyState icon={<File size={24} />} title={t("noTemplates")} />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {templates.map((tmpl) => (
                                <Card key={tmpl.id}>
                                    <CardContent style={{ padding: "16px 20px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                justifyContent: "space-between",
                                                gap: "12px",
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3
                                                    style={{
                                                        fontSize: "15px",
                                                        fontWeight: 600,
                                                        color: "var(--color-text)",
                                                        margin: "0 0 4px",
                                                    }}
                                                >
                                                    {tmpl.title}
                                                </h3>
                                                {tmpl.category && (
                                                    <Badge
                                                        variant="secondary"
                                                        style={{ marginBottom: "4px" }}
                                                    >
                                                        {t("category")}: {tmpl.category}
                                                    </Badge>
                                                )}
                                                <p
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: "4px 0",
                                                        whiteSpace: "pre-wrap",
                                                    }}
                                                >
                                                    {tmpl.description.length > 120
                                                        ? `${tmpl.description.slice(0, 120)}...`
                                                        : tmpl.description}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: "4px 0 0",
                                                    }}
                                                >
                                                    {tmpl.createdBy?.name ?? tCommon("unknown")}{" "}
                                                    &middot;{" "}
                                                    {format(
                                                        new Date(tmpl.createdAt),
                                                        "MMM d, yyyy",
                                                    )}
                                                </p>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "4px",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={() => applyTemplate(tmpl)}
                                                    aria-label={t("new")}
                                                    title={t("new")}
                                                >
                                                    <Plus size={14} />
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setPendingDelete({
                                                                id: tmpl.id,
                                                                title: tmpl.title,
                                                                kind: "template",
                                                            })
                                                        }
                                                        aria-label={tCommon("delete")}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                        <DialogDescription>{t("justification")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {tCommon("title")}
                            </Label>
                            <Input
                                placeholder={t("new")}
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {t("justification")}
                            </Label>
                            <Textarea
                                placeholder={t("justification")}
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={
                                !newTitle.trim() ||
                                !newDescription.trim() ||
                                createMutation.isPending
                            }
                        >
                            {createMutation.isPending ? tCommon("saving") : tCommon("submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("newTemplate")}</DialogTitle>
                        <DialogDescription>{t("templates")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {tCommon("title")}
                            </Label>
                            <Input
                                placeholder={t("new")}
                                value={templateTitle}
                                onChange={(e) => setTemplateTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {tCommon("description")}
                            </Label>
                            <Textarea
                                placeholder={tCommon("description")}
                                value={templateDescription}
                                onChange={(e) => setTemplateDescription(e.target.value)}
                                rows={5}
                            />
                        </div>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {t("category")}
                            </Label>
                            <Input
                                placeholder={t("category")}
                                value={templateCategory}
                                onChange={(e) => setTemplateCategory(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            onClick={() =>
                                createTemplateMutation.mutate({
                                    title: templateTitle.trim(),
                                    description: templateDescription.trim(),
                                    category: templateCategory.trim() || undefined,
                                })
                            }
                            disabled={
                                !templateTitle.trim() ||
                                !templateDescription.trim() ||
                                createTemplateMutation.isPending
                            }
                        >
                            {createTemplateMutation.isPending
                                ? tCommon("saving")
                                : tCommon("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDelete(null);
                        setPermanent(false);
                    }
                }}
                title={tCommon("delete")}
                description={pendingDelete?.title ?? ""}
                confirmLabel={permanent ? tCommon("deleteForever") : tCommon("delete")}
                destructive
                requireTypedText={permanent}
                typingChallenge={pendingDelete?.title ?? ""}
                onConfirm={() => {
                    if (!pendingDelete) return;
                    if (pendingDelete.kind === "template") {
                        deleteTemplateMutation.mutate({ id: pendingDelete.id, permanent });
                    } else {
                        deleteProposal.mutate({ id: pendingDelete.id, permanent });
                    }
                }}
            />
        </div>
    );
}
