import type { NextRequest } from "next/server";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { attachments } from "@/db/schema";
import { config } from "@/config";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

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
            try {
                await unlink(join(config.uploadsDir, attachment.storagePath));
            } catch {
                // file may already be deleted from disk
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
