import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
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

const linkSchema = z.object({
    eventId: z.string().uuid(),
    action: z.enum(["link", "unlink"]),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "create_event", module: "events" });
        const planId = requireUuid((await params).id);
        const plan = await t.db.query.annualEventPlans.findFirst({
            where: and(
                eq(annualEventPlans.id, planId),
                eq(annualEventPlans.workspaceId, t.workspaceId),
                isNull(annualEventPlans.deletedAt),
            ),
        });
        if (!plan) throw new ApiError("Annual plan not found", 404);

        const body = await parse(linkSchema, request);
        const event = await t.db.query.events.findFirst({
            where: and(
                eq(events.id, body.eventId),
                eq(events.workspaceId, t.workspaceId),
                isNull(events.deletedAt),
            ),
        });
        if (!event) throw new ApiError("Event not found", 404);

        if (body.action === "link") {
            if (event.annualPlanId)
                throw new ApiError("Event is already linked to an annual plan", 400);
        } else if (event.annualPlanId !== planId) {
            throw new ApiError("Event is not linked to this annual plan", 400);
        }

        const [rows] = await Promise.all([
            t.db
                .update(events)
                .set({
                    annualPlanId: body.action === "link" ? planId : null,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(events.id, body.eventId),
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                    ),
                )
                .returning({ id: events.id }),
            writeAuditLog(
                {
                    workspaceId: t.workspaceId,
                    userId: t.userId,
                    action: body.action,
                    entityType: "event",
                    entityId: body.eventId,
                    metadata: { planId, planName: plan.name, eventTitle: event.title },
                    ipAddress: clientIp(request),
                },
                t.db,
            ),
        ]);
        if (rows.length === 0) throw new ApiError("Event not found", 404);

        return ok({ linked: body.action === "link" });
    } catch (e) {
        return handleRouteError("POST /api/events/annual-plan/[id]/link", e);
    }
}
