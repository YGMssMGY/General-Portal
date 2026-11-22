"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Webhook {
    id: string;
    name: string;
    url: string;
    secret: string | null;
    events: string[];
    active: boolean;
    createdAt: string;
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "inherit",
    outline: "none",
};

const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--color-text)",
    marginBottom: "4px",
    display: "block",
};

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

function WebhooksContent() {
    const t = useTranslations("webhooks");
    const tc = useTranslations("common");
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_webhooks") ?? false;

    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [events, setEvents] = useState("");
    const [testResult, setTestResult] = useState("");

    const { data: hooks, isLoading } = useQuery<Webhook[]>({
        queryKey: [portal, "webhooks"],
        queryFn: () => fetchJson<Webhook[]>("/api/webhooks"),
        enabled: canManage,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: [portal, "webhooks"] });

    const createMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    url,
                    secret: secret === "" ? undefined : secret,
                    events: events
                        .split(",")
                        .map((e) => e.trim())
                        .filter((e) => e !== ""),
                }),
            }),
        onSuccess: () => {
            invalidate();
            setName("");
            setUrl("");
            setSecret("");
            setEvents("");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/webhooks/${id}`, { method: "DELETE" }),
        onSuccess: invalidate,
    });

    const testMutation = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ ok: boolean; status: number }>(`/api/webhooks/${id}/test`, {
                method: "POST",
            }),
        onSuccess: (r) => setTestResult(r.ok ? t("testSuccess") : String(r.status)),
        onError: (e) => setTestResult(e instanceof Error ? e.message : String(e)),
    });

    const replayMutation = useMutation({
        mutationFn: (hook: Webhook) =>
            fetchJson<{ queued: boolean; event: string }>(`/api/webhooks/${hook.id}/replay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: hook.events[0] ?? "webhook.replay",
                    payload: { webhookId: hook.id, name: hook.name, replay: true },
                }),
            }),
        onSuccess: (r) => toast.success(t("replaySuccess", { event: r.event })),
        onError: (e) => toast.error(e instanceof Error ? e.message : t("replayFailed")),
    });

    if (workspace && !workspace.features.includes("webhooks")) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>{tc("soon")}</p>
        );
    }

    if (!canManage) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>{t("title")}</p>
        );
    }

    return (
        <div>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: "0 0 20px",
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h1>
            <div style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                    }}
                >
                    {t("new")}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                        <label style={labelStyle}>{tc("name")}</label>
                        <input
                            style={inputStyle}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>{t("url")}</label>
                        <input
                            style={inputStyle}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>{t("secret")}</label>
                        <input
                            style={inputStyle}
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>{t("events")}</label>
                        <input
                            style={inputStyle}
                            value={events}
                            onChange={(e) => setEvents(e.target.value)}
                        />
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => createMutation.mutate()}
                            disabled={name.trim() === "" || createMutation.isPending}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "var(--radius-sm)",
                                border: "none",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                minHeight: "36px",
                                backgroundColor: "var(--color-primary)",
                                color: "#fff",
                                opacity: name.trim() === "" ? 0.5 : 1,
                            }}
                        >
                            {createMutation.isPending ? tc("saving") : tc("create")}
                        </button>
                    </div>
                </div>
            </div>
            {testResult !== "" && (
                <p style={{ fontSize: "13px", color: "var(--color-text)", margin: "0 0 12px" }}>
                    {testResult}
                </p>
            )}
            {isLoading ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </div>
            ) : (hooks ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noWebhooks")}
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(hooks ?? []).map((h) => (
                        <div
                            key={h.id}
                            style={{
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "12px 16px",
                                backgroundColor: "var(--color-bg)",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "var(--color-text)",
                                    flex: 1,
                                    minWidth: "160px",
                                }}
                            >
                                {h.name}
                            </span>
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {h.active ? t("active") : t("inactive")}
                            </span>
                            <button
                                type="button"
                                onClick={() => replayMutation.mutate(h)}
                                disabled={replayMutation.isPending}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    backgroundColor: "transparent",
                                    color: "var(--color-text)",
                                }}
                            >
                                {t("replay")}
                            </button>
                            <button
                                type="button"
                                onClick={() => testMutation.mutate(h.id)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    backgroundColor: "transparent",
                                    color: "var(--color-text)",
                                }}
                            >
                                {t("testWebhook")}
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(h.id)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "none",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    backgroundColor: "var(--color-destructive)",
                                    color: "#fff",
                                }}
                            >
                                {tc("delete")}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function WebhooksPage() {
    return (
        <AuthSessionProvider>
            <WebhooksContent />
        </AuthSessionProvider>
    );
}
