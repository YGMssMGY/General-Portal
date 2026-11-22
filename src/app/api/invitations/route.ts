import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { invitations } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant, sha256Hex } from "@/lib/tenant";

const createSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    roleName: z.enum(["admin", "officer", "member"]).default("member"),
    expiresInDays: z.number().int().min(1).max(30).default(7),
});

const PENDING_CAP = 100;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_users",
            module: "members",
        });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);
        const conds = [
            eq(invitations.workspaceId, t.workspaceId),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, new Date()),
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
                    keysetWhere(
                        [{ column: invitations.createdAt, value: at }],
                        invitations.id,
                        vals[1],
                    ),
                );
            }
        }
        const rows = await t.db
            .select({
                id: invitations.id,
                email: invitations.email,
                roleName: invitations.roleName,
                createdAt: invitations.createdAt,
                expiresAt: invitations.expiresAt,
            })
            .from(invitations)
            .where(and(...conds))
            .orderBy(desc(invitations.createdAt), desc(invitations.id))
            .limit(limit + 1);
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/invitations", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_users",
            module: "members",
        });
        const body = await parseBody(createSchema, request);
        const counts = await t.db
            .select({ value: count() })
            .from(invitations)
            .where(
                and(
                    eq(invitations.workspaceId, t.workspaceId),
                    isNull(invitations.acceptedAt),
                    isNull(invitations.revokedAt),
                ),
            );
        if ((counts[0]?.value ?? 0) >= PENDING_CAP) {
            throw new ApiError("Invitation limit reached", 409);
        }
        const token = randomBytes(32).toString("base64url");
        const [row] = await t.db
            .insert(invitations)
            .values({
                workspaceId: t.workspaceId,
                email: body.email,
                roleName: body.roleName,
                tokenHash: sha256Hex(token),
                invitedById: t.userId,
                expiresAt: new Date(Date.now() + body.expiresInDays * 86_400_000),
            })
            .returning({ id: invitations.id, expiresAt: invitations.expiresAt });
        if (!row) throw new ApiError("Could not create invitation", 500);
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "create",
            entityType: "invitation",
            entityId: row.id,
            metadata: { email: body.email, roleName: body.roleName },
        });
        return ok({ token, id: row.id, expiresAt: row.expiresAt }, 201);
    } catch (e) {
        return handleRouteError("POST /api/invitations", e);
    }
}
