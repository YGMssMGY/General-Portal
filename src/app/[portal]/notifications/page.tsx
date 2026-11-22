"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";

interface Notification {
    id: string;
    title: string;
    body: string | null;
    type: string;
    read: boolean;
    link: string | null;
    createdAt: string;
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return new Date(iso).toLocaleDateString();
}

async function fetchNotifications(): Promise<{ items: Notification[]; unread: number }> {
    const res = await fetch(`/api/notifications?limit=50`, { credentials: "same-origin" });
    if (res.status === 401) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new Error("Unauthorized");
    }
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Request failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as { success: boolean; data?: Notification[] } | Notification[];
    const items =
        typeof json === "object" && json !== null && "success" in json
            ? ((json as { success: boolean; data?: Notification[] }).data ?? [])
            : (json as Notification[]);
    return {
        items: Array.isArray(items) ? items : [],
        unread: Number(res.headers.get("X-Unread-Count") ?? 0),
    };
}

export default function NotificationsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("notifications");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const [unreadOnly, setUnreadOnly] = useState(false);

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: [portal, "notifications"],
        queryFn: fetchNotifications,
        enabled: portal !== "",
    });

    const markRead = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/notifications/${id}/read`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "notifications"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const markAllRead = useMutation({
        mutationFn: () => fetchJson(`/api/notifications/read-all`, { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "notifications"] });
            toast.success(t("markAllRead"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const all = data?.items ?? [];
    const unread = data?.unread ?? 0;
    const list = unreadOnly ? all.filter((n) => !n.read) : all;

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
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                    {unread > 0 && (
                        <Badge variant="default">
                            {unread} {t("unreadOnly")}
                        </Badge>
                    )}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Button
                        size="sm"
                        variant={unreadOnly ? "outline" : "default"}
                        onClick={() => setUnreadOnly(false)}
                    >
                        {t("all")}
                    </Button>
                    <Button
                        size="sm"
                        variant={unreadOnly ? "default" : "outline"}
                        onClick={() => setUnreadOnly(true)}
                    >
                        {t("unreadOnly")}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        {tc("retry")}
                    </Button>
                    {unread > 0 && (
                        <Button
                            size="sm"
                            onClick={() => markAllRead.mutate()}
                            disabled={markAllRead.isPending}
                        >
                            <CheckCheck size={16} />
                            <span>{t("markAllRead")}</span>
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "72px", borderRadius: "5px" }}
                        />
                    ))}
                </div>
            ) : isError ? (
                <Card>
                    <CardContent style={{ padding: "32px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-destructive)",
                                margin: 0,
                            }}
                        >
                            {te("internal")}
                        </p>
                        <div style={{ marginTop: "12px" }}>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                {tc("retry")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : list.length === 0 ? (
                <Card>
                    <CardContent
                        style={{
                            padding: "48px 24px",
                            textAlign: "center",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <Bell size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                        <p style={{ fontSize: "14px", margin: 0 }}>{t("noNotifications")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {list.map((n) => (
                        <Card key={n.id}>
                            <CardContent
                                style={{
                                    padding: "14px 16px",
                                    borderLeft: n.read
                                        ? undefined
                                        : "3px solid var(--color-primary)",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "10px",
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: "8px",
                                        }}
                                    >
                                        <strong
                                            style={{
                                                fontSize: "14px",
                                                color: "var(--color-text)",
                                                fontWeight: n.read ? 500 : 700,
                                            }}
                                        >
                                            {n.title}
                                        </strong>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                color: "var(--color-text-secondary)",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {relativeTime(n.createdAt)}
                                        </span>
                                    </div>
                                    {n.body && (
                                        <p
                                            style={{
                                                margin: "4px 0 0",
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {n.body}
                                        </p>
                                    )}
                                    <div
                                        style={{
                                            marginTop: "8px",
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center",
                                        }}
                                    >
                                        {!n.read && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => markRead.mutate(n.id)}
                                                disabled={markRead.isPending}
                                            >
                                                {t("markRead")}
                                            </Button>
                                        )}
                                        {n.link && (
                                            <Link
                                                href={n.link}
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-primary)",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                }}
                                            >
                                                <ExternalLink size={12} />
                                                {n.link}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
