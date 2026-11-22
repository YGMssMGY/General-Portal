import type { NextRequest } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { assetLoans, assets } from "@/db/schema";
import { handleRouteError, isUuid, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const MAX_IDS = 200;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const raw = new URL(request.url).searchParams.get("ids") ?? "";
        const ids = [
            ...new Set(
                raw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(isUuid),
            ),
        ].slice(0, MAX_IDS);
        if (ids.length === 0) return ok([]);
        const rows = await t.db.query.assetLoans.findMany({
            where: and(
                inArray(assetLoans.assetId, ids),
                eq(assetLoans.userId, t.userId),
                isNull(assetLoans.returnedAt),
                inArray(
                    assetLoans.assetId,
                    t.db
                        .select({ id: assets.id })
                        .from(assets)
                        .where(
                            and(eq(assets.workspaceId, t.workspaceId), isNull(assets.deletedAt)),
                        ),
                ),
            ),
            orderBy: [desc(assetLoans.borrowedAt)],
            with: { user: { columns: { id: true, name: true, email: true } } },
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/assets/loans/mine", e);
    }
}
