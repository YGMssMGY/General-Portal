"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

interface ActivityRow {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: { id: string; name: string | null; email: string; image: string | null } | null;
}

const PAGE_SIZE = 20;
const ENTITY_FILTERS = [
    "task",
    "event",
    "proposal",
    "meeting",
    "message",
    "subgroup",
    "cooperation_request",
    "member",
];

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

export default function ActivityPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("activity");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const [filter, setFilter] = useState("all");
    const [cursor, setCursor] = useState<string | null>(null);
    const [items, setItems] = useState<ActivityRow[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [appliedKey, setAppliedKey] = useState("");

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "activity", filter, cursor ?? ""],
        queryFn: () =>
            fetchPage<ActivityRow>(
                `/api/activity?limit=${PAGE_SIZE}${filter !== "all" ? `&entityType=${encodeURIComponent(filter)}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            ),
        enabled: portal !== "",
    });

    const key = `${filter}|${cursor ?? ""}`;
    if (data && appliedKey !== key) {
        setAppliedKey(key);
        setNextCursor(data.nextCursor);
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
    }

    useEffect(() => {
        if (isError) toast.error(te("internal"));
    }, [isError, te]);

    function actionLabel(action: string): string {
        if (action === "create" || action === "created") return t("created");
        if (action === "update" || action === "updated") return t("updated");
        if (action === "delete" || action === "deleted") return t("deleted");
        if (action === "approve" || action === "approved") return t("approved");
        if (action === "reject" || action === "rejected") return t("rejected");
        return action;
    }

    function pickFilter(value: string) {
        setFilter(value);
        setCursor(null);
    }

    if (user && !user.permissions.includes("view_activity")) {
        return (
            <Card>
                <CardContent style={{ padding: "32px", textAlign: "center" }}>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-destructive)",
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
                    {t("title")}
                </h1>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    {tc("retry")}
                </Button>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <Button
                    size="sm"
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => pickFilter("all")}
                >
                    {t("allTypes")}
                </Button>
                {ENTITY_FILTERS.map((entity) => (
                    <Button
                        key={entity}
                        size="sm"
                        variant={filter === entity ? "default" : "outline"}
                        onClick={() => pickFilter(entity)}
                    >
                        {entity}
                    </Button>
                ))}
            </div>

            {isLoading && items.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "64px", borderRadius: "5px" }}
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
                        <Activity size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                        <p style={{ fontSize: "14px", margin: 0 }}>{t("noActivity")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {items.map((row) => {
                        const metaTitle =
                            row.metadata && typeof row.metadata.title === "string"
                                ? row.metadata.title
                                : null;
                        return (
                            <Card key={row.id}>
                                <CardContent
                                    style={{
                                        padding: "12px 16px",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            backgroundColor: "var(--color-bg-secondary)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        {(row.user?.name ?? row.user?.email ?? "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: "14px",
                                                color: "var(--color-text)",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            <strong>
                                                {row.user?.name ?? row.user?.email ?? tc("unknown")}
                                            </strong>{" "}
                                            <span style={{ color: "var(--color-text-secondary)" }}>
                                                {actionLabel(row.action)}
                                                {metaTitle ? ` ${metaTitle}` : ""}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                marginTop: "4px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                {relativeTime(row.createdAt)}
                                            </span>
                                            <Badge variant="secondary" style={{ fontSize: "11px" }}>
                                                {row.entityType}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {nextCursor && (
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <Button variant="outline" onClick={() => setCursor(nextCursor)}>
                                {tc("showMore")}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
