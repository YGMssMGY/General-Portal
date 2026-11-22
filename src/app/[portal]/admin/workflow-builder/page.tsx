"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StageDraft {
    name: string;
    slaHours: string;
}

interface StagePayload {
    name: string;
    slaHours?: number;
    approverRoleId?: string;
    approverId?: string;
    escalationRoleId?: string;
}

interface Workflow {
    id: string;
    entityType: string;
    name: string;
    stages: Array<{ name: string; slaHours?: number | null }>;
    isActive: boolean;
    createdAt: string;
}

const MAX_STAGES = 5;
const ADVANCED_KEYS = ["approverRoleId", "approverId", "escalationRoleId"] as const;

export default function WorkflowBuilderPage() {
    const t = useTranslations("workflowBuilder");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const portal = usePortal();
    const { user, status } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const queryClient = useQueryClient();
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const canManage = user?.role === "admin" || user?.role === "officer";
    const [open, setOpen] = useState(false);
    const [entityType, setEntityType] = useState("");
    const [name, setName] = useState("");
    const [stages, setStages] = useState<StageDraft[]>([{ name: "", slaHours: "" }]);
    const [advanced, setAdvanced] = useState("");
    const [pendingDelete, setPendingDelete] = useState<Workflow | null>(null);

    const { data: workflows, isLoading } = useQuery<Workflow[]>({
        queryKey: [portal, "workflows"],
        queryFn: () => fetchJson<Workflow[]>("/api/workflows"),
        enabled: portal !== "" && canManage,
    });

    const createMutation = useMutation({
        mutationFn: (payload: { entityType: string; name: string; stages: StagePayload[] }) =>
            fetchJson<Workflow>("/api/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "workflows"] });
            setOpen(false);
            setEntityType("");
            setName("");
            setStages([{ name: "", slaHours: "" }]);
            setAdvanced("");
            toast.success(t("created"));
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : te("internal")),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            fetchJson(`/api/workflows/${id}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "workflows"] });
            setPendingDelete(null);
            toast.success(t("deleted"));
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : te("internal")),
    });

    function setStage(index: number, patch: Partial<StageDraft>) {
        setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    }

    function moveStage(index: number, delta: number) {
        setStages((prev) => {
            const target = index + delta;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            const current = next[index];
            next[index] = next[target];
            next[target] = current;
            return next;
        });
    }

    function buildStages(): StagePayload[] | null {
        let advancedRows: unknown[] = [];
        if (advanced.trim() !== "") {
            let parsed: unknown;
            try {
                parsed = JSON.parse(advanced);
            } catch {
                return null;
            }
            if (!Array.isArray(parsed)) return null;
            advancedRows = parsed;
        }
        const result: StagePayload[] = [];
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            if (stage.name.trim() === "") return null;
            const payload: StagePayload = { name: stage.name.trim() };
            if (stage.slaHours.trim() !== "") {
                const hours = Number(stage.slaHours);
                if (!Number.isFinite(hours) || hours <= 0) return null;
                payload.slaHours = hours;
            }
            const extra = advancedRows[i];
            if (extra && typeof extra === "object") {
                for (const key of ADVANCED_KEYS) {
                    const value = (extra as Record<string, unknown>)[key];
                    if (typeof value === "string" && value.trim() !== "") {
                        payload[key] = value.trim();
                    }
                }
            }
            result.push(payload);
        }
        return result;
    }

    function handleCreate() {
        if (entityType.trim() === "" || name.trim() === "") {
            toast.error(te("validationFailed"));
            return;
        }
        const payloadStages = buildStages();
        if (!payloadStages) {
            toast.error(te("validationFailed"));
            return;
        }
        createMutation.mutate({
            entityType: entityType.trim(),
            name: name.trim(),
            stages: payloadStages,
        });
    }

    if (status === "loading") {
        return (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                {tc("loading")}
            </p>
        );
    }
    if (!canManage) {
        return (
            <p style={{ color: "var(--color-destructive)", fontSize: "14px" }}>{te("forbidden")}</p>
        );
    }

    const list = workflows ?? [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                }}
            >
                <div>
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
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: "4px 0 0",
                        }}
                    >
                        {workspace?.name ?? portal}
                    </p>
                </div>
                <Button onClick={() => setOpen(true)}>{t("newWorkflow")}</Button>
            </div>

            {open && (
                <Card>
                    <CardContent style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div
                            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <Label htmlFor="wb-entity-type">{tc("type")}</Label>
                                <Input
                                    id="wb-entity-type"
                                    value={entityType}
                                    onChange={(e) => setEntityType(e.target.value)}
                                />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <Label htmlFor="wb-name">{tc("name")}</Label>
                                <Input
                                    id="wb-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <Label>{t("stages")}</Label>
                        {stages.map((stage, index) => (
                            <div
                                key={index}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 120px auto",
                                    gap: "8px",
                                    alignItems: "end",
                                }}
                            >
                                <div
                                    style={{ display: "flex", flexDirection: "column", gap: "4px" }}
                                >
                                    <Label htmlFor={`wb-stage-name-${index}`}>
                                        {t("stage")} {index + 1}
                                    </Label>
                                    <Input
                                        id={`wb-stage-name-${index}`}
                                        value={stage.name}
                                        onChange={(e) => setStage(index, { name: e.target.value })}
                                    />
                                </div>
                                <div
                                    style={{ display: "flex", flexDirection: "column", gap: "4px" }}
                                >
                                    <Label htmlFor={`wb-stage-sla-${index}`}>{t("slaHours")}</Label>
                                    <Input
                                        id={`wb-stage-sla-${index}`}
                                        type="number"
                                        min="1"
                                        value={stage.slaHours}
                                        onChange={(e) =>
                                            setStage(index, { slaHours: e.target.value })
                                        }
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={t("moveUp")}
                                        disabled={index === 0}
                                        onClick={() => moveStage(index, -1)}
                                    >
                                        <ArrowUp size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={t("moveDown")}
                                        disabled={index === stages.length - 1}
                                        onClick={() => moveStage(index, 1)}
                                    >
                                        <ArrowDown size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={t("removeStage")}
                                        disabled={stages.length === 1}
                                        onClick={() =>
                                            setStages((prev) => prev.filter((_, i) => i !== index))
                                        }
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={stages.length >= MAX_STAGES}
                                onClick={() =>
                                    setStages((prev) => [...prev, { name: "", slaHours: "" }])
                                }
                            >
                                <Plus size={14} />
                                {t("addStage")}
                            </Button>
                            {stages.length >= MAX_STAGES && (
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {t("maxStages", { count: MAX_STAGES })}
                                </span>
                            )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <Label htmlFor="wb-advanced">{t("advanced")}</Label>
                            <Textarea
                                id="wb-advanced"
                                value={advanced}
                                onChange={(e) => setAdvanced(e.target.value)}
                                placeholder={t("advancedHint")}
                                rows={4}
                            />
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                {createMutation.isPending ? tc("saving") : tc("create")}
                            </Button>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                {tc("cancel")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </p>
            ) : list.length === 0 ? (
                <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {t("noWorkflows")}
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {list.map((workflow) => (
                        <Card key={workflow.id}>
                            <CardContent
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "12px",
                                    padding: "12px 16px",
                                }}
                            >
                                <div>
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            margin: 0,
                                            color: "var(--color-text)",
                                        }}
                                    >
                                        {workflow.name}
                                    </p>
                                    <p
                                        style={{
                                            fontSize: "13px",
                                            margin: "4px 0 0",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        {tc("type")}: {workflow.entityType} ·{" "}
                                        {t("stageCount", { count: workflow.stages.length })}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={tc("delete")}
                                    onClick={() => setPendingDelete(workflow)}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(next) => {
                    if (!next) setPendingDelete(null);
                }}
                title={t("deleteTitle")}
                description={t("deleteDescription", { name: pendingDelete?.name ?? "" })}
                confirmLabel={tc("delete")}
                destructive
                onConfirm={() => {
                    if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
                }}
            />
        </div>
    );
}
