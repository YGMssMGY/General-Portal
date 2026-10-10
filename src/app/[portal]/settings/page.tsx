"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";

interface SettingsRecord {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    settings: Record<string, boolean>;
}

const MODULES = [
    "proposals",
    "tasks",
    "events",
    "messages",
    "finance",
    "volunteers",
    "members",
    "files",
    "meetings",
    "activity",
    "search",
    "notifications",
    "budget",
];

export default function SettingsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("settings");
    const tc = useTranslations("common");
    const tn = useTranslations("nav");
    const te = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const canEdit = user?.permissions.includes("manage_settings") ?? false;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [toggles, setToggles] = useState<Record<string, boolean>>({});
    const [hydrated, setHydrated] = useState(false);

    const { data, isLoading, isError, refetch } = useQuery<SettingsRecord>({
        queryKey: [portal, "settings"],
        queryFn: () => fetchJson(`/api/settings`),
        enabled: portal !== "",
    });

    if (data && !hydrated) {
        setHydrated(true);
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setLogoUrl(data.logoUrl ?? "");
        setToggles(data.settings ?? {});
    }

    useEffect(() => {
        if (isError) toast.error(te("internal"));
    }, [isError, te]);

    const saveMutation = useMutation({
        mutationFn: (body: {
            name?: string;
            description?: string | null;
            logoUrl?: string | null;
            settings?: Record<string, boolean>;
        }) =>
            fetchJson(`/api/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "settings"] });
            queryClient.invalidateQueries({ queryKey: [portal, "workspace"] });
            toast.success(t("saved"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function moduleLabel(key: string): string {
        try {
            return tn(key);
        } catch {
            return key;
        }
    }

    function handleSave() {
        saveMutation.mutate({
            name: name.trim() || undefined,
            description: description.trim() ? description.trim() : null,
            logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
            settings: toggles,
        });
    }

    if (isLoading || !hydrated) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Skeleton style={{ width: "30%", height: "24px", borderRadius: "5px" }} />
                <Skeleton style={{ width: "100%", height: "160px", borderRadius: "5px" }} />
            </div>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent style={{ padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                        {te("internal")}
                    </p>
                    <div style={{ marginTop: "12px" }}>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            {tc("retry")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

            <Card>
                <CardContent style={{ padding: "20px" }}>
                    <h3
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            margin: "0 0 12px",
                            color: "var(--color-text)",
                        }}
                    >
                        {t("workspace")}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--color-text)",
                                    display: "block",
                                    marginBottom: "6px",
                                }}
                            >
                                {t("workspaceName")}
                            </span>
                            {canEdit ? (
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            ) : (
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text)",
                                        margin: 0,
                                    }}
                                >
                                    {data.name}
                                </p>
                            )}
                        </div>
                        <div>
                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--color-text)",
                                    display: "block",
                                    marginBottom: "6px",
                                }}
                            >
                                {tc("description")}
                            </span>
                            {canEdit ? (
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                />
                            ) : (
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {data.description ?? ""}
                                </p>
                            )}
                        </div>
                        <div>
                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--color-text)",
                                    display: "block",
                                    marginBottom: "6px",
                                }}
                            >
                                {t("logo")}
                            </span>
                            {canEdit ? (
                                <Input
                                    placeholder={t("logo")}
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                />
                            ) : (
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {data.logoUrl ?? ""}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent style={{ padding: "20px" }}>
                    <h3
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            margin: "0 0 12px",
                            color: "var(--color-text)",
                        }}
                    >
                        {t("modules")}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {MODULES.map((key) => (
                            <div
                                key={key}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                    padding: "8px 0",
                                    borderBottom: "1px solid var(--color-border)",
                                }}
                            >
                                <span style={{ fontSize: "14px", color: "var(--color-text)" }}>
                                    {moduleLabel(key)}
                                </span>
                                <Switch
                                    checked={toggles[key] !== false}
                                    disabled={!canEdit}
                                    onCheckedChange={(checked) =>
                                        setToggles((prev) => ({ ...prev, [key]: checked }))
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {canEdit ? (
                <div>
                    <Button onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? tc("saving") : t("save")}
                    </Button>
                </div>
            ) : (
                <Card>
                    <CardContent
                        style={{
                            padding: "16px",
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <Shield size={18} />
                        {te("forbidden")}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
