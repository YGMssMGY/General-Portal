import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { activityFeed } from "@/db/schema";
import {
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const entityType = searchParams.get("entityType")?.trim() || null;

        const conds = [eq(activityFeed.workspaceId, t.workspaceId)];
        if (entityType) conds.push(eq(activityFeed.entityType, entityType));
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: activityFeed.createdAt, value: at }],
                        activityFeed.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.activityFeed.findMany({
            where: and(...conds),
            orderBy: [desc(activityFeed.createdAt), desc(activityFeed.id)],
            limit: limit + 1,
            with: { user: { columns: { id: true, name: true, email: true, image: true } } },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/activity", e);
    }
}
