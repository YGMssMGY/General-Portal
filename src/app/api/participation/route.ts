import { NextRequest } from "next/server";
import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { participationScores } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";
import { computeParticipation, resolvePeriod, type PeriodType } from "@/lib/participation";
import { requireTenant } from "@/lib/tenant";

function currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const params = new URL(request.url).searchParams;
        const period = params.get("period") ?? currentPeriod();
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new ApiError("Invalid period", 400);
        const periodType = z
            .enum(["month", "term", "year"])
            .catch("month")
            .parse(params.get("periodType")) as PeriodType;
        const targetUserId = params.get("userId") ?? t.userId;
        if (targetUserId !== t.userId && !t.permissions.includes("view_reports")) {
            throw new ApiError("Forbidden", 403);
        }

        const { start, end } = resolvePeriod(period, periodType);
        const { score, breakdown } = await computeParticipation(
            t.db,
            t.workspaceId,
            targetUserId,
            start,
            end,
        );

        await t.db
            .insert(participationScores)
            .values({
                workspaceId: t.workspaceId,
                userId: targetUserId,
                period,
                periodType,
                score,
                breakdown: { ...breakdown },
                computedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: [
                    participationScores.workspaceId,
                    participationScores.userId,
                    participationScores.period,
                    participationScores.periodType,
                ],
                set: { score, breakdown: { ...breakdown }, computedAt: new Date() },
            });

        const higher = await t.db
            .select({ value: count(participationScores.id) })
            .from(participationScores)
            .where(
                and(
                    eq(participationScores.workspaceId, t.workspaceId),
                    eq(participationScores.period, period),
                    eq(participationScores.periodType, periodType),
                    gt(participationScores.score, score),
                ),
            );
        const rank = (higher[0]?.value ?? 0) + 1;

        return ok({ score, breakdown, rank, period, periodType, userId: targetUserId });
    } catch (e) {
        return handleRouteError("GET /api/participation", e);
    }
}
