import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { activityFeed, attendance, participationScores, reports, transactions } from "@/db/schema";
import { config } from "@/config";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    fail,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { isFeatureEnabled } from "@/lib/deployment";
import { publishReport } from "@/lib/jobs/reports";
import { logger } from "@/lib/logger";
import { requireTenant } from "@/lib/tenant";

const createReportSchema = z.object({
    type: z.enum(["activity", "finance", "attendance", "participation", "full"]),
    format: z.enum(["csv", "xlsx", "pdf"]),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
});
type CreateReportInput = z.infer<typeof createReportSchema>;

function csvCell(v: unknown): string {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
    return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

function parseRange(body: CreateReportInput): { from: Date | null; to: Date | null } {
    let from: Date | null = null;
    let to: Date | null = null;
    if (body.periodStart) {
        from = new Date(body.periodStart);
        if (Number.isNaN(from.getTime())) throw new ApiError("Invalid periodStart", 400);
    }
    if (body.periodEnd) {
        to = new Date(body.periodEnd);
        if (Number.isNaN(to.getTime())) throw new ApiError("Invalid periodEnd", 400);
    }
    return { from, to };
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "view_reports", module: "members" });
        if (!isFeatureEnabled(t.portal, "reports")) return fail("Forbidden", 403);
        const params = new URL(request.url).searchParams;
        const downloadId = params.get("download");
        if (downloadId) {
            if (!t.permissions.includes("export_data")) return fail("Forbidden", 403);
            const row = await t.db.query.reports.findFirst({
                where: and(eq(reports.id, downloadId), eq(reports.workspaceId, t.workspaceId)),
            });
            if (!row) throw new ApiError("Report not found", 404);
            const contentTypes: Record<string, string> = {
                csv: "text/csv; charset=utf-8",
                xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                pdf: "application/pdf",
            };
            const contentType = contentTypes[row.format];
            if (!contentType || row.status !== "complete" || !row.storagePath) {
                throw new ApiError("Report file is not ready", 409);
            }
            const abs = path.resolve(process.cwd(), row.storagePath);
            const buf = await fs.readFile(abs);
            const bytes = new Uint8Array(buf);
            return new NextResponse(bytes, {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": `attachment; filename="report-${row.id}.${row.format}"`,
                },
            });
        }

        const { limit, cursor } = parsePagination(params);
        const conds = [eq(reports.workspaceId, t.workspaceId)];
        const cv = decodeCursorValues(cursor);
        if (cv && typeof cv[0] === "string" && typeof cv[1] === "string") {
            const cursorDate = new Date(cv[0]);
            if (!Number.isNaN(cursorDate.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: reports.createdAt, value: cursorDate }],
                        reports.id,
                        cv[1],
                    ),
                );
            }
        }
        const rows = await t.db.query.reports.findMany({
            where: and(...conds),
            orderBy: [desc(reports.createdAt), desc(reports.id)],
            limit: limit + 1,
        });
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            rows.pop();
            const last = rows[rows.length - 1];
            if (last) nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/reports", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_reports", module: "members" });
        if (!isFeatureEnabled(t.portal, "reports")) return fail("Forbidden", 403);
        const body = await parseBody<CreateReportInput>(createReportSchema as never, request);
        const { from, to } = parseRange(body);

        if (body.format === "xlsx" || body.format === "pdf") {
            const [row] = await t.db
                .insert(reports)
                .values({
                    workspaceId: t.workspaceId,
                    createdById: t.userId,
                    type: body.type,
                    format: body.format,
                    periodStart: from,
                    periodEnd: to,
                    status: "pending",
                })
                .returning();
            if (!row) throw new ApiError("Failed to create report", 500);
            try {
                await publishReport(t.db, row.id, t.portal);
            } catch {
                logger.warn({ reportId: row.id }, "Report queued without a worker");
            }
            return ok(
                { id: row.id, status: "pending", note: "Report queued for generation." },
                202,
            );
        }

        const sections: string[] = [];
        const want = (name: string) => body.type === "full" || body.type === name;

        if (want("activity")) {
            const conds = [
                eq(activityFeed.workspaceId, t.workspaceId),
                ...(from ? [gte(activityFeed.createdAt, from)] : []),
                ...(to ? [lte(activityFeed.createdAt, to)] : []),
            ];
            const rows = await t.db.query.activityFeed.findMany({
                where: and(...conds),
                orderBy: [desc(activityFeed.createdAt)],
                limit: 2000,
            });
            sections.push(
                toCsv(
                    ["id", "action", "entityType", "entityId", "userId", "createdAt"],
                    rows.map((r) => [
                        r.id,
                        r.action,
                        r.entityType,
                        r.entityId,
                        r.userId,
                        r.createdAt.toISOString(),
                    ]),
                ),
            );
        }
        if (want("finance")) {
            const conds = [
                eq(transactions.workspaceId, t.workspaceId),
                isNull(transactions.deletedAt),
                ...(from ? [gte(transactions.date, from)] : []),
                ...(to ? [lte(transactions.date, to)] : []),
            ];
            const rows = await t.db.query.transactions.findMany({
                where: and(...conds),
                orderBy: [desc(transactions.date)],
                limit: 2000,
            });
            sections.push(
                toCsv(
                    ["id", "type", "amountCents", "category", "description", "date"],
                    rows.map((r) => [
                        r.id,
                        r.type,
                        r.amountCents,
                        r.category,
                        r.description,
                        r.date.toISOString(),
                    ]),
                ),
            );
        }
        if (want("attendance")) {
            const conds = [
                eq(attendance.workspaceId, t.workspaceId),
                ...(from ? [gte(attendance.createdAt, from)] : []),
                ...(to ? [lte(attendance.createdAt, to)] : []),
            ];
            const rows = await t.db.query.attendance.findMany({
                where: and(...conds),
                orderBy: [desc(attendance.createdAt)],
                limit: 2000,
            });
            sections.push(
                toCsv(
                    ["id", "userId", "meetingId", "eventId", "status", "checkedInAt", "createdAt"],
                    rows.map((r) => [
                        r.id,
                        r.userId,
                        r.meetingId,
                        r.eventId,
                        r.status,
                        r.checkedInAt?.toISOString() ?? "",
                        r.createdAt.toISOString(),
                    ]),
                ),
            );
        }
        if (want("participation")) {
            const rows = await t.db.query.participationScores.findMany({
                where: eq(participationScores.workspaceId, t.workspaceId),
                orderBy: [desc(participationScores.score)],
                limit: 2000,
            });
            sections.push(
                toCsv(
                    ["userId", "period", "periodType", "score", "computedAt"],
                    rows.map((r) => [
                        r.userId,
                        r.period,
                        r.periodType,
                        r.score,
                        r.computedAt.toISOString(),
                    ]),
                ),
            );
        }

        const [row] = await t.db
            .insert(reports)
            .values({
                workspaceId: t.workspaceId,
                createdById: t.userId,
                type: body.type,
                format: "csv",
                periodStart: from,
                periodEnd: to,
                status: "complete",
            })
            .returning();
        if (!row) throw new ApiError("Failed to create report", 500);
        const dir = path.resolve(process.cwd(), config.uploadsDir, t.portal, "reports");
        await fs.mkdir(dir, { recursive: true });
        const rel = path.join(config.uploadsDir, t.portal, "reports", `${row.id}.csv`);
        await fs.writeFile(path.resolve(process.cwd(), rel), sections.join("\n"), "utf8");
        const [done] = await t.db
            .update(reports)
            .set({ storagePath: rel })
            .where(eq(reports.id, row.id))
            .returning();

        return ok(done, 201);
    } catch (e) {
        return handleRouteError("POST /api/reports", e);
    }
}
