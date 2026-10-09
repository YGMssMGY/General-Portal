import type { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { annualEventPlans } from "@/db/schema";
import {
    ApiError,
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

type BodySchema<T> = {
    safeParse: (v: unknown) =>
        | { success: true; data: T }
        | {
              success: false;
              error: { issues: Array<{ path: (string | number)[]; message: string }> };
          };
};

async function parse<T>(schema: z.ZodType<T>, request: NextRequest): Promise<T> {
    return parseBody(schema as unknown as BodySchema<T>, request);
}

const createPlanSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    academicYear: z.string().trim().min(1, "Academic year is required"),
    description: z.string().trim().nullish(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const { searchParams } = new URL(request.url);
        const { limit, cursor } = parsePagination(searchParams);

        const conds = [
            eq(annualEventPlans.workspaceId, t.workspaceId),
            isNull(annualEventPlans.deletedAt),
        ];
        const cv = decodeCursorValues(cursor);
        if (cv && typeof cv[0] === "string" && typeof cv[1] === "string") {
            const cursorDate = new Date(cv[0]);
            if (!Number.isNaN(cursorDate.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: annualEventPlans.createdAt, value: cursorDate }],
                        annualEventPlans.id,
                        cv[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.annualEventPlans.findMany({
            where: and(...conds),
            orderBy: [desc(annualEventPlans.createdAt), desc(annualEventPlans.id)],
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
        return handleRouteError("GET /api/events/annual-plan", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "create_event", module: "events" });
        const body = await parse(createPlanSchema, request);

        const inserted = await t.db
            .insert(annualEventPlans)
            .values({
                workspaceId: t.workspaceId,
                name: body.name,
                academicYear: body.academicYear,
                description: body.description ?? null,
            })
            .returning();
        const plan = inserted[0];
        if (!plan) throw new ApiError("Failed to create annual plan", 500);

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "create",
            entityType: "annual_event_plan",
            entityId: plan.id,
            metadata: { name: plan.name, academicYear: plan.academicYear },
            ipAddress: clientIp(request),
        });

        return ok(plan, 201);
    } catch (e) {
        return handleRouteError("POST /api/events/annual-plan", e);
    }
}
