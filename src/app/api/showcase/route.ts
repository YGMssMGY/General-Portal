import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { showcaseItems } from "@/db/schema";
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
    type: z.string().trim().min(1).max(50),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullish(),
    imageUrl: z.string().trim().max(2000).nullish(),
    linkUrl: z.string().trim().max(2000).nullish(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { limit, cursor } = parsePagination(request.nextUrl.searchParams);

        const cVals = decodeCursorValues(cursor);
        const cOrder = cVals && typeof cVals[0] === "number" ? cVals[0] : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cOrder !== null && cId
                ? or(
                      gt(showcaseItems.sortOrder, cOrder),
                      and(eq(showcaseItems.sortOrder, cOrder), gt(showcaseItems.id, cId)),
                  )
                : undefined;

        const rows = await t.db.query.showcaseItems.findMany({
            where: and(
                eq(showcaseItems.workspaceId, t.workspaceId),
                isNull(showcaseItems.deletedAt),
                cursorCond,
            ),
            orderBy: [asc(showcaseItems.sortOrder), asc(showcaseItems.id)],
            limit: limit + 1,
            with: { createdBy: { columns: { id: true, name: true } } },
        });

        const items = rows.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last ? encodeCursorValues([last.sortOrder, last.id]) : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/showcase", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_showcase",
            module: "members",
        });
        const data = await parseBody(body(createSchema), request);

        const [item] = await t.db
            .insert(showcaseItems)
            .values({
                workspaceId: t.workspaceId,
                type: data.type,
                title: data.title,
                description: data.description ?? null,
                imageUrl: data.imageUrl ?? null,
                linkUrl: data.linkUrl ?? null,
                createdById: t.userId,
            })
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "showcase_item",
            entityId: item.id,
            metadata: { title: item.title, type: data.type },
            ipAddress: clientIp(request),
        });

        return ok(item, 201);
    } catch (e) {
        return handleRouteError("POST /api/showcase", e);
    }
}
