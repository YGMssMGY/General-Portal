"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Award, Circle } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePresence } from "@/hooks/usePresence";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";

interface Badge {
    id: string;
    earnedAt: string | null;
    progress: number;
    target: number;
}

export default function BadgesPage() {
    const t = useTranslations("badges");
    const tp = useTranslations("presence");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const { data: presence } = usePresence();
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const {
        data: badges,
        isLoading,
        isError,
    } = useQuery<Badge[]>({
        queryKey: [portal, "badges"],
        queryFn: () => fetchJson<Badge[]>("/api/badges"),
        enabled: portal !== "",
    });

    const labels: Record<string, { title: string; description: string }> = {
        "first-task": { title: t("firstTask"), description: t("firstTaskDesc") },
        "event-goer": { title: t("eventGoer"), description: t("eventGoerDesc") },
        volunteer: { title: t("volunteer"), description: t("volunteerDesc") },
        "kudos-star": { title: t("kudosStar"), description: t("kudosStarDesc") },
        streak: { title: t("streak"), description: t("streakDesc") },
        "top-10": { title: t("top10"), description: t("top10Desc") },
    };

    const online = presence?.online ?? [];
    const locale = user?.locale || undefined;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
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
                <p
                    style={{
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                        margin: "4px 0 0",
                    }}
                >
                    {t("subtitle")} · {workspace?.name ?? portal}
                </p>
            </div>

            <Card>
                <CardContent style={{ padding: "12px 16px" }}>
                    <p
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            margin: "0 0 10px",
                        }}
                    >
                        <Circle
                            size={12}
                            fill="var(--color-success)"
                            color="var(--color-success)"
                        />
                        {tp("onlineNow", { count: online.length })}
                    </p>
                    {online.length === 0 ? (
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {tp("noOneOnline")}
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {online.map((person) => (
                                <span
                                    key={person.userId}
                                    title={tp("lastSeen", {
                                        time: new Date(person.lastSeenAt).toLocaleString(locale),
                                    })}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 8px",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-sm)",
                                        fontSize: "12px",
                                        color: "var(--color-text)",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            borderRadius: "50%",
                                            backgroundColor: "var(--color-bg-secondary)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {(person.name ?? tc("unknown")).charAt(0).toUpperCase()}
                                    </span>
                                    {person.name ?? tc("unknown")}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isLoading ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {tc("loading")}
                </p>
            ) : isError ? (
                <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>
                    {te("internal")}
                </p>
            ) : (badges ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noBadges")}
                </p>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "12px",
                    }}
                >
                    {(badges ?? []).map((badge) => {
                        const meta = labels[badge.id];
                        const earned = badge.earnedAt !== null;
                        const ratio =
                            badge.target > 0
                                ? Math.min(1, Math.max(0, badge.progress / badge.target))
                                : 0;
                        return (
                            <Card key={badge.id}>
                                <CardContent style={{ padding: "16px" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                        }}
                                    >
                                        <Award
                                            size={20}
                                            color={
                                                earned
                                                    ? "var(--color-primary)"
                                                    : "var(--color-text-secondary)"
                                            }
                                        />
                                        <span
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                color: "var(--color-text)",
                                            }}
                                        >
                                            {meta?.title ?? badge.id}
                                        </span>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: "13px",
                                            color: "var(--color-text-secondary)",
                                            margin: "8px 0 12px",
                                        }}
                                    >
                                        {meta?.description ?? ""}
                                    </p>
                                    <div
                                        style={{
                                            height: "6px",
                                            borderRadius: "3px",
                                            backgroundColor: "var(--color-bg-secondary)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${(earned ? 1 : ratio) * 100}%`,
                                                height: "100%",
                                                backgroundColor: earned
                                                    ? "var(--color-primary)"
                                                    : "var(--color-text-secondary)",
                                            }}
                                        />
                                    </div>
                                    <p
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                            fontSize: "12px",
                                            color: "var(--color-text-secondary)",
                                            margin: "8px 0 0",
                                        }}
                                    >
                                        <span>
                                            {t("progress", {
                                                current: badge.progress,
                                                target: badge.target,
                                            })}
                                        </span>
                                        <span>
                                            {earned && badge.earnedAt
                                                ? t("earnedOn", {
                                                      date: new Date(
                                                          badge.earnedAt,
                                                      ).toLocaleDateString(locale),
                                                  })
                                                : t("notEarned")}
                                        </span>
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
