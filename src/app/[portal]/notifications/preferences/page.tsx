"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";
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
import { Switch } from "@/components/ui/switch";

interface NotificationPref {
    id: string;
    userId: string;
    channel: string;
    enabled: boolean;
    digest: string;
}

type Digest = "never" | "daily" | "weekly";

interface ChannelPref {
    enabled: boolean;
    digest: Digest;
}

const CHANNELS = ["in-app", "email"] as const;
type Channel = (typeof CHANNELS)[number];

const DEFAULTS: Record<Channel, ChannelPref> = {
    "in-app": { enabled: true, digest: "never" },
    email: { enabled: true, digest: "never" },
};

function toDigest(v: string): Digest {
    return v === "daily" || v === "weekly" ? v : "never";
}

export default function NotificationPreferencesPage() {
    const t = useTranslations("notifications");
    const tc = useTranslations("common");
    const ts = useTranslations("settings");
    const te = useTranslations("errors");
    const portal = usePortal();
    const queryClient = useQueryClient();
    usePageTitle(`${t("settings")} | ${t("title")}`);

    const [prefs, setPrefs] = useState<Record<Channel, ChannelPref>>(DEFAULTS);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "notification-prefs"],
        queryFn: () => fetchJson<NotificationPref[]>("/api/notification-prefs"),
        enabled: portal !== "",
    });

    const [prevData, setPrevData] = useState<typeof data>(undefined);
    if (data && data !== prevData) {
        setPrevData(data);
        const next: Record<Channel, ChannelPref> = {
            "in-app": { ...DEFAULTS["in-app"] },
            email: { ...DEFAULTS.email },
        };
        for (const row of data) {
            if (row.channel === "in-app" || row.channel === "email") {
                next[row.channel] = { enabled: row.enabled, digest: toDigest(row.digest) };
            }
        }
        setPrefs(next);
    }

    const saveMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/notification-prefs", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    CHANNELS.map((channel) => ({
                        channel,
                        enabled: prefs[channel].enabled,
                        digest: prefs[channel].digest,
                    })),
                ),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "notification-prefs"] });
            toast.success(ts("saved"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const channelLabel = (channel: Channel) =>
        channel === "email" ? t("emailNotifications") : t("inAppNotifications");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "640px" }}>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--color-text)",
                }}
            >
                {t("settings")}
            </h1>
            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "120px", borderRadius: "5px" }}
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
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("moduleSettings")}</CardTitle>
                    </CardHeader>
                    <CardContent style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {CHANNELS.map((channel) => (
                            <div
                                key={channel}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "16px",
                                    flexWrap: "wrap",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                    }}
                                >
                                    <Switch
                                        id={`pref-enabled-${channel}`}
                                        checked={prefs[channel].enabled}
                                        onCheckedChange={(v) =>
                                            setPrefs((p) => ({
                                                ...p,
                                                [channel]: { ...p[channel], enabled: v },
                                            }))
                                        }
                                    />
                                    <Label htmlFor={`pref-enabled-${channel}`}>
                                        {channelLabel(channel)}
                                    </Label>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <Label htmlFor={`pref-digest-${channel}`}>{t("digest")}</Label>
                                    <Select
                                        value={prefs[channel].digest}
                                        onValueChange={(v) =>
                                            setPrefs((p) => ({
                                                ...p,
                                                [channel]: { ...p[channel], digest: toDigest(v) },
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            id={`pref-digest-${channel}`}
                                            style={{ width: "160px" }}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="never">
                                                {t("digestNever")}
                                            </SelectItem>
                                            <SelectItem value="daily">
                                                {t("digestDaily")}
                                            </SelectItem>
                                            <SelectItem value="weekly">
                                                {t("digestWeekly")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                        <div>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? tc("saving") : tc("save")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
