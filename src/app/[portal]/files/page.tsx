"use client";

import { useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface FileItem {
    id: string;
    workspaceId: string;
    entityType: string;
    entityId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
    sha256: string | null;
    uploadedById: string;
    createdAt: string;
    uploadedBy: { id: string; name: string | null } | null;
}

interface VersionRow {
    id: string;
    version: number;
    fileSize: number;
    storagePath: string;
    sha256: string | null;
    createdById: string | null;
    createdAt: string;
    createdBy: { id: string; name: string | null } | null;
}

const ENTITY_TYPES = [
    "file",
    "task",
    "proposal",
    "event",
    "thread",
    "message",
    "subgroup",
    "showcase",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string): boolean {
    return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "application/pdf";
}

export default function FilesPage() {
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("files");
    const tV = useTranslations("versions");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    usePageTitle(`${t("title")} | ${wsName}`);
    const isAdmin = user?.role === "admin";

    const [entity, setEntity] = useState("file");
    const [uploading, setUploading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
    const [permanentTarget, setPermanentTarget] = useState<FileItem | null>(null);
    const [historyTarget, setHistoryTarget] = useState<FileItem | null>(null);
    const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});
    const [versionUploading, setVersionUploading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkPermanentOpen, setBulkPermanentOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const versionInputRef = useRef<HTMLInputElement>(null);

    const { data: firstPage, isLoading } = useQuery({
        queryKey: [portal, "files", entity],
        queryFn: () => fetchPage<FileItem>(`/api/files?entityType=${entity}`),
        enabled: portal !== "",
    });
    const [extra, setExtra] = useState<FileItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [moreLoading, setMoreLoading] = useState(false);
    const [prevFirstPage, setPrevFirstPage] = useState(firstPage);
    if (firstPage !== prevFirstPage) {
        setPrevFirstPage(firstPage);
        setExtra([]);
        setNextCursor(firstPage?.nextCursor ?? null);
        setSelectedIds(new Set());
    }
    const files = [...(firstPage?.items ?? []), ...extra];

    const { data: versions, isLoading: versionsLoading } = useQuery({
        queryKey: [portal, "files", "versions", historyTarget?.id ?? ""],
        queryFn: async () => {
            const rows = await fetchJson<VersionRow[]>(`/api/files/${historyTarget?.id}/versions`);
            setVersionCounts((prev) => ({ ...prev, [historyTarget?.id ?? ""]: rows.length }));
            return rows;
        },
        enabled: portal !== "" && historyTarget !== null,
    });

    async function handleNewVersion(file: File) {
        if (!historyTarget) return;
        if (file.size > MAX_FILE_SIZE) {
            toast.error(errorMessage(new Error(tE("fileTooLarge")), t("uploadFailed")));
            return;
        }
        setVersionUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`/api/files/${historyTarget.id}/versions`, {
                method: "POST",
                body: form,
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || (json && json.success === false)) {
                throw new Error(typeof json?.error === "string" ? json.error : t("uploadFailed"));
            }
            queryClient.invalidateQueries({ queryKey: [portal, "files"] });
            queryClient.invalidateQueries({
                queryKey: [portal, "files", "versions", historyTarget.id],
            });
        } catch (e) {
            toast.error(errorMessage(e, t("uploadFailed")));
        } finally {
            setVersionUploading(false);
            if (versionInputRef.current) versionInputRef.current.value = "";
        }
    }

    async function loadMore() {
        if (!nextCursor || moreLoading) return;
        setMoreLoading(true);
        try {
            const page = await fetchPage<FileItem>(
                `/api/files?entityType=${entity}&cursor=${encodeURIComponent(nextCursor)}`,
            );
            setExtra((prev) => [...prev, ...page.items]);
            setNextCursor(page.nextCursor);
        } catch (e) {
            toast.error(errorMessage(e, tE("internal")));
        } finally {
            setMoreLoading(false);
        }
    }

    const deleteFile = useMutation({
        mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
            fetchJson<{ deleted: boolean }>(
                permanent ? `/api/files/${id}?permanent=true` : `/api/files/${id}`,
                { method: "DELETE" },
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "files"] });
            setDeleteTarget(null);
            setPermanentTarget(null);
        },
        onError: (e) => {
            toast.error(errorMessage(e, t("deleteFailed")));
        },
    });

    const bulkDelete = useMutation({
        mutationFn: ({ permanent }: { permanent: boolean }) =>
            Promise.all(
                [...selectedIds].map((id) =>
                    fetchJson<{ deleted: boolean }>(
                        permanent ? `/api/files/${id}?permanent=true` : `/api/files/${id}`,
                        { method: "DELETE" },
                    ),
                ),
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "files"] });
            setSelectedIds(new Set());
            setBulkDeleteOpen(false);
            setBulkPermanentOpen(false);
        },
        onError: (e) => {
            toast.error(errorMessage(e, t("deleteFailed")));
        },
    });

    async function handleUpload(file: File) {
        if (file.size > MAX_FILE_SIZE) {
            toast.error(tE("fileTooLarge"));
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`/api/files?entityType=${entity}`, {
                method: "POST",
                body: form,
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || (json && json.success === false)) {
                throw new Error(typeof json?.error === "string" ? json.error : t("uploadFailed"));
            }
            queryClient.invalidateQueries({ queryKey: [portal, "files"] });
        } catch (e) {
            toast.error(errorMessage(e, t("uploadFailed")));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
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
                        {wsName} · {t("maxSize", { size: "10MB" })}
                    </p>
                </div>
                <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
                    {uploading ? tC("loading") : t("upload")}
                </Button>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf,text/plain"
                style={{ display: "none" }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                }}
            />

            <div style={{ maxWidth: "280px" }}>
                <Select value={entity} onValueChange={setEntity}>
                    <SelectTrigger>
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

            {files.length > 0 && (
                <div
                    style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
                >
                    <Checkbox
                        id="files-select-all"
                        checked={files.every((f) => selectedIds.has(f.id))}
                        onCheckedChange={(checked) =>
                            setSelectedIds(
                                checked === true ? new Set(files.map((f) => f.id)) : new Set(),
                            )
                        }
                        aria-label={t("selectAll")}
                    />
                    <Label
                        htmlFor="files-select-all"
                        style={{ fontSize: "13px", marginRight: "8px" }}
                    >
                        {t("selectAll")}
                    </Label>
                    {selectedIds.size > 0 && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                {t("bulkDelete")} ({selectedIds.size})
                            </Button>
                            {isAdmin && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setBulkPermanentOpen(true)}
                                >
                                    {t("bulkDeleteForever")} ({selectedIds.size})
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}

            {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : files.length === 0 ? (
                <Card>
                    <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("noFiles")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {files.map((f) => (
                        <Card key={f.id}>
                            <CardContent
                                style={{
                                    padding: "12px 16px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "12px",
                                }}
                            >
                                <Checkbox
                                    checked={selectedIds.has(f.id)}
                                    onCheckedChange={(checked) =>
                                        setSelectedIds((prev) => {
                                            const next = new Set(prev);
                                            if (checked === true) next.add(f.id);
                                            else next.delete(f.id);
                                            return next;
                                        })
                                    }
                                    aria-label={f.fileName}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "var(--color-text)",
                                            margin: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {f.fileName}
                                    </p>
                                    <p
                                        style={{
                                            fontSize: "12px",
                                            color: "var(--color-text-secondary)",
                                            margin: "2px 0 0",
                                        }}
                                    >
                                        {t("fileSize")}: {formatSize(f.fileSize)}
                                        {` · ${t("uploadedBy")}: ${f.uploadedBy?.name ?? tC("unknown")}`}
                                        {` · ${t("uploadedAt")}: ${new Date(f.createdAt).toLocaleString(locale)}`}
                                    </p>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Badge variant="outline">{f.entityType}</Badge>
                                    {(versionCounts[f.id] ?? 0) > 0 && (
                                        <Badge variant="secondary">
                                            {tV("version")} {versionCounts[f.id]}
                                        </Badge>
                                    )}
                                    {isPreviewable(f.mimeType) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPreviewTarget(f)}
                                        >
                                            {t("preview")}
                                        </Button>
                                    )}
                                    <a
                                        href={`/api/files/download/${f.id}`}
                                        download
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: "var(--color-primary)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        {t("download")}
                                    </a>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDeleteTarget(f)}
                                    >
                                        {t("delete")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setHistoryTarget(f)}
                                    >
                                        {tV("history")}
                                    </Button>
                                    {isAdmin && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => setPermanentTarget(f)}
                                        >
                                            {tC("deleteForever")}
                                        </Button>
                                    )}
                                </div>
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

            <Dialog
                open={previewTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setPreviewTarget(null);
                }}
            >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{previewTarget?.fileName}</DialogTitle>
                    </DialogHeader>
                    {previewTarget?.mimeType === "application/pdf" ? (
                        <iframe
                            src={`/api/files/download/${previewTarget.id}`}
                            title={previewTarget.fileName}
                            sandbox="allow-scripts"
                            style={{
                                width: "100%",
                                height: "70vh",
                                border: "1px solid var(--color-border)",
                            }}
                        />
                    ) : previewTarget ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- preview is auth-scoped and must not pass through next/image optimizer */}
                            <img
                                src={`/api/files/download/${previewTarget.id}`}
                                alt={previewTarget.fileName}
                                style={{ maxWidth: "100%", maxHeight: "70vh", margin: "0 auto" }}
                            />
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                title={t("bulkDelete")}
                confirmLabel={t("bulkDelete")}
                destructive
                onConfirm={() => bulkDelete.mutate({ permanent: false })}
            />
            <ConfirmDialog
                open={bulkPermanentOpen}
                onOpenChange={setBulkPermanentOpen}
                title={t("bulkDeleteForever")}
                confirmLabel={tC("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={tC("deleteForever")}
                onConfirm={() => bulkDelete.mutate({ permanent: true })}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={t("delete")}
                description={deleteTarget?.fileName}
                confirmLabel={t("delete")}
                destructive
                onConfirm={() => {
                    if (deleteTarget) deleteFile.mutate({ id: deleteTarget.id, permanent: false });
                }}
            />
            <Dialog
                open={historyTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setHistoryTarget(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {tV("history")}: {historyTarget?.fileName}
                        </DialogTitle>
                    </DialogHeader>
                    <input
                        ref={versionInputRef}
                        type="file"
                        accept="image/*,application/pdf,text/plain"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleNewVersion(file);
                        }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => versionInputRef.current?.click()}
                            disabled={versionUploading}
                        >
                            {versionUploading ? tC("loading") : tV("uploadNew")}
                        </Button>
                    </div>
                    {versionsLoading ? (
                        <Skeleton className="h-16 w-full" />
                    ) : (versions ?? []).length === 0 ? (
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {tV("empty")}
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(versions ?? []).map((v) => (
                                <div
                                    key={v.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontSize: "13px",
                                        color: "var(--color-text)",
                                    }}
                                >
                                    <span>
                                        {tV("version")} {v.version} · {formatSize(v.fileSize)} ·{" "}
                                        {new Date(v.createdAt).toLocaleString(locale)}
                                    </span>
                                    <a
                                        href={`/api/files/download/${historyTarget?.id}?version=${v.version}`}
                                        download
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 600,
                                            color: "var(--color-primary)",
                                            textDecoration: "none",
                                        }}
                                    >
                                        {t("download")}
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={permanentTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setPermanentTarget(null);
                }}
                title={tC("deleteForever")}
                description={permanentTarget?.fileName}
                confirmLabel={tC("deleteForever")}
                destructive
                requireTypedText
                typingChallenge={permanentTarget?.fileName ?? tC("deleteForever")}
                onConfirm={() => {
                    if (permanentTarget)
                        deleteFile.mutate({ id: permanentTarget.id, permanent: true });
                }}
            />
        </div>
    );
}
