import type { NextRequest } from "next/server";
import { and, count, desc, eq, gte, isNull, ne } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const now = new Date();

        const [
            taskItems,
            taskTotal,
            eventItems,
            eventTotal,
            proposalItems,
            proposalTotal,
            approvalItems,
            approvalTotal,
            dueItems,
            dueTotal,
            pollItems,
            pollTotal,
            rsvpItems,
            rsvpTotal,
            kudosItems,
            kudosTotal,
        ] = await Promise.all([
            t.db
                .select({
                    id: tasks.id,
                    title: tasks.title,
                    status: tasks.status,
                    dueDate: tasks.dueDate,
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
                .select({ value: count() })
                .from(tasks)
                .where(
                    and(
                        eq(tasks.workspaceId, t.workspaceId),
                        eq(tasks.assigneeId, t.userId),
                        ne(tasks.status, "done"),
                        isNull(tasks.deletedAt),
                    ),
                ),
            t.db
                .select({
                    id: events.id,
                    title: events.title,
                    startDate: events.startDate,
                    location: events.location,
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
                .select({ value: count() })
                .from(events)
                .where(
                    and(
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                        eq(events.status, "published"),
                        gte(events.startDate, now),
                    ),
                ),
            t.db
                .select({
                    id: proposals.id,
                    title: proposals.title,
                    status: proposals.status,
                    createdAt: proposals.createdAt,
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
                .select({ value: count() })
                .from(proposals)
                .where(
                    and(
                        eq(proposals.workspaceId, t.workspaceId),
                        isNull(proposals.deletedAt),
                        eq(proposals.status, "pending"),
                    ),
                ),
            t.db
                .select({
                    id: approvals.id,
                    entityType: approvals.entityType,
                    entityId: approvals.entityId,
                    status: approvals.status,
                    dueAt: approvals.dueAt,
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
                .select({ value: count() })
                .from(approvals)
                .where(
                    and(
                        eq(approvals.workspaceId, t.workspaceId),
                        eq(approvals.approverId, t.userId),
                        eq(approvals.status, "pending"),
                    ),
                ),
            t.db
                .select({
                    id: memberDues.id,
                    title: memberDues.title,
                    amountCents: memberDues.amountCents,
                    dueDate: memberDues.dueDate,
                    status: memberDues.status,
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
                .select({ value: count() })
                .from(memberDues)
                .where(
                    and(
                        eq(memberDues.workspaceId, t.workspaceId),
                        eq(memberDues.userId, t.userId),
                        eq(memberDues.status, "unpaid"),
                    ),
                ),
            t.db
                .select({
                    id: polls.id,
                    title: polls.title,
                    status: polls.status,
                    closesAt: polls.closesAt,
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
                .select({ value: count() })
                .from(polls)
                .where(
                    and(
                        eq(polls.workspaceId, t.workspaceId),
                        isNull(polls.deletedAt),
                        eq(polls.status, "open"),
                    ),
                ),
            t.db
                .select({
                    id: meetingRsvps.id,
                    status: meetingRsvps.status,
                    meetingId: meetings.id,
                    meetingTitle: meetings.title,
                    startTime: meetings.startTime,
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
                .select({ value: count() })
                .from(meetingRsvps)
                .innerJoin(meetings, eq(meetingRsvps.meetingId, meetings.id))
                .where(
                    and(
                        eq(meetings.workspaceId, t.workspaceId),
                        isNull(meetings.deletedAt),
                        eq(meetingRsvps.userId, t.userId),
                        eq(meetingRsvps.status, "pending"),
                    ),
                ),
            t.db
                .select({ id: kudos.id, message: kudos.message, createdAt: kudos.createdAt })
                .from(kudos)
                .where(and(eq(kudos.workspaceId, t.workspaceId), eq(kudos.receiverId, t.userId)))
                .orderBy(desc(kudos.createdAt), desc(kudos.id))
                .limit(5),
            t.db
                .select({ value: count() })
                .from(kudos)
                .where(and(eq(kudos.workspaceId, t.workspaceId), eq(kudos.receiverId, t.userId))),
        ]);

        return ok({
            tasks: { items: taskItems, total: taskTotal[0]?.value ?? 0 },
            events: { items: eventItems, total: eventTotal[0]?.value ?? 0 },
            proposals: { items: proposalItems, total: proposalTotal[0]?.value ?? 0 },
            approvals: { items: approvalItems, total: approvalTotal[0]?.value ?? 0 },
            dues: { items: dueItems, total: dueTotal[0]?.value ?? 0 },
            polls: { items: pollItems, total: pollTotal[0]?.value ?? 0 },
            rsvps: { items: rsvpItems, total: rsvpTotal[0]?.value ?? 0 },
            kudos: { items: kudosItems, total: kudosTotal[0]?.value ?? 0 },
        });
    } catch (e) {
        return handleRouteError("GET /api/my-work", e);
    }
}
