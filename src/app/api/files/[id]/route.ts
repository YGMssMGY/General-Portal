import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { attachments } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { emitSideEffects } from "@/lib/side-effects";
import { fileKindMatchesMime, sniffFileKind, streamFileToDisk } from "@/lib/uploads";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain"];

function diskPathFor(storagePath: string): string | null {
    const root = resolve(config.uploadsDir);
    const target = resolve(root, storagePath);
    return target.startsWith(root + sep) ? target : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_files", module: "files" });
        const attachmentId = requireUuid((await params).id);

        const attachment = await t.db.query.attachments.findFirst({
            where: and(
                eq(attachments.id, attachmentId),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
        });
        if (!attachment) throw new ApiError("File not found", 404);

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) throw new ApiError("No file provided", 400);
        if (file.size === 0) throw new ApiError("File is empty", 400);
        if (file.size > MAX_FILE_SIZE) throw new ApiError("File too large. Max 10MB", 400);
        if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
            throw new ApiError("File type not allowed", 400);
        }
        const sniffed = sniffFileKind(new Uint8Array(await file.slice(0, 512).arrayBuffer()));
        if (!sniffed || !fileKindMatchesMime(sniffed, file.type)) {
            throw new ApiError("File type not allowed", 400);
        }

        const ext = (file.name.split(".").pop() || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
        const storedName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
        const dir = join(config.uploadsDir, t.portal);
        await mkdir(dir, { recursive: true });
        const targetPath = join(dir, storedName);
        const storagePath = join(t.portal, storedName);

        try {
            const streamed = await streamFileToDisk(file, targetPath, MAX_FILE_SIZE);
            await t.db
                .update(attachments)
                .set({
                    storagePath,
                    fileName: file.name,
                    fileSize: streamed.size,
                    mimeType: file.type,
                    sha256: streamed.sha256,
                })
                .where(eq(attachments.id, attachmentId));
            await emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "updated",
                entityType: "attachment",
                entityId: attachmentId,
                metadata: { fileName: file.name },
                ipAddress: clientIp(request),
            });
            const previous = diskPathFor(attachment.storagePath);
            if (previous) await unlink(previous).catch(() => {});
            return ok({
                id: attachmentId,
                storagePath,
                fileSize: streamed.size,
                sha256: streamed.sha256,
            });
        } catch (e) {
            await unlink(targetPath).catch(() => {});
            throw e;
        }
    } catch (e) {
        return handleRouteError("PATCH /api/files/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const { id } = await params;
        const attachmentId = requireUuid(id);

        const attachment = await t.db.query.attachments.findFirst({
            where: and(
                eq(attachments.id, attachmentId),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
        });
        if (!attachment) throw new ApiError("File not found", 404);

        if (attachment.uploadedById !== t.userId && t.roleName === "member") {
            throw new ApiError("Only the uploader or a manager can delete this file", 403);
        }

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            const diskPath = diskPathFor(attachment.storagePath);
            if (diskPath) {
                try {
                    await unlink(diskPath);
                } catch {
                    // file may already be deleted from disk
                }
            }
            await t.db.delete(attachments).where(eq(attachments.id, attachmentId));
        } else {
            await t.db
                .update(attachments)
                .set({ deletedAt: new Date() })
                .where(eq(attachments.id, attachmentId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "attachment",
                entityId: attachmentId,
                metadata: { fileName: attachment.fileName },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/files/[id]", e);
    }
}
