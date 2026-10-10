import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { getDb } from "@/db/client";
import { webhooks } from "@/db/schema";
import { getBoss } from "./boss";

export const WEBHOOK_QUEUE = "webhook-deliver";

export interface WebhookJobData {
    webhookId: string;
    event: string;
    payload: Record<string, unknown>;
    portal: string;
}

async function handle(jobs: Job<WebhookJobData>[]): Promise<void> {
    for (const job of jobs) {
        const { webhookId, event, payload, portal } = job.data;
        if (!webhookId || !portal) continue;
        const db = getDb(portal);
        const hook = await db.query.webhooks.findFirst({ where: eq(webhooks.id, webhookId) });
        if (!hook || !hook.active) continue;
        const body = JSON.stringify({ event, payload, portal });
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (hook.secret)
            headers["X-Portal-Signature"] = createHmac("sha256", hook.secret)
                .update(body)
                .digest("hex");
        const res = await fetch(hook.url, {
            method: "POST",
            headers,
            body,
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`webhook ${webhookId} responded with ${res.status}`);
    }
}

export async function publishWebhook(
    portal: string,
    workspaceId: string,
    event: string,
    payload: Record<string, unknown>,
): Promise<void> {
    const db = getDb(portal);
    const hooks = await db.query.webhooks.findMany({
        where: and(eq(webhooks.workspaceId, workspaceId), eq(webhooks.active, true)),
    });
    const targets = hooks.filter((h) => h.events.includes(event));
    if (targets.length === 0) return;
    const boss = await getBoss();
    await Promise.all(
        targets.map((h) =>
            boss.send(
                WEBHOOK_QUEUE,
                { webhookId: h.id, event, payload, portal } satisfies WebhookJobData,
                { retryLimit: 3, retryDelay: 5, retryBackoff: true },
            ),
        ),
    );
}

export async function registerWebhookJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(WEBHOOK_QUEUE);
    await boss.work<WebhookJobData>(WEBHOOK_QUEUE, handle);
}
