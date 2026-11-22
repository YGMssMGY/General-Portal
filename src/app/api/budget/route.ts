import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { budgetAllocations } from "@/db/schema";
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
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createAllocationSchema = z.object({
    category: z.string().trim().min(1),
    amount: z.number(),
    fiscalYear: z.number().int().optional(),
    description: z.string().trim().nullable().optional(),
});
type CreateAllocationInput = z.infer<typeof createAllocationSchema>;

function toCents(v: unknown): number {
    if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new ApiError("Amount must be a finite number", 400);
    }
    if (v < 0) throw new ApiError("Amount must be non-negative", 400);
    return Math.round(v * 100);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "view_reports", module: "budget" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const fiscalYear = Number(searchParams.get("fiscalYear")) || new Date().getFullYear();

        const conds = [
            eq(budgetAllocations.workspaceId, t.workspaceId),
            eq(budgetAllocations.fiscalYear, fiscalYear),
            isNull(budgetAllocations.deletedAt),
        ];
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length === 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: budgetAllocations.createdAt, value: at }],
                        budgetAllocations.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.budgetAllocations.findMany({
            where: and(...conds),
            orderBy: [desc(budgetAllocations.createdAt), desc(budgetAllocations.id)],
            limit: limit + 1,
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
        return handleRouteError("GET /api/budget", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_budget", module: "budget" });
        const body = await parseBody<CreateAllocationInput>(
            createAllocationSchema as never,
            request,
        );
        const cents = toCents(body.amount);

        const id = randomUUID();
        const [[allocation]] = await Promise.all([
            t.db
                .insert(budgetAllocations)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    category: body.category,
                    amountCents: cents,
                    fiscalYear: body.fiscalYear ?? new Date().getFullYear(),
                    description: body.description?.trim() || null,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create_budget_allocation",
                entityType: "budget_allocation",
                entityId: id,
                metadata: { category: body.category, amountCents: cents },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(allocation, 201);
    } catch (e) {
        return handleRouteError("POST /api/budget", e);
    }
}
