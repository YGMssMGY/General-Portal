import { NextRequest } from "next/server";
import { and, asc, eq, gt, or } from "drizzle-orm";
import { z } from "zod";
import { savedViews } from "@/db/schema";
import {
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
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
        const { limit, cursor } = parsePagination(request.nextUrl.searchParams);
        const vals = decodeCursorValues(cursor);
        const after =
            vals && typeof vals[0] === "number" && typeof vals[1] === "string"
                ? or(
                      gt(savedViews.position, vals[0]),
                      and(eq(savedViews.position, vals[0]), gt(savedViews.name, vals[1])),
                  )
                : undefined;
        const rows = await t.db.query.savedViews.findMany({
            where: and(...conds, after),
            orderBy: [asc(savedViews.position), asc(savedViews.name)],
            limit: limit + 1,
        });
        const items = rows.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last ? encodeCursorValues([last.position, last.name]) : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
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
