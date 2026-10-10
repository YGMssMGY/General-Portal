import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { pollVotes, polls } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";
import { isClosed } from "@/app/api/polls/route";

const voteSchema = z.object({
    optionIds: z.array(z.string().uuid()).min(1).max(10),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const poll = await t.db.query.polls.findFirst({
            where: and(
                eq(polls.id, id),
                eq(polls.workspaceId, t.workspaceId),
                isNull(polls.deletedAt),
            ),
            with: { options: { columns: { id: true } } },
        });
        if (!poll) throw new ApiError("Poll not found", 404);
        if (isClosed(poll.status, poll.closesAt)) throw new ApiError("Poll is closed", 400);
        const data = await parseBody(voteSchema as never, request);
        const body = data as z.infer<typeof voteSchema>;
        const valid = new Set(poll.options.map((o) => o.id));
        const unique = [...new Set(body.optionIds)];
        if (unique.some((o) => !valid.has(o))) throw new ApiError("Invalid option", 400);
        if (!poll.multiple && unique.length !== 1) {
            throw new ApiError("This poll allows a single choice", 400);
        }
        if (!poll.multiple) {
            await t.db
                .delete(pollVotes)
                .where(and(eq(pollVotes.pollId, id), eq(pollVotes.userId, t.userId)));
        }
        await t.db
            .insert(pollVotes)
            .values(unique.map((optionId) => ({ pollId: id, optionId, userId: t.userId })))
            .onConflictDoNothing();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "voted",
            entityType: "poll",
            entityId: id,
            metadata: { optionIds: unique },
            ipAddress: clientIp(request),
        });
        return ok({ voted: true, optionIds: unique }, 201);
    } catch (e) {
        return handleRouteError("POST /api/polls/[id]/vote", e);
    }
}
