import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiTokens } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant, sha256Hex } from "@/lib/tenant";

const createTokenSchema = z.object({
    name: z.string().trim().min(1).max(128),
    scopes: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
    expiresAt: z.string().optional(),
});
type CreateTokenInput = z.infer<typeof createTokenSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_api_tokens",
            module: "members",
        });
        const rows = await t.db.query.apiTokens.findMany({
            where: eq(apiTokens.workspaceId, t.workspaceId),
            orderBy: [desc(apiTokens.createdAt)],
            columns: {
                id: true,
                workspaceId: true,
                userId: true,
                name: true,
                scopes: true,
                expiresAt: true,
                lastUsedAt: true,
                createdAt: true,
            },
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/api-tokens", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_api_tokens",
            module: "members",
        });
        const body = await parseBody<CreateTokenInput>(createTokenSchema as never, request);
        let expiresAt: Date | null = null;
        if (body.expiresAt) {
            expiresAt = new Date(body.expiresAt);
            if (Number.isNaN(expiresAt.getTime())) throw new ApiError("Invalid expiresAt", 400);
            if (expiresAt.getTime() <= Date.now())
                throw new ApiError("expiresAt must be future", 400);
        }
        const token = randomBytes(32).toString("base64url");
        const [row] = await t.db
            .insert(apiTokens)
            .values({
                workspaceId: t.workspaceId,
                userId: t.userId,
                name: body.name,
                tokenHash: sha256Hex(token),
                scopes: body.scopes,
                expiresAt,
            })
            .returning();
        if (!row) throw new ApiError("Failed to create token", 500);
        return ok({ id: row.id, token }, 201);
    } catch (e) {
        return handleRouteError("POST /api/api-tokens", e);
    }
}
