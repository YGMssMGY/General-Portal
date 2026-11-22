declare module "nodemailer";

import { and, count, eq, inArray } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import nodemailer from "nodemailer";
import { config } from "@/config";
import { getDb } from "@/db/client";
import { notificationPrefs, notifications, users, workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";

export const DIGEST_QUEUE = "digest";
export const DIGEST_CRON = "0 7 * * *";

export interface DigestData {
    portal?: string;
}

function escapeHtml(v: string): string {
    return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function digestPortal(slug: string): Promise<void> {
    const db = getDb(slug);
    const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
        columns: { id: true },
    });
    if (!ws) return;
    const scopes = new Date().getDay() === 1 ? ["daily", "weekly"] : ["daily"];
    const prefs = await db.query.notificationPrefs.findMany({
        where: inArray(notificationPrefs.digest, scopes),
        columns: { userId: true },
    });
    const userIds = [...new Set(prefs.map((p) => p.userId))];
    if (userIds.length === 0) return;
    const unread = await db
        .select({ userId: notifications.userId, n: count() })
        .from(notifications)
        .where(
            and(
                eq(notifications.workspaceId, ws.id),
                eq(notifications.read, false),
                inArray(notifications.userId, userIds),
            ),
        )
        .groupBy(notifications.userId);
    const pending = unread.filter((u) => u.n > 0);
    if (pending.length === 0) return;
    const people = await db.query.users.findMany({
        where: inArray(
            users.id,
            pending.map((u) => u.userId),
        ),
        columns: { id: true, name: true, email: true },
    });
    const byId = new Map(people.map((p) => [p.id, p]));
    const lines = pending
        .map((u) => {
            const person = byId.get(u.userId);
            return { to: person?.email ?? "", name: person?.name ?? "member", n: u.n };
        })
        .filter((l) => l.to.length > 0);
    const total = pending.reduce((a, u) => a + u.n, 0);
    if (!config.smtp.host) {
        logger.info(
            { portal: slug, recipients: lines.length, total },
            "digest skipped: SMTP_HOST is not set",
        );
        return;
    }
    const transport = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
    const from = config.smtp.from || config.smtp.user;
    const send = async (l: (typeof lines)[number]) => {
        const plural = l.n === 1 ? "" : "s";
        const subject = `Your notification digest: ${l.n} unread notification${plural}`;
        const text = `Dear ${l.name},\n\nYou have ${l.n} unread notification${plural} in the ${slug} workspace. Please sign in to review them.\n\n${config.baseUrl}\n\nRegards,\nGeneral Portal`;
        const html = `<p>Dear ${escapeHtml(l.name)},</p><p>You have <strong>${l.n}</strong> unread notification${plural} in the ${escapeHtml(slug)} workspace. Please sign in to review them.</p><p><a href="${escapeHtml(config.baseUrl)}">${escapeHtml(config.baseUrl)}</a></p><p>Regards,<br/>General Portal</p>`;
        await transport.sendMail({ from, to: l.to, subject, text, html });
    };
    for (let i = 0; i < lines.length; i += 10) {
        const results = await Promise.allSettled(lines.slice(i, i + 10).map(send));
        for (const result of results) {
            if (result.status === "rejected") {
                logger.error({ err: result.reason, portal: slug }, "digest send failed");
            }
        }
    }
    logger.info({ portal: slug, recipients: lines.length, total }, "digest sent");
}

async function handle(jobs: Job<DigestData>[]): Promise<void> {
    for (const job of jobs) {
        const only = job.data?.portal;
        const slugs = only ? [only] : listPortals().map((p) => p.slug);
        for (let i = 0; i < slugs.length; i += 4) {
            await Promise.all(
                slugs.slice(i, i + 4).map(async (slug) => {
                    try {
                        await digestPortal(slug);
                    } catch (err) {
                        logger.error({ err, portal: slug }, "digest failed");
                    }
                }),
            );
        }
    }
}

export async function registerDigestJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(DIGEST_QUEUE);
    await boss.schedule(DIGEST_QUEUE, DIGEST_CRON);
    await boss.work<DigestData>(DIGEST_QUEUE, handle);
}
