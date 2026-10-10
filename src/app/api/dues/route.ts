import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { memberDues, memberships } from "@/db/schema";
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

const createDueSchema = z.object({
    userId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    amountCents: z.number().int().positive().max(100_000_000_00),
    dueDate: z.coerce.date().nullish(),
});
type CreateDueInput = z.infer<typeof createDueSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);
        const canManage = t.permissions.includes("manage_dues");
        const conds = [eq(memberDues.workspaceId, t.workspaceId)];
        if (!canManage) conds.push(eq(memberDues.userId, t.userId));
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
                        [{ column: memberDues.createdAt, value: at }],
                        memberDues.id,
                        vals[1],
                    ),
                );
            }
        }
        const rows = await t.db.query.memberDues.findMany({
            where: and(...conds),
            orderBy: [desc(memberDues.createdAt), desc(memberDues.id)],
            limit: limit + 1,
            with: { user: { columns: { id: true, name: true, email: true } } },
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
        return handleRouteError("GET /api/dues", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_dues", module: "finance" });
        const body = await parseBody<CreateDueInput>(createDueSchema as never, request);
        const member = await t.db.query.memberships.findFirst({
            where: and(
                eq(memberships.workspaceId, t.workspaceId),
                eq(memberships.userId, body.userId),
            ),
            columns: { id: true },
        });
        if (!member) throw new ApiError("Member not found in this workspace", 404);
        const [due] = await t.db
            .insert(memberDues)
            .values({
                workspaceId: t.workspaceId,
                userId: body.userId,
                title: body.title,
                amountCents: body.amountCents,
                dueDate: body.dueDate ?? null,
                status: "unpaid",
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "member_due",
            entityId: due.id,
            metadata: { title: due.title, amountCents: due.amountCents },
            ipAddress: clientIp(request),
        });
        return ok(due, 201);
    } catch (e) {
        return handleRouteError("POST /api/dues", e);
    }
}
