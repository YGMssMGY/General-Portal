"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageData {
    portal: string;
    limits: { uploadMb: number; requestsPerMinute: number; auditRetentionDays: number };
    usage: {
        uploadMb: { used: number; limit: number; percent: number };
        seats: { used: number; limit: number | null };
        sessions: { active: number };
        invitations: { pending: number };
        tokens: { active: number };
    };
    alerts: string[];
}

const titleStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--color-text)",
    margin: 0,
};

const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--color-text-secondary)",
    margin: "4px 0 0",
};

const valueStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--color-text)",
    margin: 0,
    lineHeight: 1.2,
};

export default function UsagePage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user, status } = useAuthSession();
    const t = useTranslations("usage");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const canView = (user?.permissions.includes("manage_settings") ?? false) && portal !== "";
    const { data, isLoading, isError, refetch } = useQuery<UsageData>({
        queryKey: [portal, "usage"],
        queryFn: () => fetchJson<UsageData>("/api/usage"),
        enabled: canView,
    });

    if (status === "loading") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <Skeleton style={{ width: "200px", height: "24px" }} />
                <Skeleton style={{ width: "320px", height: "80px" }} />
            </div>
        );
    }

    if (!canView) {
        return (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                    {tErrors("forbidden")}
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                    <h1 style={titleStyle}>{t("title")}</h1>
                    <Skeleton style={{ width: "240px", height: "14px", marginTop: "8px" }} />
                </div>
                <Skeleton style={{ width: "100%", height: "96px" }} />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent style={{ padding: "20px" }}>
                                <Skeleton style={{ width: "60px", height: "24px" }} />
                                <Skeleton
                                    style={{ width: "100px", height: "14px", marginTop: "8px" }}
                                />
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

    const { usage, limits, alerts } = data;
    const stats = [
        { key: "seats", value: usage.seats.used, label: t("seats") },
        { key: "sessions", value: usage.sessions.active, label: t("activeSessions") },
        { key: "invitations", value: usage.invitations.pending, label: t("pendingInvitations") },
        { key: "tokens", value: usage.tokens.active, label: t("activeTokens") },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
                <h1 style={titleStyle}>{t("title")}</h1>
                <p style={labelStyle}>{t("subtitle")}</p>
            </div>

            <Card>
                <CardContent style={{ padding: "20px" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            gap: "12px",
                        }}
                    >
                        <h2 style={{ ...titleStyle, fontSize: "14px" }}>{t("storage")}</h2>
                        <span style={labelStyle}>
                            {t("percentUsed", { percent: usage.uploadMb.percent })}
                        </span>
                    </div>
                    <Progress
                        value={usage.uploadMb.percent}
                        aria-label={t("storage")}
                        style={{ margin: "12px 0" }}
                    />
                    <p style={labelStyle}>
                        {t("storageUsed", {
                            used: usage.uploadMb.used,
                            limit: usage.uploadMb.limit,
                        })}
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.key}>
                        <CardContent style={{ padding: "20px" }}>
                            <p style={valueStyle}>{stat.value}</p>
                            <p style={labelStyle}>{stat.label}</p>
                            {stat.key === "seats" && <p style={labelStyle}>{t("noLimit")}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent style={{ padding: "20px" }}>
                    <h2 style={{ ...titleStyle, fontSize: "14px", marginBottom: "12px" }}>
                        {t("alerts")}
                    </h2>
                    {alerts.length === 0 ? (
                        <p style={labelStyle}>{t("noAlerts")}</p>
                    ) : (
                        <ul style={{ margin: 0, paddingLeft: "20px" }}>
                            {alerts.map((alert) => (
                                <li
                                    key={alert}
                                    style={{ fontSize: "13px", color: "var(--color-text)" }}
                                >
                                    {alert}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <p style={labelStyle}>
                {t("requestsPerMinute", { count: limits.requestsPerMinute })} ·{" "}
                {t("auditRetentionDays", { count: limits.auditRetentionDays })}
            </p>
        </div>
    );
}
