import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { participationScores } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";
import type { PeriodType } from "@/lib/participation";
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

        const rows = await t.db.query.participationScores.findMany({
            where: and(
                eq(participationScores.workspaceId, t.workspaceId),
                eq(participationScores.period, period),
                eq(participationScores.periodType, periodType),
            ),
            orderBy: [desc(participationScores.score)],
            limit: 20,
            with: { user: { columns: { id: true, name: true, email: true, image: true } } },
        });

        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/participation/leaderboard", e);
    }
}
