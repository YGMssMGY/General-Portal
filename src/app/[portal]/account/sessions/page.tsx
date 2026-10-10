"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface SessionItem {
    id: string;
    provider: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    ipAddress: string | null;
    device: string;
    current: boolean;
}

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

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
    whiteSpace: "nowrap",
};

export default function SessionsPage() {
    const t = useTranslations("sessions");
    const ta = useTranslations("account");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const portal = usePortal();
    const qc = useQueryClient();
    usePageTitle(t("title"));

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [pwMessage, setPwMessage] = useState("");
    const [pwError, setPwError] = useState("");

    const {
        data: items,
        isLoading,
        isError,
    } = useQuery<SessionItem[]>({
        queryKey: [portal, "sessions"],
        queryFn: () => fetchJson<SessionItem[]>("/api/account/sessions"),
        enabled: portal !== "",
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: [portal, "sessions"] });

    const revokeMutation = useMutation({
        mutationFn: (id: string) =>
            fetchJson("/api/account/sessions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            }),
        onSuccess: invalidate,
    });

    const revokeOthersMutation = useMutation({
        mutationFn: () => fetchJson("/api/account/sessions", { method: "DELETE" }),
        onSuccess: invalidate,
    });

    const passwordMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/account/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            }),
        onSuccess: () => {
            setPwMessage(ta("passwordUpdated"));
            setPwError("");
            setCurrentPassword("");
            setNewPassword("");
            invalidate();
        },
        onError: (err) => {
            setPwError(err instanceof Error ? err.message : te("internal"));
            setPwMessage("");
        },
    });

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                }}
            >
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
                <button
                    type="button"
                    onClick={() => revokeOthersMutation.mutate()}
                    disabled={revokeOthersMutation.isPending}
                    style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        backgroundColor: "var(--color-bg)",
                        color: "var(--color-text)",
                    }}
                >
                    {t("revokeAllOthers")}
                </button>
            </div>
            {isLoading ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {tc("loading")}
                </p>
            ) : isError ? (
                <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>
                    {t("loadFailed")}
                </p>
            ) : (items ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noSessions")}
                </p>
            ) : (
                <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>{t("device")}</th>
                                <th style={thStyle}>{t("ipAddress")}</th>
                                <th style={thStyle}>{t("lastSeen")}</th>
                                <th style={thStyle}>{t("expires")}</th>
                                <th style={thStyle}>{tc("status")}</th>
                                <th style={thStyle}>{tc("actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(items ?? []).map((s) => (
                                <tr key={s.id}>
                                    <td style={tdStyle}>
                                        {s.device} ({s.provider})
                                    </td>
                                    <td style={tdStyle}>{s.ipAddress ?? tc("unknown")}</td>
                                    <td style={tdStyle}>
                                        {new Date(s.lastSeenAt).toLocaleString()}
                                    </td>
                                    <td style={tdStyle}>
                                        {new Date(s.expiresAt).toLocaleString()}
                                    </td>
                                    <td style={tdStyle}>{s.current ? t("currentBadge") : ""}</td>
                                    <td style={tdStyle}>
                                        {!s.current && (
                                            <button
                                                type="button"
                                                onClick={() => revokeMutation.mutate(s.id)}
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: "var(--radius-sm)",
                                                    border: "none",
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    fontFamily: "inherit",
                                                    backgroundColor: "var(--color-destructive)",
                                                    color: "#fff",
                                                }}
                                            >
                                                {t("revoke")}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {t("useLogoutHint")}
            </p>
            <div style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                    }}
                >
                    {ta("changePassword")}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                        <label style={labelStyle}>{ta("currentPassword")}</label>
                        <input
                            style={inputStyle}
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>{ta("newPassword")}</label>
                        <input
                            style={inputStyle}
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "4px 0 0",
                            }}
                        >
                            {ta("passwordHint")}
                        </p>
                    </div>
                    {pwMessage !== "" && (
                        <p style={{ fontSize: "13px", color: "var(--color-success)", margin: 0 }}>
                            {pwMessage}
                        </p>
                    )}
                    {pwError !== "" && (
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-destructive)",
                                margin: 0,
                            }}
                        >
                            {pwError}
                        </p>
                    )}
                    <div>
                        <button
                            type="button"
                            onClick={() => passwordMutation.mutate()}
                            disabled={
                                currentPassword === "" ||
                                newPassword.length < 12 ||
                                passwordMutation.isPending
                            }
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
                                opacity: newPassword.length < 12 ? 0.5 : 1,
                            }}
                        >
                            {passwordMutation.isPending ? tc("saving") : tc("save")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
