import type { NextRequest } from "next/server";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import {
    attendance,
    events,
    memberships,
    participationScores,
    tasks,
    transactions,
} from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const RANGES = new Set([30, 90, 365]);

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "view_reports",
            module: "members",
        });
        const rawRange = Number.parseInt(
            new URL(request.url).searchParams.get("range") ?? "30",
            10,
        );
        const range = RANGES.has(rawRange) ? rawRange : 30;
        const since = new Date(Date.now() - range * 86_400_000);

        const [
            taskWeeks,
            eventWeeks,
            participationRows,
            financeWeeks,
            memberWeeks,
            attendanceRows,
        ] = await Promise.all([
            t.db
                .select({
                    week: sql<string>`to_char(date_trunc('week', ${tasks.createdAt}), 'YYYY-MM-DD')`,
                    created: count(),
                    completed: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
                })
                .from(tasks)
                .where(
                    and(
                        eq(tasks.workspaceId, t.workspaceId),
                        isNull(tasks.deletedAt),
                        sql`${tasks.createdAt} >= ${since}`,
                    ),
                )
                .groupBy(sql`date_trunc('week', ${tasks.createdAt})`)
                .orderBy(sql`date_trunc('week', ${tasks.createdAt})`),
            t.db
                .select({
                    week: sql<string>`to_char(date_trunc('week', ${events.createdAt}), 'YYYY-MM-DD')`,
                    count: count(),
                })
                .from(events)
                .where(
                    and(
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                        sql`${events.createdAt} >= ${since}`,
                    ),
                )
                .groupBy(sql`date_trunc('week', ${events.createdAt})`)
                .orderBy(sql`date_trunc('week', ${events.createdAt})`),
            t.db
                .select({
                    score: sql<string>`coalesce(sum(${participationScores.score}), 0)::text`,
                    participants: sql<number>`count(distinct ${participationScores.userId})::int`,
                })
                .from(participationScores)
                .where(
                    and(
                        eq(participationScores.workspaceId, t.workspaceId),
                        sql`${participationScores.computedAt} >= ${since}`,
                    ),
                ),
            t.db
                .select({
                    week: sql<string>`to_char(date_trunc('week', ${transactions.date}), 'YYYY-MM-DD')`,
                    income: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = 'income'), 0)::text`,
                    expense: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = 'expense'), 0)::text`,
                })
                .from(transactions)
                .where(
                    and(
                        eq(transactions.workspaceId, t.workspaceId),
                        isNull(transactions.deletedAt),
                        sql`${transactions.date} >= ${since}`,
                    ),
                )
                .groupBy(sql`date_trunc('week', ${transactions.date})`)
                .orderBy(sql`date_trunc('week', ${transactions.date})`),
            t.db
                .select({
                    week: sql<string>`to_char(date_trunc('week', ${memberships.createdAt}), 'YYYY-MM-DD')`,
                    count: count(),
                })
                .from(memberships)
                .where(
                    and(
                        eq(memberships.workspaceId, t.workspaceId),
                        sql`${memberships.createdAt} >= ${since}`,
                    ),
                )
                .groupBy(sql`date_trunc('week', ${memberships.createdAt})`)
                .orderBy(sql`date_trunc('week', ${memberships.createdAt})`),
            t.db
                .select({
                    total: count(),
                    present: sql<number>`count(*) filter (where ${attendance.status} in ('present', 'late'))::int`,
                })
                .from(attendance)
                .where(
                    and(
                        eq(attendance.workspaceId, t.workspaceId),
                        sql`${attendance.createdAt} >= ${since}`,
                    ),
                ),
        ]);

        const tasksSeries = taskWeeks.map((r) => ({
            week: r.week,
            created: r.created,
            completed: r.completed,
        }));
        const eventsSeries = eventWeeks.map((r) => ({ week: r.week, count: r.count }));
        let runningMembers = 0;
        const membersSeries = memberWeeks.map((r) => {
            runningMembers += r.count;
            return { week: r.week, count: r.count, cumulative: runningMembers };
        });
        const financeSeries = financeWeeks.map((r) => {
            const income = Number(r.income);
            const expense = Number(r.expense);
            return { week: r.week, income, expense, net: income - expense };
        });

        const incomeCents = financeSeries.reduce((sum, r) => sum + r.income, 0);
        const expenseCents = financeSeries.reduce((sum, r) => sum + r.expense, 0);
        const attendanceTotal = attendanceRows[0]?.total ?? 0;
        const attendancePresent = attendanceRows[0]?.present ?? 0;

        return ok({
            range,
            series: {
                tasks: tasksSeries,
                events: eventsSeries,
                members: membersSeries,
                finance: financeSeries,
            },
            totals: {
                tasksCreated: tasksSeries.reduce((sum, r) => sum + r.created, 0),
                tasksCompleted: tasksSeries.reduce((sum, r) => sum + r.completed, 0),
                events: eventsSeries.reduce((sum, r) => sum + r.count, 0),
                members: runningMembers,
                participationScore: Number(participationRows[0]?.score ?? 0),
                participants: participationRows[0]?.participants ?? 0,
                incomeCents,
                expenseCents,
                netCents: incomeCents - expenseCents,
                attendanceTotal,
                attendancePresent,
                attendanceRate: attendanceTotal === 0 ? 0 : attendancePresent / attendanceTotal,
            },
        });
    } catch (e) {
        return handleRouteError("GET /api/analytics", e);
    }
}
