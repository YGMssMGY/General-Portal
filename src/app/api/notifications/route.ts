import type { NextRequest } from "next/server";
import { and, count, desc, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
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
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const scope = [
            eq(notifications.workspaceId, t.workspaceId),
            eq(notifications.userId, t.userId),
        ];
        const conds = [...scope];
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
                        [{ column: notifications.createdAt, value: at }],
                        notifications.id,
                        vals[1],
                    ),
                );
            }
        }

        const [rows, groups] = await Promise.all([
            t.db.query.notifications.findMany({
                where: and(...conds),
                orderBy: [desc(notifications.createdAt), desc(notifications.id)],
                limit: limit + 1,
            }),
            t.db
                .select({ read: notifications.read, n: count() })
                .from(notifications)
                .where(and(...scope))
                .groupBy(notifications.read),
        ]);

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const unread = groups.find((g) => g.read === false)?.n ?? 0;
        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        res.headers.set("X-Unread-Count", String(unread));
        return res;
    } catch (e) {
        return handleRouteError("GET /api/notifications", e);
    }
}
