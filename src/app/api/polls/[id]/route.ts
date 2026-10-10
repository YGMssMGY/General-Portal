import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { polls } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { isClosed } from "@/app/api/polls/route";

const updateSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullish(),
    status: z.enum(["open", "closed"]).optional(),
    closesAt: z.string().nullish(),
    multiple: z.boolean().optional(),
    anonymous: z.boolean().optional(),
});

const scoped = (id: string, workspaceId: string) =>
    and(eq(polls.id, id), eq(polls.workspaceId, workspaceId), isNull(polls.deletedAt));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const poll = await t.db.query.polls.findFirst({
            where: scoped(id, t.workspaceId),
            with: {
                options: { orderBy: (o, { asc }) => [asc(o.position)] },
                votes: { with: { user: { columns: { id: true, name: true } } } },
                createdBy: { columns: { id: true, name: true } },
            },
        });
        if (!poll) throw new ApiError("Poll not found", 404);
        const canManage = t.permissions.includes("manage_polls");
        const votesByOption = new Map<string, number>();
        for (const v of poll.votes)
            votesByOption.set(v.optionId, (votesByOption.get(v.optionId) ?? 0) + 1);
        const myVotes = poll.votes.filter((v) => v.userId === t.userId).map((v) => v.optionId);
        const showVoters = !poll.anonymous || canManage;
        return ok({
            ...poll,
            votes: undefined,
            closed: isClosed(poll.status, poll.closesAt),
            options: poll.options.map((o) => ({ ...o, votes: votesByOption.get(o.id) ?? 0 })),
            totalVotes: poll.votes.length,
            myVotes,
            voters: showVoters
                ? poll.votes.map((v) => ({
                      optionId: v.optionId,
                      userId: v.userId,
                      userName: v.user?.name ?? null,
                  }))
                : [],
        });
    } catch (e) {
        return handleRouteError("GET /api/polls/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.polls.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Poll not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("manage_polls")) {
            throw new ApiError("Forbidden", 403);
        }
        if (isClosed(existing.status, existing.closesAt)) {
            throw new ApiError("Poll is closed", 400);
        }
        const data = await parseBody(updateSchema as never, request);
        const body = data as z.infer<typeof updateSchema>;
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        const set: Partial<typeof polls.$inferInsert> = { updatedAt: new Date() };
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description ?? null;
        if (body.status !== undefined) set.status = body.status;
        if (body.multiple !== undefined) set.multiple = body.multiple;
        if (body.anonymous !== undefined) set.anonymous = body.anonymous;
        if (body.closesAt !== undefined) {
            if (body.closesAt === null) {
                set.closesAt = null;
            } else {
                const d = new Date(body.closesAt);
                if (Number.isNaN(d.getTime())) throw new ApiError("Invalid closesAt", 400);
                set.closesAt = d;
            }
        }
        const updated = await t.db
            .update(polls)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const poll = updated[0];
        if (!poll) throw new ApiError("Poll not found", 404);
        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "poll",
                entityId: id,
                metadata: { changes: body },
                ipAddress: clientIp(request),
            },
            t.db,
        );
        return ok(poll);
    } catch (e) {
        return handleRouteError("PUT /api/polls/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.polls.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Poll not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("manage_polls")) {
            throw new ApiError("Forbidden", 403);
        }
        await t.db.update(polls).set({ deletedAt: new Date() }).where(scoped(id, t.workspaceId));
        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "poll",
                entityId: id,
                metadata: { title: existing.title },
                ipAddress: clientIp(request),
            },
            t.db,
        );
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/polls/[id]", e);
    }
}
