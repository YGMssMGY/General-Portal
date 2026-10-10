import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { apiTokens } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_api_tokens",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.apiTokens.findFirst({
            where: and(eq(apiTokens.id, id), eq(apiTokens.workspaceId, t.workspaceId)),
        });
        if (!existing) throw new ApiError("Token not found", 404);
        await t.db
            .delete(apiTokens)
            .where(and(eq(apiTokens.id, id), eq(apiTokens.workspaceId, t.workspaceId)));
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/api-tokens/[id]", e);
    }
}
