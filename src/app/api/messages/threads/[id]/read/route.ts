import type { NextRequest } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { messageReads, messageThreads, messages } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "messages" });
        const { id } = await params;
        const threadId = requireUuid(id);

        const thread = await t.db.query.messageThreads.findFirst({
            where: and(
                eq(messageThreads.id, threadId),
                eq(messageThreads.workspaceId, t.workspaceId),
                isNull(messageThreads.deletedAt),
            ),
            columns: { id: true },
        });
        if (!thread) throw new ApiError("Thread not found", 404);

        const all = await t.db.query.messages.findMany({
            where: eq(messages.threadId, threadId),
            columns: { id: true },
        });
        const ids = all.map((m) => m.id);
        if (ids.length === 0) return ok({ markedAsRead: 0 });

        const existing = await t.db.query.messageReads.findMany({
            where: and(eq(messageReads.userId, t.userId), inArray(messageReads.messageId, ids)),
            columns: { messageId: true },
        });
        const seen = new Set(existing.map((r) => r.messageId));
        const unread = ids.filter((mid) => !seen.has(mid));

        if (unread.length > 0) {
            await t.db
                .insert(messageReads)
                .values(unread.map((mid) => ({ messageId: mid, userId: t.userId })))
                .onConflictDoNothing({ target: [messageReads.messageId, messageReads.userId] });
        }

        return ok({ markedAsRead: unread.length });
    } catch (e) {
        return handleRouteError("POST /api/messages/threads/[id]/read", e);
    }
}
