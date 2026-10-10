import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { pollOptions, pollVotes, polls } from "@/db/schema";
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
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

const createSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullish(),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(10),
    multiple: z.boolean().optional(),
    anonymous: z.boolean().optional(),
    closesAt: z.string().nullish(),
});

export function isClosed(status: string, closesAt: Date | null): boolean {
    if (status === "closed") return true;
    return closesAt !== null && closesAt.getTime() <= Date.now();
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const params = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(params);
        const status = params.get("status");
        const conds = [eq(polls.workspaceId, t.workspaceId), isNull(polls.deletedAt)];
        if (status === "open" || status === "closed") conds.push(eq(polls.status, status));
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
                    keysetWhere([{ column: polls.createdAt, value: at }], polls.id, vals[1]),
                );
            }
        }
        const rows = await t.db.query.polls.findMany({
            where: and(...conds),
            orderBy: [desc(polls.createdAt), desc(polls.id)],
            limit: limit + 1,
            with: {
                options: { orderBy: (o, { asc }) => [asc(o.position)] },
                createdBy: { columns: { id: true, name: true } },
            },
        });
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const ids = rows.map((r) => r.id);
        const countByOption = new Map<string, number>();
        const myVotes = new Map<string, string[]>();
        if (ids.length > 0) {
            const counts = await t.db
                .select({
                    optionId: pollVotes.optionId,
                    count: sql<number>`count(*)::int`,
                })
                .from(pollVotes)
                .where(inArray(pollVotes.pollId, ids))
                .groupBy(pollVotes.optionId);
            for (const c of counts) countByOption.set(c.optionId, Number(c.count));
            const mine = await t.db.query.pollVotes.findMany({
                where: and(inArray(pollVotes.pollId, ids), eq(pollVotes.userId, t.userId)),
                columns: { pollId: true, optionId: true },
            });
            for (const v of mine) {
                const list = myVotes.get(v.pollId) ?? [];
                list.push(v.optionId);
                myVotes.set(v.pollId, list);
            }
        }
        const items = rows.map((r) => ({
            ...r,
            closed: isClosed(r.status, r.closesAt),
            options: r.options.map((o) => ({ ...o, votes: countByOption.get(o.id) ?? 0 })),
            totalVotes: r.options.reduce((n, o) => n + (countByOption.get(o.id) ?? 0), 0),
            myVotes: myVotes.get(r.id) ?? [],
        }));
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/polls", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const data = await parseBody(createSchema as never, request);
        const body = data as z.infer<typeof createSchema>;
        let closesAt: Date | null = null;
        if (body.closesAt) {
            closesAt = new Date(body.closesAt);
            if (Number.isNaN(closesAt.getTime())) throw new ApiError("Invalid closesAt", 400);
        }
        const id = randomUUID();
        const [poll] = await t.db
            .insert(polls)
            .values({
                id,
                workspaceId: t.workspaceId,
                title: body.title,
                description: body.description ?? null,
                multiple: body.multiple ?? false,
                anonymous: body.anonymous ?? false,
                closesAt,
                createdById: t.userId,
            })
            .returning();
        const options = await t.db
            .insert(pollOptions)
            .values(
                body.options.map((text, i) => ({
                    id: randomUUID(),
                    pollId: id,
                    text,
                    position: i,
                })),
            )
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "poll",
            entityId: id,
            metadata: { title: body.title },
            ipAddress: clientIp(request),
        });
        return ok({ ...poll, options }, 201);
    } catch (e) {
        return handleRouteError("POST /api/polls", e);
    }
}
