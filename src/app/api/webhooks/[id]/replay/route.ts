import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { webhooks } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { publishWebhook } from "@/lib/jobs/webhooks";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const replaySchema = z.object({
    event: z.string().trim().min(1).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
});
type ReplayInput = z.infer<typeof replaySchema>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_webhooks" });
        const id = requireUuid((await params).id);
        const hook = await t.db.query.webhooks.findFirst({
            where: and(eq(webhooks.id, id), eq(webhooks.workspaceId, t.workspaceId)),
        });
        if (!hook) throw new ApiError("Webhook not found", 404);
        const body = await parseBody<ReplayInput>(replaySchema as never, request);
        const event = body.event ?? hook.events[0];
        if (!event) throw new ApiError("Webhook has no events to replay", 400);
        const payload = body.payload ?? {};
        await publishWebhook(t.portal, t.workspaceId, event, payload);
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "replay",
            entityType: "webhook",
            entityId: id,
            metadata: { event },
            ipAddress: clientIp(request),
        });
        return ok({ queued: true, event });
    } catch (e) {
        return handleRouteError("POST /api/webhooks/[id]/replay", e);
    }
}
