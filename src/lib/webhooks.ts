import { createHmac } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { webhooks } from "@/db/schema";

export function signWebhookPayload(body: string, secret: string): string {
    return createHmac("sha256", secret).update(body).digest("hex");
}

function postWebhook(url: string, body: string, secret: string | null): void {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-Portal-Signature"] = signWebhookPayload(body, secret);
    void fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
}

// ponytail: fire-and-forget fan-out; persistent queue + retries land with the jobs phase.
export async function deliver(
    db: PortalDb,
    workspaceId: string,
    event: string,
    payload: Record<string, unknown>,
): Promise<void> {
    const hooks = await db.query.webhooks.findMany({
        where: and(
            eq(webhooks.workspaceId, workspaceId),
            eq(webhooks.active, true),
            sql`${webhooks.events} @> ${JSON.stringify([event])}::jsonb`,
        ),
    });
    const body = JSON.stringify({ event, deliveredAt: new Date().toISOString(), ...payload });
    for (const hook of hooks) postWebhook(hook.url, body, hook.secret);
}
