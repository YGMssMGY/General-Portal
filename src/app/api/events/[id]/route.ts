import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { events } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { validateCustomFields } from "@/lib/custom-fields";
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

const updateEventSchema = z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    location: z.string().nullable().optional(),
    isPublic: z.boolean().optional(),
    status: z.enum(["draft", "published", "cancelled"]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const scoped = (id: string, workspaceId: string) =>
    and(eq(events.id, id), eq(events.workspaceId, workspaceId), isNull(events.deletedAt));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        const event = await t.db.query.events.findFirst({
            where: scoped(id, t.workspaceId),
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
                approvedBy: { columns: { id: true, name: true, email: true, image: true } },
                annualPlan: { columns: { id: true, name: true, academicYear: true } },
            },
        });
        if (!event) throw new ApiError("Event not found", 404);
        return ok(event);
    } catch (e) {
        return handleRouteError("GET /api/events/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.events.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Event not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("manage_all_events")) {
            throw new ApiError("Forbidden", 403);
        }

        const body = await parse(updateEventSchema, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        if (body.metadata !== undefined) {
            const fieldErrors = await validateCustomFields(
                t.db,
                t.workspaceId,
                "event",
                body.metadata as Record<string, unknown> | undefined,
            );
            if (fieldErrors.length > 0) throw new ApiError(fieldErrors.join("; "), 400);
        }

        const set: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
        if (body.metadata !== undefined) set.metadata = body.metadata as Record<string, unknown>;
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;
        if (body.startDate !== undefined) set.startDate = body.startDate;
        if (body.endDate !== undefined) set.endDate = body.endDate;
        if (body.location !== undefined) set.location = body.location;
        if (body.isPublic !== undefined) set.isPublic = body.isPublic;
        if (body.status !== undefined) set.status = body.status;

        const updated = await t.db
            .update(events)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const event = updated[0];
        if (!event) throw new ApiError("Event not found", 404);

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "event",
                entityId: id,
                metadata: { changes: body },
                ipAddress: clientIp(request),
            },
            t.db,
        );

        return ok(event);
    } catch (e) {
        return handleRouteError("PUT /api/events/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.events.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Event not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("manage_all_events")) {
            throw new ApiError("Forbidden", 403);
        }

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        if (permanent && t.roleName === "admin") {
            await t.db
                .delete(events)
                .where(and(eq(events.id, id), eq(events.workspaceId, t.workspaceId)));
        } else {
            await t.db
                .update(events)
                .set({ deletedAt: new Date() })
                .where(scoped(id, t.workspaceId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "event",
                entityId: id,
                metadata: { title: existing.title },
                ipAddress: clientIp(request),
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/events/[id]", e);
    }
}
