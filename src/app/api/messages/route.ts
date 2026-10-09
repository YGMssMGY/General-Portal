import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { messageReads, messageThreads, messages, subgroups } from "@/db/schema";
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
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

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

const createSchema = z.object({
    subject: z.string().trim().max(200).optional(),
    content: z.string().trim().min(1).max(20000),
    recipientIds: z.array(z.uuid()).max(100).optional(),
    subgroupId: z.uuid().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "messages" });
        const sp = request.nextUrl.searchParams;
        const { limit, cursor } = parsePagination(sp);
        const subgroupParam = sp.get("subgroupId");
        const subgroupId = subgroupParam ? requireUuid(subgroupParam, "subgroupId") : null;

        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? keysetWhere(
                      [{ column: messageThreads.createdAt, value: cDate }],
                      messageThreads.id,
                      cId,
                  )
                : undefined;

        const rows = await t.db.query.messageThreads.findMany({
            where: and(
                eq(messageThreads.workspaceId, t.workspaceId),
                isNull(messageThreads.deletedAt),
                subgroupId ? eq(messageThreads.subgroupId, subgroupId) : undefined,
                cursorCond,
            ),
            orderBy: [desc(messageThreads.createdAt), desc(messageThreads.id)],
            limit: limit + 1,
            with: {
                messages: {
                    orderBy: [desc(messages.createdAt)],
                    limit: 1,
                    with: { sender: { columns: { id: true, name: true, image: true } } },
                },
            },
        });

        const page = rows.slice(0, limit);
        const ids = page.map((r) => r.id);

        let totals: Record<string, number> = {};
        const readByThread: Record<string, Set<string>> = {};
        if (ids.length > 0) {
            const totalRows = await t.db
                .select({ threadId: messages.threadId, n: count() })
                .from(messages)
                .where(inArray(messages.threadId, ids))
                .groupBy(messages.threadId);
            totals = Object.fromEntries(totalRows.map((r) => [r.threadId, r.n]));
            const readRows = await t.db
                .select({ threadId: messages.threadId, messageId: messageReads.messageId })
                .from(messageReads)
                .innerJoin(messages, eq(messageReads.messageId, messages.id))
                .where(and(eq(messageReads.userId, t.userId), inArray(messages.threadId, ids)));
            for (const r of readRows) {
                (readByThread[r.threadId] ??= new Set()).add(r.messageId);
            }
        }

        const items = page.map((th) => {
            const last = th.messages[0];
            const total = totals[th.id] ?? 0;
            return {
                id: th.id,
                subject: th.subject,
                subgroupId: th.subgroupId,
                createdAt: th.createdAt,
                updatedAt: th.updatedAt,
                lastMessage: last
                    ? {
                          id: last.id,
                          content: last.content,
                          createdAt: last.createdAt,
                          sender: last.sender,
                      }
                    : null,
                totalMessages: total,
                unreadCount: Math.max(0, total - (readByThread[th.id]?.size ?? 0)),
            };
        });

        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/messages", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "send_message", module: "messages" });
        const data = await parseBody(body(createSchema), request);
        const subject = data.subject?.trim() || "New conversation";

        if (data.subgroupId) {
            const sg = await t.db.query.subgroups.findFirst({
                where: and(
                    eq(subgroups.id, data.subgroupId),
                    eq(subgroups.workspaceId, t.workspaceId),
                    isNull(subgroups.deletedAt),
                ),
                columns: { id: true },
            });
            if (!sg) throw new ApiError("Subgroup not found", 404);
        }

        const { thread, message } = await t.db.transaction(async (tx) => {
            const [thread] = await tx
                .insert(messageThreads)
                .values({
                    workspaceId: t.workspaceId,
                    subject,
                    subgroupId: data.subgroupId ?? null,
                })
                .returning();
            const [message] = await tx
                .insert(messages)
                .values({ threadId: thread.id, senderId: t.userId, content: data.content })
                .returning();
            const recipients = (data.recipientIds ?? []).filter((rid) => rid !== t.userId);
            if (recipients.length > 0) {
                await tx
                    .insert(messageReads)
                    .values(
                        recipients.map((rid) => ({
                            messageId: message.id,
                            userId: rid,
                            readAt: new Date(),
                        })),
                    )
                    .onConflictDoNothing({ target: [messageReads.messageId, messageReads.userId] });
            }
            return { thread, message };
        });

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "message_thread",
            entityId: thread.id,
            metadata: { subject },
            ipAddress: clientIp(request),
        });

        return ok(
            {
                id: thread.id,
                subject: thread.subject,
                subgroupId: thread.subgroupId,
                createdAt: thread.createdAt,
                updatedAt: thread.updatedAt,
                messages: [
                    {
                        id: message.id,
                        content: message.content,
                        createdAt: message.createdAt,
                        sender: { id: t.user.id, name: t.user.name, image: t.user.image },
                    },
                ],
            },
            201,
        );
    } catch (e) {
        return handleRouteError("POST /api/messages", e);
    }
}
