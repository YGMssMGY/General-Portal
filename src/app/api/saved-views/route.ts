import { NextRequest } from "next/server";
import { and, asc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { savedViews } from "@/db/schema";
import { handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const createViewSchema = z.object({
    entityType: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(128),
    filters: z.record(z.string(), z.unknown()),
    isShared: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
});
type CreateViewInput = z.infer<typeof createViewSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const entityType = new URL(request.url).searchParams.get("entityType");
        const conds = [
            eq(savedViews.workspaceId, t.workspaceId),
            or(eq(savedViews.userId, t.userId), eq(savedViews.isShared, true)),
            ...(entityType ? [eq(savedViews.entityType, entityType)] : []),
        ];
        const rows = await t.db.query.savedViews.findMany({
            where: and(...conds),
            orderBy: [asc(savedViews.position), asc(savedViews.name)],
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/saved-views", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<CreateViewInput>(createViewSchema as never, request);
        const [row] = await t.db
            .insert(savedViews)
            .values({
                workspaceId: t.workspaceId,
                userId: t.userId,
                entityType: body.entityType,
                name: body.name,
                filters: body.filters as Record<string, unknown>,
                isShared: body.isShared === true && t.roleName !== "member",
                position: body.position ?? 0,
            })
            .returning();
        return ok(row, 201);
    } catch (e) {
        return handleRouteError("POST /api/saved-views", e);
    }
}
