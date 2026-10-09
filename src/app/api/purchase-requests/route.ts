import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { purchaseRequests } from "@/db/schema";
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

const PURCHASE_STATUSES = [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "fulfilled",
] as const;

const createSchema = z.object({
    title: z.string().trim().min(1).max(200),
    itemName: z.string().trim().min(1).max(200),
    cost: z.number(),
    justification: z.string().trim().min(1).max(5000),
    quantity: z.number().int().positive().max(100000).default(1),
});

const withCost = <T extends { costCents: number }>(r: T) => ({ ...r, cost: r.costCents / 100 });

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const sp = request.nextUrl.searchParams;
        const { limit, cursor } = parsePagination(sp);
        const statusParam = sp.get("status")?.trim() || null;
        const status =
            statusParam && (PURCHASE_STATUSES as readonly string[]).includes(statusParam)
                ? statusParam
                : null;

        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? keysetWhere(
                      [{ column: purchaseRequests.createdAt, value: cDate }],
                      purchaseRequests.id,
                      cId,
                  )
                : undefined;

        const rows = await t.db.query.purchaseRequests.findMany({
            where: and(
                eq(purchaseRequests.workspaceId, t.workspaceId),
                isNull(purchaseRequests.deletedAt),
                status
                    ? eq(purchaseRequests.status, status as (typeof PURCHASE_STATUSES)[number])
                    : undefined,
                cursorCond,
            ),
            orderBy: [desc(purchaseRequests.createdAt), desc(purchaseRequests.id)],
            limit: limit + 1,
            with: {
                submittedBy: { columns: { id: true, name: true, email: true, image: true } },
                reviewedBy: { columns: { id: true, name: true, image: true } },
            },
        });

        const items = rows.slice(0, limit).map(withCost);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/purchase-requests", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const data = await parseBody(body(createSchema), request);

        if (!Number.isFinite(data.cost) || data.cost < 0)
            throw new ApiError("Valid cost is required", 400);
        const costCents = Math.round(data.cost * 100);

        const [row] = await t.db
            .insert(purchaseRequests)
            .values({
                workspaceId: t.workspaceId,
                title: data.title,
                itemName: data.itemName,
                costCents,
                justification: data.justification,
                quantity: data.quantity,
                status: "submitted",
                submittedById: t.userId,
            })
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "submitted",
            entityType: "purchase_request",
            entityId: row.id,
            metadata: { title: row.title, itemName: row.itemName, costCents },
            ipAddress: clientIp(request),
        });

        return ok(withCost({ ...row, submittedBy: null, reviewedBy: null }), 201);
    } catch (e) {
        return handleRouteError("POST /api/purchase-requests", e);
    }
}
