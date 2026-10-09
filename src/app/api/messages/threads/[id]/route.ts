import type { NextRequest } from "next/server";
import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { messageReads, messageThreads, messages } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    ok,
    parsePagination,
    requireUuid,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        });
        if (!thread) throw new ApiError("Thread not found", 404);

        const sp = request.nextUrl.searchParams;
        const { limit, cursor } = parsePagination(sp);
        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? or(
                      gt(messages.createdAt, cDate),
                      and(eq(messages.createdAt, cDate), gt(messages.id, cId)),
                  )
                : undefined;

        const rows = await t.db.query.messages.findMany({
            where: and(eq(messages.threadId, threadId), cursorCond),
            orderBy: [asc(messages.createdAt), asc(messages.id)],
            limit: limit + 1,
            columns: { id: true, content: true, createdAt: true },
            with: { sender: { columns: { id: true, name: true, image: true } } },
        });

        const page = rows.slice(0, limit);
        const msgIds = page.map((m) => m.id);
        const readMap = new Map<string, Date | null>();
        if (msgIds.length > 0) {
            const readRows = await t.db.query.messageReads.findMany({
                where: and(
                    eq(messageReads.userId, t.userId),
                    inArray(messageReads.messageId, msgIds),
                ),
                columns: { messageId: true, readAt: true },
            });
            for (const r of readRows) readMap.set(r.messageId, r.readAt);
        }

        const items = page.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt,
            sender: m.sender,
            read: readMap.has(m.id),
            readAt: readMap.get(m.id) ?? null,
        }));

        const last = page[page.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok({
            id: thread.id,
            subject: thread.subject,
            subgroupId: thread.subgroupId,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            messages: items,
        });
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/messages/threads/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
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
        });
        if (!thread) throw new ApiError("Thread not found", 404);

        const first = await t.db.query.messages.findFirst({
            where: eq(messages.threadId, threadId),
            orderBy: [asc(messages.createdAt), asc(messages.id)],
            columns: { senderId: true },
        });
        const canDelete =
            first?.senderId === t.userId || t.permissions.includes("manage_all_messages");
        if (!canDelete)
            throw new ApiError("Only the starter or a manager can delete this conversation", 403);

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            await t.db.delete(messageThreads).where(eq(messageThreads.id, threadId));
        } else {
            await t.db
                .update(messageThreads)
                .set({ deletedAt: new Date() })
                .where(eq(messageThreads.id, threadId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "message_thread",
                entityId: threadId,
                metadata: { subject: thread.subject },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/messages/threads/[id]", e);
    }
}
