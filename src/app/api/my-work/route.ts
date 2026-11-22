import type { NextRequest } from "next/server";
import { and, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import {
    approvals,
    events,
    kudos,
    meetingRsvps,
    meetings,
    memberDues,
    polls,
    proposals,
    tasks,
} from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const totalOver = sql<number>`count(*) over()::int`;

function splitRows<T extends { total: number }>(
    rows: T[],
): { items: Array<Omit<T, "total">>; total: number } {
    return {
        items: rows.map((row) => {
            const copy = { ...row } as Partial<T>;
            delete copy.total;
            return copy as Omit<T, "total">;
        }),
        total: rows[0]?.total ?? 0,
    };
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const now = new Date();

        const [
            taskRows,
            eventRows,
            proposalRows,
            approvalRows,
            dueRows,
            pollRows,
            rsvpRows,
            kudosRows,
        ] = await Promise.all([
            t.db
                .select({
                    id: tasks.id,
                    title: tasks.title,
                    status: tasks.status,
                    dueDate: tasks.dueDate,
                    total: totalOver,
                })
                .from(tasks)
                .where(
                    and(
                        eq(tasks.workspaceId, t.workspaceId),
                        eq(tasks.assigneeId, t.userId),
                        ne(tasks.status, "done"),
                        isNull(tasks.deletedAt),
                    ),
                )
                .orderBy(desc(tasks.createdAt), desc(tasks.id))
                .limit(5),
            t.db
                .select({
                    id: events.id,
                    title: events.title,
                    startDate: events.startDate,
                    location: events.location,
                    total: totalOver,
                })
                .from(events)
                .where(
                    and(
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                        eq(events.status, "published"),
                        gte(events.startDate, now),
                    ),
                )
                .orderBy(desc(events.startDate), desc(events.id))
                .limit(5),
            t.db
                .select({
                    id: proposals.id,
                    title: proposals.title,
                    status: proposals.status,
                    createdAt: proposals.createdAt,
                    total: totalOver,
                })
                .from(proposals)
                .where(
                    and(
                        eq(proposals.workspaceId, t.workspaceId),
                        isNull(proposals.deletedAt),
                        eq(proposals.status, "pending"),
                    ),
                )
                .orderBy(desc(proposals.createdAt), desc(proposals.id))
                .limit(5),
            t.db
                .select({
                    id: approvals.id,
                    entityType: approvals.entityType,
                    entityId: approvals.entityId,
                    status: approvals.status,
                    dueAt: approvals.dueAt,
                    total: totalOver,
                })
                .from(approvals)
                .where(
                    and(
                        eq(approvals.workspaceId, t.workspaceId),
                        eq(approvals.approverId, t.userId),
                        eq(approvals.status, "pending"),
                    ),
                )
                .orderBy(desc(approvals.createdAt), desc(approvals.id))
                .limit(5),
            t.db
                .select({
                    id: memberDues.id,
                    title: memberDues.title,
                    amountCents: memberDues.amountCents,
                    dueDate: memberDues.dueDate,
                    status: memberDues.status,
                    total: totalOver,
                })
                .from(memberDues)
                .where(
                    and(
                        eq(memberDues.workspaceId, t.workspaceId),
                        eq(memberDues.userId, t.userId),
                        eq(memberDues.status, "unpaid"),
                    ),
                )
                .orderBy(desc(memberDues.createdAt), desc(memberDues.id))
                .limit(5),
            t.db
                .select({
                    id: polls.id,
                    title: polls.title,
                    status: polls.status,
                    closesAt: polls.closesAt,
                    total: totalOver,
                })
                .from(polls)
                .where(
                    and(
                        eq(polls.workspaceId, t.workspaceId),
                        isNull(polls.deletedAt),
                        eq(polls.status, "open"),
                    ),
                )
                .orderBy(desc(polls.createdAt), desc(polls.id))
                .limit(5),
            t.db
                .select({
                    id: meetingRsvps.id,
                    status: meetingRsvps.status,
                    meetingId: meetings.id,
                    meetingTitle: meetings.title,
                    startTime: meetings.startTime,
                    total: totalOver,
                })
                .from(meetingRsvps)
                .innerJoin(meetings, eq(meetingRsvps.meetingId, meetings.id))
                .where(
                    and(
                        eq(meetings.workspaceId, t.workspaceId),
                        isNull(meetings.deletedAt),
                        eq(meetingRsvps.userId, t.userId),
                        eq(meetingRsvps.status, "pending"),
                    ),
                )
                .orderBy(desc(meetings.startTime), desc(meetingRsvps.id))
                .limit(5),
            t.db
                .select({
                    id: kudos.id,
                    message: kudos.message,
                    createdAt: kudos.createdAt,
                    total: totalOver,
                })
                .from(kudos)
                .where(and(eq(kudos.workspaceId, t.workspaceId), eq(kudos.receiverId, t.userId)))
                .orderBy(desc(kudos.createdAt), desc(kudos.id))
                .limit(5),
        ]);

        return ok({
            tasks: splitRows(taskRows),
            events: splitRows(eventRows),
            proposals: splitRows(proposalRows),
            approvals: splitRows(approvalRows),
            dues: splitRows(dueRows),
            polls: splitRows(pollRows),
            rsvps: splitRows(rsvpRows),
            kudos: splitRows(kudosRows),
        });
    } catch (e) {
        return handleRouteError("GET /api/my-work", e);
    }
}
