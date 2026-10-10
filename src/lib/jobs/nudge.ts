import { and, count, eq, gte, isNotNull, isNull, lt, lte, ne } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { getDb } from "@/db/client";
import { events, memberships, notifications, tasks, volunteerSlots, workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";

export const NUDGE_QUEUE = "nudge";
export const NUDGE_CRON = "0 * * * *";

export interface NudgeData {
    portal?: string;
}

async function nudgePortal(slug: string): Promise<void> {
    const db = getDb(slug);
    const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
        columns: { id: true },
    });
    if (!ws) return;
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 3600 * 1000);
    const staleCutoff = new Date(now.getTime() - 48 * 3600 * 1000);
    const [pending, upcomingRows, members, staleTasks, slots] = await Promise.all([
        db
            .select({ assigneeId: tasks.assigneeId, n: count() })
            .from(tasks)
            .where(
                and(
                    eq(tasks.workspaceId, ws.id),
                    ne(tasks.status, "done"),
                    isNotNull(tasks.assigneeId),
                    isNull(tasks.deletedAt),
                ),
            )
            .groupBy(tasks.assigneeId),
        db
            .select({ n: count() })
            .from(events)
            .where(
                and(
                    eq(events.workspaceId, ws.id),
                    gte(events.startDate, now),
                    lte(events.startDate, horizon),
                    isNull(events.deletedAt),
                ),
            ),
        db.query.memberships.findMany({
            where: eq(memberships.workspaceId, ws.id),
            columns: { userId: true },
            with: { role: { columns: { name: true } } },
        }),
        db.query.tasks.findMany({
            where: and(
                eq(tasks.workspaceId, ws.id),
                lt(tasks.dueDate, staleCutoff),
                ne(tasks.status, "done"),
                isNotNull(tasks.assigneeId),
                isNull(tasks.deletedAt),
            ),
            columns: { id: true, title: true, assigneeId: true },
            limit: 50,
        }),
        db.query.volunteerSlots.findMany({
            where: and(
                eq(volunteerSlots.workspaceId, ws.id),
                gte(volunteerSlots.startTime, now),
                lte(volunteerSlots.startTime, horizon),
                isNull(volunteerSlots.deletedAt),
            ),
            columns: { id: true, title: true },
            with: { signups: { columns: { userId: true } } },
        }),
    ]);
    const rows: {
        workspaceId: string;
        userId: string;
        title: string;
        body: string;
        type: string;
        link: string;
    }[] = [];
    for (const p of pending) {
        if (!p.assigneeId || p.n < 1) continue;
        rows.push({
            workspaceId: ws.id,
            userId: p.assigneeId,
            title: `You have ${p.n} open task${p.n === 1 ? "" : "s"}`,
            body: "Please review your assigned tasks before they fall behind schedule.",
            type: "nudge",
            link: "/tasks",
        });
    }
    const upcomingCount = upcomingRows[0]?.n ?? 0;
    if (upcomingCount > 0) {
        for (const m of members) {
            rows.push({
                workspaceId: ws.id,
                userId: m.userId,
                title: `${upcomingCount} event${upcomingCount === 1 ? "" : "s"} in the next 24 hours`,
                body: "Please check the calendar and confirm your attendance where needed.",
                type: "nudge",
                link: "/events",
            });
        }
    }
    const officers = members
        .filter((m) => m.role && (m.role.name === "officer" || m.role.name === "admin"))
        .map((m) => m.userId)
        .slice(0, 100);
    for (const t of staleTasks) {
        if (!t.assigneeId) continue;
        rows.push({
            workspaceId: ws.id,
            userId: t.assigneeId,
            title: `Overdue: ${t.title}`,
            body: "This task is more than 48 hours past its due date. Please update its status.",
            type: "overdue",
            link: "/tasks",
        });
        for (const officerId of officers) {
            if (officerId === t.assigneeId) continue;
            rows.push({
                workspaceId: ws.id,
                userId: officerId,
                title: `Overdue task needs attention: ${t.title}`,
                body: "A task assigned in your workspace is more than 48 hours overdue.",
                type: "overdue",
                link: "/tasks",
            });
        }
    }
    let reminders = 0;
    for (const slot of slots) {
        for (const s of slot.signups) {
            if (reminders >= 200) break;
            reminders += 1;
            rows.push({
                workspaceId: ws.id,
                userId: s.userId,
                title: `Reminder: ${slot.title} starts soon`,
                body: "You signed up for a volunteer slot starting within 24 hours.",
                type: "reminder",
                link: "/volunteers",
            });
        }
        if (reminders >= 200) break;
    }
    if (rows.length === 0) return;
    await db.insert(notifications).values(rows);
}

async function handle(jobs: Job<NudgeData>[]): Promise<void> {
    for (const job of jobs) {
        const only = job.data?.portal;
        const slugs = only ? [only] : listPortals().map((p) => p.slug);
        for (const slug of slugs) {
            try {
                await nudgePortal(slug);
            } catch (err) {
                logger.error({ err, portal: slug }, "nudge failed");
            }
        }
    }
}

export async function registerNudgeJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(NUDGE_QUEUE);
    await boss.schedule(NUDGE_QUEUE, NUDGE_CRON);
    await boss.work<NudgeData>(NUDGE_QUEUE, handle);
}
