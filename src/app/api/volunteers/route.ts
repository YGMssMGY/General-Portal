import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
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
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createSlotSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    capacity: z.number().int().min(1).default(1),
});
type CreateSlotInput = z.infer<typeof createSlotSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "volunteers" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [
            eq(volunteerSlots.workspaceId, t.workspaceId),
            isNull(volunteerSlots.deletedAt),
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
        const [counts, mine] = await Promise.all([
            ids.length > 0
                ? t.db
                      .select({ slotId: volunteerSignups.slotId, n: count(volunteerSignups.id) })
                      .from(volunteerSignups)
                      .where(inArray(volunteerSignups.slotId, ids))
                      .groupBy(volunteerSignups.slotId)
                : [],
            ids.length > 0
                ? t.db.query.volunteerSignups.findMany({
                      where: and(
                          inArray(volunteerSignups.slotId, ids),
                          eq(volunteerSignups.userId, t.userId),
                      ),
                      columns: { slotId: true },
                  })
                : [],
        ]);
        const countMap = new Map(counts.map((c) => [c.slotId, c.n]));
        const mineSet = new Set(mine.map((m) => m.slotId));

        const items = rows.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            startTime: s.startTime,
            endTime: s.endTime,
            capacity: s.capacity,
            signedUp: countMap.get(s.id) ?? 0,
            userSignedUp: mineSet.has(s.id),
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/volunteers", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_volunteer_slots",
            module: "volunteers",
        });
        const body = await parseBody<CreateSlotInput>(createSlotSchema as never, request);

        const startTime = new Date(body.startTime);
        const endTime = new Date(body.endTime);
        if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            throw new ApiError("Invalid startTime or endTime", 400);
        }

        const id = randomUUID();
        const [[slot]] = await Promise.all([
            t.db
                .insert(volunteerSlots)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    title: body.title,
                    description: body.description ?? null,
                    startTime,
                    endTime,
                    capacity: body.capacity,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "volunteer_slot",
                entityId: id,
                metadata: { title: body.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(slot, 201);
    } catch (e) {
        return handleRouteError("POST /api/volunteers", e);
    }
}
