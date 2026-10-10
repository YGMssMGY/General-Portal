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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

interface Slot {
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    capacity: number;
    signedUp: number;
    userSignedUp: boolean;
}

interface Signup {
    id: string;
    userId: string;
    name: string | null;
    email: string;
    signedUpAt: string;
}

interface Stats {
    totalSlots: number;
    totalSignups: number;
    upcomingSlots: number;
    topVolunteers: { userId: string; name: string | null; count: number }[];
}

interface Hours {
    userId: string;
    hours: number;
    breakdown: { slotId: string; title: string; hours: number; date: string }[];
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function VolunteersPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("volunteers");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const canManage =
        user?.role === "admin" || (user?.permissions ?? []).includes("manage_volunteer_slots");

    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [capacity, setCapacity] = useState("5");
    const [openSlot, setOpenSlot] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<Slot | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStart, setEditStart] = useState("");
    const [editEnd, setEditEnd] = useState("");
    const [editCapacity, setEditCapacity] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Slot | null>(null);

    function toLocalInput(iso: string): string {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function openEdit(slot: Slot) {
        setEditTarget(slot);
        setEditTitle(slot.title);
        setEditDescription(slot.description ?? "");
        setEditStart(toLocalInput(slot.startTime));
        setEditEnd(toLocalInput(slot.endTime));
        setEditCapacity(String(slot.capacity));
    }

    const { data: firstPage, isLoading: slotsLoading } = useQuery({
        queryKey: [portal, "volunteers"],
        queryFn: () => fetchPage<Slot>("/api/volunteers"),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<Slot[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState<typeof firstPage>(undefined);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const slots = [...(firstPage?.items ?? []), ...extra];

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<Slot>(
                `/api/volunteers?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const { data: stats } = useQuery({
        queryKey: [portal, "volunteers", "stats"],
        queryFn: () => fetchJson<Stats>("/api/volunteers/stats"),
        enabled: portal !== "",
    });

    const { data: hours } = useQuery({
        queryKey: [portal, "volunteers", "hours"],
        queryFn: () => fetchJson<Hours>("/api/volunteers/hours"),
        enabled: portal !== "",
    });

    const { data: signupPage, isLoading: signupsLoading } = useQuery({
        queryKey: [portal, "volunteers", "signups", openSlot],
        queryFn: () => fetchPage<Signup>(`/api/volunteers/signups?slotId=${openSlot}`),
        enabled: portal !== "" && openSlot !== null,
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: [portal, "volunteers"] });
    }

    const createSlot = useMutation({
        mutationFn: (body: {
            title: string;
            description?: string | null;
            startTime: string;
            endTime: string;
            capacity: number;
        }) =>
            fetchJson<Slot>("/api/volunteers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            invalidate();
            setCreateOpen(false);
            setTitle("");
            setDescription("");
            setStartTime("");
            setEndTime("");
            setCapacity("5");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const signUp = useMutation({
        mutationFn: (slotId: string) =>
            fetchJson("/api/volunteers/signups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slotId }),
            }),
        onSuccess: () => {
            invalidate();
            toast.success(t("signUpSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, t("alreadySignedUp")));
        },
    });

    const withdraw = useMutation({
        mutationFn: (slotId: string) =>
            fetchJson("/api/volunteers/signups", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slotId }),
            }),
        onSuccess: () => {
            invalidate();
            toast.success(t("unregisterSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const updateSlot = useMutation({
        mutationFn: (body: {
            id: string;
            title?: string;
            description?: string | null;
            startTime?: string;
            endTime?: string;
            capacity?: number;
        }) =>
            fetchJson<Slot>("/api/volunteers/slots", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            invalidate();
            setEditTarget(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const deleteSlot = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ deleted: boolean }>("/api/volunteers/slots", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            }),
        onSuccess: () => {
            invalidate();
            setDeleteTarget(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleUpdateSlot() {
        if (!editTarget) return;
        if (!editTitle.trim() || !editStart || !editEnd) {
            toast.error(tE("validationFailed"));
            return;
        }
        const cap = Number.parseInt(editCapacity, 10);
        updateSlot.mutate({
            id: editTarget.id,
            title: editTitle.trim(),
            description: editDescription.trim() || null,
            startTime: new Date(editStart).toISOString(),
            endTime: new Date(editEnd).toISOString(),
            capacity: Number.isFinite(cap) && cap > 0 ? cap : 1,
        });
    }

    function handleCreate() {
        const cap = Number.parseInt(capacity, 10);
        if (!title.trim() || !startTime || !endTime) {
            toast.error(tE("validationFailed"));
            return;
        }
        createSlot.mutate({
            title: title.trim(),
            description: description.trim() || null,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            capacity: Number.isFinite(cap) && cap > 0 ? cap : 1,
        });
    }

    const mine = slots.filter((s) => s.userSignedUp).length;

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
                {canManage && <Button onClick={() => setCreateOpen(true)}>{t("newSlot")}</Button>}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent style={{ padding: "16px 20px" }}>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 4px",
                            }}
                        >
                            {t("slots")}
                        </p>
                        <p
                            style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {stats?.totalSlots ?? 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent style={{ padding: "16px 20px" }}>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 4px",
                            }}
                        >
                            {t("signups")}
                        </p>
                        <p
                            style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {stats?.totalSignups ?? 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent style={{ padding: "16px 20px" }}>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 4px",
                            }}
                        >
                            {tC("soon")}
                        </p>
                        <p
                            style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {stats?.upcomingSlots ?? 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent style={{ padding: "16px 20px" }}>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 4px",
                            }}
                        >
                            {t("mySignups")}
                        </p>
                        <p
                            style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {mine}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent style={{ padding: "16px 20px" }}>
                        <p
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                margin: "0 0 4px",
                            }}
                        >
                            {t("myHours")}
                        </p>
                        <p
                            style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {hours?.hours ?? 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {(stats?.topVolunteers?.length ?? 0) > 0 && (
                <Card>
                    <CardContent style={{ padding: "16px 20px" }}>
                        <p
                            style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                margin: "0 0 8px",
                            }}
                        >
                            {t("signups")}
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {(stats?.topVolunteers ?? []).slice(0, 10).map((v) => (
                                <Badge key={v.userId} variant="outline">
                                    {v.name ?? tC("unknown")} · {v.count}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {slotsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : slots.length === 0 ? (
                <Card>
                    <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("noSlots")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {slots.map((slot) => {
                        const full = slot.signedUp >= slot.capacity;
                        const pct =
                            slot.capacity > 0
                                ? Math.min(100, (slot.signedUp / slot.capacity) * 100)
                                : 0;
                        return (
                            <Card key={slot.id}>
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
                                                {slot.title}
                                            </p>
                                            {slot.description && (
                                                <p
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: "4px 0 0",
                                                    }}
                                                >
                                                    {slot.description}
                                                </p>
                                            )}
                                            <p
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: "4px 0 0",
                                                }}
                                            >
                                                {t("startsAt")}:{" "}
                                                {new Date(slot.startTime).toLocaleString(locale)}
                                                {` · ${t("endsAt")}: ${new Date(slot.endTime).toLocaleString(locale)}`}
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: "4px 0 0",
                                                }}
                                            >
                                                {slot.signedUp}/{slot.capacity} {t("signups")} ·{" "}
                                                {t("capacity")}: {slot.capacity}
                                            </p>
                                            <div
                                                style={{
                                                    height: "6px",
                                                    borderRadius: "5px",
                                                    backgroundColor: "var(--color-bg-secondary)",
                                                    marginTop: "8px",
                                                    overflow: "hidden",
                                                    maxWidth: "320px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${pct}%`,
                                                        height: "100%",
                                                        backgroundColor: full
                                                            ? "var(--color-destructive)"
                                                            : "var(--color-primary)",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                flexShrink: 0,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            {full && !slot.userSignedUp && (
                                                <Badge variant="destructive">{t("full")}</Badge>
                                            )}
                                            {slot.userSignedUp ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => withdraw.mutate(slot.id)}
                                                    disabled={withdraw.isPending}
                                                >
                                                    {t("unregister")}
                                                </Button>
                                            ) : (
                                                !full && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => signUp.mutate(slot.id)}
                                                        disabled={signUp.isPending}
                                                    >
                                                        {t("signUp")}
                                                    </Button>
                                                )
                                            )}
                                            {canManage && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setOpenSlot(
                                                            openSlot === slot.id ? null : slot.id,
                                                        )
                                                    }
                                                >
                                                    {t("signups")} ({slot.signedUp})
                                                </Button>
                                            )}
                                            {canManage && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEdit(slot)}
                                                >
                                                    {tC("edit")}
                                                </Button>
                                            )}
                                            {canManage && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setDeleteTarget(slot)}
                                                >
                                                    {tC("delete")}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {canManage && openSlot === slot.id && (
                                        <div
                                            style={{
                                                marginTop: "12px",
                                                borderTop: "1px solid var(--color-border)",
                                                paddingTop: "12px",
                                            }}
                                        >
                                            {signupsLoading ? (
                                                <Skeleton className="h-10 w-full" />
                                            ) : (signupPage?.items ?? []).length === 0 ? (
                                                <p
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                        margin: 0,
                                                    }}
                                                >
                                                    {t("noSlots")}
                                                </p>
                                            ) : (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: "4px",
                                                    }}
                                                >
                                                    {(signupPage?.items ?? []).map((s) => (
                                                        <div
                                                            key={s.id}
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                gap: "8px",
                                                                fontSize: "13px",
                                                                color: "var(--color-text)",
                                                            }}
                                                        >
                                                            <span>
                                                                {s.name ?? s.email} ({s.email})
                                                            </span>
                                                            <span
                                                                style={{
                                                                    color: "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {new Date(
                                                                    s.signedUpAt,
                                                                ).toLocaleString(locale)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {signupPage?.nextCursor && (
                                                        <p
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text-secondary)",
                                                                margin: "4px 0 0",
                                                            }}
                                                        >
                                                            {tC("more")}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
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
                        <DialogTitle>{t("newSlot")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tC("title")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={tC("description")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                        <Input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                        <Input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                        <Input
                            placeholder={t("capacity")}
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            inputMode="numeric"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={createSlot.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setEditTarget(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tC("edit")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tC("title")}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={tC("description")}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                        />
                        <Input
                            type="datetime-local"
                            value={editStart}
                            onChange={(e) => setEditStart(e.target.value)}
                        />
                        <Input
                            type="datetime-local"
                            value={editEnd}
                            onChange={(e) => setEditEnd(e.target.value)}
                        />
                        <Input
                            placeholder={t("capacity")}
                            value={editCapacity}
                            onChange={(e) => setEditCapacity(e.target.value)}
                            inputMode="numeric"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleUpdateSlot} disabled={updateSlot.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={tC("delete")}
                description={deleteTarget?.title}
                confirmLabel={tC("delete")}
                destructive
                onConfirm={() => {
                    if (deleteTarget) deleteSlot.mutate(deleteTarget.id);
                }}
            />
        </div>
    );
}
