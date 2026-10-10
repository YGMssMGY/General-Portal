import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

export function newCheckInCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[randomInt(chars.length)];
    return out;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_attendance",
            module: "members",
        });
        const { id } = await params;
        requireUuid(id);

        const meeting = await t.db.query.meetings.findFirst({
            where: and(
                eq(meetings.id, id),
                eq(meetings.workspaceId, t.workspaceId),
                isNull(meetings.deletedAt),
            ),
            columns: { id: true, title: true },
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const checkInCode = newCheckInCode();
        const [[updated]] = await Promise.all([
            t.db
                .update(meetings)
                .set({ checkInCode, updatedAt: new Date() })
                .where(eq(meetings.id, id))
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "regenerate_code",
                entityType: "meeting",
                entityId: id,
                metadata: { title: meeting.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/meetings/[id]/code", e);
    }
}
