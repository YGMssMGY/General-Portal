import { NextRequest } from "next/server";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
    attendance,
    kudos,
    participationScores,
    tasks,
    volunteerSignups,
    volunteerSlots,
} from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";

const BADGE_TARGETS = {
    "first-task": 1,
    "event-goer": 5,
    volunteer: 3,
    "kudos-star": 10,
    streak: 3,
    "top-10": 10,
} as const;

type BadgeId = keyof typeof BADGE_TARGETS;

interface BadgeResult {
    id: BadgeId;
    earnedAt: string | null;
    progress: number;
    target: number;
}

function toBadge(id: BadgeId, value: number, earnedAt: string | null): BadgeResult {
    const target = BADGE_TARGETS[id];
    const progress = Math.max(0, Math.min(target, Math.floor(value)));
    return {
        id,
        earnedAt: progress >= target ? (earnedAt ?? new Date().toISOString()) : null,
        progress,
        target,
    };
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const requested = new URL(request.url).searchParams.get("userId");
        if (requested && !hasPermission(t.permissions, "manage_users")) {
            throw new ApiError("Forbidden", 403);
        }
        const userId = requested ? requireUuid(requested, "userId") : t.userId;

        const [firstTask, eventGoer, volunteer, kudosStar, streak, topTen] = await Promise.all([
            t.db
                .select({
                    value: sql<number>`count(*)::int`,
                    earnedAt: sql<string | null>`min(${tasks.createdAt})::text`,
                })
                .from(tasks)
                .where(
                    and(
                        eq(tasks.workspaceId, t.workspaceId),
                        eq(tasks.status, "done"),
                        or(eq(tasks.assigneeId, userId), eq(tasks.createdById, userId)),
                        isNull(tasks.deletedAt),
                    ),
                ),
            t.db
                .select({
                    value: sql<number>`count(*)::int`,
                    earnedAt: sql<string | null>`min(${attendance.createdAt})::text`,
                })
                .from(attendance)
                .where(
                    and(
                        eq(attendance.workspaceId, t.workspaceId),
                        eq(attendance.userId, userId),
                        inArray(attendance.status, ["present", "late"]),
                        isNotNull(attendance.eventId),
                    ),
                ),
            t.db
                .select({
                    value: sql<number>`count(*)::int`,
                    earnedAt: sql<string | null>`min(${volunteerSignups.createdAt})::text`,
                })
                .from(volunteerSignups)
                .innerJoin(volunteerSlots, eq(volunteerSignups.slotId, volunteerSlots.id))
                .where(
                    and(
                        eq(volunteerSlots.workspaceId, t.workspaceId),
                        eq(volunteerSignups.userId, userId),
                        isNull(volunteerSlots.deletedAt),
                    ),
                ),
            t.db
                .select({
                    value: sql<number>`count(*)::int`,
                    earnedAt: sql<string | null>`min(${kudos.createdAt})::text`,
                })
                .from(kudos)
                .where(and(eq(kudos.workspaceId, t.workspaceId), eq(kudos.receiverId, userId))),
            t.db
                .select({
                    value: sql<number>`count(distinct ${participationScores.period})::int`,
                    earnedAt: sql<string | null>`min(${participationScores.computedAt})::text`,
                })
                .from(participationScores)
                .where(
                    and(
                        eq(participationScores.workspaceId, t.workspaceId),
                        eq(participationScores.userId, userId),
                        sql`${participationScores.score} > 0`,
                    ),
                ),
            (async () => {
                const res = (await t.db.execute(sql`
                    WITH ranked AS (
                        SELECT "userId", "score", "computedAt",
                               row_number() OVER (
                                   PARTITION BY "period", "periodType"
                                   ORDER BY "score" DESC, "userId" ASC
                               ) AS rnk
                        FROM "participation_scores"
                        WHERE "workspaceId" = ${t.workspaceId}
                    )
                    SELECT
                        least(10, greatest(0, 20 - coalesce(min(rnk), 2147483647)))::int AS value,
                        min(CASE WHEN rnk <= 10 THEN "computedAt" END)::text AS "earnedAt"
                    FROM ranked
                    WHERE "userId" = ${userId}
                `)) as unknown as { rows?: Array<{ value: number; earnedAt: string | null }> };
                return res.rows?.[0];
            })(),
        ]);

        const rank = topTen;
        const badges: BadgeResult[] = [
            toBadge("first-task", firstTask[0]?.value ?? 0, firstTask[0]?.earnedAt ?? null),
            toBadge("event-goer", eventGoer[0]?.value ?? 0, eventGoer[0]?.earnedAt ?? null),
            toBadge("volunteer", volunteer[0]?.value ?? 0, volunteer[0]?.earnedAt ?? null),
            toBadge("kudos-star", kudosStar[0]?.value ?? 0, kudosStar[0]?.earnedAt ?? null),
            toBadge("streak", streak[0]?.value ?? 0, streak[0]?.earnedAt ?? null),
            toBadge("top-10", rank?.value ?? 0, rank?.earnedAt ?? null),
        ];

        return ok(badges);
    } catch (e) {
        return handleRouteError("GET /api/badges", e);
    }
}
