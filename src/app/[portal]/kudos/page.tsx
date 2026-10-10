"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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

interface Person {
    id: string;
    name: string | null;
    image: string | null;
}

interface KudosItem {
    id: string;
    senderId: string;
    receiverId: string;
    message: string | null;
    createdAt: string;
    sender: Person | null;
    receiver: Person | null;
}

interface LeaderboardRow {
    userId: string;
    userName: string | null;
    userEmail: string;
    userImage: string | null;
    count: number;
}

interface MemberOption {
    id: string;
    name: string | null;
    email: string;
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

export default function KudosPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const tC = useTranslations("common");
    const tK = useTranslations("kudos");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${tK("title")} | ${wsName}`);

    const [tab, setTab] = useState("received");
    const [sendOpen, setSendOpen] = useState(false);
    const [receiverId, setReceiverId] = useState("");
    const [message, setMessage] = useState("");

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "kudos"],
        queryFn: () => fetchPage<KudosItem>("/api/kudos"),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<KudosItem[]>([]);
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
            const page = await fetchPage<KudosItem>(
                `/api/kudos?cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const { data: leaderboard } = useQuery({
        queryKey: [portal, "kudos", "leaderboard"],
        queryFn: () => fetchJson<LeaderboardRow[]>("/api/kudos/leaderboard"),
        enabled: portal !== "",
    });

    const { data: memberPage } = useQuery({
        queryKey: [portal, "members"],
        queryFn: () => fetchPage<MemberOption>("/api/members"),
        enabled: portal !== "" && sendOpen,
    });
    const options = (memberPage?.items ?? []).filter((m) => m.id !== user?.id);

    const sendKudos = useMutation({
        mutationFn: (body: { receiverId: string; message?: string | null }) =>
            fetchJson<KudosItem>("/api/kudos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "kudos"] });
            setSendOpen(false);
            setReceiverId("");
            setMessage("");
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleSend() {
        if (!receiverId) {
            toast.error(tE("validationFailed"));
            return;
        }
        sendKudos.mutate({ receiverId, message: message.trim() || null });
    }

    const received = all.filter((k) => k.receiverId === user?.id);
    const sent = all.filter((k) => k.senderId === user?.id);
    const visible = tab === "received" ? received : sent;

    function renderKudos(k: KudosItem) {
        const other = tab === "received" ? k.sender : k.receiver;
        return (
            <Card key={k.id}>
                <CardContent style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                            {(other?.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                                style={{
                                    display: "block",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "var(--color-text)",
                                }}
                            >
                                {other?.name ?? tC("unknown")}
                            </span>
                            {k.message && (
                                <span
                                    style={{
                                        display: "block",
                                        fontSize: "13px",
                                        color: "var(--color-text)",
                                        marginTop: "2px",
                                    }}
                                >
                                    {k.message}
                                </span>
                            )}
                            <span
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                {new Date(k.createdAt).toLocaleString(locale)}
                            </span>
                        </span>
                    </div>
                </CardContent>
            </Card>
        );
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
                        Kudos
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
                <Button onClick={() => setSendOpen(true)}>{tC("submit")}</Button>
            </div>

            <Card>
                <CardContent style={{ padding: "16px 20px" }}>
                    <p
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            margin: "0 0 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <Trophy size={16} />
                        {tK("leaderboard")}
                    </p>
                    {(leaderboard ?? []).length === 0 ? (
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {tK("noKudos")}
                        </p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "14px",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            textAlign: "left",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        <th style={{ padding: "8px" }}>#</th>
                                        <th style={{ padding: "8px" }}>{tC("name")}</th>
                                        <th style={{ padding: "8px" }}>{tK("count")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(leaderboard ?? []).map((row, i) => (
                                        <tr
                                            key={row.userId}
                                            style={{ borderTop: "1px solid var(--color-border)" }}
                                        >
                                            <td
                                                style={{
                                                    padding: "8px",
                                                    color: "var(--color-text)",
                                                }}
                                            >
                                                {i + 1}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "8px",
                                                    color: "var(--color-text)",
                                                }}
                                            >
                                                {row.userName ?? row.userEmail ?? tC("unknown")}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "8px",
                                                    color: "var(--color-text)",
                                                }}
                                            >
                                                {row.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="received">{tK("received")}</TabsTrigger>
                    <TabsTrigger value="sent">{tK("sent")}</TabsTrigger>
                </TabsList>
                <TabsContent value="received">
                    {isLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : received.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {tK("noKudos")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {received.map(renderKudos)}
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="sent">
                    {isLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : sent.length === 0 ? (
                        <Card>
                            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {tK("noKudos")}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {sent.map(renderKudos)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {nextCursor && visible.length > 0 && (
                <Button variant="outline" onClick={loadMore} disabled={moreLoading}>
                    {moreLoading ? tC("loading") : tC("showMore")}
                </Button>
            )}

            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tK("send")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <Select value={receiverId} onValueChange={setReceiverId}>
                            <SelectTrigger>
                                <SelectValue placeholder={tC("members")} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name ?? m.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Textarea
                            placeholder={tC("description")}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSendOpen(false)}>
                            {tC("cancel")}
                        </Button>
                        <Button onClick={handleSend} disabled={!receiverId || sendKudos.isPending}>
                            {tC("submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
