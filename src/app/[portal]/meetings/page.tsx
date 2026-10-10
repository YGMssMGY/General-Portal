"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Plus, Users } from "lucide-react";

type RsvpValue = "accepted" | "declined" | "maybe";

interface Meeting {
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string | null;
    location: string | null;
    status: "scheduled" | "ongoing" | "completed" | "cancelled";
    rsvpCount: number;
    myRsvp: RsvpValue | null;
}

interface RsvpRow {
    id: string;
    status: string;
    user: { id: string; name: string | null; email: string };
}

interface AgendaItem {
    id: string;
    title: string;
    description: string | null;
    position: number;
    status: string;
    createdAt: string;
}

const PAGE_SIZE = 20;

export default function MeetingsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("meetings");
    const tAgenda = useTranslations("agenda");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const canManage = user?.permissions.includes("manage_meetings") ?? false;
    const isAdmin = user?.role === "admin";

    const [cursor, setCursor] = useState<string | null>(null);
    const [items, setItems] = useState<Meeting[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [appliedKey, setAppliedKey] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [location, setLocation] = useState("");
    const [openRsvps, setOpenRsvps] = useState<string | null>(null);
    const [rsvpRows, setRsvpRows] = useState<Record<string, RsvpRow[]>>({});
    const [openAgenda, setOpenAgenda] = useState<string | null>(null);
    const [agendaRows, setAgendaRows] = useState<Record<string, AgendaItem[]>>({});
    const [newAgendaTitle, setNewAgendaTitle] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "meetings", cursor ?? ""],
        queryFn: () =>
            fetchPage<Meeting>(
                `/api/meetings?limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            ),
        enabled: portal !== "",
    });

    const key = cursor ?? "";
    if (data && appliedKey !== key) {
        setAppliedKey(key);
        setNextCursor(data.nextCursor);
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
    }

    const createMutation = useMutation({
        mutationFn: (body: {
            title: string;
            description?: string;
            startTime: string;
            endTime?: string;
            location?: string;
        }) =>
            fetchJson(`/api/meetings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "meetings"] });
            setCursor(null);
            setShowForm(false);
            setTitle("");
            setDescription("");
            setStartTime("");
            setEndTime("");
            setLocation("");
            toast.success(t("title"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const rsvpMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: RsvpValue | null }) =>
            fetchJson(`/api/meetings/${id}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "meetings"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            fetchJson(`/api/meetings/${id}${isAdmin ? "?permanent=true" : ""}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "meetings"] });
            setCursor(null);
            setDeleteTarget(null);
            toast.success(tc("delete"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    async function toggleRsvps(meetingId: string) {
        if (openRsvps === meetingId) {
            setOpenRsvps(null);
            return;
        }
        setOpenRsvps(meetingId);
        if (!rsvpRows[meetingId]) {
            try {
                const page = await fetchPage<RsvpRow>(`/api/meetings/${meetingId}/rsvps`);
                setRsvpRows((prev) => ({ ...prev, [meetingId]: page.items }));
            } catch (err) {
                toast.error(err instanceof Error ? err.message : te("internal"));
            }
        }
    }

    async function toggleAgenda(meetingId: string) {
        if (openAgenda === meetingId) {
            setOpenAgenda(null);
            return;
        }
        setOpenAgenda(meetingId);
        try {
            const items = await fetchJson<AgendaItem[]>(`/api/meetings/${meetingId}/agenda`);
            setAgendaRows((prev) => ({ ...prev, [meetingId]: items }));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : te("internal"));
        }
    }

    const addAgendaMutation = useMutation({
        mutationFn: ({ meetingId, title }: { meetingId: string; title: string }) =>
            fetchJson<AgendaItem>(`/api/meetings/${meetingId}/agenda`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            }),
        onSuccess: (created, vars) => {
            setAgendaRows((prev) => ({
                ...prev,
                [vars.meetingId]: [...(prev[vars.meetingId] ?? []), created],
            }));
            setNewAgendaTitle("");
            toast.success(tAgenda("add"));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const cycleAgendaMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; meetingId: string; status: string }) =>
            fetchJson<AgendaItem>(`/api/agenda/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            }),
        onSuccess: (updated, vars) => {
            setAgendaRows((prev) => ({
                ...prev,
                [vars.meetingId]: (prev[vars.meetingId] ?? []).map((a) =>
                    a.id === updated.id ? updated : a,
                ),
            }));
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    function agendaStatusLabel(status: string): string {
        if (status === "discussed") return tAgenda("discussed");
        if (status === "skipped") return tAgenda("skipped");
        return tAgenda("open");
    }

    function nextAgendaStatus(status: string): string {
        if (status === "open") return "discussed";
        if (status === "discussed") return "skipped";
        return "open";
    }

    function handleCreate() {
        if (!title.trim() || !startTime) return;
        createMutation.mutate({
            title: title.trim(),
            description: description.trim() || undefined,
            startTime,
            endTime: endTime || undefined,
            location: location.trim() || undefined,
        });
    }

    const statusLabel: Record<Meeting["status"], string> = {
        scheduled: t("statusScheduled"),
        ongoing: t("statusOngoing"),
        completed: t("statusCompleted"),
        cancelled: t("statusCancelled"),
    };

    const rsvpOptions: { label: string; value: RsvpValue }[] = [
        { label: t("rsvpGoing"), value: "accepted" },
        { label: t("rsvpMaybe"), value: "maybe" },
        { label: t("rsvpNotGoing"), value: "declined" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        {tc("retry")}
                    </Button>
                    {canManage && (
                        <Button size="sm" onClick={() => setShowForm(true)}>
                            <Plus size={16} />
                            <span>{t("new")}</span>
                        </Button>
                    )}
                </div>
            </div>

            {isLoading && items.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "120px", borderRadius: "5px" }}
                        />
                    ))}
                </div>
            ) : isError ? (
                <Card>
                    <CardContent style={{ padding: "32px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-destructive)",
                                margin: 0,
                            }}
                        >
                            {te("internal")}
                        </p>
                        <div style={{ marginTop: "12px" }}>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                {tc("retry")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent
                        style={{
                            padding: "48px 24px",
                            textAlign: "center",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <Calendar size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                        <p style={{ fontSize: "14px", margin: 0 }}>{t("noMeetings")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {items.map((meeting) => (
                        <Card key={meeting.id}>
                            <CardContent style={{ padding: "16px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "8px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: "200px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: 600,
                                                    margin: 0,
                                                    color: "var(--color-text)",
                                                }}
                                            >
                                                {meeting.title}
                                            </h3>
                                            <Badge variant="secondary">
                                                {statusLabel[meeting.status]}
                                            </Badge>
                                        </div>
                                        {meeting.description && (
                                            <p
                                                style={{
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: "6px 0 0",
                                                    whiteSpace: "pre-wrap",
                                                }}
                                            >
                                                {meeting.description}
                                            </p>
                                        )}
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "16px",
                                                flexWrap: "wrap",
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                marginTop: "8px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                }}
                                            >
                                                <Clock size={14} />
                                                {new Date(meeting.startTime).toLocaleString()}
                                                {meeting.endTime
                                                    ? ` – ${new Date(meeting.endTime).toLocaleTimeString()}`
                                                    : ""}
                                            </span>
                                            {meeting.location && (
                                                <span
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                    }}
                                                >
                                                    <MapPin size={14} /> {meeting.location}
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                }}
                                            >
                                                <Users size={14} /> {meeting.rsvpCount} {t("rsvps")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        marginTop: "12px",
                                        display: "flex",
                                        gap: "6px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {rsvpOptions.map((opt) => {
                                        const selected = meeting.myRsvp === opt.value;
                                        return (
                                            <Button
                                                key={opt.value}
                                                size="sm"
                                                variant={selected ? "default" : "outline"}
                                                disabled={rsvpMutation.isPending}
                                                onClick={() =>
                                                    rsvpMutation.mutate({
                                                        id: meeting.id,
                                                        status: selected ? null : opt.value,
                                                    })
                                                }
                                            >
                                                {opt.label}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => toggleRsvps(meeting.id)}
                                    >
                                        {t("rsvps")} ({meeting.rsvpCount})
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => toggleAgenda(meeting.id)}
                                    >
                                        {tAgenda("title")}
                                    </Button>
                                    {canManage && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            style={{ marginLeft: "auto" }}
                                            onClick={() => setDeleteTarget(meeting)}
                                        >
                                            {tc("delete")}
                                        </Button>
                                    )}
                                </div>
                                {openAgenda === meeting.id && (
                                    <div
                                        style={{
                                            marginTop: "12px",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "5px",
                                            padding: "8px 12px",
                                            backgroundColor: "var(--color-bg-secondary)",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                        }}
                                    >
                                        {(agendaRows[meeting.id] ?? []).length === 0 ? (
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                {tAgenda("empty")}
                                            </p>
                                        ) : (
                                            (agendaRows[meeting.id] ?? []).map((a) => (
                                                <div
                                                    key={a.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        fontSize: "13px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--color-text)",
                                                            flex: 1,
                                                        }}
                                                    >
                                                        {a.title}
                                                    </span>
                                                    {canManage ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={cycleAgendaMutation.isPending}
                                                            onClick={() =>
                                                                cycleAgendaMutation.mutate({
                                                                    id: a.id,
                                                                    meetingId: meeting.id,
                                                                    status: nextAgendaStatus(
                                                                        a.status,
                                                                    ),
                                                                })
                                                            }
                                                        >
                                                            {agendaStatusLabel(a.status)}
                                                        </Button>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            {agendaStatusLabel(a.status)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        {canManage && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "8px",
                                                    marginTop: "4px",
                                                }}
                                            >
                                                <Input
                                                    placeholder={tAgenda("placeholder")}
                                                    value={
                                                        openAgenda === meeting.id
                                                            ? newAgendaTitle
                                                            : ""
                                                    }
                                                    onChange={(e) =>
                                                        setNewAgendaTitle(e.target.value)
                                                    }
                                                />
                                                <Button
                                                    size="sm"
                                                    disabled={
                                                        !newAgendaTitle.trim() ||
                                                        addAgendaMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        addAgendaMutation.mutate({
                                                            meetingId: meeting.id,
                                                            title: newAgendaTitle.trim(),
                                                        })
                                                    }
                                                >
                                                    {tAgenda("add")}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {openRsvps === meeting.id && (
                                    <div
                                        style={{
                                            marginTop: "12px",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "5px",
                                            padding: "8px 12px",
                                            backgroundColor: "var(--color-bg-secondary)",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "6px",
                                        }}
                                    >
                                        {(rsvpRows[meeting.id] ?? []).length === 0 ? (
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                {t("noMeetings")}
                                            </p>
                                        ) : (
                                            (rsvpRows[meeting.id] ?? []).map((r) => (
                                                <div
                                                    key={r.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        fontSize: "13px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--color-text)",
                                                            flex: 1,
                                                        }}
                                                    >
                                                        {r.user.name || r.user.email}
                                                    </span>
                                                    <Badge variant="outline">{r.status}</Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {nextCursor && (
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <Button variant="outline" onClick={() => setCursor(nextCursor)}>
                                {tc("showMore")}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                        <DialogDescription>{t("title")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tc("title")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder={tc("description")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                type="datetime-local"
                                aria-label={t("startsAt")}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                            <Input
                                type="datetime-local"
                                aria-label={t("endsAt")}
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                        <Input
                            placeholder={t("location")}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>
                            {tc("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!title.trim() || !startTime || createMutation.isPending}
                        >
                            {createMutation.isPending ? tc("saving") : tc("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={tc("delete")}
                description={deleteTarget?.title}
                confirmLabel={isAdmin ? tc("deleteForever") : tc("delete")}
                destructive
                requireTypedText={isAdmin}
                typingChallenge={deleteTarget?.title ?? ""}
                onConfirm={() => {
                    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                }}
            />
        </div>
    );
}
