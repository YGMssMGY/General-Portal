"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuthSession } from "@/components/AuthSessionProvider";

interface OpenApiDoc {
    paths?: Record<string, Record<string, { tags?: string[]; summary?: string }>>;
    "x-token-scopes"?: string[];
}

const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--color-text)",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
};

export default function ApiDocsPage() {
    const t = useTranslations("apiDocs");
    const tc = useTranslations("common");
    const portal = usePortal();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_api_tokens") ?? false;
    const [tag, setTag] = useState("");

    const { data, isLoading, isError } = useQuery<OpenApiDoc>({
        queryKey: [portal, "openapi"],
        queryFn: () => fetchJson<OpenApiDoc>("/api/public/openapi.json"),
        enabled: canManage && portal !== "",
    });

    if (!canManage) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>{t("title")}</p>
        );
    }

    const entries = Object.entries(data?.paths ?? {}).flatMap(([path, methods]) =>
        Object.entries(methods ?? {}).map(([method, op]) => ({
            method: method.toUpperCase(),
            path,
            tag: op.tags?.[0] ?? "misc",
            summary: op.summary ?? "",
        })),
    );
    const tags = [...new Set(entries.map((e) => e.tag))].sort();
    const visible = tag === "" ? entries : entries.filter((e) => e.tag === tag);
    const scopes = data?.["x-token-scopes"] ?? [];

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
            {isLoading ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {tc("loading")}
                </p>
            ) : isError || !data ? (
                <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>
                    {t("loadFailed")}
                </p>
            ) : (
                <div>
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "20px",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setTag("")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                backgroundColor:
                                    tag === "" ? "var(--color-primary)" : "var(--color-bg)",
                                color: tag === "" ? "#fff" : "var(--color-text)",
                            }}
                        >
                            {tc("all")}
                        </button>
                        {tags.map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setTag(g)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    backgroundColor:
                                        tag === g ? "var(--color-primary)" : "var(--color-bg)",
                                    color: tag === g ? "#fff" : "var(--color-text)",
                                }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                    <div
                        style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--color-bg)",
                            marginBottom: "20px",
                            overflowX: "auto",
                        }}
                    >
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>{t("method")}</th>
                                    <th style={thStyle}>{t("path")}</th>
                                    <th style={thStyle}>{t("summary")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((e) => (
                                    <tr key={`${e.method} ${e.path}`}>
                                        <td style={tdStyle}>
                                            <code
                                                style={{
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "var(--color-primary)",
                                                }}
                                            >
                                                {e.method}
                                            </code>
                                        </td>
                                        <td style={tdStyle}>
                                            <code style={{ fontSize: "12px" }}>{e.path}</code>
                                        </td>
                                        <td style={tdStyle}>{e.summary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div
                        style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "16px",
                            backgroundColor: "var(--color-bg)",
                        }}
                    >
                        <h2
                            style={{
                                fontSize: "15px",
                                fontWeight: 600,
                                margin: "0 0 8px",
                                color: "var(--color-text)",
                            }}
                        >
                            {t("tokenScopes")}
                        </h2>
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 12px",
                            }}
                        >
                            {t("scopesNote")}
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {scopes.map((s) => (
                                <code
                                    key={s}
                                    style={{
                                        fontSize: "12px",
                                        padding: "4px 8px",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-sm)",
                                        color: "var(--color-text)",
                                    }}
                                >
                                    {s}
                                </code>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
