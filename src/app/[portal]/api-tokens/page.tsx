"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface ApiToken {
    id: string;
    name: string;
    scopes: string[];
    expiresAt: string | null;
    lastUsedAt: string | null;
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

function ApiTokensContent() {
    const t = useTranslations("apiTokens");
    const tc = useTranslations("common");
    const portal = usePortal();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_api_tokens") ?? false;

    const [name, setName] = useState("");
    const [scopes, setScopes] = useState("");
    const [plainToken, setPlainToken] = useState("");

    const { data: tokens, isLoading } = useQuery<ApiToken[]>({
        queryKey: [portal, "api-tokens"],
        queryFn: () => fetchJson<ApiToken[]>("/api/api-tokens"),
        enabled: canManage,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: [portal, "api-tokens"] });

    const createMutation = useMutation({
        mutationFn: () =>
            fetchJson<{ id: string; token: string }>("/api/api-tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    scopes: scopes
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s !== ""),
                }),
            }),
        onSuccess: (r) => {
            setPlainToken(r.token);
            invalidate();
            setName("");
            setScopes("");
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/api-tokens/${id}`, { method: "DELETE" }),
        onSuccess: invalidate,
    });

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
            {plainToken !== "" && (
                <div
                    style={{
                        ...cardStyle,
                        borderColor: "var(--color-warning)",
                    }}
                >
                    <p
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            margin: "0 0 8px",
                        }}
                    >
                        {t("copyWarning")}
                    </p>
                    <p
                        style={{
                            fontSize: "13px",
                            color: "var(--color-text-secondary)",
                            margin: "0 0 8px",
                        }}
                    >
                        {t("tokenShownOnce")}
                    </p>
                    <code
                        style={{
                            fontSize: "13px",
                            color: "var(--color-text)",
                            wordBreak: "break-all",
                        }}
                    >
                        {plainToken}
                    </code>
                </div>
            )}
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
                        <label style={labelStyle}>{t("tokenName")}</label>
                        <input
                            style={inputStyle}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>{t("scopes")}</label>
                        <input
                            style={inputStyle}
                            value={scopes}
                            onChange={(e) => setScopes(e.target.value)}
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
            {isLoading ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </div>
            ) : (tokens ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noTokens")}
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(tokens ?? []).map((tok) => (
                        <div
                            key={tok.id}
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
                                {tok.name}
                            </span>
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {t("lastUsedAt")}: {tok.lastUsedAt ?? t("neverUsed")}
                            </span>
                            <button
                                type="button"
                                onClick={() => revokeMutation.mutate(tok.id)}
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
                                {t("revoke")}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ApiTokensPage() {
    return (
        <AuthSessionProvider>
            <ApiTokensContent />
        </AuthSessionProvider>
    );
}
