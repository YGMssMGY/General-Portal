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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";

interface SettingsRecord {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    settings: Record<string, unknown>;
}

interface BrandingSettings {
    primary?: string;
    radius?: number;
}

function parseTerminology(
    text: string,
): { ok: true; value: Record<string, string> } | { ok: false } {
    try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const value: Record<string, string> = {};
            for (const [key, entry] of Object.entries(parsed)) {
                if (typeof entry !== "string") return { ok: false };
                value[key] = entry;
            }
            return { ok: true, value };
        }
    } catch {
        return { ok: false };
    }
    return { ok: false };
}

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
    const moduleList = [...(workspace?.modules ?? [])].sort();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [toggles, setToggles] = useState<Record<string, unknown>>({});
    const [primaryColor, setPrimaryColor] = useState("");
    const [radius, setRadius] = useState("");
    const [faviconUrl, setFaviconUrl] = useState("");
    const [terminologyText, setTerminologyText] = useState("{}");
    const [terminologyError, setTerminologyError] = useState("");
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
        const branding = data.settings.branding;
        if (branding && typeof branding === "object" && !Array.isArray(branding)) {
            const values = branding as Record<string, unknown>;
            if (typeof values.primary === "string") setPrimaryColor(values.primary);
            if (typeof values.radius === "number") setRadius(String(values.radius));
        }
        if (typeof data.settings.faviconUrl === "string") setFaviconUrl(data.settings.faviconUrl);
        const terminology = data.settings.terminology;
        if (terminology && typeof terminology === "object" && !Array.isArray(terminology)) {
            setTerminologyText(JSON.stringify(terminology, null, 2));
        }
    }

    useEffect(() => {
        if (isError) toast.error(te("internal"));
    }, [isError, te]);

    const saveMutation = useMutation({
        mutationFn: (body: {
            name?: string;
            description?: string | null;
            logoUrl?: string | null;
            settings?: Record<string, unknown>;
            branding?: BrandingSettings;
            faviconUrl?: string | null;
            terminology?: Record<string, string>;
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
        const terminology = parseTerminology(terminologyText);
        if (!terminology.ok) {
            setTerminologyError(t("invalidTerminology"));
            return;
        }
        setTerminologyError("");
        const branding: BrandingSettings = {};
        if (primaryColor !== "") branding.primary = primaryColor;
        if (radius.trim() !== "") branding.radius = Number(radius);
        saveMutation.mutate({
            name: name.trim() || undefined,
            description: description.trim() ? description.trim() : null,
            logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
            settings: toggles,
            ...(Object.keys(branding).length > 0 ? { branding } : {}),
            faviconUrl: faviconUrl.trim() ? faviconUrl.trim() : null,
            terminology: terminology.value,
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
                        {t("branding")}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                                role="img"
                                aria-label={t("preview")}
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    flexShrink: 0,
                                    border: "1px solid var(--color-border)",
                                    backgroundColor:
                                        primaryColor !== "" ? primaryColor : "var(--color-primary)",
                                    borderRadius:
                                        radius.trim() !== "" ? `${Number(radius)}px` : "5px",
                                }}
                            />
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {t("preview")}
                            </span>
                        </div>
                        <div>
                            <Label htmlFor="settings-primary-color">{t("primaryColor")}</Label>
                            <Input
                                id="settings-primary-color"
                                type="color"
                                value={primaryColor !== "" ? primaryColor : "#000000"}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                disabled={!canEdit}
                                style={{ width: "88px", padding: "2px" }}
                            />
                        </div>
                        <div>
                            <Label htmlFor="settings-radius">{t("radius")}</Label>
                            <Input
                                id="settings-radius"
                                type="number"
                                min={0}
                                max={32}
                                value={radius}
                                onChange={(e) => setRadius(e.target.value)}
                                disabled={!canEdit}
                            />
                        </div>
                        <div>
                            <Label htmlFor="settings-favicon">{t("favicon")}</Label>
                            <Input
                                id="settings-favicon"
                                value={faviconUrl}
                                onChange={(e) => setFaviconUrl(e.target.value)}
                                disabled={!canEdit}
                            />
                        </div>
                        <div>
                            <Label htmlFor="settings-terminology">{t("terminology")}</Label>
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                    margin: "4px 0 6px",
                                }}
                            >
                                {t("terminologyHint")}
                            </p>
                            <Textarea
                                id="settings-terminology"
                                value={terminologyText}
                                onChange={(e) => {
                                    setTerminologyText(e.target.value);
                                    setTerminologyError("");
                                }}
                                rows={5}
                                disabled={!canEdit}
                            />
                            {terminologyError !== "" && (
                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--color-destructive)",
                                        margin: "4px 0 0",
                                    }}
                                >
                                    {terminologyError}
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
                        {moduleList.map((key) => (
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
