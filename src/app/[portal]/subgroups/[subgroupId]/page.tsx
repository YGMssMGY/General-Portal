"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, MessageSquare, Trash2, Users } from "lucide-react";

interface SubgroupUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface SubgroupMembership {
    id: string;
    subgroupId: string;
    userId: string;
    joinedAt: string;
    user: SubgroupUser;
}

interface SubgroupDetail {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    members: SubgroupMembership[];
    _count: { members: number };
}

interface ThreadSummary {
    id: string;
    subject: string;
    lastMessage: {
        id: string;
        content: string;
        createdAt: string;
        sender: { id: string; name: string | null };
    } | null;
    totalMessages: number;
}

interface TaskSummary {
    id: string;
    title: string;
    status: string;
    priority: number;
    subgroupId: string | null;
}

interface DirectoryEntry {
    id: string;
    name: string | null;
    email: string;
}

export default function SubgroupDetailPage() {
    const portal = usePortal();
    const params = useParams();
    const router = useRouter();
    const subgroupId = Array.isArray(params.subgroupId)
        ? (params.subgroupId[0] ?? "")
        : (params.subgroupId ?? "");
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("subgroups");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const tn = useTranslations("nav");
    const tm = useTranslations("messages");
    const queryClient = useQueryClient();

    const canManage = user?.permissions.includes("manage_subgroups") ?? false;
    const isAdmin = user?.role === "admin";

    const [addValue, setAddValue] = useState("");
    const [removeTarget, setRemoveTarget] = useState<{ userId: string; label: string } | null>(
        null,
    );
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const {
        data: subgroup,
        isLoading,
        isError,
    } = useQuery<SubgroupDetail>({
        queryKey: [portal, "subgroups", subgroupId],
        queryFn: () => fetchJson(`/api/subgroups/${subgroupId}`),
        enabled: portal !== "" && subgroupId !== "",
    });

    usePageTitle(`${subgroup?.name ?? t("title")} | ${workspace?.name ?? portal}`);

    const { data: threadPage } = useQuery({
        queryKey: [portal, "messages", subgroupId],
        queryFn: () => fetchPage<ThreadSummary>(`/api/messages?subgroupId=${subgroupId}`),
        enabled: portal !== "" && subgroupId !== "",
    });

    const { data: taskPage } = useQuery({
        queryKey: [portal, "tasks", "subgroup", subgroupId],
        queryFn: () => fetchPage<TaskSummary>(`/api/tasks?limit=100`),
        enabled: portal !== "" && subgroupId !== "",
    });

    const { data: directoryPage } = useQuery({
        queryKey: [portal, "members"],
        queryFn: () => fetchPage<DirectoryEntry>(`/api/members?limit=100`),
        enabled: canManage,
    });

    const threads = threadPage?.items ?? [];
    const tasks = (taskPage?.items ?? []).filter((task) => task.subgroupId === subgroupId);
    const members = subgroup?.members ?? [];
    const isMember = members.some((m) => m.userId === user?.id);

    const addMutation = useMutation({
        mutationFn: (userIds: string[]) =>
            fetchJson(`/api/subgroups/${subgroupId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userIds }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "subgroups", subgroupId] });
            queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
            setAddValue("");
            toast.success(t("members"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const removeMutation = useMutation({
        mutationFn: (userId: string) =>
            fetchJson(`/api/subgroups/${subgroupId}/members?userId=${userId}`, {
                method: "DELETE",
            }),
        onSuccess: (_data, userId) => {
            queryClient.invalidateQueries({ queryKey: [portal, "subgroups", subgroupId] });
            queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
            setRemoveTarget(null);
            setLeaveOpen(false);
            toast.success(t("members"));
            if (userId === user?.id) router.push(`/${portal}/subgroups`);
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () =>
            fetchJson(`/api/subgroups/${subgroupId}${isAdmin ? "?permanent=true" : ""}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
            setDeleteOpen(false);
            router.push(`/${portal}/subgroups`);
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function handleAdd() {
        const needle = addValue.trim().toLowerCase();
        if (!needle) return;
        const match = (directoryPage?.items ?? []).find(
            (entry) => entry.email.toLowerCase() === needle || entry.id.toLowerCase() === needle,
        );
        if (!match) {
            toast.error(te("notFound"));
            return;
        }
        addMutation.mutate([match.id]);
    }

    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Skeleton style={{ width: "40%", height: "24px", borderRadius: "5px" }} />
                <Skeleton style={{ width: "100%", height: "120px", borderRadius: "5px" }} />
            </div>
        );
    }

    if (isError || !subgroup) {
        return (
            <Card>
                <CardContent style={{ padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                        {te("notFound")}
                    </p>
                    <div style={{ marginTop: "12px" }}>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/${portal}/subgroups`}>{tc("back")}</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const accent = subgroup.color ?? "var(--color-primary)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                }}
            >
                <Link
                    href={`/${portal}/subgroups`}
                    style={{ color: "var(--color-primary)", textDecoration: "none" }}
                >
                    {t("title")}
                </Link>
                <span>/</span>
                <span style={{ color: accent, fontWeight: 600 }}>{subgroup.name}</span>
            </div>

            <Card>
                <CardContent
                    style={{
                        padding: "20px 24px",
                        borderLeft: `4px solid ${accent}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: "18px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {subgroup.name}
                        </h1>
                        {subgroup.description && (
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    margin: "4px 0 0",
                                }}
                            >
                                {subgroup.description}
                            </p>
                        )}
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "6px 0 0",
                            }}
                        >
                            {subgroup._count.members} {t("members")} · {tasks.length} {tn("tasks")}{" "}
                            · {threads.length} {tm("title")}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {isMember && (
                            <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)}>
                                {t("leave")}
                            </Button>
                        )}
                        {canManage && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteOpen(true)}
                            >
                                {tc("delete")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="tasks">
                <TabsList>
                    <TabsTrigger value="tasks">
                        <ClipboardList size={14} />
                        <span>Tasks ({tasks.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="threads">
                        <MessageSquare size={14} />
                        <span>Threads ({threads.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="members">
                        <Users size={14} />
                        <span>
                            {t("members")} ({members.length})
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tasks">
                    {tasks.length === 0 ? (
                        <Card>
                            <CardContent
                                style={{
                                    padding: "32px",
                                    textAlign: "center",
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                {t("noSubgroupsJoined")}
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {tasks.slice(0, 10).map((task) => (
                                <Card key={task.id}>
                                    <CardContent
                                        style={{
                                            padding: "10px 16px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: 500,
                                                color: "var(--color-text)",
                                                flex: 1,
                                            }}
                                        >
                                            {task.title}
                                        </span>
                                        <Badge variant="outline">{task.status}</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="threads">
                    {threads.length === 0 ? (
                        <Card>
                            <CardContent
                                style={{
                                    padding: "32px",
                                    textAlign: "center",
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                {t("noSubgroupsJoined")}
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {threads.slice(0, 10).map((thread) => (
                                <Card key={thread.id}>
                                    <CardContent style={{ padding: "10px 16px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    color: "var(--color-text)",
                                                    flex: 1,
                                                }}
                                            >
                                                {thread.subject}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                {thread.totalMessages}
                                            </span>
                                        </div>
                                        {thread.lastMessage && (
                                            <p
                                                style={{
                                                    margin: "4px 0 0",
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {thread.lastMessage.content}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="members">
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {canManage && (
                            <Card>
                                <CardContent
                                    style={{
                                        padding: "16px",
                                        display: "flex",
                                        gap: "8px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Input
                                        placeholder={tc("email")}
                                        value={addValue}
                                        onChange={(e) => setAddValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAdd();
                                        }}
                                        style={{ flex: 1, minWidth: "200px" }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleAdd}
                                        disabled={!addValue.trim() || addMutation.isPending}
                                    >
                                        {t("addMembers")}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {members.map((member) => (
                                <Card key={member.id}>
                                    <CardContent
                                        style={{
                                            padding: "10px 16px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                        }}
                                    >
                                        <div>
                                            <span
                                                style={{
                                                    fontSize: "14px",
                                                    fontWeight: 500,
                                                    color: "var(--color-text)",
                                                }}
                                            >
                                                {member.user.name ?? member.user.email}
                                            </span>
                                            {member.user.name && (
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                        display: "block",
                                                    }}
                                                >
                                                    {member.user.email}
                                                </span>
                                            )}
                                        </div>
                                        {canManage && member.userId !== user?.id && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setRemoveTarget({
                                                        userId: member.userId,
                                                        label:
                                                            member.user.name ?? member.user.email,
                                                    })
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={removeTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoveTarget(null);
                }}
                title={t("removeMember")}
                description={removeTarget?.label}
                confirmLabel={t("removeMember")}
                destructive
                onConfirm={() => {
                    if (removeTarget) removeMutation.mutate(removeTarget.userId);
                }}
            />

            <ConfirmDialog
                open={leaveOpen}
                onOpenChange={setLeaveOpen}
                title={t("leave")}
                description={subgroup.name}
                confirmLabel={t("leave")}
                destructive
                onConfirm={() => {
                    if (user?.id) removeMutation.mutate(user.id);
                }}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={tc("delete")}
                description={subgroup.name}
                confirmLabel={isAdmin ? tc("deleteForever") : tc("delete")}
                destructive
                requireTypedText={isAdmin}
                typingChallenge={subgroup.name}
                onConfirm={() => deleteMutation.mutate()}
            />
        </div>
    );
}
