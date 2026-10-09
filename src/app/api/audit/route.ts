import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auditLogs } from "@/db/schema";
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
        const t = await requireTenant(request, { permission: "view_audit", module: "members" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const entityType = searchParams.get("entityType")?.trim() || null;
        const action = searchParams.get("action")?.trim() || null;

        const conds = [eq(auditLogs.workspaceId, t.workspaceId)];
        if (entityType) conds.push(eq(auditLogs.entityType, entityType));
        if (action) conds.push(eq(auditLogs.action, action));
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
                        [{ column: auditLogs.createdAt, value: at }],
                        auditLogs.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.auditLogs.findMany({
            where: and(...conds),
            orderBy: [desc(auditLogs.createdAt), desc(auditLogs.id)],
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
        return handleRouteError("GET /api/audit", e);
    }
}
