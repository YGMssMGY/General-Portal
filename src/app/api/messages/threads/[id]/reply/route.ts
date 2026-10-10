import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { messageThreads, messages } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";
import { notifyMentioned } from "@/lib/mentions";

function body<T>(schema: {
    safeParse: (
        v: unknown,
    ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}) {
    return {
        safeParse: (v: unknown) => {
            const r = schema.safeParse(v);
            if (r.success) return { success: true as const, data: r.data };
            return {
                success: false as const,
                error: {
                    issues: r.error.issues.map((i) => ({
                        path: i.path.filter(
                            (p): p is string | number =>
                                typeof p === "string" || typeof p === "number",
                        ),
                        message: i.message,
                    })),
                },
            };
        },
    };
}

const replySchema = z.object({
    content: z.string().trim().min(1).max(20000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "send_message", module: "messages" });
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

        const data = await parseBody(body(replySchema), request);

        const [message] = await t.db
            .insert(messages)
            .values({ threadId, senderId: t.userId, content: data.content })
            .returning();
        await t.db
            .update(messageThreads)
            .set({ updatedAt: new Date() })
            .where(eq(messageThreads.id, threadId));

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "replied",
            entityType: "message_thread",
            entityId: threadId,
            metadata: { messageId: message.id },
            ipAddress: clientIp(request),
        });

        void notifyMentioned(t.db, {
            workspaceId: t.workspaceId,
            entityType: "message",
            entityId: message.id,
            text: data.content,
            senderId: t.userId,
            link: `/messages?thread=${threadId}`,
        }).catch(() => {});

        return ok(
            {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                sender: { id: t.user.id, name: t.user.name, image: t.user.image },
            },
            201,
        );
    } catch (e) {
        return handleRouteError("POST /api/messages/threads/[id]/reply", e);
    }
}
