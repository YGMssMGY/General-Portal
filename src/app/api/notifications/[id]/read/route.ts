import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id } = await params;
        const nid = requireUuid(id);

        const existing = await t.db.query.notifications.findFirst({
            where: and(
                eq(notifications.id, nid),
                eq(notifications.workspaceId, t.workspaceId),
                eq(notifications.userId, t.userId),
            ),
            columns: { id: true },
        });
        if (!existing) throw new ApiError("Notification not found", 404);

        await t.db.update(notifications).set({ read: true }).where(eq(notifications.id, nid));
        return ok({ read: true });
    } catch (e) {
        return handleRouteError("POST /api/notifications/[id]/read", e);
    }
}
