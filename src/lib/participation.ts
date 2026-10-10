import { and, eq, gte, isNull, lt, or } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { attendance, kudos, meetingRsvps, meetings, tasks, volunteerSignups } from "@/db/schema";

export const PARTICIPATION_WEIGHTS = {
    task: 10,
    event: 5,
    rsvp: 1,
    volunteerHour: 3,
    volunteerCap: 30,
    kudos: 2,
} as const;

export interface ParticipationBreakdown {
    taskCount: number;
    taskPoints: number;
    eventCount: number;
    eventPoints: number;
    rsvpCount: number;
    rsvpPoints: number;
    volunteerHours: number;
    volunteerPoints: number;
    kudosCount: number;
    kudosPoints: number;
}

export type PeriodType = "month" | "term" | "year";

export function resolvePeriod(period: string, periodType: PeriodType): { start: Date; end: Date } {
    const [y, m] = period.split("-").map(Number);
    if (periodType === "month") {
        return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
    }
    if (periodType === "year") {
        return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
    }
    let startMonth: number;
    let endMonth: number;
    let endYear = y;
    if (m >= 9) {
        startMonth = 8;
        endMonth = 0;
        endYear = y + 1;
    } else if (m >= 5) {
        startMonth = 4;
        endMonth = 8;
    } else {
        startMonth = 0;
        endMonth = 4;
    }
    return { start: new Date(y, startMonth, 1), end: new Date(endYear, endMonth, 1) };
}

export async function computeParticipation(
    db: PortalDb,
    workspaceId: string,
    userId: string,
    start: Date,
    end: Date,
): Promise<{ score: number; breakdown: ParticipationBreakdown }> {
    const doneTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
            and(
                eq(tasks.workspaceId, workspaceId),
                eq(tasks.status, "done"),
                or(eq(tasks.assigneeId, userId), eq(tasks.createdById, userId)),
                gte(tasks.updatedAt, start),
                lt(tasks.updatedAt, end),
                isNull(tasks.deletedAt),
            ),
        );
    const attended = await db
        .select({ id: attendance.id })
        .from(attendance)
        .where(
            and(
                eq(attendance.workspaceId, workspaceId),
                eq(attendance.userId, userId),
                gte(attendance.createdAt, start),
                lt(attendance.createdAt, end),
            ),
        );
    const rsvps = await db
        .select({ id: meetingRsvps.id })
        .from(meetingRsvps)
        .innerJoin(meetings, eq(meetingRsvps.meetingId, meetings.id))
        .where(
            and(
                eq(meetings.workspaceId, workspaceId),
                eq(meetingRsvps.userId, userId),
                gte(meetings.startTime, start),
                lt(meetings.startTime, end),
            ),
        );
    const signups = await db.query.volunteerSignups.findMany({
        where: eq(volunteerSignups.userId, userId),
        with: { slot: true },
    });
    let volunteerHours = 0;
    for (const s of signups) {
        const slot = s.slot;
        if (!slot || slot.workspaceId !== workspaceId) continue;
        if (slot.deletedAt) continue;
        if (slot.startTime < start || slot.startTime >= end) continue;
        volunteerHours += Math.max(
            0,
            (slot.endTime.getTime() - slot.startTime.getTime()) / 3_600_000,
        );
    }
    const receivedKudos = await db
        .select({ id: kudos.id })
        .from(kudos)
        .where(
            and(
                eq(kudos.workspaceId, workspaceId),
                eq(kudos.receiverId, userId),
                gte(kudos.createdAt, start),
                lt(kudos.createdAt, end),
            ),
        );

    const breakdown: ParticipationBreakdown = {
        taskCount: doneTasks.length,
        taskPoints: doneTasks.length * PARTICIPATION_WEIGHTS.task,
        eventCount: attended.length,
        eventPoints: attended.length * PARTICIPATION_WEIGHTS.event,
        rsvpCount: rsvps.length,
        rsvpPoints: rsvps.length * PARTICIPATION_WEIGHTS.rsvp,
        volunteerHours: Math.round(volunteerHours * 10) / 10,
        volunteerPoints: Math.min(
            PARTICIPATION_WEIGHTS.volunteerCap,
            Math.floor(volunteerHours * PARTICIPATION_WEIGHTS.volunteerHour),
        ),
        kudosCount: receivedKudos.length,
        kudosPoints: receivedKudos.length * PARTICIPATION_WEIGHTS.kudos,
    };
    const score =
        breakdown.taskPoints +
        breakdown.eventPoints +
        breakdown.rsvpPoints +
        breakdown.volunteerPoints +
        breakdown.kudosPoints;
    return { score, breakdown };
}
