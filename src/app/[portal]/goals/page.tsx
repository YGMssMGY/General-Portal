"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface KeyResult {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
}

interface GoalItem {
    id: string;
    title: string;
    description: string | null;
    ownerId: string | null;
    status: string;
    dueDate: string | null;
    progress: number;
    keyResults: KeyResult[];
    owner: { id: string; name: string | null } | null;
}

interface MemberOption {
    id: string;
    name: string | null;
    email: string;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

function KeyResultRow({
    goalId,
    kr,
    canEdit,
}: {
    goalId: string;
    kr: KeyResult;
    canEdit: boolean;
}) {
    const portal = usePortal();
    const t = useTranslations("goals");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const [value, setValue] = useState(String(kr.current));

    const save = useMutation({
        mutationFn: (current: number) =>
            fetchJson(`/api/goals/${goalId}/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyResultId: kr.id, current }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "goals"] });
            toast.success(t("updateSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const pct = kr.target > 0 ? Math.min(Math.round((kr.current / kr.target) * 100), 100) : 0;

    return (
        <div
            style={{
                border: "1px solid var(--color-border)",
                borderRadius: "5px",
                padding: "8px 10px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--color-text)",
                }}
            >
                <span>{kr.title}</span>
                <span style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {kr.current} / {kr.target}
                    {kr.unit ? ` ${kr.unit}` : ""}
                </span>
            </div>
            <span
                style={{
                    display: "block",
                    height: "6px",
                    borderRadius: "5px",
                    backgroundColor: "var(--color-bg-secondary)",
                    marginTop: "6px",
                }}
            >
                <span
                    style={{
                        display: "block",
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "5px",
                        backgroundColor: "var(--color-primary)",
                    }}
                />
            </span>
            {canEdit && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <Input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        style={{ maxWidth: "120px" }}
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={save.isPending}
                        onClick={() => {
                            const n = Number.parseInt(value, 10);
                            if (!Number.isInteger(n) || n < 0) {
                                toast.error(tE("validationFailed"));
                                return;
                            }
                            save.mutate(n);
                        }}
                    >
                        {t("saveProgress")}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function GoalsPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("goals");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);

    const [status, setStatus] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [ownerId, setOwnerId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [krs, setKrs] = useState<Array<{ title: string; target: string; unit: string }>>([
        { title: "", target: "", unit: "" },
    ]);

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "goals", status],
        queryFn: () => fetchPage<GoalItem>(`/api/goals${status ? `?status=${status}` : ""}`),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<GoalItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const all = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<GoalItem>(
                `/api/goals?cursor=${encodeURIComponent(nextCursor)}${status ? `&status=${status}` : ""}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const { data: memberPage } = useQuery({
        queryKey: [portal, "members"],
        queryFn: () => fetchPage<MemberOption>("/api/members"),
        enabled: portal !== "" && createOpen,
    });

    const create = useMutation({
        mutationFn: (body: {
            title: string;
            description?: string | null;
            ownerId?: string | null;
            dueDate?: string | null;
            keyResults: Array<{ title: string; target: number; unit?: string }>;
        }) =>
            fetchJson("/api/goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "goals"] });
            setCreateOpen(false);
            setTitle("");
            setDescription("");
            setOwnerId("");
            setDueDate("");
            setKrs([{ title: "", target: "", unit: "" }]);
            toast.success(t("createSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleCreate() {
        const cleanKrs = krs
            .map((k) => ({
                title: k.title.trim(),
                target: Number.parseInt(k.target, 10),
                unit: k.unit.trim() || undefined,
            }))
            .filter((k) => k.title !== "" && Number.isInteger(k.target) && k.target > 0);
        if (!title.trim() || cleanKrs.length === 0) {
            toast.error(tE("validationFailed"));
            return;
        }
        create.mutate({
            title: title.trim(),
            description: description.trim() || null,
            ownerId: ownerId || null,
            dueDate: dueDate || null,
            keyResults: cleanKrs,
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "var(--color-text)",
                            margin: 0,
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
                        {wsName}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "5px",
                            padding: "6px 10px",
                            fontSize: "14px",
                            backgroundColor: "var(--color-bg)",
                            color: "var(--color-text)",
                        }}
                    >
                        <option value="">{tC("all")}</option>
                        <option value="active">{t("active")}</option>
                        <option value="completed">{t("completed")}</option>
                        <option value="archived">{t("archived")}</option>
                    </select>
                    <Button onClick={() => setCreateOpen(true)}>{t("new")}</Button>
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            ) : all.length === 0 ? (
                <Card>
                    <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("noGoals")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {all.map((g) => {
                        const canEdit =
                            user?.id === g.ownerId ||
                            user?.role === "admin" ||
                            user?.role === "officer";
                        return (
                            <Card key={g.id}>
                                <CardContent
                                    style={{
                                        padding: "16px 20px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "10px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <div>
                                            <p
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: 600,
                                                    color: "var(--color-text)",
                                                    margin: 0,
                                                }}
                                            >
                                                {g.title}
                                            </p>
                                            {g.description && (
                                                <p
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: "4px 0 0",
                                                    }}
                                                >
                                                    {g.description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge
                                            variant={
                                                g.status === "active" ? "default" : "secondary"
                                            }
                                        >
                                            {g.status === "active"
                                                ? t("active")
                                                : g.status === "completed"
                                                  ? t("completed")
                                                  : t("archived")}
                                        </Badge>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: "12px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                        }}
                                    >
                                        {g.owner
                                            ? (g.owner.name ?? t("unassigned"))
                                            : t("unassigned")}
                                        {g.dueDate
                                            ? ` · ${t("dueDate")}: ${new Date(g.dueDate).toLocaleDateString()}`
                                            : ""}
                                        {` · ${t("progress")}: ${g.progress}%`}
                                    </p>
                                    <span
                                        style={{
                                            display: "block",
                                            height: "8px",
                                            borderRadius: "5px",
                                            backgroundColor: "var(--color-bg-secondary)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "block",
                                                height: "100%",
                                                width: `${g.progress}%`,
                                                borderRadius: "5px",
                                                backgroundColor: "var(--color-primary)",
                                            }}
                                        />
                                    </span>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                        }}
                                    >
                                        {g.keyResults.map((kr) => (
                                            <KeyResultRow
                                                key={kr.id}
                                                goalId={g.id}
                                                kr={kr}
                                                canEdit={canEdit}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {nextCursor && (
                <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                    {moreLoading ? tC("loading") : tC("showMore")}
                </Button>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={t("title")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={t("description")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                        <select
                            value={ownerId}
                            onChange={(e) => setOwnerId(e.target.value)}
                            style={{
                                border: "1px solid var(--color-border)",
                                borderRadius: "5px",
                                padding: "8px 10px",
                                fontSize: "14px",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-text)",
                            }}
                        >
                            <option value="">{t("unassigned")}</option>
                            {(memberPage?.items ?? []).map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name ?? m.email}
                                </option>
                            ))}
                        </select>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                        {krs.map((k, i) => (
                            <div key={i} style={{ display: "flex", gap: "8px" }}>
                                <Input
                                    placeholder={t("keyResultTitle")}
                                    value={k.title}
                                    onChange={(e) =>
                                        setKrs((prev) =>
                                            prev.map((v, j) =>
                                                j === i ? { ...v, title: e.target.value } : v,
                                            ),
                                        )
                                    }
                                />
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder={t("target")}
                                    value={k.target}
                                    onChange={(e) =>
                                        setKrs((prev) =>
                                            prev.map((v, j) =>
                                                j === i ? { ...v, target: e.target.value } : v,
                                            ),
                                        )
                                    }
                                    style={{ maxWidth: "100px" }}
                                />
                                <Input
                                    placeholder={t("unit")}
                                    value={k.unit}
                                    onChange={(e) =>
                                        setKrs((prev) =>
                                            prev.map((v, j) =>
                                                j === i ? { ...v, unit: e.target.value } : v,
                                            ),
                                        )
                                    }
                                    style={{ maxWidth: "80px" }}
                                />
                            </div>
                        ))}
                        {krs.length < 20 && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setKrs((prev) => [...prev, { title: "", target: "", unit: "" }])
                                }
                            >
                                {t("addKeyResult")}
                            </Button>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={create.isPending}>
                            {tC("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
