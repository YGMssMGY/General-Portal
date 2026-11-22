"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CommentEntityType = "event" | "proposal" | "goal" | "poll";

interface CommentRow {
    id: string;
    userId: string;
    body: string;
    createdAt: string;
    user: { id: string; name: string | null; image: string | null } | null;
}

export default function EntityComments({
    entityType,
    entityId,
}: {
    entityType: CommentEntityType;
    entityId: string;
}) {
    const portal = usePortal();
    const { user } = useAuthSession();
    const t = useTranslations("comments");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const queryClient = useQueryClient();
    const [body, setBody] = useState("");

    const queryKey = [portal, "comments", entityType, entityId];
    const { data, isLoading } = useQuery<CommentRow[]>({
        queryKey,
        queryFn: () =>
            fetchJson<CommentRow[]>(
                `/api/comments?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`,
            ),
        enabled: portal !== "",
    });

    const createMutation = useMutation({
        mutationFn: (text: string) =>
            fetchJson("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityType, entityId, body: text }),
            }),
        onSuccess: () => {
            setBody("");
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : te("internal")),
    });

    const comments = data ?? [];

    return (
        <section style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px" }}>{t("title")}</h4>
            {isLoading ? (
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
                    {tc("loading")}
                </p>
            ) : comments.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
                    {t("empty")}
                </p>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginBottom: "8px",
                    }}
                >
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            style={{
                                padding: "6px 10px",
                                borderRadius: "5px",
                                backgroundColor: "var(--color-bg-secondary)",
                            }}
                        >
                            <div style={{ fontSize: "11px", fontWeight: 600 }}>
                                {comment.user?.name ?? tc("unknown")}
                            </div>
                            <div style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                                {comment.body}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {user && (
                <div style={{ display: "flex", gap: "8px" }}>
                    <Input
                        aria-label={t("placeholder")}
                        placeholder={t("placeholder")}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && body.trim())
                                createMutation.mutate(body.trim());
                        }}
                    />
                    <Button
                        size="sm"
                        disabled={!body.trim() || createMutation.isPending}
                        onClick={() => createMutation.mutate(body.trim())}
                    >
                        {t("add")}
                    </Button>
                </div>
            )}
        </section>
    );
}
