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
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";

interface ShowcaseItem {
    id: string;
    type: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    sortOrder: number;
    isActive: boolean;
}

const TYPES = ["event_feature", "announcement", "gallery_image"];

export default function ShowcaseAdminPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("showcase");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    usePageTitle(`${t("manageShowcase")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const canManage =
        (user?.permissions.includes("manage_showcase") ?? false) &&
        (user?.permissions.includes("manage_announcements") ?? false);
    const isAdmin = user?.role === "admin";

    const [activeTab, setActiveTab] = useState(TYPES[0]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ShowcaseItem | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formImageUrl, setFormImageUrl] = useState("");
    const [formLinkUrl, setFormLinkUrl] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<ShowcaseItem | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "showcase"],
        queryFn: () => fetchPage<ShowcaseItem>(`/api/showcase?limit=100`),
        enabled: portal !== "",
    });

    useEffect(() => {
        if (isError) toast.error(te("internal"));
    }, [isError, te]);

    const sorted = [...(data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const filtered = sorted.filter((item) => item.type === activeTab);

    const createMutation = useMutation({
        mutationFn: (body: {
            type: string;
            title: string;
            description?: string;
            imageUrl?: string;
            linkUrl?: string;
        }) =>
            fetchJson(`/api/showcase`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
            closeForm();
            toast.success(t("title"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            body,
        }: {
            id: string;
            body: {
                title?: string;
                description?: string | null;
                imageUrl?: string | null;
                linkUrl?: string | null;
                isActive?: boolean;
            };
        }) =>
            fetchJson(`/api/showcase/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
            closeForm();
            toast.success(t("title"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            fetchJson(`/api/showcase/${id}${isAdmin ? "?permanent=true" : ""}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
            setDeleteTarget(null);
            toast.success(tc("delete"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const reorderMutation = useMutation({
        mutationFn: (items: { id: string; sortOrder: number }[]) =>
            fetchJson(`/api/showcase/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function closeForm() {
        setShowForm(false);
        setEditing(null);
        setFormTitle("");
        setFormDescription("");
        setFormImageUrl("");
        setFormLinkUrl("");
    }

    function openCreate() {
        setEditing(null);
        setFormTitle("");
        setFormDescription("");
        setFormImageUrl("");
        setFormLinkUrl("");
        setShowForm(true);
    }

    function openEdit(item: ShowcaseItem) {
        setEditing(item);
        setFormTitle(item.title);
        setFormDescription(item.description ?? "");
        setFormImageUrl(item.imageUrl ?? "");
        setFormLinkUrl(item.linkUrl ?? "");
        setShowForm(true);
    }

    function handleSave() {
        if (!formTitle.trim()) return;
        const body = {
            title: formTitle.trim(),
            description: formDescription.trim() ? formDescription.trim() : null,
            imageUrl: formImageUrl.trim() ? formImageUrl.trim() : null,
            linkUrl: formLinkUrl.trim() ? formLinkUrl.trim() : null,
        };
        if (editing) {
            updateMutation.mutate({ id: editing.id, body });
        } else {
            createMutation.mutate({
                type: activeTab,
                title: body.title,
                description: body.description ?? undefined,
                imageUrl: body.imageUrl ?? undefined,
                linkUrl: body.linkUrl ?? undefined,
            });
        }
    }

    function move(item: ShowcaseItem, direction: -1 | 1) {
        const idx = sorted.findIndex((s) => s.id === item.id);
        const other = sorted[idx + direction];
        if (!other) return;
        const orders = new Map(sorted.map((s) => [s.id, s.sortOrder]));
        orders.set(item.id, other.sortOrder);
        orders.set(other.id, item.sortOrder);
        reorderMutation.mutate(sorted.map((s) => ({ id: s.id, sortOrder: orders.get(s.id) ?? 0 })));
    }

    function typeLabel(type: string): string {
        if (type === "event_feature") return t("itemTypeEventFeature");
        if (type === "announcement") return t("itemTypeAnnouncement");
        return t("itemTypeGalleryImage");
    }

    if (!canManage) {
        return (
            <Card>
                <CardContent style={{ padding: "64px 24px", textAlign: "center" }}>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                        }}
                    >
                        {te("forbidden")}
                    </p>
                </CardContent>
            </Card>
        );
    }

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
                    {t("manageShowcase")}
                </h1>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        {tc("retry")}
                    </Button>
                    <Button size="sm" onClick={openCreate}>
                        <Plus size={16} />
                        <span>{t("addItem")}</span>
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    {TYPES.map((type) => (
                        <TabsTrigger key={type} value={type}>
                            {typeLabel(type)}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {TYPES.map((type) => (
                    <TabsContent key={type} value={type}>
                        {isLoading ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        style={{
                                            width: "100%",
                                            height: "72px",
                                            borderRadius: "5px",
                                        }}
                                    />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <Card>
                                <CardContent
                                    style={{
                                        padding: "48px 24px",
                                        textAlign: "center",
                                        color: "var(--color-text-secondary)",
                                        fontSize: "14px",
                                    }}
                                >
                                    {t("noItems")}
                                </CardContent>
                            </Card>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {filtered.map((item) => (
                                    <Card key={item.id}>
                                        <CardContent
                                            style={{
                                                padding: "12px 16px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
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
                                                    <span
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text)",
                                                        }}
                                                    >
                                                        {item.title}
                                                    </span>
                                                    {item.isActive && (
                                                        <Badge variant="secondary">
                                                            {t("isActive")}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <p
                                                        style={{
                                                            fontSize: "13px",
                                                            color: "var(--color-text-secondary)",
                                                            margin: "2px 0 0",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                            <Switch
                                                checked={item.isActive}
                                                disabled={updateMutation.isPending}
                                                onCheckedChange={(checked) =>
                                                    updateMutation.mutate({
                                                        id: item.id,
                                                        body: { isActive: checked },
                                                    })
                                                }
                                            />
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={reorderMutation.isPending}
                                                onClick={() => move(item, -1)}
                                            >
                                                <ArrowUp size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={reorderMutation.isPending}
                                                onClick={() => move(item, 1)}
                                            >
                                                <ArrowDown size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEdit(item)}
                                            >
                                                <Pencil size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDeleteTarget(item)}
                                            >
                                                {tc("delete")}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            <Dialog
                open={showForm}
                onOpenChange={(open) => {
                    if (!open) closeForm();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? tc("edit") : t("addItem")}</DialogTitle>
                        <DialogDescription>
                            {t("itemType")}: {typeLabel(editing?.type ?? activeTab)}
                        </DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tc("title")}
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={tc("description")}
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            rows={3}
                        />
                        <Input
                            placeholder={t("imageUrl")}
                            value={formImageUrl}
                            onChange={(e) => setFormImageUrl(e.target.value)}
                        />
                        <Input
                            placeholder={t("linkUrl")}
                            value={formLinkUrl}
                            onChange={(e) => setFormLinkUrl(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeForm}>
                            {tc("cancel")}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={
                                !formTitle.trim() ||
                                createMutation.isPending ||
                                updateMutation.isPending
                            }
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? tc("saving")
                                : tc("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={tc("delete")}
                description={deleteTarget?.title}
                confirmLabel={isAdmin ? tc("deleteForever") : tc("delete")}
                destructive
                requireTypedText={isAdmin}
                typingChallenge={deleteTarget?.title ?? ""}
                onConfirm={() => {
                    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                }}
            />
        </div>
    );
}
