import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { config } from "@/config";
import { getDb, type PortalDb } from "@/db/client";
import { activityFeed, attendance, reports, transactions } from "@/db/schema";
import { logger } from "@/lib/logger";
import { writePdf } from "@/lib/report-writers/pdf";
import { writeXlsx } from "@/lib/report-writers/xlsx";
import { getBoss } from "./boss";

export const REPORT_QUEUE = "report-generate";

export interface ReportJobData {
    reportId: string;
    portal: string;
}

function cell(v: unknown): string {
    const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, `""`)}"` : s;
}

async function writeCsv(file: string, header: string[], rows: unknown[][]): Promise<void> {
    const stream = createWriteStream(file, { encoding: "utf8" });
    await new Promise<void>((resolve, reject) => {
        stream.on("error", reject);
        stream.on("finish", resolve);
        stream.write(`${header.join(",")}\n`);
        let i = 0;
        const pump = () => {
            while (i < rows.length) {
                const end = Math.min(i + 500, rows.length);
                let text = "";
                for (; i < end; i++) {
                    text += `${rows[i]!.map(cell).join(",")}\n`;
                }
                if (!stream.write(text)) {
                    stream.once("drain", pump);
                    return;
                }
            }
            stream.end();
        };
        pump();
    });
}

interface ReportData {
    header: string[];
    rows: unknown[][];
}

async function activityData(
    db: PortalDb,
    workspaceId: string,
    from: Date | null,
    to: Date | null,
): Promise<ReportData> {
    const conds = [eq(activityFeed.workspaceId, workspaceId)];
    if (from) conds.push(gte(activityFeed.createdAt, from));
    if (to) conds.push(lte(activityFeed.createdAt, to));
    const rows = await db.query.activityFeed.findMany({
        where: and(...conds),
        orderBy: [desc(activityFeed.createdAt)],
        limit: 10000,
        columns: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            userId: true,
            createdAt: true,
        },
    });
    return {
        header: ["id", "action", "entityType", "entityId", "userId", "createdAt"],
        rows: rows.map((r) => [r.id, r.action, r.entityType, r.entityId, r.userId, r.createdAt]),
    };
}

async function financeData(
    db: PortalDb,
    workspaceId: string,
    from: Date | null,
    to: Date | null,
): Promise<ReportData> {
    const conds = [eq(transactions.workspaceId, workspaceId), isNull(transactions.deletedAt)];
    if (from) conds.push(gte(transactions.date, from));
    if (to) conds.push(lte(transactions.date, to));
    const rows = await db.query.transactions.findMany({
        where: and(...conds),
        orderBy: [desc(transactions.date)],
        limit: 10000,
        columns: {
            id: true,
            type: true,
            category: true,
            description: true,
            amountCents: true,
            date: true,
            createdAt: true,
        },
    });
    return {
        header: ["id", "type", "category", "description", "amountCents", "date", "createdAt"],
        rows: rows.map((r) => [
            r.id,
            r.type,
            r.category,
            r.description,
            r.amountCents,
            r.date,
            r.createdAt,
        ]),
    };
}

async function attendanceData(
    db: PortalDb,
    workspaceId: string,
    from: Date | null,
    to: Date | null,
): Promise<ReportData> {
    const conds = [eq(attendance.workspaceId, workspaceId)];
    if (from) conds.push(gte(attendance.createdAt, from));
    if (to) conds.push(lte(attendance.createdAt, to));
    const rows = await db.query.attendance.findMany({
        where: and(...conds),
        orderBy: [desc(attendance.createdAt)],
        limit: 10000,
        columns: {
            id: true,
            meetingId: true,
            eventId: true,
            userId: true,
            status: true,
            checkedInAt: true,
            createdAt: true,
        },
    });
    return {
        header: ["id", "meetingId", "eventId", "userId", "status", "checkedInAt", "createdAt"],
        rows: rows.map((r) => [
            r.id,
            r.meetingId,
            r.eventId,
            r.userId,
            r.status,
            r.checkedInAt,
            r.createdAt,
        ]),
    };
}

async function fail(db: PortalDb, reportId: string, reason: string): Promise<void> {
    await db.update(reports).set({ status: "failed" }).where(eq(reports.id, reportId));
    logger.error({ reportId, reason }, "report generation failed");
}

async function handle(jobs: Job<ReportJobData>[]): Promise<void> {
    for (const job of jobs) {
        const { reportId, portal } = job.data;
        if (!reportId || !portal) continue;
        const db = getDb(portal);
        const row = await db.query.reports.findFirst({
            where: and(eq(reports.id, reportId), eq(reports.status, "pending")),
        });
        if (!row) continue;
        try {
            const from = row.periodStart;
            const to = row.periodEnd;
            const data =
                row.type === "activity"
                    ? await activityData(db, row.workspaceId, from, to)
                    : row.type === "finance"
                      ? await financeData(db, row.workspaceId, from, to)
                      : row.type === "attendance"
                        ? await attendanceData(db, row.workspaceId, from, to)
                        : null;
            if (data === null) {
                await fail(db, reportId, `unknown report type: ${row.type}`);
                continue;
            }
            if (row.format === "csv") {
                const storagePath = path.join("reports", portal, `${reportId}.csv`);
                await fs.mkdir(path.join(config.uploadsDir, "reports", portal), {
                    recursive: true,
                });
                await writeCsv(path.join(config.uploadsDir, storagePath), data.header, data.rows);
                await db
                    .update(reports)
                    .set({ status: "complete", storagePath })
                    .where(eq(reports.id, reportId));
            } else if (row.format === "xlsx") {
                const storagePath = path.join("reports", portal, `${reportId}.xlsx`);
                await fs.mkdir(path.join(config.uploadsDir, "reports", portal), {
                    recursive: true,
                });
                await fs.writeFile(
                    path.join(config.uploadsDir, storagePath),
                    writeXlsx(data.header, data.rows, row.type),
                );
                await db
                    .update(reports)
                    .set({ status: "complete", storagePath })
                    .where(eq(reports.id, reportId));
            } else if (row.format === "pdf") {
                const storagePath = path.join("reports", portal, `${reportId}.pdf`);
                await fs.mkdir(path.join(config.uploadsDir, "reports", portal), {
                    recursive: true,
                });
                await fs.writeFile(
                    path.join(config.uploadsDir, storagePath),
                    writePdf(`${row.type} report`, data.header, data.rows),
                );
                await db
                    .update(reports)
                    .set({ status: "complete", storagePath })
                    .where(eq(reports.id, reportId));
            } else {
                await fail(db, reportId, `unknown report format: ${row.format}`);
                continue;
            }
        } catch (err) {
            await db.update(reports).set({ status: "failed" }).where(eq(reports.id, reportId));
            logger.error({ err, reportId, portal }, "report generation failed");
        }
    }
}

export async function publishReport(
    db: PortalDb,
    reportId: string,
    portal: string,
): Promise<string | null> {
    const row = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        columns: { id: true },
    });
    if (!row) throw new Error(`report not found: ${reportId}`);
    return (await getBoss()).send(REPORT_QUEUE, { reportId, portal } satisfies ReportJobData, {
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
    });
}

export async function registerReportJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(REPORT_QUEUE);
    await boss.work<ReportJobData>(REPORT_QUEUE, handle);
}
