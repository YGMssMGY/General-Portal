"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface CustomFieldDef {
    id: string;
    entityType: string;
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    options: string[];
    position: number;
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

function CustomFieldsContent() {
    const tc = useTranslations("common");
    const tm = useTranslations("members");
    const tt = useTranslations("tasks");
    const te = useTranslations("events");
    const portal = usePortal();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(tm("title"));
    const canManage = user?.permissions.includes("manage_custom_fields") ?? false;

    const [entityType, setEntityType] = useState("task");
    const [key, setKey] = useState("");
    const [label, setLabel] = useState("");
    const [fieldType, setFieldType] = useState("text");
    const [required, setRequired] = useState(false);
    const [options, setOptions] = useState("");

    const { data: defs, isLoading } = useQuery<CustomFieldDef[]>({
        queryKey: [portal, "custom-fields", entityType],
        queryFn: () => fetchJson<CustomFieldDef[]>(`/api/custom-fields?entityType=${entityType}`),
    });

    const invalidate = () =>
        qc.invalidateQueries({ queryKey: [portal, "custom-fields", entityType] });

    const createMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/custom-fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityType,
                    key,
                    label,
                    fieldType,
                    required,
                    options: options
                        .split(",")
                        .map((o) => o.trim())
                        .filter((o) => o !== ""),
                }),
            }),
        onSuccess: () => {
            invalidate();
            setKey("");
            setLabel("");
            setOptions("");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/custom-fields/${id}`, { method: "DELETE" }),
        onSuccess: invalidate,
    });

    const entityLabel = (v: string) => {
        if (v === "task") return tt("title");
        if (v === "event") return te("title");
        return v;
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
                {tm("title")}
            </h1>
            <div style={{ marginBottom: "20px", maxWidth: "320px" }}>
                <label style={labelStyle}>{tc("type")}</label>
                <select
                    style={inputStyle}
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                >
                    <option value="task">{tt("title")}</option>
                    <option value="event">{te("title")}</option>
                </select>
            </div>
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
                        {tc("create")}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>{tc("name")}</label>
                            <input
                                style={inputStyle}
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{tc("title")}</label>
                            <input
                                style={inputStyle}
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{tc("type")}</label>
                            <select
                                style={inputStyle}
                                value={fieldType}
                                onChange={(e) => setFieldType(e.target.value)}
                            >
                                <option value="text">text</option>
                                <option value="number">number</option>
                                <option value="date">date</option>
                                <option value="select">select</option>
                                <option value="boolean">boolean</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>{tc("description")}</label>
                            <input
                                style={inputStyle}
                                value={options}
                                onChange={(e) => setOptions(e.target.value)}
                            />
                        </div>
                        <label
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text)",
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={required}
                                onChange={(e) => setRequired(e.target.checked)}
                            />
                            {tc("required")}
                        </label>
                        <div>
                            <button
                                type="button"
                                onClick={() => createMutation.mutate()}
                                disabled={key.trim() === "" || createMutation.isPending}
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
                                    opacity: key.trim() === "" ? 0.5 : 1,
                                }}
                            >
                                {createMutation.isPending ? tc("saving") : tc("create")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isLoading ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(defs ?? []).map((d) => (
                        <div
                            key={d.id}
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
                                {d.label} · {d.key} · {d.fieldType} · {entityLabel(d.entityType)}
                            </span>
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => deleteMutation.mutate(d.id)}
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
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CustomFieldsPage() {
    return (
        <AuthSessionProvider>
            <CustomFieldsContent />
        </AuthSessionProvider>
    );
}
