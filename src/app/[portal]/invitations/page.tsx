"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuthSession } from "@/components/AuthSessionProvider";
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchJson, fetchPage } from "@/lib/api-client";

interface Invitation {
    id: string;
    email: string;
    roleName: string;
    createdAt: string;
    expiresAt: string;
}

interface CreatedInvitation {
    token: string;
    id: string;
    expiresAt: string;
}

const ROLES = ["member", "officer", "admin"];

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function InvitationsPage() {
    const portal = usePortal();
    const { user, status } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("invitations");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const canManage = (user?.permissions ?? []).includes("manage_users") || user?.role === "admin";
    const locale = user?.locale || undefined;
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [created, setCreated] = useState<CreatedInvitation | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
    const [extra, setExtra] = useState<Invitation[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "invitations"],
        queryFn: () => fetchPage<Invitation>("/api/invitations"),
        enabled: portal !== "" && canManage,
    });
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
    }
    const all = [...(firstPage?.items ?? []), ...extra];

    const createInvitation = useMutation({
        mutationFn: (body: { email: string; roleName: string; expiresInDays: number }) =>
            fetchJson<CreatedInvitation>("/api/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: [portal, "invitations"] });
            setCreated(result);
            setInviteOpen(false);
            setEmail("");
            setRole("member");
            setExpiresInDays(7);
        },
        onError: (e) => toast.error(errorMessage(e, tE("internal"))),
    });

    const revoke = useMutation({
        mutationFn: (id: string) =>
            fetchJson<{ revoked: boolean }>(`/api/invitations/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "invitations"] });
            setRevokeTarget(null);
        },
        onError: (e) => toast.error(errorMessage(e, tE("internal"))),
    });

    async function loadMore() {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await fetchPage<Invitation>(
                `/api/invitations?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setLoadingMore(false);
        }
    }

    async function copyToken() {
        if (!created) return;
        try {
            await navigator.clipboard.writeText(created.token);
            toast.success(tC("copied"));
        } catch {
            toast.error(tE("internal"));
        }
    }

    function handleCreate() {
        if (!email.trim()) {
            toast.error(tE("validationFailed"));
            return;
        }
        createInvitation.mutate({ email: email.trim(), roleName: role, expiresInDays });
    }

    function roleLabel(name: string): string {
        if (name === "admin") return t("roleAdmin");
        if (name === "officer") return t("roleOfficer");
        return t("roleMember");
    }

    if (status === "loading") return <Skeleton className="h-64 w-full" />;
    if (!canManage) return <p style={{ color: "var(--color-text)" }}>{t("forbidden")}</p>;

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
                        {t("description")}
                    </p>
                </div>
                <Button onClick={() => setInviteOpen(true)}>{t("createInvitation")}</Button>
            </div>

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
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
                            {t("noInvitations")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {all.map((inv) => (
                        <Card key={inv.id}>
                            <CardContent
                                style={{
                                    padding: "12px 16px",
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
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {inv.email}
                                    </span>
                                    <span
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        {`${t("expiresAt")}: ${new Date(inv.expiresAt).toLocaleDateString(locale)}`}
                                    </span>
                                </span>
                                <Badge variant="outline">{roleLabel(inv.roleName)}</Badge>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRevokeTarget(inv)}
                                >
                                    {t("revoke")}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {nextCursor && (
                        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? tC("loading") : tC("showMore")}
                        </Button>
                    )}
                </div>
            )}

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("createInvitation")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <Label htmlFor="invitation-email">{tC("email")}</Label>
                            <Input
                                id="invitation-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                inputMode="email"
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <Label htmlFor="invitation-role">{t("role")}</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger id="invitation-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map((name) => (
                                        <SelectItem key={name} value={name}>
                                            {roleLabel(name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <Label htmlFor="invitation-expiry">{t("expiresInDays")}</Label>
                            <Input
                                id="invitation-expiry"
                                type="number"
                                min={1}
                                max={30}
                                value={expiresInDays}
                                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleCreate} disabled={createInvitation.isPending}>
                            {t("invite")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={created !== null}
                onOpenChange={(open) => {
                    if (!open) setCreated(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("tokenTitle")}</DialogTitle>
                    </DialogHeader>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                        }}
                    >
                        {t("tokenNotice")}
                    </p>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <code
                            style={{
                                flex: 1,
                                minWidth: 0,
                                overflowWrap: "anywhere",
                                padding: "8px",
                                background: "var(--color-bg-secondary)",
                                borderRadius: "5px",
                                fontSize: "12px",
                            }}
                        >
                            {created?.token}
                        </code>
                        <Button size="sm" onClick={copyToken}>
                            {t("copyToken")}
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreated(null)}>
                            {tC("close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={revokeTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setRevokeTarget(null);
                }}
                title={t("revoke")}
                description={t("revokeWarning")}
                confirmLabel={t("revoke")}
                destructive
                onConfirm={() => {
                    if (revokeTarget) revoke.mutate(revokeTarget.id);
                }}
            />
        </div>
    );
}
