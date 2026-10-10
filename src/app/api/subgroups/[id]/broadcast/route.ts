import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { notifications, subgroupMemberships, subgroups } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const broadcastSchema = z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(2000),
    link: z.string().trim().max(2048).nullish(),
});
type BroadcastInput = z.infer<typeof broadcastSchema>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_subgroups",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const body = await parseBody<BroadcastInput>(broadcastSchema as never, request);
        const subgroup = await t.db.query.subgroups.findFirst({
            where: and(
                eq(subgroups.id, id),
                eq(subgroups.workspaceId, t.workspaceId),
                isNull(subgroups.deletedAt),
            ),
            columns: { id: true, name: true },
        });
        if (!subgroup) throw new ApiError("Subgroup not found", 404);
        const members = await t.db.query.subgroupMemberships.findMany({
            where: eq(subgroupMemberships.subgroupId, id),
            columns: { userId: true },
            limit: 500,
        });
        if (members.length > 0) {
            await t.db.insert(notifications).values(
                members.map((m) => ({
                    workspaceId: t.workspaceId,
                    userId: m.userId,
                    title: body.title,
                    body: body.body,
                    type: "broadcast",
                    link: body.link ?? null,
                })),
            );
        }
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "broadcast",
            entityType: "subgroup",
            entityId: id,
            metadata: { name: subgroup.name, sent: members.length },
            ipAddress: clientIp(request),
        });
        return ok({ sent: members.length });
    } catch (e) {
        return handleRouteError("POST /api/subgroups/[id]/broadcast", e);
    }
}
