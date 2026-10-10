import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import {
    events,
    messageThreads,
    messages,
    proposals,
    reactions,
    taskComments,
    tasks,
} from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const ALLOWED_EMOJI = new Set([
    "👍",
    "❤️",
    "😂",
    "🎉",
    "😮",
    "😢",
    "🙏",
    "🔥",
    "✅",
    "👀",
    "👏",
    "💯",
]);

const entitySchema = z.object({
    entityType: z.enum(["thread", "message", "task", "comment", "event", "proposal"]),
    entityId: z.string().uuid(),
    emoji: z.string().min(1).max(16),
});

function assertEmoji(emoji: string): void {
    if (Array.from(emoji).length > 8 || !/\p{Extended_Pictographic}/u.test(emoji)) {
        throw new ApiError("Invalid emoji", 400);
    }
    if (!ALLOWED_EMOJI.has(emoji) && Array.from(emoji).length > 4) {
        throw new ApiError("Invalid emoji", 400);
    }
}

async function assertEntity(
    t: Awaited<ReturnType<typeof requireTenant>>,
    entityType: string,
    entityId: string,
): Promise<void> {
    if (entityType === "thread") {
        const row = await t.db.query.messageThreads.findFirst({
            where: and(
                eq(messageThreads.id, entityId),
                eq(messageThreads.workspaceId, t.workspaceId),
                isNull(messageThreads.deletedAt),
            ),
            columns: { id: true },
        });
        if (!row) throw new ApiError("Thread not found", 404);
        return;
    }
    if (entityType === "message") {
        const row = await t.db.query.messages.findFirst({
            where: eq(messages.id, entityId),
            with: { thread: { columns: { workspaceId: true } } },
        });
        if (!row || row.thread.workspaceId !== t.workspaceId) {
            throw new ApiError("Message not found", 404);
        }
        return;
    }
    if (entityType === "task") {
        const row = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, entityId),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
            columns: { id: true },
        });
        if (!row) throw new ApiError("Task not found", 404);
        return;
    }
    if (entityType === "comment") {
        const row = await t.db.query.taskComments.findFirst({
            where: eq(taskComments.id, entityId),
            with: { task: { columns: { workspaceId: true, deletedAt: true } } },
        });
        if (!row || row.task.workspaceId !== t.workspaceId || row.task.deletedAt) {
            throw new ApiError("Comment not found", 404);
        }
        return;
    }
    if (entityType === "event") {
        const row = await t.db.query.events.findFirst({
            where: and(
                eq(events.id, entityId),
                eq(events.workspaceId, t.workspaceId),
                isNull(events.deletedAt),
            ),
            columns: { id: true },
        });
        if (!row) throw new ApiError("Event not found", 404);
        return;
    }
    const row = await t.db.query.proposals.findFirst({
        where: and(
            eq(proposals.id, entityId),
            eq(proposals.workspaceId, t.workspaceId),
            isNull(proposals.deletedAt),
        ),
        columns: { id: true },
    });
    if (!row) throw new ApiError("Proposal not found", 404);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request);
        const params = new URL(request.url).searchParams;
        const entityType = params.get("entityType");
        const entityId = params.get("entityId");
        if (!entityType || !entityId) throw new ApiError("entityType and entityId required", 400);
        await assertEntity(t, entityType, entityId);
        const rows = await t.db.query.reactions.findMany({
            where: and(
                eq(reactions.workspaceId, t.workspaceId),
                eq(reactions.entityType, entityType),
                eq(reactions.entityId, entityId),
            ),
            with: { user: { columns: { id: true, name: true } } },
        });
        const grouped = new Map<
            string,
            { emoji: string; count: number; mine: boolean; users: string[] }
        >();
        for (const r of rows) {
            const g = grouped.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false, users: [] };
            g.count += 1;
            if (r.userId === t.userId) g.mine = true;
            if (r.user?.name) g.users.push(r.user.name);
            grouped.set(r.emoji, g);
        }
        return ok([...grouped.values()]);
    } catch (e) {
        return handleRouteError("GET /api/reactions", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request);
        const data = await parseBody(entitySchema as never, request);
        const { entityType, entityId, emoji } = data as z.infer<typeof entitySchema>;
        assertEmoji(emoji);
        await assertEntity(t, entityType, entityId);
        const existing = await t.db.query.reactions.findFirst({
            where: and(
                eq(reactions.workspaceId, t.workspaceId),
                eq(reactions.entityType, entityType),
                eq(reactions.entityId, entityId),
                eq(reactions.userId, t.userId),
                eq(reactions.emoji, emoji),
            ),
            columns: { id: true },
        });
        if (existing) {
            await t.db.delete(reactions).where(eq(reactions.id, existing.id));
            return ok({ reacted: false });
        }
        await t.db
            .insert(reactions)
            .values({
                workspaceId: t.workspaceId,
                entityType,
                entityId,
                userId: t.userId,
                emoji,
            })
            .onConflictDoNothing();
        return ok({ reacted: true }, 201);
    } catch (e) {
        return handleRouteError("POST /api/reactions", e);
    }
}
