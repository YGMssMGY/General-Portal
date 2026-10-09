import { and, eq, isNull } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { config } from "@/config";
import { ApiError, handleRouteError, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { attachments } from "@/db/schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const { id } = await params;
        requireUuid(id);

        const file = await t.db.query.attachments.findFirst({
            where: and(
                eq(attachments.id, id),
                eq(attachments.workspaceId, t.workspaceId),
                isNull(attachments.deletedAt),
            ),
            columns: { id: true, fileName: true, fileSize: true, storagePath: true },
        });
        if (!file) throw new ApiError("File not found", 404);

        const buffer = await readFile(join(config.uploadsDir, file.storagePath));
        const encodedName = encodeURIComponent(file.fileName);
        return new Response(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
                "Content-Length": String(file.fileSize),
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (e) {
        return handleRouteError("GET /api/files/download/[id]", e);
    }
}
