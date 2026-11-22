"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Approval {
    id: string;
    entityType: string;
    entityId: string;
    stageIndex: number;
    approverId: string | null;
    dueAt: string | null;
    createdAt: string;
    approver: { id: string; name: string | null; email: string; image: string | null } | null;
    entity: { type: string; id: string; title: string | null };
}

type Filter = "all" | "mine" | "overdue";
type Sla = "none" | "overdue" | "dueSoon" | "onTrack";

const DUE_SOON_MS = 24 * 60 * 60 * 1000;

function slaOf(dueAt: string | null): Sla {
    if (!dueAt) return "none";
    const diff = new Date(dueAt).getTime() - Date.now();
    if (Number.isNaN(diff)) return "none";
    if (diff < 0) return "overdue";
    if (diff <= DUE_SOON_MS) return "dueSoon";
    return "onTrack";
}

function formatDue(iso: string, locale: string | undefined): string {
    return new Intl.DateTimeFormat(locale || undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(iso));
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function ApprovalsPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("slaInbox");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const queryClient = useQueryClient();
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const [filter, setFilter] = useState<Filter>("all");
    const [extra, setExtra] = useState<Approval[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [comments, setComments] = useState<Record<string, string>>({});

    const {
        data: firstPage,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: [portal, "approvals"],
        queryFn: () => fetchPage<Approval>("/api/approvals"),
        enabled: portal !== "",
    });
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const all = [...(firstPage?.items ?? []), ...extra];
    const items = all.filter((item) => {
        if (filter === "mine") return item.approverId === user?.id;
        if (filter === "overdue") return slaOf(item.dueAt) === "overdue";
        return true;
    });
    const groups = new Map<string, Approval[]>();
    for (const item of items) {
        const list = groups.get(item.entityType) ?? [];
        list.push(item);
        groups.set(item.entityType, list);
    }

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<Approval>(
                `/api/approvals?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, te("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const decide = useMutation({
        mutationFn: (vars: { id: string; decision: "approved" | "rejected"; comment: string }) =>
            fetchJson(`/api/approvals/${vars.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    decision: vars.decision,
                    comment: vars.comment.trim() === "" ? null : vars.comment.trim(),
                }),
            }),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: [portal, "approvals"] });
            setComments((prev) => {
                const next = { ...prev };
                delete next[vars.id];
                return next;
            });
            toast.success(vars.decision === "approved" ? t("approveSuccess") : t("rejectSuccess"));
        },
        onError: (e) => toast.error(errorMessage(e, te("internal"))),
    });

    function entityLabel(type: string): string {
        if (type === "event") return t("typeEvent");
        if (type === "proposal") return t("typeProposal");
        if (type === "task") return t("typeTask");
        if (type === "meeting") return t("typeMeeting");
        return t("typeOther");
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Button
                    size="sm"
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                >
                    {tc("all")}
                </Button>
                <Button
                    size="sm"
                    variant={filter === "mine" ? "default" : "outline"}
                    onClick={() => setFilter("mine")}
                >
                    {t("filterMine")}
                </Button>
                <Button
                    size="sm"
                    variant={filter === "overdue" ? "default" : "outline"}
                    onClick={() => setFilter("overdue")}
                >
                    {t("filterOverdue")}
                </Button>
            </div>
            {isError && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    <span>{te("internal")}</span>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                        {tc("retry")}
                    </Button>
                </div>
            )}
            {isLoading && all.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "72px", borderRadius: "5px" }}
                        />
                    ))}
                </div>
            ) : groups.size === 0 ? (
                <Card>
                    <CardContent
                        style={{
                            padding: "48px 24px",
                            textAlign: "center",
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        {t("empty")}
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {[...groups.entries()].map(([type, rows]) => (
                        <div
                            key={type}
                            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                        >
                            <h2
                                style={{
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    margin: 0,
                                    color: "var(--color-text)",
                                }}
                            >
                                {entityLabel(type)}
                            </h2>
                            {rows.map((row) => {
                                const sla = slaOf(row.dueAt);
                                const badgeText =
                                    sla === "overdue"
                                        ? t("overdue")
                                        : sla === "dueSoon"
                                          ? t("dueSoon")
                                          : sla === "onTrack"
                                            ? t("onTrack")
                                            : t("noDueDate");
                                const badgeVariant =
                                    sla === "overdue"
                                        ? "destructive"
                                        : sla === "dueSoon"
                                          ? "secondary"
                                          : "outline";
                                return (
                                    <Card key={row.id}>
                                        <CardContent
                                            style={{
                                                padding: "12px 16px",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "10px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: "var(--color-text)",
                                                    }}
                                                >
                                                    {row.entity.title ?? row.entity.id}
                                                </span>
                                                <Badge variant={badgeVariant}>{badgeText}</Badge>
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "12px",
                                                    flexWrap: "wrap",
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                <span>{t("stage", { n: row.stageIndex + 1 })}</span>
                                                <span>
                                                    {t("assignedTo", {
                                                        name:
                                                            row.approver?.name ??
                                                            row.approver?.email ??
                                                            tc("unknown"),
                                                    })}
                                                </span>
                                                {row.dueAt && (
                                                    <span>
                                                        {t("dueAt", {
                                                            date: formatDue(
                                                                row.dueAt,
                                                                user?.locale,
                                                            ),
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "8px",
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <Input
                                                    aria-label={t("commentOptional")}
                                                    placeholder={t("commentOptional")}
                                                    value={comments[row.id] ?? ""}
                                                    onChange={(e) =>
                                                        setComments((prev) => ({
                                                            ...prev,
                                                            [row.id]: e.target.value,
                                                        }))
                                                    }
                                                />
                                                <Button
                                                    size="sm"
                                                    disabled={decide.isPending}
                                                    onClick={() =>
                                                        decide.mutate({
                                                            id: row.id,
                                                            decision: "approved",
                                                            comment: comments[row.id] ?? "",
                                                        })
                                                    }
                                                >
                                                    {t("approve")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={decide.isPending}
                                                    onClick={() =>
                                                        decide.mutate({
                                                            id: row.id,
                                                            decision: "rejected",
                                                            comment: comments[row.id] ?? "",
                                                        })
                                                    }
                                                >
                                                    {t("reject")}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ))}
                    {nextCursor && (
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                                {tc("showMore")}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
