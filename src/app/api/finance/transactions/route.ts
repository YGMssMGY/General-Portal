import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { attachments, transactions } from "@/db/schema";
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

const createTransactionSchema = z.object({
    amount: z.number(),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    date: z.string().nullable().optional(),
});
type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

function toCents(v: unknown): number {
    if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new ApiError("Amount must be a finite number", 400);
    }
    if (v < 0) throw new ApiError("Amount must be non-negative", 400);
    return Math.round(v * 100);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const type = searchParams.get("type");

        const conds = [eq(transactions.workspaceId, t.workspaceId), isNull(transactions.deletedAt)];
        if (type === "income" || type === "expense") conds.push(eq(transactions.type, type));

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
                        [{ column: transactions.date, value: at }],
                        transactions.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.transactions.findMany({
            where: and(...conds),
            orderBy: [desc(transactions.date), desc(transactions.id)],
            limit: limit + 1,
            with: { createdBy: { columns: { id: true, name: true, image: true } } },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.date.toISOString(), last.id]);
        }

        const ids = rows.map((r) => r.id);
        const countMap = new Map<string, number>();
        if (ids.length > 0) {
            const counts = await t.db
                .select({ entityId: attachments.entityId, n: count() })
                .from(attachments)
                .where(
                    and(
                        eq(attachments.entityType, "transaction"),
                        inArray(attachments.entityId, ids),
                        eq(attachments.workspaceId, t.workspaceId),
                        isNull(attachments.deletedAt),
                    ),
                )
                .groupBy(attachments.entityId);
            for (const c of counts) countMap.set(c.entityId, c.n);
        }
        const items = rows.map((r) => ({ ...r, attachmentCount: countMap.get(r.id) ?? 0 }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/finance/transactions", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_finance", module: "finance" });
        const body = await parseBody<CreateTransactionInput>(
            createTransactionSchema as never,
            request,
        );
        const cents = toCents(body.amount);

        let date = new Date();
        if (body.date) {
            date = new Date(body.date);
            if (Number.isNaN(date.getTime())) throw new ApiError("Invalid date", 400);
        }

        const id = randomUUID();
        const [[transaction]] = await Promise.all([
            t.db
                .insert(transactions)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    amountCents: cents,
                    type: body.type,
                    category: body.category?.trim() || null,
                    description: body.description?.trim() || null,
                    date,
                    createdById: t.userId,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create_transaction",
                entityType: "transaction",
                entityId: id,
                metadata: { amountCents: cents, type: body.type },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(transaction, 201);
    } catch (e) {
        return handleRouteError("POST /api/finance/transactions", e);
    }
}
