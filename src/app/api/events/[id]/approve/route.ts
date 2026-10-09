import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { events } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
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

const reviewSchema = z.object({ reviewComment: z.string().max(2000).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_all_events",
            module: "events",
        });
        const id = requireUuid((await params).id);
        const event = await t.db.query.events.findFirst({
            where: and(
                eq(events.id, id),
                eq(events.workspaceId, t.workspaceId),
                isNull(events.deletedAt),
            ),
        });
        if (!event) throw new ApiError("Event not found", 404);
        if (event.approvalStatus !== "pending")
            throw new ApiError("Only pending events can be approved", 400);

        let reviewComment: string | undefined;
        try {
            reviewComment = (await parse(reviewSchema, request)).reviewComment;
        } catch (e) {
            if (e instanceof ApiError && e.message === "Invalid JSON body")
                reviewComment = undefined;
            else throw e;
        }

        const [updated] = await Promise.all([
            t.db
                .update(events)
                .set({
                    approvalStatus: "approved",
                    approvedById: t.userId,
                    approvedAt: new Date(),
                    reviewComment: reviewComment ?? null,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(events.id, id),
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                    ),
                )
                .returning()
                .then((rows) => rows[0]),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "approve",
                entityType: "event",
                entityId: id,
                metadata: { title: event.title, reviewComment: reviewComment ?? null },
                ipAddress: clientIp(request),
            }),
        ]);
        if (!updated) throw new ApiError("Event not found", 404);
        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/events/[id]/approve", e);
    }
}
