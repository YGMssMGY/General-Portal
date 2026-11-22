import type { NextRequest } from "next/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { auditLogs, webhooks } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_webhooks" });
        const id = requireUuid((await params).id);
        const hook = await t.db.query.webhooks.findFirst({
            where: and(eq(webhooks.id, id), eq(webhooks.workspaceId, t.workspaceId)),
        });
        if (!hook) throw new ApiError("Webhook not found", 404);

        const rows = await t.db.query.auditLogs.findMany({
            where: and(
                eq(auditLogs.workspaceId, t.workspaceId),
                or(eq(auditLogs.entityType, "webhook"), like(auditLogs.action, "webhook.%")),
            ),
            orderBy: [desc(auditLogs.createdAt), desc(auditLogs.id)],
            limit: 100,
        });

        const deliveries = rows
            .filter((row) => row.metadata?.webhookId === id)
            .map((row) => {
                const meta = row.metadata;
                const status = typeof meta?.status === "string" ? meta.status : "unknown";
                const event = typeof meta?.event === "string" ? meta.event : "";
                return { at: row.createdAt.toISOString(), status, event };
            });

        return ok({ deliveries });
    } catch (e) {
        return handleRouteError("GET /api/webhooks/[id]/deliveries", e);
    }
}
