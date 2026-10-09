import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        await t.db
            .update(notifications)
            .set({ read: true })
            .where(
                and(
                    eq(notifications.workspaceId, t.workspaceId),
                    eq(notifications.userId, t.userId),
                    eq(notifications.read, false),
                ),
            );
        return ok({ updated: true });
    } catch (e) {
        return handleRouteError("POST /api/notifications/read-all", e);
    }
}
