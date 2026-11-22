"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchJson } from "@/lib/api-client";

type Channel = "email" | "in-app";
type Digest = "never" | "daily" | "weekly";

interface PreviewItem {
    id: string;
    title: string;
    createdAt: string;
}

interface PreviewGroup {
    label: string;
    count: number;
    items: PreviewItem[];
}

interface Preview {
    channel: Channel;
    digest: Digest;
    totalUnread: number;
    groups: PreviewGroup[];
    sampleText: string;
    html: string;
}

function toChannel(value: string): Channel {
    return value === "in-app" ? "in-app" : "email";
}

function formatDate(iso: string, locale: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale || undefined);
}

export default function DigestPreviewPage() {
    const t = useTranslations("digestPreview");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const [channel, setChannel] = useState<Channel>("email");

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, user?.id ?? "", "digest-preview", channel],
        queryFn: () => fetchJson<Preview>(`/api/notification-prefs/preview?channel=${channel}`),
        enabled: portal !== "" && user !== null,
    });

    const digest: Digest = data?.digest ?? "never";
    const groups = data?.groups ?? [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "720px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>
                    {t("description")}
                </p>
            </div>

            <Card>
                <CardContent
                    style={{
                        display: "flex",
                        gap: "16px",
                        flexWrap: "wrap",
                        padding: "16px",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <Label htmlFor="digest-preview-channel">{t("channel")}</Label>
                        <Select value={channel} onValueChange={(v) => setChannel(toChannel(v))}>
                            <SelectTrigger id="digest-preview-channel" style={{ width: "180px" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="email">{t("channelEmail")}</SelectItem>
                                <SelectItem value="in-app">{t("channelInApp")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <Label htmlFor="digest-preview-digest">{t("digest")}</Label>
                        <Select value={digest} disabled>
                            <SelectTrigger id="digest-preview-digest" style={{ width: "180px" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="never">{t("digestNever")}</SelectItem>
                                <SelectItem value="daily">{t("digestDaily")}</SelectItem>
                                <SelectItem value="weekly">{t("digestWeekly")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Skeleton style={{ width: "100%", height: "96px", borderRadius: "5px" }} />
                    <Skeleton style={{ width: "100%", height: "160px", borderRadius: "5px" }} />
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
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("sampleHeading")}</CardTitle>
                        </CardHeader>
                        <CardContent
                            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                        >
                            <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text)" }}>
                                {data?.sampleText ?? ""}
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                {t("totalUnread", { total: data?.totalUnread ?? 0 })}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("groupsHeading")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {groups.length === 0 ? (
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: "13px",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {t("empty")}
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "12px",
                                    }}
                                >
                                    {groups.map((group) => (
                                        <div
                                            key={group.label}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "6px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: "8px",
                                                }}
                                            >
                                                <strong
                                                    style={{
                                                        fontSize: "14px",
                                                        color: "var(--color-text)",
                                                    }}
                                                >
                                                    {group.label}
                                                </strong>
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                    }}
                                                >
                                                    {group.count}
                                                </span>
                                            </div>
                                            {group.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        gap: "8px",
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                    }}
                                                >
                                                    <span>{item.title}</span>
                                                    <span style={{ whiteSpace: "nowrap" }}>
                                                        {formatDate(
                                                            item.createdAt,
                                                            user?.locale ?? "",
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/notifications/preferences">{t("openPreferences")}</Link>
                </Button>
            </div>
        </div>
    );
}
