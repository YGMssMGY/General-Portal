import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { linkItems } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const { id } = await params;
        const linkId = requireUuid(id);

        const link = await t.db.query.linkItems.findFirst({
            where: and(
                eq(linkItems.id, linkId),
                eq(linkItems.workspaceId, t.workspaceId),
                isNull(linkItems.deletedAt),
            ),
            with: { uploadedBy: { columns: { id: true, name: true, image: true } } },
        });
        if (!link) throw new ApiError("Link not found", 404);

        return ok({
            ...link,
            createdBy: link.uploadedBy
                ? { id: link.uploadedBy.id, name: link.uploadedBy.name }
                : null,
        });
    } catch (e) {
        return handleRouteError("GET /api/links/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const { id } = await params;
        const linkId = requireUuid(id);

        const link = await t.db.query.linkItems.findFirst({
            where: and(
                eq(linkItems.id, linkId),
                eq(linkItems.workspaceId, t.workspaceId),
                isNull(linkItems.deletedAt),
            ),
            columns: { id: true, title: true, uploadedById: true },
        });
        if (!link) throw new ApiError("Link not found", 404);

        if (link.uploadedById !== t.userId && t.roleName === "member") {
            throw new ApiError("Only the uploader or a manager can delete this link", 403);
        }

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            await t.db.delete(linkItems).where(eq(linkItems.id, linkId));
        } else {
            await t.db
                .update(linkItems)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(linkItems.id, linkId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "link",
                entityId: linkId,
                metadata: { title: link.title },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/links/[id]", e);
    }
}
