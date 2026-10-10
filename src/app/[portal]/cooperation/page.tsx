"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Handshake } from "lucide-react";

type PartnershipStatus = "pending" | "under_review" | "approved" | "rejected";

interface PartnershipRequest {
    id: string;
    clubName: string;
    contactName: string;
    contactEmail: string;
    email: string;
    eventTitle: string;
    description: string;
    proposedDate: string | null;
    resourcesNeeded: string | null;
    status: PartnershipStatus;
    createdBy: { id: string; name: string | null } | null;
    createdAt: string;
}

const PAGE_SIZE = 20;
const STATUSES: PartnershipStatus[] = ["pending", "under_review", "approved", "rejected"];

export default function CooperationPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("partnerships");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const canReview = user?.permissions.includes("manage_partnerships") ?? false;
    const isAdmin = user?.role === "admin";

    const [statusFilter, setStatusFilter] = useState("all");
    const [cursor, setCursor] = useState<string | null>(null);
    const [items, setItems] = useState<PartnershipRequest[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [appliedKey, setAppliedKey] = useState("");

    const [clubName, setClubName] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [eventTitle, setEventTitle] = useState("");
    const [description, setDescription] = useState("");
    const [proposedDate, setProposedDate] = useState("");
    const [resourcesNeeded, setResourcesNeeded] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<PartnershipRequest | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "cooperation", statusFilter, cursor ?? ""],
        queryFn: () =>
            fetchPage<PartnershipRequest>(
                `/api/cooperation?limit=${PAGE_SIZE}${statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            ),
        enabled: portal !== "",
    });

    const key = `${statusFilter}|${cursor ?? ""}`;
    if (data && appliedKey !== key) {
        setAppliedKey(key);
        setNextCursor(data.nextCursor);
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
    }

    useEffect(() => {
        if (isError) toast.error(te("internal"));
    }, [isError, te]);

    const createMutation = useMutation({
        mutationFn: (body: {
            clubName: string;
            contactName: string;
            contactEmail: string;
            eventTitle: string;
            description: string;
            proposedDate?: string;
            resourcesNeeded?: string;
        }) =>
            fetchJson(`/api/cooperation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "cooperation"] });
            setCursor(null);
            setClubName("");
            setContactName("");
            setContactEmail("");
            setEventTitle("");
            setDescription("");
            setProposedDate("");
            setResourcesNeeded("");
            toast.success(t("submitSuccess"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const reviewMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: PartnershipStatus }) =>
            fetchJson(`/api/cooperation/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "cooperation"] });
            toast.success(t("review"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            fetchJson(`/api/cooperation/${id}${isAdmin ? "?permanent=true" : ""}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "cooperation"] });
            setCursor(null);
            setDeleteTarget(null);
            toast.success(tc("delete"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function handleSubmit() {
        if (!clubName.trim() || !contactName.trim() || !contactEmail.trim() || !description.trim())
            return;
        createMutation.mutate({
            clubName: clubName.trim(),
            contactName: contactName.trim(),
            contactEmail: contactEmail.trim(),
            eventTitle: eventTitle.trim() || clubName.trim(),
            description: description.trim(),
            proposedDate: proposedDate || undefined,
            resourcesNeeded: resourcesNeeded.trim() || undefined,
        });
    }

    function statusLabel(status: PartnershipStatus): string {
        if (status === "pending") return t("statusPending");
        if (status === "under_review") return t("statusUnderReview");
        if (status === "approved") return t("statusApproved");
        return t("statusRejected");
    }

    const labelStyle: React.CSSProperties = {
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--color-text)",
        display: "block",
        marginBottom: "6px",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--color-text)",
                    }}
                >
                    {t("title")}
                </h1>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    {tc("retry")}
                </Button>
            </div>

            <Tabs defaultValue="list">
                <TabsList>
                    <TabsTrigger value="list">{t("title")}</TabsTrigger>
                    <TabsTrigger value="submit">{t("new")}</TabsTrigger>
                </TabsList>

                <TabsContent value="submit">
                    <Card>
                        <CardContent
                            style={{
                                padding: "20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                            }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label style={labelStyle}>{t("clubName")}</label>
                                    <Input
                                        value={clubName}
                                        onChange={(e) => setClubName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t("contactName")}</label>
                                    <Input
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t("contactEmail")}</label>
                                    <Input
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t("proposedDate")}</label>
                                    <Input
                                        type="date"
                                        value={proposedDate}
                                        onChange={(e) => setProposedDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>{t("eventTitle")}</label>
                                <Input
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>{tc("description")}</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>{t("resourcesNeeded")}</label>
                                <Textarea
                                    value={resourcesNeeded}
                                    onChange={(e) => setResourcesNeeded(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={
                                        !clubName.trim() ||
                                        !contactName.trim() ||
                                        !contactEmail.trim() ||
                                        !description.trim() ||
                                        createMutation.isPending
                                    }
                                >
                                    {createMutation.isPending ? tc("saving") : tc("submit")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="list">
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}
                        >
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => {
                                    setStatusFilter(v);
                                    setCursor(null);
                                }}
                            >
                                <SelectTrigger style={{ width: "200px" }}>
                                    <SelectValue placeholder={tc("filter")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{tc("all")}</SelectItem>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {statusLabel(s)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {items.length}
                            </span>
                        </div>

                        {isLoading && items.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        style={{
                                            width: "100%",
                                            height: "120px",
                                            borderRadius: "5px",
                                        }}
                                    />
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <Card>
                                <CardContent
                                    style={{
                                        padding: "40px 20px",
                                        textAlign: "center",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    <Handshake
                                        size={32}
                                        style={{ marginBottom: "12px", opacity: 0.5 }}
                                    />
                                    <p style={{ fontSize: "14px", margin: 0 }}>{t("noRequests")}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            items.map((req) => (
                                <Card key={req.id}>
                                    <CardContent style={{ padding: "20px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                flexWrap: "wrap",
                                                marginBottom: "6px",
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
                                                {req.eventTitle}
                                            </h3>
                                            <Badge
                                                variant={
                                                    req.status === "approved"
                                                        ? "default"
                                                        : req.status === "rejected"
                                                          ? "destructive"
                                                          : "secondary"
                                                }
                                            >
                                                {statusLabel(req.status)}
                                            </Badge>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                margin: "0 0 4px",
                                            }}
                                        >
                                            {req.clubName} · {req.contactName} ({req.email})
                                        </p>
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text)",
                                                margin: "4px 0",
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {req.description}
                                        </p>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "16px",
                                                flexWrap: "wrap",
                                                fontSize: "12px",
                                                color: "var(--color-text-secondary)",
                                                marginTop: "8px",
                                            }}
                                        >
                                            {req.proposedDate && (
                                                <span>
                                                    {t("proposedDate")}:{" "}
                                                    {new Date(
                                                        req.proposedDate,
                                                    ).toLocaleDateString()}
                                                </span>
                                            )}
                                            {req.resourcesNeeded && (
                                                <span>
                                                    {t("resourcesNeeded")}: {req.resourcesNeeded}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                marginTop: "12px",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            {canReview && req.status !== "approved" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        reviewMutation.mutate({
                                                            id: req.id,
                                                            status: "approved",
                                                        })
                                                    }
                                                    disabled={reviewMutation.isPending}
                                                >
                                                    {t("approve")}
                                                </Button>
                                            )}
                                            {canReview && req.status !== "rejected" && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        reviewMutation.mutate({
                                                            id: req.id,
                                                            status: "rejected",
                                                        })
                                                    }
                                                    disabled={reviewMutation.isPending}
                                                >
                                                    {t("reject")}
                                                </Button>
                                            )}
                                            {(canReview || req.createdBy?.id === user?.id) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteTarget(req)}
                                                >
                                                    {tc("delete")}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                        {nextCursor && (
                            <div style={{ display: "flex", justifyContent: "center" }}>
                                <Button variant="outline" onClick={() => setCursor(nextCursor)}>
                                    {tc("showMore")}
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={tc("delete")}
                description={deleteTarget?.eventTitle}
                confirmLabel={isAdmin ? tc("deleteForever") : tc("delete")}
                destructive
                requireTypedText={isAdmin}
                typingChallenge={deleteTarget?.eventTitle ?? ""}
                onConfirm={() => {
                    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                }}
            />
        </div>
    );
}
