import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { goals, keyResults, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import {
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

const krSchema = z.object({
    title: z.string().trim().min(1).max(200),
    target: z.number().int().positive().max(1000000000),
    unit: z.string().trim().max(20).nullish(),
});

const createSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullish(),
    ownerId: z.string().uuid().nullish(),
    dueDate: z.string().nullish(),
    status: z.enum(["active", "completed", "archived"]).optional(),
    keyResults: z.array(krSchema).max(20).optional(),
});

export function goalProgress(krs: Array<{ target: number; current: number }>): number {
    if (krs.length === 0) return 0;
    const avg =
        krs.reduce((n, k) => n + (k.target > 0 ? Math.min(k.current / k.target, 1) : 0), 0) /
        krs.length;
    return Math.round(avg * 100);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const params = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(params);
        const status = params.get("status");
        const conds = [eq(goals.workspaceId, t.workspaceId), isNull(goals.deletedAt)];
        if (status === "active" || status === "completed" || status === "archived") {
            conds.push(eq(goals.status, status));
        }
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
                    keysetWhere([{ column: goals.createdAt, value: at }], goals.id, vals[1]),
                );
            }
        }
        const rows = await t.db.query.goals.findMany({
            where: and(...conds),
            orderBy: [desc(goals.createdAt), desc(goals.id)],
            limit: limit + 1,
            with: {
                keyResults: { orderBy: (o, { asc }) => [asc(o.position)] },
                owner: { columns: { id: true, name: true } },
            },
        });
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const items = rows.map((g) => ({ ...g, progress: goalProgress(g.keyResults) }));
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/goals", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "create_task", module: "members" });
        const data = await parseBody(createSchema as never, request);
        const body = data as z.infer<typeof createSchema>;
        if (body.ownerId) {
            const owner = await t.db.query.users.findFirst({
                where: eq(users.id, body.ownerId),
                columns: { id: true },
            });
            if (!owner) throw new ApiError("Owner not found", 404);
        }
        let dueDate: Date | null = null;
        if (body.dueDate) {
            dueDate = new Date(body.dueDate);
            if (Number.isNaN(dueDate.getTime())) throw new ApiError("Invalid dueDate", 400);
        }
        const id = randomUUID();
        const [goal] = await t.db
            .insert(goals)
            .values({
                id,
                workspaceId: t.workspaceId,
                title: body.title,
                description: body.description ?? null,
                ownerId: body.ownerId ?? null,
                status: body.status ?? "active",
                dueDate,
            })
            .returning();
        const krs =
            body.keyResults && body.keyResults.length > 0
                ? await t.db
                      .insert(keyResults)
                      .values(
                          body.keyResults.map((k, i) => ({
                              id: randomUUID(),
                              goalId: id,
                              title: k.title,
                              target: k.target,
                              unit: k.unit ?? "",
                              position: i,
                          })),
                      )
                      .returning()
                : [];
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "goal",
            entityId: id,
            metadata: { title: body.title },
            ipAddress: clientIp(request),
        });
        return ok({ ...goal, keyResults: krs, progress: goalProgress(krs) }, 201);
    } catch (e) {
        return handleRouteError("POST /api/goals", e);
    }
}
