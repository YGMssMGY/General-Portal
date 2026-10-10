"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Stage {
    name: string;
    approverRoleId?: string | null;
    approverId?: string | null;
    slaHours?: number | null;
    escalationRoleId?: string | null;
}

interface Workflow {
    id: string;
    entityType: string;
    name: string;
    stages: Stage[];
    isActive: boolean;
    createdAt: string;
}

interface PendingApproval {
    id: string;
    entityType: string;
    entityId: string;
    stageIndex: number;
    status: string;
    dueAt: string | null;
    comment: string | null;
    workflow: Workflow | null;
    entity: { type: string; id: string; title: string | null };
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

const btnBase: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: "36px",
};

function WorkflowsContent() {
    const t = useTranslations("workflows");
    const tc = useTranslations("common");
    const te = useTranslations("events");
    const portal = usePortal();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_workflows") ?? false;

    const [entityType, setEntityType] = useState("");
    const [name, setName] = useState("");
    const [stageName, setStageName] = useState("");
    const [slaHours, setSlaHours] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [deciding, setDeciding] = useState<PendingApproval | null>(null);
    const [comment, setComment] = useState("");

    const { data: workflows, isLoading } = useQuery<Workflow[]>({
        queryKey: [portal, "workflows"],
        queryFn: () => fetchJson<Workflow[]>("/api/workflows"),
    });

    const { data: pending } = useQuery<PendingApproval[]>({
        queryKey: [portal, "approvals", "pending"],
        queryFn: () => fetchJson<PendingApproval[]>("/api/approvals"),
    });

    const createMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityType,
                    name,
                    stages: [
                        {
                            name: stageName,
                            slaHours: slaHours.trim() === "" ? undefined : Number(slaHours),
                        },
                    ],
                }),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [portal, "workflows"] });
            setEntityType("");
            setName("");
            setStageName("");
            setSlaHours("");
            setShowForm(false);
        },
    });

    const decideMutation = useMutation({
        mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
            fetchJson(`/api/approvals/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, comment: comment.trim() === "" ? null : comment }),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [portal, "approvals", "pending"] });
            setDeciding(null);
            setComment("");
        },
    });

    if (isLoading) {
        return (
            <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                {tc("loading")}
            </div>
        );
    }

    const list = workflows ?? [];
    const pendingList = pending ?? [];

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "12px",
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
                {canManage && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        style={{
                            ...btnBase,
                            backgroundColor: "var(--color-primary)",
                            color: "#fff",
                        }}
                    >
                        {t("configureWorkflow")}
                    </button>
                )}
            </div>

            {showForm && (
                <div
                    style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "16px",
                        marginBottom: "20px",
                        backgroundColor: "var(--color-bg-secondary)",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>{tc("type")}</label>
                            <input
                                style={inputStyle}
                                value={entityType}
                                onChange={(e) => setEntityType(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{tc("name")}</label>
                            <input
                                style={inputStyle}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t("stageName")}</label>
                            <input
                                style={inputStyle}
                                value={stageName}
                                onChange={(e) => setStageName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t("slaHours")}</label>
                            <input
                                type="number"
                                min="0"
                                style={inputStyle}
                                value={slaHours}
                                onChange={(e) => setSlaHours(e.target.value)}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={() => createMutation.mutate()}
                                disabled={
                                    !entityType.trim() ||
                                    !name.trim() ||
                                    !stageName.trim() ||
                                    createMutation.isPending
                                }
                                style={{
                                    ...btnBase,
                                    backgroundColor: "var(--color-primary)",
                                    color: "#fff",
                                    opacity:
                                        !entityType.trim() || !name.trim() || !stageName.trim()
                                            ? 0.5
                                            : 1,
                                }}
                            >
                                {createMutation.isPending ? tc("saving") : tc("create")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                style={{
                                    ...btnBase,
                                    backgroundColor: "transparent",
                                    color: "var(--color-text-secondary)",
                                    border: "1px solid var(--color-border)",
                                }}
                            >
                                {tc("cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {list.length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noWorkflows")}
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {list.map((w) => (
                        <div
                            key={w.id}
                            style={{
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "16px",
                                backgroundColor: "var(--color-bg)",
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "15px",
                                    fontWeight: 600,
                                    margin: "0 0 4px",
                                    color: "var(--color-text)",
                                }}
                            >
                                {w.name}
                            </h3>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {tc("type")}: {w.entityType} · {t("stages")}: {w.stages.length}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <h2
                style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: "28px 0 12px",
                    color: "var(--color-text)",
                }}
            >
                {t("pendingApproval")}
            </h2>
            {pendingList.length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("pendingApproval")}: 0
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {pendingList.map((a) => {
                        const total = a.workflow?.stages.length ?? 1;
                        return (
                            <div
                                key={a.id}
                                style={{
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "var(--radius-sm)",
                                    padding: "16px",
                                    backgroundColor: "var(--color-bg)",
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        margin: "0 0 4px",
                                        color: "var(--color-text)",
                                    }}
                                >
                                    {a.entity.title ?? a.entityId}
                                </h3>
                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 12px",
                                    }}
                                >
                                    {t("currentStage")}:{" "}
                                    {a.workflow?.stages[a.stageIndex]?.name ?? a.stageIndex + 1} ·{" "}
                                    {t("stageOf", {
                                        current: a.stageIndex + 1,
                                        total,
                                    })}
                                </p>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeciding(a);
                                            setComment("");
                                        }}
                                        style={{
                                            ...btnBase,
                                            backgroundColor: "var(--color-success)",
                                            color: "#fff",
                                        }}
                                    >
                                        {t("approve")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeciding(a);
                                            setComment("");
                                        }}
                                        style={{
                                            ...btnBase,
                                            backgroundColor: "transparent",
                                            color: "var(--color-destructive)",
                                            border: "1px solid var(--color-destructive)",
                                        }}
                                    >
                                        {t("reject")}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {deciding && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 50,
                        padding: "16px",
                    }}
                    onClick={() => setDeciding(null)}
                >
                    <div
                        style={{
                            backgroundColor: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "20px",
                            width: "100%",
                            maxWidth: "420px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            style={{
                                fontSize: "15px",
                                fontWeight: 600,
                                margin: "0 0 12px",
                                color: "var(--color-text)",
                            }}
                        >
                            {deciding.entity.title ?? deciding.entityId}
                        </h3>
                        <label style={labelStyle}>{te("approvalComment")}</label>
                        <textarea
                            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                            <button
                                type="button"
                                onClick={() =>
                                    decideMutation.mutate({ id: deciding.id, decision: "approved" })
                                }
                                disabled={decideMutation.isPending}
                                style={{
                                    ...btnBase,
                                    backgroundColor: "var(--color-success)",
                                    color: "#fff",
                                }}
                            >
                                {t("approve")}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    decideMutation.mutate({ id: deciding.id, decision: "rejected" })
                                }
                                disabled={decideMutation.isPending}
                                style={{
                                    ...btnBase,
                                    backgroundColor: "var(--color-destructive)",
                                    color: "#fff",
                                }}
                            >
                                {t("reject")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeciding(null)}
                                style={{
                                    ...btnBase,
                                    backgroundColor: "transparent",
                                    color: "var(--color-text-secondary)",
                                    border: "1px solid var(--color-border)",
                                }}
                            >
                                {tc("cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WorkflowsPage() {
    return (
        <AuthSessionProvider>
            <WorkflowsContent />
        </AuthSessionProvider>
    );
}
