import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { attachments, tasks } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { config } from "@/config";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "svg"]);

function uploadExt(fileName: string, mime: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ext) throw new ApiError("File must have an extension", 400);
    if (mime.startsWith("image/") && IMAGE_EXTS.has(ext)) return ext;
    if (mime === "application/pdf" && ext === "pdf") return ext;
    if (mime === "text/plain" && (ext === "txt" || ext === "md")) return ext;
    throw new ApiError("File type not allowed. Accepted: images, PDF, plain text", 400);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { id } = await params;
        requireUuid(id);

        const task = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, id),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
            columns: { id: true },
        });
        if (!task) throw new ApiError("Task not found", 404);

        const rows = await t.db.query.attachments.findMany({
            where: and(
                eq(attachments.entityType, "task"),
                eq(attachments.entityId, id),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
            orderBy: [desc(attachments.createdAt)],
            with: { uploadedBy: { columns: { id: true, name: true, image: true } } },
        });

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/tasks/[id]/attachments", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "create_task", module: "tasks" });
        const { id } = await params;
        requireUuid(id);

        const task = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, id),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
            columns: { id: true },
        });
        if (!task) throw new ApiError("Task not found", 404);

        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) throw new ApiError("No file provided", 400);
        if (file.size > MAX_FILE_SIZE) throw new ApiError("File exceeds 10 MB limit", 400);

        const ext = uploadExt(file.name, file.type);
        const bytes = Buffer.from(await file.arrayBuffer());
        const sha256 = createHash("sha256").update(bytes).digest("hex");

        const dir = join(config.uploadsDir, t.portal);
        await mkdir(dir, { recursive: true });
        const attachmentId = randomUUID();
        const storagePath = join(dir, `${attachmentId}.${ext}`);
        await writeFile(storagePath, bytes);

        const [[attachment]] = await Promise.all([
            t.db
                .insert(attachments)
                .values({
                    id: attachmentId,
                    workspaceId: t.workspaceId,
                    entityType: "task",
                    entityId: id,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    storagePath,
                    sha256,
                    uploadedById: t.userId,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "attachment",
                entityId: attachmentId,
                metadata: { taskId: id, fileName: file.name },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(attachment, 201);
    } catch (e) {
        return handleRouteError("POST /api/tasks/[id]/attachments", e);
    }
}
