import { and, eq, isNull } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { NextRequest } from "next/server";
import { config } from "@/config";
import { ApiError, handleRouteError, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { attachments, attachmentVersions } from "@/db/schema";

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

        const versionParam = request.nextUrl.searchParams.get("version");
        let storagePath = file.storagePath;
        let fileSize = file.fileSize;
        if (versionParam !== null) {
            const version = Number.parseInt(versionParam, 10);
            if (!Number.isInteger(version) || version < 1)
                throw new ApiError("Invalid version", 400);
            const rows = await t.db.query.attachmentVersions.findMany({
                where: and(
                    eq(attachmentVersions.attachmentId, id),
                    eq(attachmentVersions.version, version),
                ),
                columns: { storagePath: true, fileSize: true },
                limit: 1,
            });
            const match = rows[0];
            if (!match) throw new ApiError("Version not found", 404);
            storagePath = match.storagePath;
            fileSize = match.fileSize;
        }

        const root = resolve(config.uploadsDir);
        const diskPath = resolve(root, storagePath);
        if (!diskPath.startsWith(root + sep)) throw new ApiError("Invalid storage path", 400);

        const buffer = await readFile(diskPath);
        const encodedName = encodeURIComponent(file.fileName);
        return new Response(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
                "Content-Length": String(fileSize),
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (e) {
        return handleRouteError("GET /api/files/download/[id]", e);
    }
}
