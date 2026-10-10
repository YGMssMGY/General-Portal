import type { NextRequest } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { sum } from "drizzle-orm";
import { z } from "zod";
import { assetLoans, assets } from "@/db/schema";
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
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createAssetSchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullish(),
    quantity: z.number().int().min(1).max(100000).default(1),
    condition: z.string().trim().max(64).optional(),
});
type CreateAssetInput = z.infer<typeof createAssetSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);
        const conds = [eq(assets.workspaceId, t.workspaceId), isNull(assets.deletedAt)];
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
                    keysetWhere([{ column: assets.createdAt, value: at }], assets.id, vals[1]),
                );
            }
        }
        const rows = await t.db.query.assets.findMany({
            where: and(...conds),
            orderBy: [desc(assets.createdAt), desc(assets.id)],
            limit: limit + 1,
        });
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const ids = rows.map((r) => r.id);
        const loanSums =
            ids.length > 0
                ? await t.db
                      .select({ assetId: assetLoans.assetId, n: sum(assetLoans.quantity) })
                      .from(assetLoans)
                      .where(and(inArray(assetLoans.assetId, ids), isNull(assetLoans.returnedAt)))
                      .groupBy(assetLoans.assetId)
                : [];
        const outMap = new Map(loanSums.map((r) => [r.assetId, Number(r.n ?? 0)]));
        const items = rows.map((a) => {
            const onLoan = outMap.get(a.id) ?? 0;
            return { ...a, onLoan, available: Math.max(0, a.quantity - onLoan) };
        });
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/assets", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_assets", module: "members" });
        const body = await parseBody<CreateAssetInput>(createAssetSchema as never, request);
        const [asset] = await t.db
            .insert(assets)
            .values({
                workspaceId: t.workspaceId,
                name: body.name,
                description: body.description ?? null,
                quantity: body.quantity,
                condition: body.condition ?? "good",
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "asset",
            entityId: asset.id,
            metadata: { name: asset.name, quantity: asset.quantity },
            ipAddress: clientIp(request),
        });
        return ok({ ...asset, onLoan: 0, available: asset.quantity }, 201);
    } catch (e) {
        return handleRouteError("POST /api/assets", e);
    }
}
