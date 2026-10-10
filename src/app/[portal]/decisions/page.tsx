"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface DecisionItem {
    id: string;
    title: string;
    summary: string;
    entityType: string | null;
    entityId: string | null;
    decidedById: string | null;
    decidedAt: string;
    createdAt: string;
    decidedBy: { id: string; name: string | null } | null;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function DecisionsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("decisions");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);

    const [entityType, setEntityType] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [linkedType, setLinkedType] = useState("");
    const [linkedId, setLinkedId] = useState("");
    const [decidedAt, setDecidedAt] = useState("");

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "decisions", entityType],
        queryFn: () =>
            fetchPage<DecisionItem>(
                `/api/decisions${entityType ? `?entityType=${encodeURIComponent(entityType)}` : ""}`,
            ),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<DecisionItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const all = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<DecisionItem>(
                `/api/decisions?cursor=${encodeURIComponent(nextCursor)}${entityType ? `&entityType=${encodeURIComponent(entityType)}` : ""}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const create = useMutation({
        mutationFn: (body: {
            title: string;
            summary: string;
            entityType?: string | null;
            entityId?: string | null;
            decidedAt?: string | null;
        }) =>
            fetchJson("/api/decisions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "decisions"] });
            setCreateOpen(false);
            setTitle("");
            setSummary("");
            setLinkedType("");
            setLinkedId("");
            setDecidedAt("");
            toast.success(t("createSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleCreate() {
        if (!title.trim() || !summary.trim()) {
            toast.error(tE("validationFailed"));
            return;
        }
        create.mutate({
            title: title.trim(),
            summary: summary.trim(),
            entityType: linkedType.trim() || null,
            entityId: linkedId.trim() || null,
            decidedAt: decidedAt || null,
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
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
                        {wsName}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Input
                        placeholder={t("entityType")}
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                        style={{ maxWidth: "160px" }}
                    />
                    <Button onClick={() => setCreateOpen(true)}>{t("new")}</Button>
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : all.length === 0 ? (
                <Card>
                    <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("noDecisions")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {all.map((d) => (
                        <Card key={d.id}>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: 0,
                                    }}
                                >
                                    {d.title}
                                </p>
                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--color-text)",
                                        margin: "6px 0 0",
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {d.summary}
                                </p>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "8px 0 0",
                                    }}
                                >
                                    {t("decidedBy")}: {d.decidedBy?.name ?? tC("unknown")}
                                    {` · ${t("decidedAt")}: ${new Date(d.decidedAt).toLocaleString()}`}
                                    {d.entityType
                                        ? ` · ${t("linkedEntity")}: ${d.entityType}${d.entityId ? ` / ${d.entityId}` : ""}`
                                        : ""}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {nextCursor && (
                <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                    {moreLoading ? tC("loading") : tC("showMore")}
                </Button>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={t("title")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={t("summary")}
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={4}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                            <Input
                                placeholder={t("entityType")}
                                value={linkedType}
                                onChange={(e) => setLinkedType(e.target.value)}
                            />
                            <Input
                                placeholder={t("entityId")}
                                value={linkedId}
                                onChange={(e) => setLinkedId(e.target.value)}
                            />
                        </div>
                        <Input
                            type="datetime-local"
                            value={decidedAt}
                            onChange={(e) => setDecidedAt(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={create.isPending}>
                            {tC("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
