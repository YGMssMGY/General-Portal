import type { NextRequest } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { annualEventPlans, events } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

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

const updatePlanSchema = z.object({
    name: z.string().trim().min(1).optional(),
    academicYear: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
});

const scoped = (id: string, workspaceId: string) =>
    and(
        eq(annualEventPlans.id, id),
        eq(annualEventPlans.workspaceId, workspaceId),
        isNull(annualEventPlans.deletedAt),
    );

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        const plan = await t.db.query.annualEventPlans.findFirst({
            where: scoped(id, t.workspaceId),
            with: {
                events: {
                    where: isNull(events.deletedAt),
                    orderBy: [asc(events.startDate)],
                    with: {
                        createdBy: { columns: { id: true, name: true, email: true, image: true } },
                    },
                },
            },
        });
        if (!plan) throw new ApiError("Annual plan not found", 404);
        return ok(plan);
    } catch (e) {
        return handleRouteError("GET /api/events/annual-plan/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.annualEventPlans.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Annual plan not found", 404);

        const body = await parse(updatePlanSchema, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);

        const set: Partial<typeof annualEventPlans.$inferInsert> = { updatedAt: new Date() };
        if (body.name !== undefined) set.name = body.name;
        if (body.academicYear !== undefined) set.academicYear = body.academicYear;
        if (body.description !== undefined) set.description = body.description;
        if (body.isActive !== undefined) set.isActive = body.isActive;

        const updated = await t.db
            .update(annualEventPlans)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const plan = updated[0];
        if (!plan) throw new ApiError("Annual plan not found", 404);

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "annual_event_plan",
                entityId: id,
                metadata: { changes: body },
                ipAddress: clientIp(request),
            },
            t.db,
        );

        return ok(plan);
    } catch (e) {
        return handleRouteError("PUT /api/events/annual-plan/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "events" });
        if (t.roleName !== "admin") throw new ApiError("Forbidden: admin only", 403);
        const id = requireUuid((await params).id);
        const existing = await t.db.query.annualEventPlans.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Annual plan not found", 404);

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        if (permanent) {
            await t.db
                .delete(annualEventPlans)
                .where(
                    and(
                        eq(annualEventPlans.id, id),
                        eq(annualEventPlans.workspaceId, t.workspaceId),
                    ),
                );
        } else {
            await t.db
                .update(annualEventPlans)
                .set({ deletedAt: new Date() })
                .where(scoped(id, t.workspaceId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "annual_event_plan",
                entityId: id,
                metadata: { name: existing.name, academicYear: existing.academicYear },
                ipAddress: clientIp(request),
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/events/annual-plan/[id]", e);
    }
}
