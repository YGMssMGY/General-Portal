"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

interface LinkItem {
    id: string;
    title: string;
    url: string;
    description: string | null;
    category: string | null;
    createdAt: string;
    uploadedBy: { id: string; name: string | null; image: string | null } | null;
    createdBy: { id: string; name: string | null } | null;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function LinksPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("links");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const isAdmin = user?.role === "admin";

    const [input, setInput] = useState("");
    const [query, setQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
    const [permanentTarget, setPermanentTarget] = useState<LinkItem | null>(null);

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "links", query],
        queryFn: () =>
            fetchPage<LinkItem>(
                query.trim().length === 0
                    ? "/api/links"
                    : `/api/links?q=${encodeURIComponent(query.trim())}`,
            ),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<LinkItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const links = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const base =
                query.trim().length === 0
                    ? "/api/links"
                    : `/api/links?q=${encodeURIComponent(query.trim())}`;
            const page = await fetchPage<LinkItem>(
                `${base}${base.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const createLink = useMutation({
        mutationFn: (body: {
            title: string;
            url: string;
            description?: string | null;
            category?: string | null;
        }) =>
            fetchJson<LinkItem>("/api/links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "links"] });
            setCreateOpen(false);
            setTitle("");
            setUrl("");
            setCategory("");
            setDescription("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const deleteLink = useMutation({
        mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
            fetchJson<{ deleted: boolean }>(
                permanent ? `/api/links/${id}?permanent=true` : `/api/links/${id}`,
                { method: "DELETE" },
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "links"] });
            setDeleteTarget(null);
            setPermanentTarget(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleCreate() {
        if (!title.trim() || !url.trim()) {
            toast.error(tE("validationFailed"));
            return;
        }
        createLink.mutate({
            title: title.trim(),
            url: url.trim(),
            description: description.trim() || null,
            category: category.trim() || null,
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
                <Button onClick={() => setCreateOpen(true)}>{t("new")}</Button>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setQuery(input);
                }}
                style={{ display: "flex", gap: "8px", maxWidth: "480px" }}
            >
                <Input
                    placeholder={tC("search")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <Button type="submit" variant="outline">
                    {tC("search")}
                </Button>
                {query.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setInput("");
                            setQuery("");
                        }}
                    >
                        {tC("reset")}
                    </Button>
                )}
            </form>

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : links.length === 0 ? (
                <Card>
                    <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("noLinks")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {links.map((link) => (
                        <Card key={link.id}>
                            <CardContent
                                style={{
                                    padding: "12px 16px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: "12px",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "var(--color-primary)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        {link.title}
                                    </a>
                                    <p
                                        style={{
                                            fontSize: "12px",
                                            color: "var(--color-text-secondary)",
                                            margin: "2px 0 0",
                                        }}
                                    >
                                        {t("url")}: {link.url}
                                    </p>
                                    {link.description && (
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text)",
                                                margin: "4px 0 0",
                                            }}
                                        >
                                            {link.description}
                                        </p>
                                    )}
                                    <p
                                        style={{
                                            fontSize: "11px",
                                            color: "var(--color-text-secondary)",
                                            margin: "4px 0 0",
                                        }}
                                    >
                                        {link.createdBy?.name ??
                                            link.uploadedBy?.name ??
                                            tC("unknown")}
                                        {` · ${new Date(link.createdAt).toLocaleString(locale)}`}
                                    </p>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        flexShrink: 0,
                                    }}
                                >
                                    {link.category && (
                                        <Badge variant="outline">
                                            {t("category")}: {link.category}
                                        </Badge>
                                    )}
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: "var(--color-primary)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        {t("openLink")}
                                    </a>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDeleteTarget(link)}
                                    >
                                        {tC("delete")}
                                    </Button>
                                    {isAdmin && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => setPermanentTarget(link)}
                                        >
                                            {tC("deleteForever")}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {nextCursor && (
                        <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                            {moreLoading ? tC("loading") : tC("showMore")}
                        </Button>
                    )}
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tC("title")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Input
                            placeholder={t("url")}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            inputMode="url"
                        />
                        <Input
                            placeholder={t("category")}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                        <Textarea
                            placeholder={tC("description")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!title.trim() || !url.trim() || createLink.isPending}
                        >
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={tC("delete")}
                description={deleteTarget?.title}
                confirmLabel={tC("delete")}
                destructive
                onConfirm={() => {
                    if (deleteTarget) deleteLink.mutate({ id: deleteTarget.id, permanent: false });
                }}
            />
            <ConfirmDialog
                open={permanentTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setPermanentTarget(null);
                }}
                title={tC("deleteForever")}
                description={permanentTarget?.title}
                confirmLabel={tC("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={permanentTarget?.title ?? tC("deleteForever")}
                onConfirm={() => {
                    if (permanentTarget)
                        deleteLink.mutate({ id: permanentTarget.id, permanent: true });
                }}
            />
        </div>
    );
}
