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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Member {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    membershipId: string;
    joinedAt: string;
}

interface MemberDetail {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    joinedAt: string;
    membershipSince: string;
}

interface HistoryRecord {
    id: string;
    name: string;
    role: string;
    councilType: string;
    academicYear: string;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
    createdAt: string;
}

const ROLES = ["member", "officer", "admin"];

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function MembersPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("members");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const canManageUsers =
        user?.role === "admin" || (user?.permissions ?? []).includes("manage_users");

    const [filter, setFilter] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [pendingRole, setPendingRole] = useState<string | null>(null);
    const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
    const [memberTab, setMemberTab] = useState("members");
    const [histOpen, setHistOpen] = useState(false);
    const [histName, setHistName] = useState("");
    const [histRole, setHistRole] = useState("");
    const [histYear, setHistYear] = useState("");
    const [histCouncil, setHistCouncil] = useState("");
    const [histStart, setHistStart] = useState("");
    const [histEnd, setHistEnd] = useState("");
    const [histNotes, setHistNotes] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [addEmail, setAddEmail] = useState("");
    const [addName, setAddName] = useState("");
    const [addRole, setAddRole] = useState("member");

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "members"],
        queryFn: () => fetchPage<Member>("/api/members"),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<Member[]>([]);
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
            const page = await fetchPage<Member>(
                `/api/members?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const { data: detail } = useQuery({
        queryKey: [portal, "members", selectedId],
        queryFn: () => fetchJson<MemberDetail>(`/api/members/${selectedId}`),
        enabled: portal !== "" && selectedId !== null,
    });

    const pendingKey = `${selectedId ?? ""}|${detail?.role ?? ""}`;
    const [prevPendingKey, setPrevPendingKey] = useState(pendingKey);
    if (pendingKey !== prevPendingKey) {
        setPrevPendingKey(pendingKey);
        setPendingRole(null);
    }

    const changeRole = useMutation({
        mutationFn: ({ id, role }: { id: string; role: string }) =>
            fetchJson<{ id: string; role: string }>(`/api/members/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "members"] });
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const removeMember = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ removed: boolean }>(`/api/members/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "members"] });
            setRemoveTarget(null);
            setSelectedId(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const { data: histFirst, isLoading: histLoading } = useQuery({
        queryKey: [portal, "members", "history"],
        queryFn: () => fetchPage<HistoryRecord>("/api/members/history"),
        enabled: portal !== "",
    });
    const [histExtra, setHistExtra] = useState<HistoryRecord[]>([]);
    const [histNext, setHistNext] = useState<string | null>(null);
    const [histMoreLoading, setHistMoreLoading] = useState(false);
    const [prevHistFirst, setPrevHistFirst] = useState(histFirst);
    if (histFirst !== prevHistFirst) {
        setPrevHistFirst(histFirst);
        setHistExtra([]);
        setHistNext(histFirst?.nextCursor ?? null);
    }
    const historyRecords = [...(histFirst?.items ?? []), ...histExtra];

    async function loadMoreHistory() {
        if (!histNext || histMoreLoading) return;
        setHistMoreLoading(true);
        try {
            const page = await fetchPage<HistoryRecord>(
                `/api/members/history?cursor=${encodeURIComponent(histNext)}`,
            );
            setHistExtra((prev) => [...prev, ...page.items]);
            setHistNext(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setHistMoreLoading(false);
        }
    }

    const addHistory = useMutation({
        mutationFn: (body: {
            name: string;
            role: string;
            academicYear: string;
            councilType?: string | null;
            startDate?: string | null;
            endDate?: string | null;
            notes?: string | null;
        }) =>
            fetchJson<HistoryRecord>("/api/members/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "members", "history"] });
            setHistOpen(false);
            setHistName("");
            setHistRole("");
            setHistYear("");
            setHistCouncil("");
            setHistStart("");
            setHistEnd("");
            setHistNotes("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const addMember = useMutation({
        mutationFn: (body: { email: string; name?: string | null; role?: string }) =>
            fetchJson<{ user: { id: string }; role: string }>("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "members"] });
            setAddOpen(false);
            setAddEmail("");
            setAddName("");
            setAddRole("member");
            toast.success("Member added.");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleAddHistory() {
        if (!histName.trim() || !histRole.trim() || !histYear.trim()) {
            toast.error(tE("validationFailed"));
            return;
        }
        addHistory.mutate({
            name: histName.trim(),
            role: histRole.trim(),
            academicYear: histYear.trim(),
            councilType: histCouncil.trim() || null,
            startDate: histStart ? new Date(histStart).toISOString() : null,
            endDate: histEnd ? new Date(histEnd).toISOString() : null,
            notes: histNotes.trim() || null,
        });
    }

    function handleAddMember() {
        if (!addEmail.trim()) {
            toast.error(tE("validationFailed"));
            return;
        }
        addMember.mutate({
            email: addEmail.trim(),
            name: addName.trim() || null,
            role: addRole,
        });
    }

    function roleLabel(role: string): string {
        if (role === "admin") return t("roleAdmin");
        if (role === "officer") return t("roleOfficer");
        return t("roleMember");
    }

    const q = filter.trim().toLowerCase();
    const visible =
        q.length === 0
            ? all
            : all.filter(
                  (m) =>
                      (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
              );

    const selected: Member | MemberDetail | null =
        detail ?? all.find((m) => m.id === selectedId) ?? null;

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
                {canManageUsers && (
                    <Button onClick={() => setAddOpen(true)}>{t("addMember")}</Button>
                )}
            </div>

            <div style={{ maxWidth: "400px" }}>
                <Input
                    placeholder={tC("search")}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <Tabs value={memberTab} onValueChange={setMemberTab}>
                <TabsList>
                    <TabsTrigger value="members">{t("title")}</TabsTrigger>
                    <TabsTrigger value="history">{t("historicalMembers")}</TabsTrigger>
                </TabsList>
                <TabsContent value="members">
                    {isLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : visible.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {t("noMembers")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {visible.map((m) => (
                                <Card key={m.membershipId}>
                                    <CardContent style={{ padding: "12px 16px" }}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(m.id)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                width: "100%",
                                                border: "none",
                                                background: "transparent",
                                                cursor: "pointer",
                                                padding: 0,
                                                textAlign: "left",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "5px",
                                                    backgroundColor: "var(--color-bg-secondary)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "14px",
                                                    fontWeight: 700,
                                                    color: "var(--color-text)",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {(m.name ?? m.email).charAt(0).toUpperCase()}
                                            </span>
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        display: "block",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: "var(--color-text)",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {m.name ?? m.email}
                                                </span>
                                                <span
                                                    style={{
                                                        display: "block",
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                    }}
                                                >
                                                    {m.email}
                                                    {` · ${t("joinedAt")}: ${new Date(m.joinedAt).toLocaleDateString(locale)}`}
                                                </span>
                                            </span>
                                            <Badge variant="outline">{roleLabel(m.role)}</Badge>
                                        </button>
                                    </CardContent>
                                </Card>
                            ))}
                            {nextCursor && (
                                <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                                    {moreLoading ? tC("loading") : tC("showMore")}
                                </Button>
                            )}
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="history">
                    {canManageUsers && (
                        <div style={{ marginBottom: "12px" }}>
                            <Button onClick={() => setHistOpen(true)}>{tC("create")}</Button>
                        </div>
                    )}
                    {histLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : historyRecords.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {t("noHistoricalMembers")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {historyRecords.map((h) => (
                                <Card key={h.id}>
                                    <CardContent style={{ padding: "12px 16px" }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                            }}
                                        >
                                            <span style={{ flex: 1, minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        display: "block",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: "var(--color-text)",
                                                    }}
                                                >
                                                    {h.name}
                                                </span>
                                                <span
                                                    style={{
                                                        display: "block",
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                    }}
                                                >
                                                    {`${t("role")}: ${h.role} · ${t("academicYear")}: ${h.academicYear}`}
                                                </span>
                                                {(h.startDate || h.endDate) && (
                                                    <span
                                                        style={{
                                                            display: "block",
                                                            fontSize: "12px",
                                                            color: "var(--color-text-secondary)",
                                                        }}
                                                    >
                                                        {h.startDate
                                                            ? new Date(
                                                                  h.startDate,
                                                              ).toLocaleDateString(locale)
                                                            : ""}
                                                        {h.endDate
                                                            ? ` – ${new Date(h.endDate).toLocaleDateString(locale)}`
                                                            : ""}
                                                    </span>
                                                )}
                                                {h.notes && (
                                                    <span
                                                        style={{
                                                            display: "block",
                                                            fontSize: "13px",
                                                            color: "var(--color-text)",
                                                            marginTop: "2px",
                                                        }}
                                                    >
                                                        {h.notes}
                                                    </span>
                                                )}
                                            </span>
                                            <Badge variant="outline">{h.councilType}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {histNext && (
                                <Button
                                    variant="outline"
                                    onClick={loadMoreHistory}
                                    disabled={histMoreLoading}
                                >
                                    {histMoreLoading ? tC("loading") : tC("showMore")}
                                </Button>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedId(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selected?.name ?? selected?.email ?? t("title")}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {tC("email")}: {selected.email}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {t("role")}:
                                </span>
                                <Badge variant="outline">{roleLabel(selected.role)}</Badge>
                            </div>
                            {canManageUsers && selected.id !== user?.id && (
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <Select
                                        value={pendingRole ?? selected.role}
                                        onValueChange={(v) => setPendingRole(v)}
                                    >
                                        <SelectTrigger style={{ width: "180px" }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map((r) => (
                                                <SelectItem key={r} value={r}>
                                                    {roleLabel(r)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {pendingRole && pendingRole !== selected.role && (
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                changeRole.mutate({
                                                    id: selected.id,
                                                    role: pendingRole,
                                                })
                                            }
                                            disabled={changeRole.isPending}
                                        >
                                            {t("changeRole")}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                            const row = all.find((m) => m.id === selected.id);
                                            if (row) setRemoveTarget(row);
                                        }}
                                    >
                                        {t("removeMember")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedId(null)}>
                            {tC("close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={removeTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoveTarget(null);
                }}
                title={t("removeMember")}
                description={t("removeWarning")}
                confirmLabel={t("removeMember")}
                destructive
                onConfirm={() => {
                    if (removeTarget) removeMember.mutate(removeTarget.id);
                }}
            />

            <Dialog open={histOpen} onOpenChange={setHistOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("historicalMembers")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tC("name")}
                            value={histName}
                            onChange={(e) => setHistName(e.target.value)}
                        />
                        <Input
                            placeholder={t("role")}
                            value={histRole}
                            onChange={(e) => setHistRole(e.target.value)}
                        />
                        <Input
                            placeholder={t("academicYear")}
                            value={histYear}
                            onChange={(e) => setHistYear(e.target.value)}
                        />
                        <Input
                            placeholder={tC("type")}
                            value={histCouncil}
                            onChange={(e) => setHistCouncil(e.target.value)}
                        />
                        <Input
                            type="date"
                            value={histStart}
                            onChange={(e) => setHistStart(e.target.value)}
                        />
                        <Input
                            type="date"
                            value={histEnd}
                            onChange={(e) => setHistEnd(e.target.value)}
                        />
                        <Textarea
                            placeholder={tC("description")}
                            value={histNotes}
                            onChange={(e) => setHistNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleAddHistory} disabled={addHistory.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("addMember")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Input
                            placeholder={tC("email")}
                            value={addEmail}
                            onChange={(e) => setAddEmail(e.target.value)}
                            inputMode="email"
                        />
                        <Input
                            placeholder={tC("name")}
                            value={addName}
                            onChange={(e) => setAddName(e.target.value)}
                        />
                        <Select value={addRole} onValueChange={setAddRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {roleLabel(r)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleAddMember} disabled={addMember.isPending}>
                            {tC("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
