import { NextRequest } from "next/server";
import { and, desc, eq, isNotNull, lt, type AnyColumn } from "drizzle-orm";
import { z } from "zod";
import type { PortalDb } from "@/db/client";
import {
    attachments,
    cooperationRequests,
    events,
    linkItems,
    meetings,
    messageThreads,
    proposals,
    purchaseRequests,
    showcaseItems,
    subgroups,
    tasks,
} from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const TRASH_ENTITIES = [
    "tasks",
    "events",
    "proposals",
    "messageThreads",
    "meetings",
    "subgroups",
    "linkItems",
    "attachments",
    "showcaseItems",
    "cooperationRequests",
    "purchaseRequests",
] as const;
type TrashEntity = (typeof TRASH_ENTITIES)[number];

const entitySchema = z.object({
    entityType: z.enum(TRASH_ENTITIES),
    id: z.string().uuid(),
});
type EntityInput = z.infer<typeof entitySchema>;

async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const out = new Array<R>(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i]!);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

export interface TrashItem {
    entityType: TrashEntity;
    id: string;
    title: string;
    deletedAt: string;
}

async function listEntity(
    db: PortalDb,
    workspaceId: string,
    entity: TrashEntity,
    before: Date | null,
    perType: number,
): Promise<TrashItem[]> {
    const beforeConds = (col: AnyColumn) => (before ? [lt(col, before)] : []);
    switch (entity) {
        case "tasks": {
            const rows = await db
                .select({ id: tasks.id, title: tasks.title, deletedAt: tasks.deletedAt })
                .from(tasks)
                .where(
                    and(
                        eq(tasks.workspaceId, workspaceId),
                        isNotNull(tasks.deletedAt),
                        ...beforeConds(tasks.deletedAt),
                    ),
                )
                .orderBy(desc(tasks.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "events": {
            const rows = await db
                .select({ id: events.id, title: events.title, deletedAt: events.deletedAt })
                .from(events)
                .where(
                    and(
                        eq(events.workspaceId, workspaceId),
                        isNotNull(events.deletedAt),
                        ...beforeConds(events.deletedAt),
                    ),
                )
                .orderBy(desc(events.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "proposals": {
            const rows = await db
                .select({
                    id: proposals.id,
                    title: proposals.title,
                    deletedAt: proposals.deletedAt,
                })
                .from(proposals)
                .where(
                    and(
                        eq(proposals.workspaceId, workspaceId),
                        isNotNull(proposals.deletedAt),
                        ...beforeConds(proposals.deletedAt),
                    ),
                )
                .orderBy(desc(proposals.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "messageThreads": {
            const rows = await db
                .select({
                    id: messageThreads.id,
                    title: messageThreads.subject,
                    deletedAt: messageThreads.deletedAt,
                })
                .from(messageThreads)
                .where(
                    and(
                        eq(messageThreads.workspaceId, workspaceId),
                        isNotNull(messageThreads.deletedAt),
                        ...beforeConds(messageThreads.deletedAt),
                    ),
                )
                .orderBy(desc(messageThreads.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "meetings": {
            const rows = await db
                .select({ id: meetings.id, title: meetings.title, deletedAt: meetings.deletedAt })
                .from(meetings)
                .where(
                    and(
                        eq(meetings.workspaceId, workspaceId),
                        isNotNull(meetings.deletedAt),
                        ...beforeConds(meetings.deletedAt),
                    ),
                )
                .orderBy(desc(meetings.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "subgroups": {
            const rows = await db
                .select({ id: subgroups.id, title: subgroups.name, deletedAt: subgroups.deletedAt })
                .from(subgroups)
                .where(
                    and(
                        eq(subgroups.workspaceId, workspaceId),
                        isNotNull(subgroups.deletedAt),
                        ...beforeConds(subgroups.deletedAt),
                    ),
                )
                .orderBy(desc(subgroups.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "linkItems": {
            const rows = await db
                .select({
                    id: linkItems.id,
                    title: linkItems.title,
                    deletedAt: linkItems.deletedAt,
                })
                .from(linkItems)
                .where(
                    and(
                        eq(linkItems.workspaceId, workspaceId),
                        isNotNull(linkItems.deletedAt),
                        ...beforeConds(linkItems.deletedAt),
                    ),
                )
                .orderBy(desc(linkItems.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "attachments": {
            const rows = await db
                .select({
                    id: attachments.id,
                    title: attachments.fileName,
                    deletedAt: attachments.deletedAt,
                })
                .from(attachments)
                .where(
                    and(
                        eq(attachments.workspaceId, workspaceId),
                        isNotNull(attachments.deletedAt),
                        ...beforeConds(attachments.deletedAt),
                    ),
                )
                .orderBy(desc(attachments.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "showcaseItems": {
            const rows = await db
                .select({
                    id: showcaseItems.id,
                    title: showcaseItems.title,
                    deletedAt: showcaseItems.deletedAt,
                })
                .from(showcaseItems)
                .where(
                    and(
                        eq(showcaseItems.workspaceId, workspaceId),
                        isNotNull(showcaseItems.deletedAt),
                        ...beforeConds(showcaseItems.deletedAt),
                    ),
                )
                .orderBy(desc(showcaseItems.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "cooperationRequests": {
            const rows = await db
                .select({
                    id: cooperationRequests.id,
                    title: cooperationRequests.eventTitle,
                    deletedAt: cooperationRequests.deletedAt,
                })
                .from(cooperationRequests)
                .where(
                    and(
                        eq(cooperationRequests.workspaceId, workspaceId),
                        isNotNull(cooperationRequests.deletedAt),
                        ...beforeConds(cooperationRequests.deletedAt),
                    ),
                )
                .orderBy(desc(cooperationRequests.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
        case "purchaseRequests": {
            const rows = await db
                .select({
                    id: purchaseRequests.id,
                    title: purchaseRequests.title,
                    deletedAt: purchaseRequests.deletedAt,
                })
                .from(purchaseRequests)
                .where(
                    and(
                        eq(purchaseRequests.workspaceId, workspaceId),
                        isNotNull(purchaseRequests.deletedAt),
                        ...beforeConds(purchaseRequests.deletedAt),
                    ),
                )
                .orderBy(desc(purchaseRequests.deletedAt))
                .limit(perType);
            return rows.map((r) => ({
                entityType: entity,
                id: r.id,
                title: r.title,
                deletedAt: r.deletedAt?.toISOString() ?? "",
            }));
        }
    }
}

async function restoreEntity(
    db: PortalDb,
    workspaceId: string,
    entity: TrashEntity,
    id: string,
): Promise<boolean> {
    const now = new Date();
    switch (entity) {
        case "tasks": {
            const found = await db.query.tasks.findFirst({
                where: and(
                    eq(tasks.id, id),
                    eq(tasks.workspaceId, workspaceId),
                    isNotNull(tasks.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(tasks).set({ deletedAt: null, updatedAt: now }).where(eq(tasks.id, id));
            return true;
        }
        case "events": {
            const found = await db.query.events.findFirst({
                where: and(
                    eq(events.id, id),
                    eq(events.workspaceId, workspaceId),
                    isNotNull(events.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(events).set({ deletedAt: null }).where(eq(events.id, id));
            return true;
        }
        case "proposals": {
            const found = await db.query.proposals.findFirst({
                where: and(
                    eq(proposals.id, id),
                    eq(proposals.workspaceId, workspaceId),
                    isNotNull(proposals.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(proposals).set({ deletedAt: null }).where(eq(proposals.id, id));
            return true;
        }
        case "messageThreads": {
            const found = await db.query.messageThreads.findFirst({
                where: and(
                    eq(messageThreads.id, id),
                    eq(messageThreads.workspaceId, workspaceId),
                    isNotNull(messageThreads.deletedAt),
                ),
            });
            if (!found) return false;
            await db
                .update(messageThreads)
                .set({ deletedAt: null })
                .where(eq(messageThreads.id, id));
            return true;
        }
        case "meetings": {
            const found = await db.query.meetings.findFirst({
                where: and(
                    eq(meetings.id, id),
                    eq(meetings.workspaceId, workspaceId),
                    isNotNull(meetings.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(meetings).set({ deletedAt: null }).where(eq(meetings.id, id));
            return true;
        }
        case "subgroups": {
            const found = await db.query.subgroups.findFirst({
                where: and(
                    eq(subgroups.id, id),
                    eq(subgroups.workspaceId, workspaceId),
                    isNotNull(subgroups.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(subgroups).set({ deletedAt: null }).where(eq(subgroups.id, id));
            return true;
        }
        case "linkItems": {
            const found = await db.query.linkItems.findFirst({
                where: and(
                    eq(linkItems.id, id),
                    eq(linkItems.workspaceId, workspaceId),
                    isNotNull(linkItems.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(linkItems).set({ deletedAt: null }).where(eq(linkItems.id, id));
            return true;
        }
        case "attachments": {
            const found = await db.query.attachments.findFirst({
                where: and(
                    eq(attachments.id, id),
                    eq(attachments.workspaceId, workspaceId),
                    isNotNull(attachments.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(attachments).set({ deletedAt: null }).where(eq(attachments.id, id));
            return true;
        }
        case "showcaseItems": {
            const found = await db.query.showcaseItems.findFirst({
                where: and(
                    eq(showcaseItems.id, id),
                    eq(showcaseItems.workspaceId, workspaceId),
                    isNotNull(showcaseItems.deletedAt),
                ),
            });
            if (!found) return false;
            await db.update(showcaseItems).set({ deletedAt: null }).where(eq(showcaseItems.id, id));
            return true;
        }
        case "cooperationRequests": {
            const found = await db.query.cooperationRequests.findFirst({
                where: and(
                    eq(cooperationRequests.id, id),
                    eq(cooperationRequests.workspaceId, workspaceId),
                    isNotNull(cooperationRequests.deletedAt),
                ),
            });
            if (!found) return false;
            await db
                .update(cooperationRequests)
                .set({ deletedAt: null })
                .where(eq(cooperationRequests.id, id));
            return true;
        }
        case "purchaseRequests": {
            const found = await db.query.purchaseRequests.findFirst({
                where: and(
                    eq(purchaseRequests.id, id),
                    eq(purchaseRequests.workspaceId, workspaceId),
                    isNotNull(purchaseRequests.deletedAt),
                ),
            });
            if (!found) return false;
            await db
                .update(purchaseRequests)
                .set({ deletedAt: null })
                .where(eq(purchaseRequests.id, id));
            return true;
        }
    }
}

async function hardDeleteEntity(
    db: PortalDb,
    workspaceId: string,
    entity: TrashEntity,
    id: string,
): Promise<boolean> {
    switch (entity) {
        case "tasks":
            return (
                (
                    await db
                        .delete(tasks)
                        .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
                        .returning({ id: tasks.id })
                ).length > 0
            );
        case "events":
            return (
                (
                    await db
                        .delete(events)
                        .where(and(eq(events.id, id), eq(events.workspaceId, workspaceId)))
                        .returning({ id: events.id })
                ).length > 0
            );
        case "proposals":
            return (
                (
                    await db
                        .delete(proposals)
                        .where(and(eq(proposals.id, id), eq(proposals.workspaceId, workspaceId)))
                        .returning({ id: proposals.id })
                ).length > 0
            );
        case "messageThreads":
            return (
                (
                    await db
                        .delete(messageThreads)
                        .where(
                            and(
                                eq(messageThreads.id, id),
                                eq(messageThreads.workspaceId, workspaceId),
                            ),
                        )
                        .returning({ id: messageThreads.id })
                ).length > 0
            );
        case "meetings":
            return (
                (
                    await db
                        .delete(meetings)
                        .where(and(eq(meetings.id, id), eq(meetings.workspaceId, workspaceId)))
                        .returning({ id: meetings.id })
                ).length > 0
            );
        case "subgroups":
            return (
                (
                    await db
                        .delete(subgroups)
                        .where(and(eq(subgroups.id, id), eq(subgroups.workspaceId, workspaceId)))
                        .returning({ id: subgroups.id })
                ).length > 0
            );
        case "linkItems":
            return (
                (
                    await db
                        .delete(linkItems)
                        .where(and(eq(linkItems.id, id), eq(linkItems.workspaceId, workspaceId)))
                        .returning({ id: linkItems.id })
                ).length > 0
            );
        case "attachments":
            return (
                (
                    await db
                        .delete(attachments)
                        .where(
                            and(eq(attachments.id, id), eq(attachments.workspaceId, workspaceId)),
                        )
                        .returning({ id: attachments.id })
                ).length > 0
            );
        case "showcaseItems":
            return (
                (
                    await db
                        .delete(showcaseItems)
                        .where(
                            and(
                                eq(showcaseItems.id, id),
                                eq(showcaseItems.workspaceId, workspaceId),
                            ),
                        )
                        .returning({ id: showcaseItems.id })
                ).length > 0
            );
        case "cooperationRequests":
            return (
                (
                    await db
                        .delete(cooperationRequests)
                        .where(
                            and(
                                eq(cooperationRequests.id, id),
                                eq(cooperationRequests.workspaceId, workspaceId),
                            ),
                        )
                        .returning({ id: cooperationRequests.id })
                ).length > 0
            );
        case "purchaseRequests":
            return (
                (
                    await db
                        .delete(purchaseRequests)
                        .where(
                            and(
                                eq(purchaseRequests.id, id),
                                eq(purchaseRequests.workspaceId, workspaceId),
                            ),
                        )
                        .returning({ id: purchaseRequests.id })
                ).length > 0
            );
    }
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const params = new URL(request.url).searchParams;
        const entityType = params.get("entityType") as TrashEntity | null;
        const entities = entityType
            ? TRASH_ENTITIES.includes(entityType)
                ? [entityType]
                : (() => {
                      throw new ApiError("Invalid entityType", 400);
                  })()
            : [...TRASH_ENTITIES];
        const cursorRaw = params.get("cursor");
        const before = cursorRaw ? new Date(cursorRaw) : null;
        if (cursorRaw && (before === null || Number.isNaN(before.getTime()))) {
            throw new ApiError("Invalid cursor", 400);
        }
        const lists = await mapWithConcurrency(entities, 6, (entity) =>
            listEntity(t.db, t.workspaceId, entity, before, 20),
        );
        const merged: TrashItem[] = lists.flat();
        merged.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
        const items = merged.slice(0, 50);
        const nextCursor = items.length > 0 ? items[items.length - 1].deletedAt : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/trash", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<EntityInput>(entitySchema as never, request);
        if (body.entityType === "tasks") {
            if (!t.permissions.includes("manage_all_tasks")) throw new ApiError("Forbidden", 403);
        } else if (t.roleName === "member") {
            throw new ApiError("Forbidden", 403);
        }
        const restored = await restoreEntity(t.db, t.workspaceId, body.entityType, body.id);
        if (!restored) throw new ApiError("Item not found", 404);
        return ok({ restored: true });
    } catch (e) {
        return handleRouteError("POST /api/trash/restore", e);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        if (t.roleName !== "admin") throw new ApiError("Forbidden", 403);
        const body = await parseBody<EntityInput>(entitySchema as never, request);
        const deleted = await hardDeleteEntity(t.db, t.workspaceId, body.entityType, body.id);
        if (!deleted) throw new ApiError("Item not found", 404);
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/trash", e);
    }
}
