import { and, eq } from "drizzle-orm";
import type { Job, JobResult, PgBoss } from "pg-boss";
import { getDb } from "@/db/client";
import { webhooks } from "@/db/schema";
import { postWebhook } from "@/lib/webhooks";
import { getBoss } from "./boss";

export const WEBHOOK_QUEUE = "webhook-deliver";

export interface WebhookJobData {
    webhookId: string;
    event: string;
    payload: Record<string, unknown>;
    portal: string;
    url: string;
    secret: string | null;
}

async function deliver(job: Job<WebhookJobData>): Promise<JobResult> {
    const { webhookId, event, payload, portal, url, secret } = job.data;
    if (!webhookId || !portal || !url) {
        return { id: job.id, status: "failed", output: "missing webhook delivery fields" };
    }
    const body = JSON.stringify({ event, payload, portal });
    try {
        const result = await postWebhook(url, body, secret);
        if (!result.ok) throw new Error(`webhook ${webhookId} responded with ${result.status}`);
        return { id: job.id, status: "completed" };
    } catch (err) {
        return {
            id: job.id,
            status: "failed",
            output: err instanceof Error ? err.message : String(err),
        };
    }
}

async function handle(jobs: Job<WebhookJobData>[]): Promise<JobResult[]> {
    const results: JobResult[] = [];
    for (let i = 0; i < jobs.length; i += 8) {
        const chunk = jobs.slice(i, i + 8);
        const settled = await Promise.allSettled(chunk.map(deliver));
        settled.forEach((result, k) => {
            const job = chunk[k]!;
            results.push(
                result.status === "fulfilled"
                    ? result.value
                    : { id: job.id, status: "failed", output: String(result.reason) },
            );
        });
    }
    return results;
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
                {
                    webhookId: h.id,
                    event,
                    payload,
                    portal,
                    url: h.url,
                    secret: h.secret,
                } satisfies WebhookJobData,
                { retryLimit: 3, retryDelay: 5, retryBackoff: true },
            ),
        ),
    );
}

export async function registerWebhookJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(WEBHOOK_QUEUE);
    await boss.work<WebhookJobData>(WEBHOOK_QUEUE, { perJobResults: true }, handle);
}
