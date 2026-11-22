import { z } from "zod";
import { connectionString, getBoss } from "@/lib/jobs/boss";
import { withClient } from "@/tui/lib/tui-db";
import type { ActionDefinition } from "../types";

const PUBLISH_QUEUES = [
    "nudge",
    "digest",
    "report-generate",
    "webhook-deliver",
    "retention",
    "link-health",
    "scheduled-backup",
] as const;

function bossUrl(): string | null {
    try {
        return connectionString();
    } catch {
        return null;
    }
}

export const jobActions: ActionDefinition[] = [
    {
        id: "job.list",
        group: "job",
        summary: "Show pg-boss queue depths grouped by state",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const url = bossUrl();
            if (!url) return { available: false, reason: "no database configured" };
            try {
                return await withClient(url, async (c) => {
                    const r = await c.query<{ name: string; state: string; count: string }>(
                        "SELECT name, state, COUNT(*)::text AS count FROM pgboss.job GROUP BY name, state ORDER BY name, state",
                    );
                    return { available: true, queues: r.rows };
                });
            } catch {
                return { available: false, reason: "pg-boss schema unavailable" };
            }
        },
    },
    {
        id: "job.status",
        group: "job",
        summary: "Inspect one pg-boss job by id",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ id: z.string().uuid() }),
        run: async ({ id }) => {
            const url = bossUrl();
            if (!url) throw new Error("No database configured");
            return withClient(url, async (c) => {
                const r = await c.query(
                    "SELECT id, name, state, createdon, startafter, output FROM pgboss.job WHERE id = $1 LIMIT 1",
                    [id],
                );
                return r.rows[0] ?? null;
            });
        },
    },
    {
        id: "job.publish",
        group: "job",
        summary: "Publish a job to a known application pg-boss queue",
        scopes: ["ops:deploy"],
        destructive: true,
        params: z.object({
            queue: z.enum(PUBLISH_QUEUES),
            data: z.record(z.string(), z.unknown()).default({}),
        }),
        run: async ({ queue, data }) => {
            const boss = await getBoss();
            const id = await boss.send(queue, { ...data, portal: String(data.portal ?? "") });
            return { queue, id };
        },
    },
    {
        id: "job.retry",
        group: "job",
        summary: "Retry a failed pg-boss job",
        scopes: ["ops:deploy"],
        destructive: false,
        params: z.object({ queue: z.string().min(1).max(64), id: z.string().uuid() }),
        run: async ({ queue, id }) => {
            const boss = await getBoss();
            await boss.retry(queue, id);
            return { queue, id, retried: true };
        },
    },
    {
        id: "job.resume",
        group: "job",
        summary: "Resume a paused pg-boss job",
        scopes: ["ops:deploy"],
        destructive: false,
        params: z.object({ queue: z.string().min(1).max(64), id: z.string().uuid() }),
        run: async ({ queue, id }) => {
            const boss = await getBoss();
            await boss.resume(queue, id);
            return { queue, id, resumed: true };
        },
    },
];
