import type { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { PortalDb } from "@/db/client";
import {
    comments,
    decisions,
    events,
    goals,
    meetings,
    polls,
    proposals,
    tasks,
    users,
} from "@/db/schema";
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
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const ENTITY_TYPES = ["task", "event", "proposal", "meeting", "goal", "poll", "decision"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const createSchema = z.object({
    entityType: z.enum(ENTITY_TYPES),
    entityId: z.uuid(),
    body: z.string().trim().min(1).max(5000),
});
type CreateInput = z.infer<typeof createSchema>;

const commentSelection = {
    comment: comments,
    user: { id: users.id, name: users.name, image: users.image },
};

type TargetTable = {
    id: PgColumn;
    workspaceId: PgColumn;
    deletedAt?: PgColumn;
};

const TARGETS: Record<EntityType, { table: TargetTable; softDelete: boolean }> = {
    task: { table: tasks, softDelete: true },
    event: { table: events, softDelete: true },
    proposal: { table: proposals, softDelete: true },
    meeting: { table: meetings, softDelete: true },
    goal: { table: goals, softDelete: true },
    poll: { table: polls, softDelete: true },
    decision: { table: decisions, softDelete: false },
};

async function targetExists(
    db: PortalDb,
    workspaceId: string,
    entityType: EntityType,
    entityId: string,
): Promise<boolean> {
    const { table, softDelete } = TARGETS[entityType];
    const conds = [eq(table.workspaceId, workspaceId), eq(table.id, entityId)];
    if (softDelete) conds.push(isNull(table.deletedAt!));
    const rows = await db
        .select({ id: table.id })
        .from(table as never)
        .where(and(...conds))
        .limit(1);
    return rows.length > 0;
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const params = new URL(request.url).searchParams;
        const rawType = params.get("entityType");
        if (!rawType || !ENTITY_TYPES.includes(rawType as EntityType)) {
            throw new ApiError("Invalid entityType", 400);
        }
        const entityType = rawType as EntityType;
        const entityId = requireUuid(params.get("entityId"), "entityId");
        const { limit, cursor } = parsePagination(params);

        const conds = [
            eq(comments.workspaceId, t.workspaceId),
            eq(comments.entityType, entityType),
            eq(comments.entityId, entityId),
            isNull(comments.deletedAt),
        ];
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere([{ column: comments.createdAt, value: at }], comments.id, vals[1]),
                );
            }
        }

        const rows = await t.db
            .select(commentSelection)
            .from(comments)
            .leftJoin(users, eq(comments.userId, users.id))
            .where(and(...conds))
            .orderBy(desc(comments.createdAt), desc(comments.id))
            .limit(limit + 1);

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([
                last.comment.createdAt.toISOString(),
                last.comment.id,
            ]);
        }

        const res = ok(rows.map((r) => ({ ...r.comment, user: r.user })));
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/comments", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<CreateInput>(createSchema as never, request);

        if (!(await targetExists(t.db, t.workspaceId, body.entityType, body.entityId))) {
            throw new ApiError("Target not found", 404);
        }

        const inserted = await t.db
            .insert(comments)
            .values({
                workspaceId: t.workspaceId,
                entityType: body.entityType,
                entityId: body.entityId,
                userId: t.userId,
                body: body.body,
            })
            .returning();
        const comment = inserted[0];
        if (!comment) throw new ApiError("Failed to create comment", 500);

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "create",
            entityType: "comment",
            entityId: comment.id,
            metadata: { targetType: body.entityType, targetId: body.entityId },
            ipAddress: clientIp(request),
        });

        const rows = await t.db
            .select(commentSelection)
            .from(comments)
            .leftJoin(users, eq(comments.userId, users.id))
            .where(eq(comments.id, comment.id))
            .limit(1);

        return ok(rows[0], 201);
    } catch (e) {
        return handleRouteError("POST /api/comments", e);
    }
}
