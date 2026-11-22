import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { webhooks } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { postWebhook } from "@/lib/webhooks";
import { requireTenant } from "@/lib/tenant";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_webhooks",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const hook = await t.db.query.webhooks.findFirst({
            where: and(eq(webhooks.id, id), eq(webhooks.workspaceId, t.workspaceId)),
        });
        if (!hook) throw new ApiError("Webhook not found", 404);
        const body = JSON.stringify({
            event: "ping",
            webhookId: hook.id,
            workspaceId: t.workspaceId,
            sentAt: new Date().toISOString(),
        });
        const result = await postWebhook(hook.url, body, hook.secret);
        return ok({ ok: result.ok, status: result.status });
    } catch (e) {
        return handleRouteError("POST /api/webhooks/[id]/test", e);
    }
}
