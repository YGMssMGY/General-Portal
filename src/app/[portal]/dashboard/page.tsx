"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fetchJson } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowRight,
    Calendar,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    FileText,
    Settings,
    Star,
    TrendingUp,
    Users,
} from "lucide-react";

interface DashboardData {
    tasks: Record<string, number>;
    upcomingEvents: Array<{
        id: string;
        title: string;
        startDate: string;
        endDate: string | null;
        location: string | null;
    }>;
    pendingProposals: number;
    unreadNotifications: number;
    totalMembers: number;
    recentActivity: Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string | null;
        metadata: Record<string, unknown>;
        createdAt: string;
        user: { id: string; name: string | null; email: string; image: string | null } | null;
    }>;
}

interface Prefs {
    widgets: string[];
    theme: string;
    density: string;
}

interface ParticipationData {
    score: number;
    breakdown: {
        taskCount: number;
        eventCount: number;
        rsvpCount: number;
        volunteerHours: number;
        kudosCount: number;
    };
    rank: number;
    period: string;
}

interface KudosItem {
    id: string;
    message: string | null;
    createdAt: string;
    sender: { id: string; name: string | null; image: string | null } | null;
    receiver: { id: string; name: string | null; image: string | null } | null;
}

const ALL_WIDGETS = ["tasks", "events", "proposals", "activity", "kudos", "participation"] as const;

const ROLE_WIDGETS: Record<string, string[]> = {
    admin: ["activity", "tasks", "events", "proposals", "kudos", "participation"],
    officer: ["tasks", "events", "proposals", "activity", "kudos", "participation"],
    member: ["tasks", "events", "kudos", "participation", "proposals", "activity"],
};

function currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("dashboard");
    const tNav = useTranslations("nav");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    const tProd = useTranslations("productivity");
    const tPart = useTranslations("participation");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();
    const [customizing, setCustomizing] = useState(false);

    const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
        queryKey: [portal, "dashboard"],
        queryFn: () => fetchJson<DashboardData>("/api/dashboard"),
        enabled: portal !== "",
    });

    const { data: prefs } = useQuery<Prefs>({
        queryKey: [portal, "prefs"],
        queryFn: () => fetchJson<Prefs>("/api/me/prefs"),
        enabled: portal !== "",
    });

    const period = currentMonth();
    const { data: participation } = useQuery<ParticipationData>({
        queryKey: [portal, "participation", period],
        queryFn: () => fetchJson<ParticipationData>(`/api/participation?period=${period}`),
        enabled: portal !== "",
    });

    const { data: kudos } = useQuery<KudosItem[]>({
        queryKey: [portal, "kudos-preview"],
        queryFn: () => fetchJson<KudosItem[]>("/api/kudos?limit=5"),
        enabled: portal !== "",
    });

    const prefsMutation = useMutation({
        mutationFn: (widgets: string[]) =>
            fetchJson<Prefs>("/api/me/prefs", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ widgets }),
            }),
        onSuccess: (next) => {
            queryClient.setQueryData([portal, "prefs"], next);
        },
    });

    const defaultWidgets = ROLE_WIDGETS[user?.role ?? ""] ?? [...ALL_WIDGETS];
    const visible = prefs
        ? prefs.widgets.filter((w): w is string => (ALL_WIDGETS as readonly string[]).includes(w))
        : defaultWidgets;
    const visibleSet = new Set(visible.length > 0 ? visible : [...ALL_WIDGETS]);
    const ordered = (visible.length > 0 ? visible : [...ALL_WIDGETS]).filter((w) =>
        (ALL_WIDGETS as readonly string[]).includes(w),
    );

    function widgetLabel(key: string): string {
        if (key === "tasks") return tProd("widgetTasks");
        if (key === "events") return tProd("widgetEvents");
        if (key === "proposals") return tProd("widgetProposals");
        if (key === "activity") return tProd("widgetActivity");
        if (key === "kudos") return tProd("widgetKudos");
        return tProd("widgetParticipation");
    }

    function toggleWidget(key: string) {
        const next = visibleSet.has(key) ? ordered.filter((w) => w !== key) : [...ordered, key];
        prefsMutation.mutate(next.length > 0 ? next : [...ALL_WIDGETS]);
    }

    function moveWidget(key: string, dir: -1 | 1) {
        const idx = ordered.indexOf(key);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= ordered.length) return;
        const next = [...ordered];
        const tmp = next[idx];
        next[idx] = next[j];
        next[j] = tmp;
        prefsMutation.mutate(next);
    }

    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                    <Skeleton style={{ width: "200px", height: "14px", marginTop: "8px" }} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent style={{ padding: "20px" }}>
                                <Skeleton
                                    style={{ width: "40px", height: "40px", marginBottom: "12px" }}
                                />
                                <Skeleton
                                    style={{ width: "60px", height: "24px", marginBottom: "4px" }}
                                />
                                <Skeleton style={{ width: "100px", height: "14px" }} />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                    {tErrors("internal")}
                </p>
                <Button variant="outline" style={{ marginTop: "16px" }} onClick={() => refetch()}>
                    {tCommon("retry")}
                </Button>
            </div>
        );
    }

    const totalTasks = Object.values(data.tasks ?? {}).reduce((sum, n) => sum + n, 0);
    const statCards = [
        { key: "tasks", value: totalTasks, label: t("myTasks"), icon: ClipboardList },
        {
            key: "events",
            value: data.upcomingEvents?.length ?? 0,
            label: t("upcomingEvents"),
            icon: Calendar,
        },
        { key: "members", value: data.totalMembers, label: tNav("members"), icon: Users },
        {
            key: "proposals",
            value: data.pendingProposals,
            label: t("pendingProposals"),
            icon: FileText,
        },
    ].filter((s) => s.key === "members" || visibleSet.has(s.key));
    const quickLinks = [
        { label: tNav("tasks"), path: "/tasks" },
        { label: tNav("events"), path: "/events" },
        { label: tNav("proposals"), path: "/proposals" },
        { label: tNav("messages"), path: "/messages" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
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
                        {t("welcome", { name: user?.name ?? workspace?.name ?? portal })}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCustomizing((v) => !v)}>
                    <Settings size={14} />
                    <span>{tProd("customizeWidgets")}</span>
                </Button>
            </div>

            {customizing && (
                <Card>
                    <CardContent style={{ padding: "20px" }}>
                        <h3
                            style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                margin: "0 0 12px",
                            }}
                        >
                            {tProd("widgets")}
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {ALL_WIDGETS.map((key) => {
                                const on = visibleSet.has(key);
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={on}
                                            onChange={() => toggleWidget(key)}
                                            aria-label={widgetLabel(key)}
                                        />
                                        <span
                                            style={{
                                                flex: 1,
                                                fontSize: "13px",
                                                color: "var(--color-text)",
                                            }}
                                        >
                                            {widgetLabel(key)}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveWidget(key, -1)}
                                            disabled={!on}
                                            aria-label={tProd("moveUp")}
                                        >
                                            <ChevronUp size={14} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => moveWidget(key, 1)}
                                            disabled={!on}
                                            aria-label={tProd("moveDown")}
                                        >
                                            <ChevronDown size={14} />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.key}>
                            <CardContent style={{ padding: "20px" }}>
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "5px",
                                        backgroundColor: "var(--color-bg-secondary)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: "12px",
                                    }}
                                >
                                    <Icon size={20} style={{ color: "var(--color-primary)" }} />
                                </div>
                                <p
                                    style={{
                                        fontSize: "24px",
                                        fontWeight: 700,
                                        color: "var(--color-text)",
                                        margin: 0,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {stat.value}
                                </p>
                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--color-text-secondary)",
                                        margin: "4px 0 0",
                                    }}
                                >
                                    {stat.label}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {ordered.map((key) => {
                    if (key === "activity" && visibleSet.has("activity")) {
                        return (
                            <Card key="activity">
                                <CardContent style={{ padding: "20px" }}>
                                    <h3
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "var(--color-text)",
                                            margin: "0 0 16px",
                                        }}
                                    >
                                        {t("recentActivity")}
                                    </h3>
                                    {data.recentActivity.length === 0 ? (
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                margin: "24px 0",
                                                textAlign: "center",
                                            }}
                                        >
                                            {tNav("activity")}: {tCommon("none")}
                                        </p>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            {data.recentActivity.map((item) => (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        display: "flex",
                                                        gap: "12px",
                                                        padding: "10px 0",
                                                        borderBottom:
                                                            "1px solid var(--color-border)",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: "28px",
                                                            height: "28px",
                                                            borderRadius: "5px",
                                                            backgroundColor:
                                                                "var(--color-bg-secondary)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            flexShrink: 0,
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text-secondary)",
                                                        }}
                                                    >
                                                        {item.user?.name
                                                            ?.charAt(0)
                                                            ?.toUpperCase() ?? "?"}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p
                                                            style={{
                                                                fontSize: "13px",
                                                                color: "var(--color-text)",
                                                                margin: 0,
                                                            }}
                                                        >
                                                            <strong>
                                                                {item.user?.name ??
                                                                    tCommon("unknown")}
                                                            </strong>{" "}
                                                            {item.action} {item.entityType}
                                                        </p>
                                                        <p
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text-secondary)",
                                                                margin: "2px 0 0",
                                                            }}
                                                        >
                                                            {format(
                                                                new Date(item.createdAt),
                                                                "MMM d, HH:mm",
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    }
                    if (key === "events" && visibleSet.has("events")) {
                        return (
                            <Card key="events">
                                <CardContent style={{ padding: "20px" }}>
                                    <h3
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "var(--color-text)",
                                            margin: "0 0 16px",
                                        }}
                                    >
                                        {t("quickActions")}
                                    </h3>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                        }}
                                    >
                                        {quickLinks.map((link) => (
                                            <Link
                                                key={link.path}
                                                href={`/${portal}${link.path}`}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    width: "100%",
                                                    minHeight: "44px",
                                                    padding: "0 16px",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: "5px",
                                                    fontSize: "14px",
                                                    color: "var(--color-text)",
                                                    textDecoration: "none",
                                                }}
                                            >
                                                <span>{link.label}</span>
                                                <ArrowRight size={16} />
                                            </Link>
                                        ))}
                                    </div>
                                    {data.upcomingEvents.length > 0 && (
                                        <>
                                            <h3
                                                style={{
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    color: "var(--color-text)",
                                                    margin: "24px 0 16px",
                                                }}
                                            >
                                                {t("upcomingEvents")}
                                            </h3>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "8px",
                                                }}
                                            >
                                                {data.upcomingEvents.map((event) => (
                                                    <div
                                                        key={event.id}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "12px",
                                                            padding: "10px 12px",
                                                            border: "1px solid var(--color-border)",
                                                            borderRadius: "5px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                alignItems: "center",
                                                                minWidth: "44px",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: "11px",
                                                                    fontWeight: 700,
                                                                    color: "var(--color-primary)",
                                                                    textTransform: "uppercase",
                                                                }}
                                                            >
                                                                {format(
                                                                    new Date(event.startDate),
                                                                    "MMM",
                                                                )}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: "18px",
                                                                    fontWeight: 700,
                                                                    color: "var(--color-text)",
                                                                    lineHeight: 1.2,
                                                                }}
                                                            >
                                                                {format(
                                                                    new Date(event.startDate),
                                                                    "d",
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <p
                                                                style={{
                                                                    fontSize: "13px",
                                                                    fontWeight: 600,
                                                                    color: "var(--color-text)",
                                                                    margin: 0,
                                                                }}
                                                            >
                                                                {event.title}
                                                            </p>
                                                            {event.location && (
                                                                <p
                                                                    style={{
                                                                        fontSize: "12px",
                                                                        color: "var(--color-text-secondary)",
                                                                        margin: "2px 0 0",
                                                                    }}
                                                                >
                                                                    {event.location}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {data.unreadNotifications > 0 && (
                                        <div
                                            style={{
                                                marginTop: "16px",
                                                padding: "10px 12px",
                                                borderRadius: "5px",
                                                backgroundColor: "var(--color-primary-light)",
                                                border: "1px solid var(--color-primary)",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "13px",
                                                    fontWeight: 500,
                                                    color: "var(--color-primary)",
                                                }}
                                            >
                                                {t("unreadNotifications", {
                                                    count: data.unreadNotifications,
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    }
                    if (key === "kudos" && visibleSet.has("kudos")) {
                        return (
                            <Card key="kudos">
                                <CardContent style={{ padding: "20px" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginBottom: "16px",
                                        }}
                                    >
                                        <Star size={16} style={{ color: "var(--color-primary)" }} />
                                        <h3
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                color: "var(--color-text)",
                                                margin: 0,
                                            }}
                                        >
                                            {tProd("widgetKudos")}
                                        </h3>
                                    </div>
                                    {!kudos || kudos.length === 0 ? (
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                margin: 0,
                                            }}
                                        >
                                            {tProd("noResults")}
                                        </p>
                                    ) : (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "8px",
                                            }}
                                        >
                                            {kudos.map((k) => (
                                                <div
                                                    key={k.id}
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: "1px solid var(--color-border)",
                                                        borderRadius: "5px",
                                                    }}
                                                >
                                                    <p
                                                        style={{
                                                            fontSize: "13px",
                                                            color: "var(--color-text)",
                                                            margin: 0,
                                                        }}
                                                    >
                                                        <strong>
                                                            {k.sender?.name ?? tCommon("unknown")}
                                                        </strong>{" "}
                                                        → {k.receiver?.name ?? tCommon("unknown")}
                                                    </p>
                                                    {k.message && (
                                                        <p
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text-secondary)",
                                                                margin: "4px 0 0",
                                                            }}
                                                        >
                                                            {k.message}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    }
                    if (key === "participation" && visibleSet.has("participation")) {
                        return (
                            <Card key="participation">
                                <CardContent style={{ padding: "20px" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginBottom: "16px",
                                        }}
                                    >
                                        <TrendingUp
                                            size={16}
                                            style={{ color: "var(--color-primary)" }}
                                        />
                                        <h3
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                color: "var(--color-text)",
                                                margin: 0,
                                            }}
                                        >
                                            {tProd("participationScore")}
                                        </h3>
                                    </div>
                                    {!participation ? (
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                margin: 0,
                                            }}
                                        >
                                            {tPart("noData")}
                                        </p>
                                    ) : (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "8px",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    fontSize: "24px",
                                                    fontWeight: 700,
                                                    color: "var(--color-text)",
                                                    margin: 0,
                                                }}
                                            >
                                                {participation.score}
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: 0,
                                                }}
                                            >
                                                {tPart("rank")}: {participation.rank} ·{" "}
                                                {tPart("tasksCompleted", {
                                                    count: participation.breakdown.taskCount,
                                                })}{" "}
                                                ·{" "}
                                                {tPart("eventsAttended", {
                                                    count: participation.breakdown.eventCount,
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
}
