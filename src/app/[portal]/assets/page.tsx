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

interface Asset {
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    condition: string;
    onLoan: number;
    available: number;
    createdAt: string;
}

interface Loan {
    id: string;
    assetId: string;
    userId: string;
    quantity: number;
    borrowedAt: string;
    dueAt: string | null;
    returnedAt: string | null;
    status: string;
    user: { id: string; name: string | null; email: string } | null;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function AssetsPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("assets");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const canManage = user?.role === "admin" || (user?.permissions ?? []).includes("manage_assets");

    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [condition, setCondition] = useState("good");
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [openLoans, setOpenLoans] = useState<string | null>(null);
    const [loanRows, setLoanRows] = useState<Record<string, Loan[]>>({});

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "assets"],
        queryFn: () => fetchPage<Asset>("/api/assets"),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<Asset[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const assets = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<Asset>(
                `/api/assets?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const assetIds = assets.map((a) => a.id).join(",");
    const { data: myLoans } = useQuery({
        queryKey: [portal, "assets", "my-loans", assetIds],
        queryFn: () =>
            fetchJson<Loan[]>(`/api/assets/loans/mine?ids=${encodeURIComponent(assetIds)}`),
        enabled: portal !== "" && assets.length > 0,
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: [portal, "assets"] });
    }

    const createAsset = useMutation({
        mutationFn: (body: {
            name: string;
            description?: string | null;
            quantity: number;
            condition: string;
        }) =>
            fetchJson<Asset>("/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            invalidate();
            setCreateOpen(false);
            setName("");
            setDescription("");
            setQuantity("1");
            setCondition("good");
            toast.success(tC("create"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const borrowMutation = useMutation({
        mutationFn: ({ assetId, quantity }: { assetId: string; quantity: number }) =>
            fetchJson(`/api/assets/${assetId}/loans`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity }),
            }),
        onSuccess: () => {
            invalidate();
            toast.success(t("borrowed"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const returnMutation = useMutation({
        mutationFn: (loanId: string) =>
            fetchJson(`/api/assets/loans/${loanId}/return`, { method: "POST" }),
        onSuccess: () => {
            invalidate();
            setLoanRows({});
            setOpenLoans(null);
            toast.success(t("returned"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    async function toggleLoans(assetId: string) {
        if (openLoans === assetId) {
            setOpenLoans(null);
            return;
        }
        setOpenLoans(assetId);
        try {
            const rows = await fetchJson<Loan[]>(`/api/assets/${assetId}/loans`);
            setLoanRows((prev) => ({ ...prev, [assetId]: rows }));
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        }
    }

    function handleCreate() {
        const qty = Number.parseInt(quantity, 10);
        if (!name.trim() || !Number.isFinite(qty) || qty < 1) {
            toast.error(tE("validationFailed"));
            return;
        }
        createAsset.mutate({
            name: name.trim(),
            description: description.trim() || null,
            quantity: qty,
            condition: condition.trim() || "good",
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
                {canManage && <Button onClick={() => setCreateOpen(true)}>{t("newAsset")}</Button>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        margin: 0,
                    }}
                >
                    {t("myLoans")} ({myLoans?.length ?? 0})
                </h2>
                {(myLoans ?? []).map((l) => (
                    <Card key={l.id}>
                        <CardContent
                            style={{
                                padding: "12px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px",
                            }}
                        >
                            <p style={{ fontSize: "13px", color: "var(--color-text)", margin: 0 }}>
                                {assets.find((a) => a.id === l.assetId)?.name ?? l.assetId} ·{" "}
                                {t("quantity")}: {l.quantity}
                                {l.dueAt
                                    ? ` · ${t("dueAt")}: ${new Date(l.dueAt).toLocaleDateString(locale)}`
                                    : ""}
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => returnMutation.mutate(l.id)}
                                disabled={returnMutation.isPending}
                            >
                                {t("returnItem")}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        margin: 0,
                    }}
                >
                    {t("catalog")}
                </h2>
                {isLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : assets.length === 0 ? (
                    <Card>
                        <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {t("noAssets")}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    assets.map((a) => (
                        <Card key={a.id}>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p
                                            style={{
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                color: "var(--color-text)",
                                                margin: 0,
                                            }}
                                        >
                                            {a.name}
                                        </p>
                                        {a.description && (
                                            <p
                                                style={{
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: "4px 0 0",
                                                }}
                                            >
                                                {a.description}
                                            </p>
                                        )}
                                        <p
                                            style={{
                                                fontSize: "12px",
                                                color: "var(--color-text-secondary)",
                                                margin: "4px 0 0",
                                            }}
                                        >
                                            {t("available")}: {a.available}/{a.quantity} ·{" "}
                                            {t("condition")}: {a.condition}
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            flexShrink: 0,
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        {a.available <= 0 && (
                                            <Badge variant="destructive">{t("outOfStock")}</Badge>
                                        )}
                                        <Input
                                            value={quantities[a.id] ?? "1"}
                                            onChange={(e) =>
                                                setQuantities((prev) => ({
                                                    ...prev,
                                                    [a.id]: e.target.value,
                                                }))
                                            }
                                            inputMode="numeric"
                                            aria-label={t("quantity")}
                                            style={{ width: "64px" }}
                                        />
                                        <Button
                                            size="sm"
                                            disabled={a.available <= 0 || borrowMutation.isPending}
                                            onClick={() => {
                                                const qty = Number.parseInt(
                                                    quantities[a.id] ?? "1",
                                                    10,
                                                );
                                                borrowMutation.mutate({
                                                    assetId: a.id,
                                                    quantity:
                                                        Number.isFinite(qty) && qty > 0 ? qty : 1,
                                                });
                                            }}
                                        >
                                            {t("borrow")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => toggleLoans(a.id)}
                                        >
                                            {t("loans")}
                                        </Button>
                                    </div>
                                </div>
                                {openLoans === a.id && (
                                    <div
                                        style={{
                                            marginTop: "12px",
                                            borderTop: "1px solid var(--color-border)",
                                            paddingTop: "12px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                        }}
                                    >
                                        {(loanRows[a.id] ?? []).length === 0 ? (
                                            <p
                                                style={{
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: 0,
                                                }}
                                            >
                                                {t("noLoans")}
                                            </p>
                                        ) : (
                                            (loanRows[a.id] ?? []).map((l) => (
                                                <div
                                                    key={l.id}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        gap: "8px",
                                                        fontSize: "13px",
                                                        color: "var(--color-text)",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <span>
                                                        {l.user?.name ?? l.userId} · {t("quantity")}
                                                        : {l.quantity} · {l.status}
                                                    </span>
                                                    {!l.returnedAt &&
                                                        (l.userId === user?.id || canManage) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    returnMutation.mutate(l.id)
                                                                }
                                                                disabled={returnMutation.isPending}
                                                            >
                                                                {t("returnItem")}
                                                            </Button>
                                                        )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
                {nextCursor && (
                    <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                        {moreLoading ? tC("loading") : tC("showMore")}
                    </Button>
                )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("newAsset")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={t("name")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Textarea
                            placeholder={t("description")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                        <Input
                            placeholder={t("quantity")}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            inputMode="numeric"
                        />
                        <Input
                            placeholder={t("condition")}
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={createAsset.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
