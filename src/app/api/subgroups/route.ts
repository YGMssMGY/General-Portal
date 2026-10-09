import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { subgroupMemberships, subgroups } from "@/db/schema";
import {
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    ok,
    parseBody,
    parsePagination,
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
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2000).nullish(),
    color: z.string().trim().max(32).nullish(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { limit, cursor } = parsePagination(request.nextUrl.searchParams);
        const canManage = t.permissions.includes("manage_subgroups");

        const mine = await t.db.query.subgroupMemberships.findMany({
            where: eq(subgroupMemberships.userId, t.userId),
            columns: { subgroupId: true },
        });
        const myIds = mine.map((m) => m.subgroupId);
        const mySet = new Set(myIds);
        if (!canManage && myIds.length === 0) {
            const res = ok([]);
            res.headers.set("X-Next-Cursor", "");
            return res;
        }

        const cVals = decodeCursorValues(cursor);
        const cName = cVals && typeof cVals[0] === "string" ? cVals[0] : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cName !== null && cId
                ? or(
                      gt(subgroups.name, cName),
                      and(eq(subgroups.name, cName), gt(subgroups.id, cId)),
                  )
                : undefined;

        const rows = await t.db.query.subgroups.findMany({
            where: and(
                eq(subgroups.workspaceId, t.workspaceId),
                isNull(subgroups.deletedAt),
                canManage ? undefined : inArray(subgroups.id, myIds),
                cursorCond,
            ),
            orderBy: [asc(subgroups.name), asc(subgroups.id)],
            limit: limit + 1,
        });

        const page = rows.slice(0, limit);
        const pageIds = page.map((r) => r.id);
        const counts: Record<string, number> = {};
        if (pageIds.length > 0) {
            const countRows = await t.db
                .select({ subgroupId: subgroupMemberships.subgroupId, n: count() })
                .from(subgroupMemberships)
                .where(inArray(subgroupMemberships.subgroupId, pageIds))
                .groupBy(subgroupMemberships.subgroupId);
            for (const r of countRows) counts[r.subgroupId] = r.n;
        }

        const items = page.map((r) => ({
            ...r,
            _count: { members: counts[r.id] ?? 0 },
            isMember: mySet.has(r.id),
        }));

        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last ? encodeCursorValues([last.name, last.id]) : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/subgroups", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_subgroups",
            module: "members",
        });
        const data = await parseBody(body(createSchema), request);

        const [subgroup] = await t.db
            .insert(subgroups)
            .values({
                workspaceId: t.workspaceId,
                name: data.name,
                description: data.description ?? null,
                color: data.color ?? "#0f62fe",
                createdById: t.userId,
            })
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "subgroup",
            entityId: subgroup.id,
            metadata: { name: subgroup.name },
            ipAddress: clientIp(request),
        });

        return ok({ ...subgroup, _count: { members: 0 }, isMember: false }, 201);
    } catch (e) {
        return handleRouteError("POST /api/subgroups", e);
    }
}
