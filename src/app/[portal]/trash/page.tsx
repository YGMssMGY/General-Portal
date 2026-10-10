"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TrashItem {
    entityType: string;
    id: string;
    title: string;
    deletedAt: string;
}

const ENTITY_TYPES = [
    "tasks",
    "events",
    "proposals",
    "messageThreads",
    "meetings",
    "subgroups",
    "linkItems",
    "attachments",
    "showcaseItems",
    "cooperationRequests",
    "purchaseRequests",
];

const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "inherit",
    outline: "none",
};

function TrashContent() {
    const t = useTranslations("trash");
    const tc = useTranslations("common");
    const portal = usePortal();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const isAdmin = user?.role === "admin";

    const [entityType, setEntityType] = useState("");
    const [pendingDelete, setPendingDelete] = useState<TrashItem | null>(null);

    const qs = entityType === "" ? "" : `?entityType=${encodeURIComponent(entityType)}`;
    const { data: items, isLoading } = useQuery<TrashItem[]>({
        queryKey: [portal, "trash", entityType],
        queryFn: () => fetchJson<TrashItem[]>(`/api/trash${qs}`),
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: [portal, "trash", entityType] });

    const restoreMutation = useMutation({
        mutationFn: (item: TrashItem) =>
            fetchJson("/api/trash/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityType: item.entityType, id: item.id }),
            }),
        onSuccess: invalidate,
    });

    const deleteMutation = useMutation({
        mutationFn: (item: TrashItem) =>
            fetchJson("/api/trash", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityType: item.entityType, id: item.id }),
            }),
        onSuccess: () => {
            invalidate();
            setPendingDelete(null);
        },
    });

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
            <div style={{ marginBottom: "20px", maxWidth: "320px" }}>
                <select
                    style={{ ...inputStyle, width: "100%" }}
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                >
                    <option value="">{tc("all")}</option>
                    {ENTITY_TYPES.map((e) => (
                        <option key={e} value={e}>
                            {e}
                        </option>
                    ))}
                </select>
            </div>
            {isLoading ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </div>
            ) : (items ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("trashEmpty")}
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(items ?? []).map((item) => (
                        <div
                            key={`${item.entityType}-${item.id}`}
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
                                {item.title}
                            </span>
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {item.entityType} · {t("deletedAt")}: {item.deletedAt}
                            </span>
                            <button
                                type="button"
                                onClick={() => restoreMutation.mutate(item)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "none",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    backgroundColor: "var(--color-primary)",
                                    color: "#fff",
                                }}
                            >
                                {t("restore")}
                            </button>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setPendingDelete(item)}
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
                                    {tc("deleteForever")}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDelete(null);
                }}
                title={tc("permanentlyDelete")}
                description={t("permanentDeleteWarning")}
                confirmLabel={tc("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={pendingDelete?.title ?? tc("deleteForever")}
                onConfirm={() => {
                    if (pendingDelete) deleteMutation.mutate(pendingDelete);
                }}
            />
        </div>
    );
}

export default function TrashPage() {
    return (
        <AuthSessionProvider>
            <TrashContent />
        </AuthSessionProvider>
    );
}
