"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Users, Plus } from "lucide-react";

interface Subgroup {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    _count: { members: number };
    isMember: boolean;
}

const PAGE_SIZE = 20;

const PRESET_COLORS = ["#0f62fe", "#da1e28", "#24a148", "#f1c21b", "#6f6f6f", "#161616"];

export default function SubgroupsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("subgroups");
    const tB = useTranslations("broadcast");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const canManage = user?.permissions.includes("manage_subgroups") ?? false;

    const [cursor, setCursor] = useState<string | null>(null);
    const [items, setItems] = useState<Subgroup[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [appliedKey, setAppliedKey] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [broadcastTarget, setBroadcastTarget] = useState<Subgroup | null>(null);
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastBody, setBroadcastBody] = useState("");
    const [broadcastLink, setBroadcastLink] = useState("");

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "subgroups", cursor ?? ""],
        queryFn: () =>
            fetchPage<Subgroup>(
                `/api/subgroups?limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            ),
        enabled: portal !== "",
    });

    const key = cursor ?? "";
    if (data && appliedKey !== key) {
        setAppliedKey(key);
        setNextCursor(data.nextCursor);
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
    }

    useEffect(() => {
        if (isError) toast.error(te("internal"));
    }, [isError, te]);

    const createMutation = useMutation({
        mutationFn: (body: { name: string; description?: string; color?: string }) =>
            fetchJson(`/api/subgroups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
            setCursor(null);
            setShowCreate(false);
            setName("");
            setDescription("");
            setColor(PRESET_COLORS[0]);
            toast.success(t("title"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function handleCreate() {
        if (!name.trim()) return;
        createMutation.mutate({
            name: name.trim(),
            description: description.trim() || undefined,
            color,
        });
    }

    const broadcastMutation = useMutation({
        mutationFn: (body: { id: string; title: string; body: string; link?: string }) =>
            fetchJson<{ sent: number }>(`/api/subgroups/${body.id}/broadcast`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: body.title,
                    body: body.body,
                    link: body.link || undefined,
                }),
            }),
        onSuccess: (data) => {
            setBroadcastTarget(null);
            setBroadcastTitle("");
            setBroadcastBody("");
            setBroadcastLink("");
            toast.success(tB("sent", { count: data.sent }));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function handleBroadcast() {
        if (!broadcastTarget || !broadcastTitle.trim() || !broadcastBody.trim()) return;
        broadcastMutation.mutate({
            id: broadcastTarget.id,
            title: broadcastTitle.trim(),
            body: broadcastBody.trim(),
            link: broadcastLink.trim() || undefined,
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
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
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        {tc("retry")}
                    </Button>
                    {canManage && (
                        <Button size="sm" onClick={() => setShowCreate(true)}>
                            <Plus size={16} />
                            <span>{t("new")}</span>
                        </Button>
                    )}
                </div>
            </div>

            {isLoading && items.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "120px", borderRadius: "5px" }}
                        />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent
                        style={{
                            padding: "48px 24px",
                            textAlign: "center",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <Users size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                        <p style={{ fontSize: "14px", margin: 0 }}>{t("noSubgroups")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map((group) => (
                        <Card key={group.id}>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ display: "flex", minHeight: "100px" }}>
                                    <div
                                        style={{
                                            width: "5px",
                                            flexShrink: 0,
                                            backgroundColor: group.color ?? "var(--color-primary)",
                                            borderRadius: "5px 0 0 5px",
                                        }}
                                    />
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: "20px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                        }}
                                    >
                                        <div>
                                            <h3
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: 600,
                                                    color: "var(--color-text)",
                                                    margin: 0,
                                                }}
                                            >
                                                {group.name}
                                            </h3>
                                            {group.description && (
                                                <p
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: "4px 0 0",
                                                    }}
                                                >
                                                    {group.description}
                                                </p>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                marginTop: "auto",
                                                gap: "8px",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                }}
                                            >
                                                <Users size={14} />
                                                {group._count.members} {t("members")}
                                            </span>
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                {group.isMember && (
                                                    <Badge variant="secondary">
                                                        {t("members")}
                                                    </Badge>
                                                )}
                                                {canManage && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setBroadcastTarget(group)}
                                                    >
                                                        {tB("send")}
                                                    </Button>
                                                )}
                                                <Button asChild size="sm">
                                                    <Link href={`/${portal}/subgroups/${group.id}`}>
                                                        {t("join")}
                                                    </Link>
                                                </Button>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {nextCursor && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Button variant="outline" onClick={() => setCursor(nextCursor)}>
                        {tc("showMore")}
                    </Button>
                </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                        <DialogDescription>{t("title")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tc("name")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Textarea
                            placeholder={tc("description")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-label={c}
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "5px",
                                        border:
                                            color === c
                                                ? "3px solid var(--color-text)"
                                                : "2px solid var(--color-border)",
                                        backgroundColor: c,
                                        cursor: "pointer",
                                        padding: 0,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>
                            {tc("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!name.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? tc("saving") : tc("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={broadcastTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setBroadcastTarget(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {tB("dialogTitle")}: {broadcastTarget?.name}
                        </DialogTitle>
                        <DialogDescription>{tB("dialogHint")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tB("titleLabel")}
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={tB("bodyLabel")}
                            value={broadcastBody}
                            onChange={(e) => setBroadcastBody(e.target.value)}
                            rows={4}
                        />
                        <Input
                            placeholder={tB("linkLabel")}
                            value={broadcastLink}
                            onChange={(e) => setBroadcastLink(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBroadcastTarget(null)}>
                            {tc("cancel")}
                        </Button>
                        <Button
                            onClick={handleBroadcast}
                            disabled={
                                !broadcastTitle.trim() ||
                                !broadcastBody.trim() ||
                                broadcastMutation.isPending
                            }
                        >
                            {broadcastMutation.isPending ? tc("saving") : tB("send")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
