import type { NextRequest } from "next/server";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { attachments, proposals } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { config } from "@/config";
import { requireTenant } from "@/lib/tenant";

const UPLOADS_DIR = config.uploadsDir;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain"];

function isAllowedMime(mime: string): boolean {
    return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const id = requireUuid((await params).id);
        const proposal = await t.db.query.proposals.findFirst({
            where: and(
                eq(proposals.id, id),
                eq(proposals.workspaceId, t.workspaceId),
                isNull(proposals.deletedAt),
            ),
        });
        if (!proposal) throw new ApiError("Proposal not found", 404);

        const rows = await t.db.query.attachments.findMany({
            where: and(
                eq(attachments.entityType, "proposal"),
                eq(attachments.entityId, id),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
            orderBy: [desc(attachments.createdAt)],
        });

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/proposals/[id]/attachments", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "create_proposal",
            module: "proposals",
        });
        const id = requireUuid((await params).id);
        const proposal = await t.db.query.proposals.findFirst({
            where: and(
                eq(proposals.id, id),
                eq(proposals.workspaceId, t.workspaceId),
                isNull(proposals.deletedAt),
            ),
        });
        if (!proposal) throw new ApiError("Proposal not found", 404);

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) throw new ApiError("No file provided", 400);
        if (file.size > MAX_FILE_SIZE) throw new ApiError("File exceeds 10 MB limit", 400);
        if (!isAllowedMime(file.type)) {
            throw new ApiError("File type not allowed. Accepted: images, PDF, plain text", 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const rawExt = file.name.includes(".") ? (file.name.split(".").pop() ?? "") : "";
        const cleanExt = rawExt
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 10);
        const storedName = `${randomUUID()}${cleanExt ? `.${cleanExt}` : ""}`;
        const storagePath = join(UPLOADS_DIR, t.portal, storedName);
        await mkdir(join(UPLOADS_DIR, t.portal), { recursive: true });
        await writeFile(storagePath, buffer);

        const inserted = await t.db
            .insert(attachments)
            .values({
                workspaceId: t.workspaceId,
                entityType: "proposal",
                entityId: id,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                storagePath,
                sha256: createHash("sha256").update(buffer).digest("hex"),
                uploadedById: t.userId,
            })
            .returning();
        const attachment = inserted[0];
        if (!attachment) throw new ApiError("Failed to save attachment", 500);

        return ok(attachment, 201);
    } catch (e) {
        return handleRouteError("POST /api/proposals/[id]/attachments", e);
    }
}
