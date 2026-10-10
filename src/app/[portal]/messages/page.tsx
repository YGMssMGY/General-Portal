"use client";

import { useEffect, useRef, useState } from "react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface Sender {
    id: string;
    name: string | null;
    image: string | null;
}

interface ThreadListItem {
    id: string;
    subject: string;
    subgroupId: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessage: {
        id: string;
        content: string;
        createdAt: string;
        sender: Sender;
    } | null;
    totalMessages: number;
    unreadCount: number;
}

interface ThreadMessage {
    id: string;
    content: string;
    createdAt: string;
    sender: Sender;
    read: boolean;
    readAt: string | null;
}

interface ThreadDetail {
    id: string;
    subject: string;
    subgroupId: string | null;
    createdAt: string;
    updatedAt: string;
    messages: ThreadMessage[];
}

interface MemberRow {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    membershipId: string;
    joinedAt: string;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

const QUICK_EMOJI = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];

interface ReactionGroup {
    emoji: string;
    count: number;
    mine: boolean;
    users: string[];
}

function MessageReactions({ messageId }: { messageId: string }) {
    const portal = usePortal();
    const t = useTranslations("reactions");
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: [portal, "reactions", "message", messageId],
        queryFn: () =>
            fetchJson<ReactionGroup[]>(`/api/reactions?entityType=message&entityId=${messageId}`),
        enabled: portal !== "",
    });
    const toggle = useMutation({
        mutationFn: (emoji: string) =>
            fetchJson<{ reacted: boolean }>("/api/reactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityType: "message", entityId: messageId, emoji }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [portal, "reactions", "message", messageId],
            });
        },
    });
    const groups = data ?? [];
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
            {QUICK_EMOJI.filter((e) => !groups.some((g) => g.emoji === e)).map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    title={t("react")}
                    onClick={() => toggle.mutate(emoji)}
                    disabled={toggle.isPending}
                    style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "13px",
                        padding: "1px 6px",
                        opacity: 0.6,
                    }}
                >
                    {emoji}
                </button>
            ))}
            {groups.map((g) => (
                <button
                    key={g.emoji}
                    type="button"
                    title={g.mine ? t("removeReaction") : t("react")}
                    onClick={() => toggle.mutate(g.emoji)}
                    disabled={toggle.isPending}
                    style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        backgroundColor: g.mine ? "var(--color-bg-secondary)" : "transparent",
                        cursor: "pointer",
                        fontSize: "13px",
                        padding: "1px 6px",
                        color: "var(--color-text)",
                    }}
                >
                    {g.emoji} {g.count}
                </button>
            ))}
        </div>
    );
}

export default function MessagesPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("messages");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const isAdmin = user?.role === "admin";
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<"list" | "thread">("list");
    const [createOpen, setCreateOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [recipientIds, setRecipientIds] = useState<string[]>([]);
    const [reply, setReply] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<ThreadListItem | null>(null);
    const [permanentTarget, setPermanentTarget] = useState<ThreadListItem | null>(null);
    const markedRef = useRef<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: firstPage, isLoading: threadsLoading } = useQuery({
        queryKey: [portal, "messages"],
        queryFn: () => fetchPage<ThreadListItem>("/api/messages"),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<ThreadListItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState<typeof firstPage>(undefined);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const threads = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await fetchPage<ThreadListItem>(
                `/api/messages?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setLoadingMore(false);
        }
    }

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: [portal, "messages", selectedId],
        queryFn: () => fetchJson<ThreadDetail>(`/api/messages/threads/${selectedId}?limit=100`),
        enabled: portal !== "" && selectedId !== null,
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [detail?.messages.length]);

    const markRead = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ markedAsRead: number }>(`/api/messages/threads/${id}/read`, {
                method: "POST",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
        },
    });

    useEffect(() => {
        if (detail && selectedId && markedRef.current !== selectedId) {
            markedRef.current = selectedId;
            markRead.mutate(selectedId);
        }
    }, [detail, selectedId, markRead]);

    const { data: recipientPage } = useQuery({
        queryKey: [portal, "message-recipients"],
        queryFn: () => fetchPage<MemberRow>("/api/members"),
        enabled: portal !== "" && createOpen,
    });

    const createThread = useMutation({
        mutationFn: (body: { subject: string; content: string; recipientIds: string[] }) =>
            fetchJson<ThreadDetail>("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
            setCreateOpen(false);
            setSubject("");
            setContent("");
            setRecipientIds([]);
            setSelectedId(created.id);
            setMobileView("thread");
            toast.success(t("newThread"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const sendReply = useMutation({
        mutationFn: (body: { content: string }) =>
            fetchJson<ThreadMessage>(`/api/messages/threads/${selectedId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "messages", selectedId] });
            queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
            setReply("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const removeThread = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ deleted: boolean }>(`/api/messages/threads/${id}`, {
                method: "DELETE",
            }),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
            if (selectedId === id) {
                setSelectedId(null);
                setMobileView("list");
            }
            setDeleteTarget(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const removeThreadPermanent = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ deleted: boolean }>(`/api/messages/threads/${id}?permanent=true`, {
                method: "DELETE",
            }),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
            if (selectedId === id) {
                setSelectedId(null);
                setMobileView("list");
            }
            setPermanentTarget(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const markAllRead = useMutation({
        mutationFn: async (ids: string[]) => {
            await Promise.all(
                ids.map((id) => fetchJson(`/api/messages/threads/${id}/read`, { method: "POST" })),
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function toggleRecipient(id: string) {
        setRecipientIds((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
        );
    }

    function handleCreate() {
        if (!content.trim()) return;
        createThread.mutate({
            subject: subject.trim() || t("newThread"),
            content: content.trim(),
            recipientIds,
        });
    }

    function handleReply() {
        if (!reply.trim() || !selectedId) return;
        sendReply.mutate({ content: reply.trim() });
    }

    const unreadTotal = threads.reduce((n, th) => n + th.unreadCount, 0);
    const recipients = recipientPage?.items ?? [];

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
                        {unreadTotal > 0 ? ` · ${unreadTotal} ${t("unread")}` : ""}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {unreadTotal > 0 && (
                        <Button
                            variant="outline"
                            onClick={() =>
                                markAllRead.mutate(
                                    threads.filter((th) => th.unreadCount > 0).map((th) => th.id),
                                )
                            }
                            disabled={markAllRead.isPending}
                        >
                            {t("markAllRead")}
                        </Button>
                    )}
                    <Button onClick={() => setCreateOpen(true)}>{t("newThread")}</Button>
                </div>
            </div>

            <div
                className="lg:grid lg:grid-cols-[320px_1fr]"
                style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "5px",
                    overflow: "hidden",
                    minHeight: "400px",
                }}
            >
                <div
                    className={mobileView === "thread" ? "hidden lg:flex" : "flex"}
                    style={{
                        flexDirection: "column",
                        borderRight: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-bg)",
                    }}
                >
                    <div style={{ flex: 1, overflowY: "auto", maxHeight: "60vh" }}>
                        {threadsLoading ? (
                            <div
                                style={{
                                    padding: "12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : threads.length === 0 ? (
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    padding: "24px",
                                    textAlign: "center",
                                    margin: 0,
                                }}
                            >
                                {t("noThreads")}
                            </p>
                        ) : (
                            threads.map((th) => {
                                const active = selectedId === th.id;
                                return (
                                    <button
                                        key={th.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedId(th.id);
                                            setMobileView("thread");
                                        }}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            padding: "12px",
                                            border: "none",
                                            borderBottom: "1px solid var(--color-border)",
                                            backgroundColor: active
                                                ? "var(--color-bg-secondary)"
                                                : "transparent",
                                            cursor: "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: "8px",
                                                marginBottom: "4px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: th.unreadCount > 0 ? 700 : 500,
                                                    color: "var(--color-text)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {th.subject}
                                            </span>
                                            {th.unreadCount > 0 && (
                                                <Badge variant="default">{th.unreadCount}</Badge>
                                            )}
                                        </div>
                                        {th.lastMessage && (
                                            <p
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: 0,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {th.lastMessage.sender?.name ?? tC("unknown")}
                                                {": "}
                                                {th.lastMessage.content}
                                            </p>
                                        )}
                                        <p
                                            style={{
                                                fontSize: "11px",
                                                color: "var(--color-text-secondary)",
                                                margin: "4px 0 0",
                                            }}
                                        >
                                            {new Date(th.updatedAt).toLocaleString(locale)}
                                            {` · ${th.totalMessages}`}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    {nextCursor && (
                        <div
                            style={{ padding: "12px", borderTop: "1px solid var(--color-border)" }}
                        >
                            <Button
                                variant="outline"
                                onClick={loadMore}
                                disabled={loadingMore}
                                style={{ width: "100%" }}
                            >
                                {loadingMore ? tC("loading") : tC("showMore")}
                            </Button>
                        </div>
                    )}
                </div>

                <div
                    className={mobileView === "list" ? "hidden lg:flex" : "flex"}
                    style={{ flexDirection: "column", backgroundColor: "var(--color-bg)" }}
                >
                    {!selectedId ? (
                        <div style={{ padding: "48px 24px", textAlign: "center" }}>
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {t("noMessages")}
                            </p>
                        </div>
                    ) : detailLoading ? (
                        <div
                            style={{
                                padding: "20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}
                        >
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : !detail ? (
                        <div style={{ padding: "48px 24px", textAlign: "center" }}>
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-destructive)",
                                    margin: 0,
                                }}
                            >
                                {tE("notFound")}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "12px 16px",
                                    borderBottom: "1px solid var(--color-border)",
                                }}
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="lg:hidden"
                                    onClick={() => setMobileView("list")}
                                >
                                    {tC("back")}
                                </Button>
                                <h2
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: 0,
                                        flex: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {detail.subject}
                                </h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setDeleteTarget(
                                            threads.find((th) => th.id === detail.id) ?? {
                                                id: detail.id,
                                                subject: detail.subject,
                                                subgroupId: detail.subgroupId,
                                                createdAt: detail.createdAt,
                                                updatedAt: detail.updatedAt,
                                                lastMessage: null,
                                                totalMessages: detail.messages.length,
                                                unreadCount: 0,
                                            },
                                        )
                                    }
                                >
                                    {tC("delete")}
                                </Button>
                                {isAdmin && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                            setPermanentTarget(
                                                threads.find((th) => th.id === detail.id) ?? {
                                                    id: detail.id,
                                                    subject: detail.subject,
                                                    subgroupId: detail.subgroupId,
                                                    createdAt: detail.createdAt,
                                                    updatedAt: detail.updatedAt,
                                                    lastMessage: null,
                                                    totalMessages: detail.messages.length,
                                                    unreadCount: 0,
                                                },
                                            )
                                        }
                                    >
                                        {tC("deleteForever")}
                                    </Button>
                                )}
                            </div>
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    padding: "16px",
                                    maxHeight: "50vh",
                                }}
                            >
                                {detail.messages.length === 0 ? (
                                    <p
                                        style={{
                                            fontSize: "13px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                        }}
                                    >
                                        {t("noMessages")}
                                    </p>
                                ) : (
                                    detail.messages.map((msg) => (
                                        <div key={msg.id} style={{ marginBottom: "16px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    marginBottom: "4px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "13px",
                                                        fontWeight: 600,
                                                        color: "var(--color-text)",
                                                    }}
                                                >
                                                    {msg.sender?.name ?? tC("unknown")}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "var(--color-text-secondary)",
                                                    }}
                                                >
                                                    {new Date(msg.createdAt).toLocaleString(locale)}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: msg.read
                                                            ? "var(--color-text-secondary)"
                                                            : "var(--color-primary)",
                                                    }}
                                                >
                                                    {msg.read
                                                        ? msg.readAt
                                                            ? new Date(msg.readAt).toLocaleString(
                                                                  locale,
                                                              )
                                                            : ""
                                                        : t("unread")}
                                                </span>
                                            </div>
                                            <p
                                                style={{
                                                    fontSize: "14px",
                                                    color: "var(--color-text)",
                                                    margin: 0,
                                                    whiteSpace: "pre-wrap",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {msg.content}
                                            </p>
                                            <MessageReactions messageId={msg.id} />
                                        </div>
                                    ))
                                )}
                                <div ref={bottomRef} />
                            </div>
                            <div
                                style={{
                                    padding: "12px 16px",
                                    borderTop: "1px solid var(--color-border)",
                                    display: "flex",
                                    gap: "8px",
                                }}
                            >
                                <Input
                                    placeholder={t("reply")}
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleReply}
                                    disabled={!reply.trim() || sendReply.isPending}
                                >
                                    {t("send")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("newThread")}</DialogTitle>
                        <DialogDescription>{t("participants")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={t("subject")}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                        <Textarea
                            placeholder={t("noMessages")}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                        />
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                maxHeight: "180px",
                                overflowY: "auto",
                                border: "1px solid var(--color-border)",
                                borderRadius: "5px",
                                padding: "8px",
                            }}
                        >
                            {recipients.map((m) => (
                                <label
                                    key={m.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontSize: "13px",
                                        color: "var(--color-text)",
                                        padding: "4px",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={recipientIds.includes(m.id)}
                                        onChange={() => toggleRecipient(m.id)}
                                    />
                                    <span>
                                        {m.name ?? m.email} ({m.email})
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!content.trim() || createThread.isPending}
                        >
                            {t("send")}
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
                description={deleteTarget?.subject}
                confirmLabel={tC("delete")}
                destructive
                onConfirm={() => {
                    if (deleteTarget) removeThread.mutate(deleteTarget.id);
                }}
            />
            <ConfirmDialog
                open={permanentTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setPermanentTarget(null);
                }}
                title={tC("deleteForever")}
                description={permanentTarget?.subject}
                confirmLabel={tC("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={permanentTarget?.subject ?? tC("deleteForever")}
                onConfirm={() => {
                    if (permanentTarget) removeThreadPermanent.mutate(permanentTarget.id);
                }}
            />
        </div>
    );
}
