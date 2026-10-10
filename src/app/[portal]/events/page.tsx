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
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    FileText,
    MapPin,
    Plus,
    Trash2,
    XCircle,
} from "lucide-react";

interface EventUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface EventData {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    location: string | null;
    isPublic: boolean;
    status: "draft" | "published" | "cancelled";
    approvalStatus: "pending" | "approved" | "rejected";
    approvedBy: EventUser | null;
    annualPlan: { id: string; name: string; academicYear: string } | null;
    createdBy: EventUser;
    createdAt: string;
}

interface AnnualPlan {
    id: string;
    name: string;
    description: string | null;
    academicYear: string;
    isActive: boolean;
    createdAt: string;
}

interface Registration {
    count: number;
    attendees: {
        id: string;
        userId: string;
        name: string | null;
        status: string;
        createdAt: string;
    }[];
    myStatus: string | null;
}

const PAGE_SIZE = 20;

export default function EventsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("events");
    const tReg = useTranslations("registration");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [activeTab, setActiveTab] = useState("events");
    const [showCreatePlan, setShowCreatePlan] = useState(false);
    const [planName, setPlanName] = useState("");
    const [planYear, setPlanYear] = useState("");
    const [planDescription, setPlanDescription] = useState("");
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [pendingDelete, setPendingDelete] = useState<EventData | null>(null);
    const [permanent, setPermanent] = useState(false);

    const isAdmin = user?.role === "admin";
    const cursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : null;

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "events", cursor ?? ""],
        queryFn: () =>
            fetchPage<EventData>(
                `/api/events?limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            ),
        enabled: portal !== "",
    });

    const { data: annualPlans, isLoading: plansLoading } = useQuery({
        queryKey: [portal, "annual-plans"],
        queryFn: () => fetchJson<AnnualPlan[]>("/api/events/annual-plan"),
        enabled: portal !== "" && activeTab === "plans",
    });

    const { data: registration } = useQuery({
        queryKey: [portal, "event-register", expandedId ?? ""],
        queryFn: () => fetchJson<Registration>(`/api/events/${expandedId}/register`),
        enabled: portal !== "" && expandedId !== null,
    });

    const registerMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/events/${id}/register`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "event-register"] });
            toast.success(tReg("registerSuccess"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/events/${id}/register`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "event-register"] });
            toast.success(tReg("cancelSuccess"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const events = data?.items ?? [];
    const nextCursor = data?.nextCursor ?? null;

    const createMutation = useMutation({
        mutationFn: (body: {
            title: string;
            description: string | null;
            startDate: string;
            endDate: string | null;
            location: string | null;
        }) =>
            fetchJson<EventData>("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...body, isPublic: false }),
            }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: [portal, "events"] });
            queryClient.invalidateQueries({ queryKey: [portal, "calendar"] });
            setShowCreate(false);
            setNewTitle("");
            setNewDescription("");
            setNewStartDate("");
            setNewEndDate("");
            setNewLocation("");
            toast.success(t("new"), {
                action: {
                    label: tCommon("undo"),
                    onClick: () => deleteMutation.mutate({ id: created.id, permanent: false }),
                },
            });
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: "draft" | "published" | "cancelled" }) =>
            fetchJson(`/api/events/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "events"] });
            queryClient.invalidateQueries({ queryKey: [portal, "calendar"] });
            toast.success(tCommon("update"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/events/${id}/approve`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "events"] });
            toast.success(t("approvalApproved"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/events/${id}/reject`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "events"] });
            toast.success(t("approvalRejected"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, permanent: perm }: { id: string; permanent: boolean }) =>
            fetchJson(`/api/events/${id}${perm ? "?permanent=true" : ""}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "events"] });
            queryClient.invalidateQueries({ queryKey: [portal, "calendar"] });
            setPendingDelete(null);
            setPermanent(false);
            toast.success(tCommon("delete"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const createPlanMutation = useMutation({
        mutationFn: (body: { name: string; academicYear: string; description?: string }) =>
            fetchJson("/api/events/annual-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "annual-plans"] });
            setShowCreatePlan(false);
            setPlanName("");
            setPlanYear("");
            setPlanDescription("");
            toast.success(tCommon("create"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    function handleCreate() {
        if (!newTitle.trim() || !newStartDate) return;
        createMutation.mutate({
            title: newTitle.trim(),
            description: newDescription.trim() || null,
            startDate: newStartDate,
            endDate: newEndDate || null,
            location: newLocation.trim() || null,
        });
    }

    function handleCreatePlan() {
        if (!planName.trim() || !planYear.trim()) return;
        createPlanMutation.mutate({
            name: planName.trim(),
            academicYear: planYear.trim(),
            description: planDescription.trim() || undefined,
        });
    }

    function statusLabel(status: EventData["status"]): string {
        if (status === "published") return t("statusPublished");
        if (status === "cancelled") return t("statusCancelled");
        return t("statusDraft");
    }

    function approvalLabel(status: EventData["approvalStatus"]): string {
        if (status === "approved") return t("approvalApproved");
        if (status === "rejected") return t("approvalRejected");
        return t("approvalPending");
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "16px",
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
                        {t("annualPlans")}
                    </p>
                </div>
                {activeTab === "events" && (
                    <Button onClick={() => setShowCreate(true)}>
                        <Plus size={16} />
                        <span>{t("new")}</span>
                    </Button>
                )}
            </div>

            <TabsList>
                <TabsTrigger value="events">{t("title")}</TabsTrigger>
                <TabsTrigger value="plans">{t("annualPlans")}</TabsTrigger>
            </TabsList>

            <TabsContent value="events">
                {isLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                                <CardContent style={{ padding: "20px" }}>
                                    <Skeleton
                                        style={{
                                            width: "50%",
                                            height: "16px",
                                            marginBottom: "8px",
                                        }}
                                    />
                                    <Skeleton style={{ width: "30%", height: "14px" }} />
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
                ) : events.length === 0 ? (
                    <EmptyState icon={<Calendar size={24} />} title={t("noEvents")} />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {events.map((event) => {
                            const isExpanded = expandedId === event.id;
                            return (
                                <Card key={event.id}>
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "16px",
                                            padding: "20px",
                                            cursor: "pointer",
                                            borderBottom: isExpanded
                                                ? "1px solid var(--color-border)"
                                                : "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                minWidth: "52px",
                                                padding: "8px 12px",
                                                border: "1px solid var(--color-border)",
                                                borderRadius: "5px",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    color: "var(--color-primary)",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                {format(new Date(event.startDate), "MMM")}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "20px",
                                                    fontWeight: 700,
                                                    color: "var(--color-text)",
                                                    lineHeight: 1.2,
                                                }}
                                            >
                                                {format(new Date(event.startDate), "d")}
                                            </span>
                                        </div>
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
                                                    {event.title}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        event.status === "published"
                                                            ? "default"
                                                            : event.status === "cancelled"
                                                              ? "destructive"
                                                              : "outline"
                                                    }
                                                >
                                                    {statusLabel(event.status)}
                                                </Badge>
                                                <Badge
                                                    variant={
                                                        event.approvalStatus === "approved"
                                                            ? "default"
                                                            : event.approvalStatus === "rejected"
                                                              ? "destructive"
                                                              : "secondary"
                                                    }
                                                >
                                                    {approvalLabel(event.approvalStatus)}
                                                </Badge>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    flexWrap: "wrap",
                                                    marginTop: "6px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                    }}
                                                >
                                                    {t("startsAt")}:{" "}
                                                    {format(
                                                        new Date(event.startDate),
                                                        "MMM d, h:mm a",
                                                    )}
                                                </span>
                                                {event.location && (
                                                    <span
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "var(--color-text-secondary)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}
                                                    >
                                                        <MapPin size={12} />
                                                        {event.location}
                                                    </span>
                                                )}
                                                {event.annualPlan && (
                                                    <span
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "var(--color-text-secondary)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                        }}
                                                    >
                                                        <FileText size={12} />
                                                        {event.annualPlan.name}
                                                    </span>
                                                )}
                                            </div>
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
                                            {event.description && (
                                                <p
                                                    style={{
                                                        fontSize: "14px",
                                                        color: "var(--color-text)",
                                                        margin: 0,
                                                        whiteSpace: "pre-wrap",
                                                    }}
                                                >
                                                    {event.description}
                                                </p>
                                            )}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "16px",
                                                    flexWrap: "wrap",
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                <div>
                                                    <strong style={{ color: "var(--color-text)" }}>
                                                        {t("startsAt")}:{" "}
                                                    </strong>
                                                    {format(
                                                        new Date(event.startDate),
                                                        "MMM d, yyyy h:mm a",
                                                    )}
                                                </div>
                                                {event.endDate && (
                                                    <div>
                                                        <strong
                                                            style={{ color: "var(--color-text)" }}
                                                        >
                                                            {t("endsAt")}:{" "}
                                                        </strong>
                                                        {format(
                                                            new Date(event.endDate),
                                                            "MMM d, yyyy h:mm a",
                                                        )}
                                                    </div>
                                                )}
                                                {event.approvedBy && (
                                                    <div>
                                                        <strong
                                                            style={{ color: "var(--color-text)" }}
                                                        >
                                                            {t("approvalApproved")}:{" "}
                                                        </strong>
                                                        {event.approvedBy.name ??
                                                            event.approvedBy.email}
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "8px",
                                                    flexWrap: "wrap",
                                                    alignItems: "center",
                                                }}
                                            >
                                                {event.status === "published" && (
                                                    <>
                                                        <span
                                                            style={{
                                                                fontSize: "13px",
                                                                color: "var(--color-text-secondary)",
                                                            }}
                                                        >
                                                            {tReg("attendeesCount", {
                                                                count:
                                                                    expandedId === event.id
                                                                        ? (registration?.count ?? 0)
                                                                        : 0,
                                                            })}
                                                        </span>
                                                        {expandedId === event.id &&
                                                        registration?.myStatus === "going" ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    cancelMutation.mutate(event.id)
                                                                }
                                                                disabled={cancelMutation.isPending}
                                                            >
                                                                {tReg("cancel")}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    registerMutation.mutate(
                                                                        event.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    registerMutation.isPending
                                                                }
                                                            >
                                                                {tReg("register")}
                                                            </Button>
                                                        )}
                                                        {expandedId === event.id &&
                                                            (registration?.attendees.length ?? 0) >
                                                                0 && (
                                                                <span
                                                                    style={{
                                                                        fontSize: "12px",
                                                                        color: "var(--color-text-secondary)",
                                                                    }}
                                                                >
                                                                    {(registration?.attendees ?? [])
                                                                        .map((a) => a.name ?? "?")
                                                                        .join(", ")}
                                                                </span>
                                                            )}
                                                    </>
                                                )}
                                                {event.status === "draft" && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            statusMutation.mutate({
                                                                id: event.id,
                                                                status: "published",
                                                            })
                                                        }
                                                        disabled={statusMutation.isPending}
                                                    >
                                                        {t("publish")}
                                                    </Button>
                                                )}
                                                {event.status === "published" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            statusMutation.mutate({
                                                                id: event.id,
                                                                status: "draft",
                                                            })
                                                        }
                                                        disabled={statusMutation.isPending}
                                                    >
                                                        {t("unpublish")}
                                                    </Button>
                                                )}
                                                {isAdmin && event.approvalStatus === "pending" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                approveMutation.mutate(event.id)
                                                            }
                                                            disabled={approveMutation.isPending}
                                                        >
                                                            <CheckCircle size={14} />
                                                            {t("approve")}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() =>
                                                                rejectMutation.mutate(event.id)
                                                            }
                                                            disabled={rejectMutation.isPending}
                                                        >
                                                            <XCircle size={14} />
                                                            {t("reject")}
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setPendingDelete(event)}
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
                                                            id={`permanent-${event.id}`}
                                                            checked={permanent}
                                                            onCheckedChange={(v) =>
                                                                setPermanent(v === true)
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor={`permanent-${event.id}`}
                                                            style={{
                                                                fontSize: "13px",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            {tCommon("permanentlyDelete")}
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
                                                    setCursorStack((s) => s.slice(0, -1));
                                            }}
                                            style={
                                                cursorStack.length === 0
                                                    ? { opacity: 0.4, pointerEvents: "none" }
                                                    : undefined
                                            }
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (nextCursor)
                                                    setCursorStack((s) => [...s, nextCursor]);
                                            }}
                                            style={
                                                !nextCursor
                                                    ? { opacity: 0.4, pointerEvents: "none" }
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

            <TabsContent value="plans">
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button size="sm" onClick={() => setShowCreatePlan(!showCreatePlan)}>
                            <Plus size={14} />
                            <span>{t("createPlan")}</span>
                        </Button>
                    </div>
                    {showCreatePlan && (
                        <Card>
                            <CardContent
                                style={{
                                    padding: "16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px",
                                }}
                            >
                                <Input
                                    placeholder={tCommon("name")}
                                    value={planName}
                                    onChange={(e) => setPlanName(e.target.value)}
                                />
                                <Input
                                    placeholder={t("academicYear")}
                                    value={planYear}
                                    onChange={(e) => setPlanYear(e.target.value)}
                                />
                                <Textarea
                                    placeholder={tCommon("description")}
                                    value={planDescription}
                                    onChange={(e) => setPlanDescription(e.target.value)}
                                    rows={2}
                                />
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <Button
                                        size="sm"
                                        onClick={handleCreatePlan}
                                        disabled={
                                            !planName.trim() ||
                                            !planYear.trim() ||
                                            createPlanMutation.isPending
                                        }
                                    >
                                        {createPlanMutation.isPending
                                            ? tCommon("saving")
                                            : tCommon("create")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {plansLoading ? (
                        <Card>
                            <CardContent style={{ padding: "20px" }}>
                                <Skeleton
                                    style={{ width: "60%", height: "16px", marginBottom: "8px" }}
                                />
                                <Skeleton style={{ width: "40%", height: "14px" }} />
                            </CardContent>
                        </Card>
                    ) : !annualPlans || annualPlans.length === 0 ? (
                        <EmptyState icon={<FileText size={24} />} title={t("noPlans")} />
                    ) : (
                        annualPlans.map((plan) => (
                            <Card key={plan.id}>
                                <CardContent style={{ padding: "20px" }}>
                                    <h3
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                            color: "var(--color-text)",
                                            margin: "0 0 4px",
                                        }}
                                    >
                                        {plan.name}
                                    </h3>
                                    {plan.description && (
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                margin: "0 0 8px",
                                            }}
                                        >
                                            {plan.description}
                                        </p>
                                    )}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "16px",
                                            fontSize: "12px",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        <span>
                                            <strong style={{ color: "var(--color-text)" }}>
                                                {t("academicYear")}:{" "}
                                            </strong>
                                            {plan.academicYear}
                                        </span>
                                        <span>
                                            {plan.isActive
                                                ? t("statusPublished")
                                                : t("statusDraft")}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </TabsContent>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                        <DialogDescription>{t("title")}</DialogDescription>
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
                                {tCommon("description")}
                            </Label>
                            <Textarea
                                placeholder={tCommon("description")}
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label style={{ display: "block", marginBottom: "6px" }}>
                                    {t("startsAt")}
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={newStartDate}
                                    onChange={(e) => setNewStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label style={{ display: "block", marginBottom: "6px" }}>
                                    {t("endsAt")}
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={newEndDate}
                                    onChange={(e) => setNewEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {tCommon("location")}
                            </Label>
                            <Input
                                placeholder={tCommon("location")}
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!newTitle.trim() || !newStartDate || createMutation.isPending}
                        >
                            {createMutation.isPending ? tCommon("saving") : tCommon("create")}
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
                    if (pendingDelete) deleteMutation.mutate({ id: pendingDelete.id, permanent });
                }}
            />
        </Tabs>
    );
}
