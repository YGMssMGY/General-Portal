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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface DueUser {
    id: string;
    name: string | null;
    email: string;
}

interface Due {
    id: string;
    userId: string;
    title: string;
    amountCents: number;
    dueDate: string | null;
    status: string;
    paidAt: string | null;
    createdAt: string;
    user: DueUser | null;
}

interface Member {
    id: string;
    name: string | null;
    email: string;
    role: string;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

function formatMoney(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function isOverdue(due: Due): boolean {
    return (
        due.status === "unpaid" &&
        due.dueDate !== null &&
        new Date(due.dueDate).getTime() < Date.now()
    );
}

export default function DuesPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("dues");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const canManage = user?.role === "admin" || (user?.permissions ?? []).includes("manage_dues");

    const [createOpen, setCreateOpen] = useState(false);
    const [memberId, setMemberId] = useState("");
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "dues"],
        queryFn: () => fetchPage<Due>("/api/dues"),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<Due[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const dues = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<Due>(`/api/dues?cursor=${encodeURIComponent(nextCursor)}`);
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const { data: membersPage } = useQuery({
        queryKey: [portal, "dues", "members"],
        queryFn: () => fetchPage<Member>("/api/members?limit=100"),
        enabled: portal !== "" && canManage && createOpen,
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: [portal, "dues"] });
    }

    const createDue = useMutation({
        mutationFn: (body: {
            userId: string;
            title: string;
            amountCents: number;
            dueDate?: string;
        }) =>
            fetchJson<Due>("/api/dues", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            invalidate();
            setCreateOpen(false);
            setMemberId("");
            setTitle("");
            setAmount("");
            setDueDate("");
            toast.success(tC("create"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const actMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: "pay" | "waive" }) =>
            fetchJson<Due>(`/api/dues/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            }),
        onSuccess: () => {
            invalidate();
            toast.success(tC("update"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const deleteDue = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/dues/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            invalidate();
            toast.success(tC("delete"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleCreate() {
        const cents = Math.round(Number.parseFloat(amount) * 100);
        if (!memberId || !title.trim() || !Number.isFinite(cents) || cents <= 0) {
            toast.error(tE("validationFailed"));
            return;
        }
        createDue.mutate({
            userId: memberId,
            title: title.trim(),
            amountCents: cents,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
    }

    function statusBadge(due: Due) {
        if (due.status === "paid") return <Badge variant="default">{t("paid")}</Badge>;
        if (due.status === "waived") return <Badge variant="secondary">{t("waived")}</Badge>;
        if (isOverdue(due)) return <Badge variant="destructive">{t("overdue")}</Badge>;
        return <Badge variant="outline">{t("unpaid")}</Badge>;
    }

    function dueRow(due: Due) {
        const mine = due.userId === user?.id;
        return (
            <Card key={due.id}>
                <CardContent
                    style={{
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <p
                            style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {due.title}
                        </p>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "2px 0 0",
                            }}
                        >
                            {formatMoney(due.amountCents)}
                            {due.dueDate
                                ? ` · ${t("dueDate")}: ${new Date(due.dueDate).toLocaleDateString(locale)}`
                                : ""}
                            {canManage && due.user ? ` · ${due.user.name ?? due.user.email}` : ""}
                        </p>
                    </div>
                    <div
                        style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}
                    >
                        {statusBadge(due)}
                        {due.status === "unpaid" && (mine || canManage) && (
                            <Button
                                size="sm"
                                onClick={() => actMutation.mutate({ id: due.id, action: "pay" })}
                                disabled={actMutation.isPending}
                            >
                                {t("pay")}
                            </Button>
                        )}
                        {due.status === "unpaid" && canManage && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => actMutation.mutate({ id: due.id, action: "waive" })}
                                disabled={actMutation.isPending}
                            >
                                {t("waive")}
                            </Button>
                        )}
                        {canManage && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteDue.mutate(due.id)}
                                disabled={deleteDue.isPending}
                            >
                                {tC("delete")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const myDues = dues.filter((d) => d.userId === user?.id);
    const owed = myDues.filter((d) => d.status === "unpaid").reduce((s, d) => s + d.amountCents, 0);

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
                        {t("totalOwed")}: {formatMoney(owed)}
                    </p>
                </div>
                {canManage && <Button onClick={() => setCreateOpen(true)}>{t("newDue")}</Button>}
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
                    {t("myDues")}
                </h2>
                {isLoading ? (
                    <Skeleton className="h-16 w-full" />
                ) : myDues.length === 0 ? (
                    <Card>
                        <CardContent style={{ padding: "24px 20px", textAlign: "center" }}>
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {t("noDues")}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    myDues.map(dueRow)
                )}
            </div>

            {canManage && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h2
                        style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            margin: 0,
                        }}
                    >
                        {t("allDues")}
                    </h2>
                    {dues.map(dueRow)}
                    {nextCursor && (
                        <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                            {moreLoading ? tC("loading") : tC("showMore")}
                        </Button>
                    )}
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("newDue")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Select value={memberId} onValueChange={setMemberId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("member")} />
                            </SelectTrigger>
                            <SelectContent>
                                {(membersPage?.items ?? []).map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name ?? m.email} ({m.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder={tC("title")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Input
                            placeholder={t("amount")}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            inputMode="decimal"
                        />
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            aria-label={t("dueDate")}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={createDue.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
