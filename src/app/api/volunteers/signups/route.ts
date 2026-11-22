import { NextRequest } from "next/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
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

const createSignupSchema = z.object({ slotId: z.string() });
type CreateSignupInput = z.infer<typeof createSignupSchema>;

const deleteSignupSchema = z.object({ slotId: z.string(), userId: z.string().optional() });
type DeleteSignupInput = z.infer<typeof deleteSignupSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "volunteers" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const slotId = requireUuid(searchParams.get("slotId"), "slotId");

        const slot = await t.db.query.volunteerSlots.findFirst({
            where: and(
                eq(volunteerSlots.id, slotId),
                eq(volunteerSlots.workspaceId, t.workspaceId),
                isNull(volunteerSlots.deletedAt),
            ),
            columns: { id: true },
        });
        if (!slot) throw new ApiError("Volunteer slot not found", 404);

        const conds = [eq(volunteerSignups.slotId, slotId)];
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
                        [{ column: volunteerSignups.createdAt, value: at }],
                        volunteerSignups.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.volunteerSignups.findMany({
            where: and(...conds),
            orderBy: [desc(volunteerSignups.createdAt), desc(volunteerSignups.id)],
            limit: limit + 1,
            with: { user: { columns: { id: true, name: true, email: true, image: true } } },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const items = rows.map((s) => ({
            id: s.id,
            userId: s.userId,
            name: s.user.name,
            email: s.user.email,
            signedUpAt: s.createdAt,
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/volunteers/signups", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "signup_volunteer",
            module: "volunteers",
        });
        const body = await parseBody<CreateSignupInput>(createSignupSchema as never, request);
        const slotId = requireUuid(body.slotId, "slotId");

        const [slot, [{ n: signedUp }]] = await Promise.all([
            t.db.query.volunteerSlots.findFirst({
                where: and(
                    eq(volunteerSlots.id, slotId),
                    eq(volunteerSlots.workspaceId, t.workspaceId),
                    isNull(volunteerSlots.deletedAt),
                ),
            }),
            t.db
                .select({ n: count() })
                .from(volunteerSignups)
                .where(eq(volunteerSignups.slotId, slotId)),
        ]);
        if (!slot) throw new ApiError("Volunteer slot not found", 404);
        if (signedUp >= slot.capacity) throw new ApiError("Slot is at full capacity", 409);

        const [created] = await t.db
            .insert(volunteerSignups)
            .values({ slotId, userId: t.userId })
            .onConflictDoNothing({ target: [volunteerSignups.slotId, volunteerSignups.userId] })
            .returning();
        if (!created) throw new ApiError("Already signed up for this slot", 409);

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "signed_up",
            entityType: "volunteer_signup",
            entityId: created.id,
            metadata: { slotId, title: slot.title },
            ipAddress: clientIp(request),
        });

        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/volunteers/signups", e);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "volunteers" });
        const body = await parseBody<DeleteSignupInput>(deleteSignupSchema as never, request);
        const slotId = requireUuid(body.slotId, "slotId");
        const targetUserId = body.userId ?? t.userId;
        if (targetUserId !== t.userId && !t.permissions.includes("manage_volunteer_slots")) {
            throw new ApiError("Forbidden", 403);
        }

        const slot = await t.db.query.volunteerSlots.findFirst({
            where: and(
                eq(volunteerSlots.id, slotId),
                eq(volunteerSlots.workspaceId, t.workspaceId),
                isNull(volunteerSlots.deletedAt),
            ),
            columns: { id: true, title: true },
        });
        if (!slot) throw new ApiError("Volunteer slot not found", 404);

        const existing = await t.db.query.volunteerSignups.findFirst({
            where: and(
                eq(volunteerSignups.slotId, slotId),
                eq(volunteerSignups.userId, targetUserId),
            ),
        });
        if (!existing) throw new ApiError("Signup not found", 404);

        await Promise.all([
            t.db.delete(volunteerSignups).where(eq(volunteerSignups.id, existing.id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "cancelled_signup",
                entityType: "volunteer_signup",
                entityId: existing.id,
                metadata: { slotId, title: slot.title, targetUserId },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ removed: true });
    } catch (e) {
        return handleRouteError("DELETE /api/volunteers/signups", e);
    }
}
