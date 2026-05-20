import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

type WebhookEvent = "task.created" | "task.updated" | "proposal.created" | "proposal.updated";

export async function triggerWebhooks(
    db: PrismaClient,
    workspaceId: string,
    event: WebhookEvent,
    data: Record<string, unknown>,
) {
    const subs = await db.webhookSubscription.findMany({
        where: { workspaceId, isActive: true },
    });
    if (!subs.length) return;

    const payload = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
    });
    const results = subs.map(async (sub) => {
        const sig = createHmac("sha256", sub.secret).update(payload).digest("hex");
        try {
            await fetch(sub.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": sig,
                },
                body: payload,
            });
            await db.webhookSubscription.update({
                where: { id: sub.id },
                data: { lastTriggered: new Date() },
            });
        } catch {
            /* webhook delivery failure is non-fatal */
        }
    });
    await Promise.allSettled(results);
}
