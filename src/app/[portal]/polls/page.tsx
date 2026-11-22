"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fetchJson, fetchPage } from "@/lib/api-client";
import EntityComments from "@/components/EntityComments";
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

interface PollOption {
    id: string;
    text: string;
    position: number;
    votes: number;
}

interface PollItem {
    id: string;
    title: string;
    description: string | null;
    status: string;
    multiple: boolean;
    anonymous: boolean;
    closesAt: string | null;
    closed: boolean;
    createdAt: string;
    options: PollOption[];
    totalVotes: number;
    myVotes: string[];
}

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

function PollCard({ poll }: { poll: PollItem }) {
    const portal = usePortal();
    const t = useTranslations("polls");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<string[]>(poll.myVotes);

    const vote = useMutation({
        mutationFn: (optionIds: string[]) =>
            fetchJson(`/api/polls/${poll.id}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ optionIds }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "polls"] });
            toast.success(t("voteSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    const close = useMutation({
        mutationFn: () =>
            fetchJson(`/api/polls/${poll.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "closed" }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "polls"] });
            toast.success(t("closeSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function toggleOption(id: string) {
        if (poll.closed) return;
        if (poll.multiple) {
            setSelected((prev) =>
                prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
            );
        } else {
            setSelected([id]);
        }
    }

    const maxVotes = Math.max(1, ...poll.options.map((o) => o.votes));

    return (
        <Card>
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
                            {poll.title}
                        </p>
                        {poll.description && (
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    margin: "4px 0 0",
                                }}
                            >
                                {poll.description}
                            </p>
                        )}
                    </div>
                    <Badge variant={poll.closed ? "secondary" : "default"}>
                        {poll.closed ? t("closed") : t("open")}
                    </Badge>
                </div>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
                    {poll.multiple ? t("multiple") : t("single")}
                    {poll.anonymous ? ` · ${t("anonymous")}` : ""}
                    {` · ${poll.totalVotes} ${t("votes")}`}
                    {poll.closesAt
                        ? ` · ${t("closesAt")}: ${new Date(poll.closesAt).toLocaleString()}`
                        : ""}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {poll.options.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            disabled={poll.closed}
                            onClick={() => toggleOption(o.id)}
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                border: `1px solid ${selected.includes(o.id) ? "var(--color-primary)" : "var(--color-border)"}`,
                                borderRadius: "5px",
                                padding: "8px 10px",
                                backgroundColor: "transparent",
                                cursor: poll.closed ? "default" : "pointer",
                            }}
                        >
                            <span
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "13px",
                                    color: "var(--color-text)",
                                }}
                            >
                                <span>{o.text}</span>
                                <span style={{ color: "var(--color-text-secondary)" }}>
                                    {o.votes}
                                </span>
                            </span>
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
                                        width: `${Math.round((o.votes / maxVotes) * 100)}%`,
                                        borderRadius: "5px",
                                        backgroundColor: "var(--color-primary)",
                                    }}
                                />
                            </span>
                        </button>
                    ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {!poll.closed && (
                        <Button
                            size="sm"
                            disabled={selected.length === 0 || vote.isPending}
                            onClick={() => vote.mutate(selected)}
                        >
                            {t("vote")}
                        </Button>
                    )}
                    {!poll.closed && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={close.isPending}
                            onClick={() => close.mutate()}
                        >
                            {t("close")}
                        </Button>
                    )}
                    {poll.closed && (
                        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                            {t("results")}: {poll.totalVotes} {t("votes")}
                        </span>
                    )}
                    {selected.length === 0 && !poll.closed && (
                        <span
                            style={{
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                alignSelf: "center",
                            }}
                        >
                            {tC("required")}
                        </span>
                    )}
                </div>
                <EntityComments entityType="poll" entityId={poll.id} />
            </CardContent>
        </Card>
    );
}

export default function PollsPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("polls");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);

    const [status, setStatus] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [multiple, setMultiple] = useState(false);
    const [anonymous, setAnonymous] = useState(false);
    const [closesAt, setClosesAt] = useState("");

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "polls", status],
        queryFn: () => fetchPage<PollItem>(`/api/polls${status ? `?status=${status}` : ""}`),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<PollItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState<typeof firstPage>(undefined);
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
            const page = await fetchPage<PollItem>(
                `/api/polls?cursor=${encodeURIComponent(nextCursor)}${status ? `&status=${status}` : ""}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const create = useMutation({
        mutationFn: (body: {
            title: string;
            description?: string | null;
            options: string[];
            multiple: boolean;
            anonymous: boolean;
            closesAt?: string | null;
        }) =>
            fetchJson("/api/polls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "polls"] });
            setCreateOpen(false);
            setTitle("");
            setDescription("");
            setOptions(["", ""]);
            setMultiple(false);
            setAnonymous(false);
            setClosesAt("");
            toast.success(t("createSuccess"));
        },
        onError: (e) => {
            toast.error(errorMessage(e, tE("internal")));
        },
    });

    function handleCreate() {
        const clean = options.map((o) => o.trim()).filter((o) => o !== "");
        if (!title.trim() || clean.length < 2) {
            toast.error(tE("validationFailed"));
            return;
        }
        create.mutate({
            title: title.trim(),
            description: description.trim() || null,
            options: clean,
            multiple,
            anonymous,
            closesAt: closesAt || null,
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
                        <option value="open">{t("open")}</option>
                        <option value="closed">{t("closed")}</option>
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
                            {t("noPolls")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {all.map((p) => (
                        <PollCard key={p.id} poll={p} />
                    ))}
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
                        {options.map((o, i) => (
                            <Input
                                key={i}
                                placeholder={`${t("optionPlaceholder")} ${i + 1}`}
                                value={o}
                                onChange={(e) =>
                                    setOptions((prev) =>
                                        prev.map((v, j) => (j === i ? e.target.value : v)),
                                    )
                                }
                            />
                        ))}
                        {options.length < 10 && (
                            <Button
                                variant="outline"
                                onClick={() => setOptions((prev) => [...prev, ""])}
                            >
                                {t("addOption")}
                            </Button>
                        )}
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                color: "var(--color-text)",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={multiple}
                                onChange={(e) => setMultiple(e.target.checked)}
                            />
                            {t("multiple")}
                        </label>
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                color: "var(--color-text)",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={anonymous}
                                onChange={(e) => setAnonymous(e.target.checked)}
                            />
                            {t("anonymous")}
                        </label>
                        <Input
                            type="datetime-local"
                            value={closesAt}
                            onChange={(e) => setClosesAt(e.target.value)}
                        />
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
