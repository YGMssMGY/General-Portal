import type { NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { attachmentVersions, attachments } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const id = requireUuid((await params).id);
        const attachment = await t.db.query.attachments.findFirst({
            where: and(
                eq(attachments.id, id),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
            columns: { id: true },
        });
        if (!attachment) throw new ApiError("File not found", 404);
        const rows = await t.db.query.attachmentVersions.findMany({
            where: eq(attachmentVersions.attachmentId, id),
            orderBy: [desc(attachmentVersions.version)],
            with: { createdBy: { columns: { id: true, name: true } } },
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/files/[id]/versions", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_files", module: "files" });
        const id = requireUuid((await params).id);
        const attachment = await t.db.query.attachments.findFirst({
            where: and(
                eq(attachments.id, id),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
        });
        if (!attachment) throw new ApiError("File not found", 404);
        if (attachment.uploadedById !== t.userId && t.roleName === "member") {
            throw new ApiError("Only the uploader or a manager can add a version", 403);
        }
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) throw new ApiError("No file provided", 400);
        if (file.size === 0) throw new ApiError("File is empty", 400);
        if (file.size > MAX_FILE_SIZE) throw new ApiError("File too large. Max 10MB", 400);
        if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
            throw new ApiError("File type not allowed", 400);
        }
        const ext = (file.name.split(".").pop() || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
        const storedName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
        const dir = join(config.uploadsDir, t.portal);
        await mkdir(dir, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(join(dir, storedName), buffer);
        const sha256 = createHash("sha256").update(buffer).digest("hex");
        const top = await t.db.query.attachmentVersions.findMany({
            where: eq(attachmentVersions.attachmentId, id),
            orderBy: [desc(attachmentVersions.version)],
            limit: 1,
            columns: { version: true },
        });
        const version = (top[0]?.version ?? 0) + 1;
        const storagePath = join(t.portal, storedName);
        const [[created]] = await Promise.all([
            t.db
                .insert(attachmentVersions)
                .values({
                    attachmentId: id,
                    version,
                    storagePath,
                    fileSize: file.size,
                    sha256,
                    createdById: t.userId,
                })
                .returning(),
            t.db
                .update(attachments)
                .set({ storagePath, fileSize: file.size, sha256 })
                .where(eq(attachments.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "versioned",
                entityType: "attachment",
                entityId: id,
                metadata: { fileName: attachment.fileName, version },
                ipAddress: clientIp(request),
            }),
        ]);
        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/files/[id]/versions", e);
    }
}
