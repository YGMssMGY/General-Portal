"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";

interface SavedView {
    id: string;
    workspaceId: string;
    userId: string;
    entityType: string;
    name: string;
    filters: Record<string, unknown>;
    isShared: boolean;
    position: number;
    createdAt: string;
}

const ENTITY_TYPES = [
    "task",
    "event",
    "proposal",
    "message",
    "finance",
    "volunteer",
    "meeting",
] as const;

function parseFilters(text: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
    try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return { ok: true, value: parsed as Record<string, unknown> };
        }
        return { ok: false };
    } catch {
        return { ok: false };
    }
}

function SavedViewsContent() {
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const tS = useTranslations("savedViews");
    const portal = usePortal();
    const queryClient = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(`${tS("title")} | ${portal}`);
    const canShare = user?.role !== "member";

    const [entityFilter, setEntityFilter] = useState("");
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [entityType, setEntityType] = useState<string>("task");
    const [isShared, setIsShared] = useState(false);
    const [filtersText, setFiltersText] = useState("{}");
    const [filtersError, setFiltersError] = useState("");

    const qs = entityFilter === "" ? "" : `?entityType=${encodeURIComponent(entityFilter)}`;
    const {
        data: views,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: [portal, "saved-views", entityFilter],
        queryFn: () => fetchJson<SavedView[]>(`/api/saved-views${qs}`),
        enabled: portal !== "",
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: [portal, "saved-views"] });

    const createMutation = useMutation({
        mutationFn: (input: {
            entityType: string;
            name: string;
            filters: Record<string, unknown>;
            isShared: boolean;
        }) =>
            fetchJson("/api/saved-views", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        onSuccess: () => {
            invalidate();
            setOpen(false);
            setName("");
            setEntityType("task");
            setIsShared(false);
            setFiltersText("{}");
            setFiltersError("");
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchJson(`/api/saved-views/${id}`, { method: "DELETE" }),
        onSuccess: invalidate,
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : te("internal"));
        },
    });

    const handleCreate = () => {
        const parsed = parseFilters(filtersText);
        if (!parsed.ok) {
            setFiltersError(tS("invalidJson"));
            return;
        }
        setFiltersError("");
        createMutation.mutate({
            entityType,
            name: name.trim(),
            filters: parsed.value,
            isShared: canShare && isShared,
        });
    };

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
                    Saved Views
                </h1>
                <Button size="sm" onClick={() => setOpen(true)}>
                    {tc("create")}
                </Button>
            </div>
            <div style={{ maxWidth: "320px" }}>
                <Label htmlFor="saved-views-filter">{tc("filter")}</Label>
                <Select
                    value={entityFilter === "" ? "all" : entityFilter}
                    onValueChange={(v) => setEntityFilter(v === "all" ? "" : v)}
                >
                    <SelectTrigger id="saved-views-filter">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{tc("all")}</SelectItem>
                        {ENTITY_TYPES.map((e) => (
                            <SelectItem key={e} value={e}>
                                {e}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            style={{ width: "100%", height: "64px", borderRadius: "5px" }}
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
            ) : (views ?? []).length === 0 ? (
                <Card>
                    <CardContent
                        style={{
                            padding: "48px 24px",
                            textAlign: "center",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <p style={{ fontSize: "14px", margin: 0 }}>No saved views yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(views ?? []).map((v) => (
                        <Card key={v.id}>
                            <CardContent
                                style={{
                                    padding: "14px 16px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    flexWrap: "wrap",
                                }}
                            >
                                <strong
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text)",
                                        flex: 1,
                                        minWidth: "160px",
                                    }}
                                >
                                    {v.name}
                                </strong>
                                <Badge variant="outline">{v.entityType}</Badge>
                                {v.isShared && <Badge variant="default">{tS("shared")}</Badge>}
                                {user && v.userId !== user.id && (
                                    <Badge variant="secondary">{tS("sharedWithYou")}</Badge>
                                )}
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteMutation.mutate(v.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {tc("delete")}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tS("create")}</DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <Label htmlFor="saved-view-name">{tS("name")}</Label>
                            <Input
                                id="saved-view-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="saved-view-entity">{tS("entityType")}</Label>
                            <Select value={entityType} onValueChange={setEntityType}>
                                <SelectTrigger id="saved-view-entity">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENTITY_TYPES.map((e) => (
                                        <SelectItem key={e} value={e}>
                                            {e}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {canShare && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Checkbox
                                    id="saved-view-shared"
                                    checked={isShared}
                                    onCheckedChange={(v) => setIsShared(v === true)}
                                />
                                <Label htmlFor="saved-view-shared">{tS("shared")}</Label>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="saved-view-filters">{tS("filtersJson")}</Label>
                            <Textarea
                                id="saved-view-filters"
                                value={filtersText}
                                onChange={(e) => setFiltersText(e.target.value)}
                                rows={5}
                            />
                            {filtersError !== "" && (
                                <p
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--color-destructive)",
                                        margin: "4px 0 0",
                                    }}
                                >
                                    {filtersError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {tc("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={name.trim() === "" || createMutation.isPending}
                        >
                            {createMutation.isPending ? tc("saving") : tc("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function SavedViewsPage() {
    return (
        <AuthSessionProvider>
            <SavedViewsContent />
        </AuthSessionProvider>
    );
}
