import { NextRequest } from "next/server";
import { and, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { volunteerSignups, volunteerSlots } from "@/db/schema";
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
    requireUuid,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const updateSlotSchema = z.object({
    id: z.string(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    startTime: z.string().min(1).optional(),
    endTime: z.string().min(1).optional(),
    capacity: z.number().int().min(1).optional(),
});
type UpdateSlotInput = z.infer<typeof updateSlotSchema>;

const deleteSlotSchema = z.object({ id: z.string() });
type DeleteSlotInput = z.infer<typeof deleteSlotSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "volunteers" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);
        const now = new Date();

        const conds = [
            eq(volunteerSlots.workspaceId, t.workspaceId),
            isNull(volunteerSlots.deletedAt),
            gte(volunteerSlots.startTime, now),
        ];
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: volunteerSlots.startTime, value: at }],
                        volunteerSlots.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.volunteerSlots.findMany({
            where: and(...conds),
            orderBy: [desc(volunteerSlots.startTime), desc(volunteerSlots.id)],
            limit: limit + 1,
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.startTime.toISOString(), last.id]);
        }

        const ids = rows.map((r) => r.id);
        const counts =
            ids.length > 0
                ? await t.db
                      .select({ slotId: volunteerSignups.slotId, n: count(volunteerSignups.id) })
                      .from(volunteerSignups)
                      .where(inArray(volunteerSignups.slotId, ids))
                      .groupBy(volunteerSignups.slotId)
                : [];
        const countMap = new Map(counts.map((c) => [c.slotId, c.n]));
        const items = rows.map((s) => ({ ...s, signupCount: countMap.get(s.id) ?? 0 }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/volunteers/slots", e);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_volunteer_slots",
            module: "volunteers",
        });
        const body = await parseBody<UpdateSlotInput>(updateSlotSchema as never, request);
        const id = requireUuid(body.id, "id");

        const existing = await t.db.query.volunteerSlots.findFirst({
            where: and(
                eq(volunteerSlots.id, id),
                eq(volunteerSlots.workspaceId, t.workspaceId),
                isNull(volunteerSlots.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Volunteer slot not found", 404);

        const set: Partial<typeof volunteerSlots.$inferInsert> = {};
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;
        if (body.capacity !== undefined) set.capacity = body.capacity;
        if (body.startTime !== undefined) {
            const d = new Date(body.startTime);
            if (Number.isNaN(d.getTime())) throw new ApiError("Invalid startTime", 400);
            set.startTime = d;
        }
        if (body.endTime !== undefined) {
            const d = new Date(body.endTime);
            if (Number.isNaN(d.getTime())) throw new ApiError("Invalid endTime", 400);
            set.endTime = d;
        }
        if (Object.keys(set).length === 0) throw new ApiError("No fields to update", 400);

        const [[updated]] = await Promise.all([
            t.db.update(volunteerSlots).set(set).where(eq(volunteerSlots.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "volunteer_slot",
                entityId: id,
                metadata: { changes: Object.keys(set) },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/volunteers/slots", e);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_volunteer_slots",
            module: "volunteers",
        });
        const body = await parseBody<DeleteSlotInput>(deleteSlotSchema as never, request);
        const id = requireUuid(body.id, "id");

        const existing = await t.db.query.volunteerSlots.findFirst({
            where: and(
                eq(volunteerSlots.id, id),
                eq(volunteerSlots.workspaceId, t.workspaceId),
                isNull(volunteerSlots.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Volunteer slot not found", 404);

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        const sideEffect = emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "delete",
            entityType: "volunteer_slot",
            entityId: id,
            metadata: { title: existing.title },
            ipAddress: clientIp(request),
        });
        if (permanent && t.roleName === "admin") {
            await Promise.all([
                t.db.delete(volunteerSlots).where(eq(volunteerSlots.id, id)),
                sideEffect,
            ]);
        } else {
            await Promise.all([
                t.db
                    .update(volunteerSlots)
                    .set({ deletedAt: new Date() })
                    .where(eq(volunteerSlots.id, id)),
                sideEffect,
            ]);
        }

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/volunteers/slots", e);
    }
}
