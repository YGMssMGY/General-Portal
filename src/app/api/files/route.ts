import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { attachments } from "@/db/schema";
import { config } from "@/config";
import {
    ApiError,
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";
import { fileKindMatchesMime, sniffFileKind, streamFileToDisk } from "@/lib/uploads";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain"];
const ENTITY_TYPES = [
    "file",
    "task",
    "proposal",
    "event",
    "thread",
    "message",
    "subgroup",
    "showcase",
] as const;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const sp = request.nextUrl.searchParams;
        const { limit, cursor } = parsePagination(sp);

        const entityParam = sp.get("entityType");
        if (entityParam !== null && !(ENTITY_TYPES as readonly string[]).includes(entityParam)) {
            throw new ApiError("Invalid entityType", 400);
        }

        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? keysetWhere(
                      [{ column: attachments.createdAt, value: cDate }],
                      attachments.id,
                      cId,
                  )
                : undefined;

        const rows = await t.db.query.attachments.findMany({
            where: and(
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
                entityParam ? eq(attachments.entityType, entityParam) : undefined,
                cursorCond,
            ),
            orderBy: [desc(attachments.createdAt), desc(attachments.id)],
            limit: limit + 1,
            columns: {
                id: true,
                workspaceId: true,
                entityType: true,
                entityId: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
                storagePath: true,
                sha256: true,
                uploadedById: true,
                createdAt: true,
            },
            with: { uploadedBy: { columns: { id: true, name: true } } },
        });

        const items = rows.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/files", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "files" });

        const entityType = request.nextUrl.searchParams.get("entityType") || "file";
        if (!(ENTITY_TYPES as readonly string[]).includes(entityType)) {
            throw new ApiError("Invalid entityType", 400);
        }

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

        try {
            const streamed = await streamFileToDisk(file, targetPath, MAX_FILE_SIZE);
            const [attachment] = await t.db
                .insert(attachments)
                .values({
                    workspaceId: t.workspaceId,
                    entityType,
                    entityId: "",
                    fileName: file.name,
                    fileSize: streamed.size,
                    mimeType: file.type,
                    storagePath: join(t.portal, storedName),
                    sha256: streamed.sha256,
                    uploadedById: t.userId,
                })
                .returning();

            await emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "created",
                entityType: "attachment",
                entityId: attachment.id,
                metadata: { fileName: attachment.fileName, entityType },
                ipAddress: clientIp(request),
            });

            return ok(attachment, 201);
        } catch (e) {
            await unlink(targetPath).catch(() => {});
            throw e;
        }
    } catch (e) {
        return handleRouteError("POST /api/files", e);
    }
}
