import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { decisions } from "@/db/schema";
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

const createSchema = z.object({
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(5000),
    entityType: z.string().trim().max(50).nullish(),
    entityId: z.string().trim().max(100).nullish(),
    decidedAt: z.string().nullish(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const params = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(params);
        const entityType = params.get("entityType");
        const conds = [eq(decisions.workspaceId, t.workspaceId)];
        if (entityType) conds.push(eq(decisions.entityType, entityType));
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
                    keysetWhere(
                        [{ column: decisions.createdAt, value: at }],
                        decisions.id,
                        vals[1],
                    ),
                );
            }
        }
        const rows = await t.db.query.decisions.findMany({
            where: and(...conds),
            orderBy: [desc(decisions.createdAt), desc(decisions.id)],
            limit: limit + 1,
            with: { decidedBy: { columns: { id: true, name: true } } },
        });
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/decisions", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_decisions",
            module: "members",
        });
        const data = await parseBody(createSchema as never, request);
        const body = data as z.infer<typeof createSchema>;
        let decidedAt = new Date();
        if (body.decidedAt) {
            decidedAt = new Date(body.decidedAt);
            if (Number.isNaN(decidedAt.getTime())) throw new ApiError("Invalid decidedAt", 400);
        }
        const id = randomUUID();
        const [decision] = await t.db
            .insert(decisions)
            .values({
                id,
                workspaceId: t.workspaceId,
                title: body.title,
                summary: body.summary,
                entityType: body.entityType ?? null,
                entityId: body.entityId ?? null,
                decidedById: t.userId,
                decidedAt,
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "recorded",
            entityType: "decision",
            entityId: id,
            metadata: {
                title: body.title,
                linkedEntityType: body.entityType ?? null,
                linkedEntityId: body.entityId ?? null,
            },
            ipAddress: clientIp(request),
        });
        return ok(decision, 201);
    } catch (e) {
        return handleRouteError("POST /api/decisions", e);
    }
}
