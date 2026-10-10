import { NextRequest } from "next/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { tasks } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { expandRecurrence } from "@/lib/recurrence";

function parseWindow(searchParams: URLSearchParams): { start: Date; end: Date } {
    const now = Date.now();
    const defStart = new Date(now - 30 * 86_400_000);
    const defEnd = new Date(now + 30 * 86_400_000);
    const s = searchParams.get("start");
    const e = searchParams.get("end");
    const start = s ? new Date(s) : defStart;
    const end = e ? new Date(e) : defEnd;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new ApiError("Invalid start or end", 400);
    }
    if (start > end) throw new ApiError("Invalid date range", 400);
    return { start, end };
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { start, end } = parseWindow(new URL(request.url).searchParams);
        const rows = await t.db.query.tasks.findMany({
            where: and(
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
                isNotNull(tasks.recurrence),
            ),
            columns: { id: true, title: true, recurrence: true, dueDate: true, createdAt: true },
            limit: 200,
        });
        const out: Array<{ taskId: string; title: string; occurrence: string }> = [];
        for (const r of rows) {
            if (!r.recurrence) continue;
            try {
                const dates = expandRecurrence(
                    { recurrence: r.recurrence, dueDate: r.dueDate, createdAt: r.createdAt },
                    start,
                    end,
                );
                for (const d of dates) {
                    out.push({ taskId: r.id, title: r.title, occurrence: d.toISOString() });
                }
            } catch {
                continue;
            }
        }
        return ok(out);
    } catch (e) {
        return handleRouteError("GET /api/tasks/occurrences", e);
    }
}
