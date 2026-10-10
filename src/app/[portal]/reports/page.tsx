"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface ReportRow {
    id: string;
    type: string;
    format: string;
    status: string;
    storagePath: string | null;
    periodStart: string | null;
    periodEnd: string | null;
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

function ReportsContent() {
    const t = useTranslations("reports");
    const tc = useTranslations("common");
    const ta = useTranslations("activity");
    const tf = useTranslations("finance");
    const tat = useTranslations("attendance");
    const tp = useTranslations("participation");
    const portal = usePortal();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_reports") ?? false;

    const [type, setType] = useState("full");
    const [format, setFormat] = useState("csv");
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [notice, setNotice] = useState("");

    const { data: rows, isLoading } = useQuery<ReportRow[]>({
        queryKey: [portal, "reports"],
        queryFn: () => fetchJson<ReportRow[]>("/api/reports"),
    });

    const generateMutation = useMutation({
        mutationFn: () =>
            fetchJson<ReportRow>("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    format,
                    periodStart: periodStart === "" ? undefined : periodStart,
                    periodEnd: periodEnd === "" ? undefined : periodEnd,
                }),
            }),
        onSuccess: (row) => {
            qc.invalidateQueries({ queryKey: [portal, "reports"] });
            setNotice(row.status === "complete" ? t("reportReady") : row.status);
        },
        onError: (e) => setNotice(e instanceof Error ? e.message : t("reportReady")),
    });

    const typeLabel = (v: string) => {
        if (v === "activity") return ta("title");
        if (v === "finance") return tf("title");
        if (v === "attendance") return tat("title");
        if (v === "participation") return tp("title");
        return tc("all");
    };

    const formatLabel = (v: string) => {
        if (v === "pdf") return t("formatPdf");
        if (v === "xlsx") return t("formatXlsx");
        return t("formatCsv");
    };

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
            {canManage && (
                <div style={cardStyle}>
                    <h2
                        style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            margin: "0 0 12px",
                            color: "var(--color-text)",
                        }}
                    >
                        {t("generateReport")}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>{tc("type")}</label>
                            <select
                                style={inputStyle}
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="full">{tc("all")}</option>
                                <option value="activity">{ta("title")}</option>
                                <option value="finance">{tf("title")}</option>
                                <option value="attendance">{tat("title")}</option>
                                <option value="participation">{tp("title")}</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>{t("format")}</label>
                            <select
                                style={inputStyle}
                                value={format}
                                onChange={(e) => setFormat(e.target.value)}
                            >
                                <option value="csv">{t("formatCsv")}</option>
                                <option value="xlsx">{t("formatXlsx")}</option>
                                <option value="pdf">{t("formatPdf")}</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>{t("period")}</label>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    style={inputStyle}
                                    type="date"
                                    value={periodStart}
                                    onChange={(e) => setPeriodStart(e.target.value)}
                                />
                                <input
                                    style={inputStyle}
                                    type="date"
                                    value={periodEnd}
                                    onChange={(e) => setPeriodEnd(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => generateMutation.mutate()}
                                disabled={generateMutation.isPending}
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
                                }}
                            >
                                {generateMutation.isPending ? tc("saving") : t("generate")}
                            </button>
                        </div>
                        {notice !== "" && (
                            <p style={{ fontSize: "13px", color: "var(--color-text)", margin: 0 }}>
                                {notice}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <h2
                style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: "0 0 12px",
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h2>
            {isLoading ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </div>
            ) : (rows ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noReports")}
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(rows ?? []).map((r) => (
                        <div
                            key={r.id}
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
                                {typeLabel(r.type)} · {formatLabel(r.format)}
                            </span>
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {r.status}
                            </span>
                            {(r.format === "csv" || r.format === "xlsx" || r.format === "pdf") &&
                                r.status === "complete" && (
                                    <a
                                        href={`/api/reports?download=${r.id}`}
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: "var(--color-primary)",
                                        }}
                                    >
                                        {t("downloadReport")}
                                    </a>
                                )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ReportsPage() {
    return (
        <AuthSessionProvider>
            <ReportsContent />
        </AuthSessionProvider>
    );
}
