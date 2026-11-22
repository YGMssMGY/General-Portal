import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { config } from "@/config";
import { savedViews } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { requireTenant, type TenantContext } from "@/lib/tenant";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const REVOKED_EXP = 1;

const getSchema = z.object({ id: z.uuid() });
const postSchema = z.object({ id: z.uuid(), revoke: z.literal(true) });

function sign(raw: string): string {
    return createHmac("sha256", config.authSecret).update(raw).digest("base64url");
}

function buildShare(
    portal: string,
    viewId: string,
    workspaceId: string,
    userId: string,
    exp: number,
    version: number,
) {
    const raw = `${viewId}|${workspaceId}|${userId}|${exp}|${version}`;
    const payload = Buffer.from(raw, "utf8").toString("base64url");
    return {
        url: `/${portal}/saved-views/shared/${payload}.${sign(raw)}`,
        expiresAt: new Date(exp * 1000).toISOString(),
    };
}

async function authorizeView(
    t: TenantContext,
    id: string,
): Promise<typeof savedViews.$inferSelect> {
    const view = await t.db.query.savedViews.findFirst({
        where: and(eq(savedViews.id, id), eq(savedViews.workspaceId, t.workspaceId)),
    });
    if (!view) throw new ApiError("Saved view not found", 404);
    if (
        !view.isShared &&
        view.userId !== t.userId &&
        !hasPermission(t.permissions, "manage_reports")
    ) {
        throw new ApiError("Forbidden", 403);
    }
    return view;
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const parsed = getSchema.safeParse({ id: new URL(request.url).searchParams.get("id") });
        if (!parsed.success) throw new ApiError("Invalid id", 400);
        const view = await authorizeView(t, parsed.data.id);
        const exp = Math.floor(Date.now() / 1000) + SEVEN_DAYS_SECONDS;
        return ok(buildShare(t.portal, view.id, t.workspaceId, t.userId, exp, view.shareVersion));
    } catch (e) {
        return handleRouteError("GET /api/saved-views/share", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<z.infer<typeof postSchema>>(postSchema as never, request);
        const view = await authorizeView(t, body.id);
        await t.db
            .update(savedViews)
            .set({ shareVersion: view.shareVersion + 1 })
            .where(and(eq(savedViews.id, view.id), eq(savedViews.workspaceId, t.workspaceId)));
        return ok(
            buildShare(
                t.portal,
                view.id,
                t.workspaceId,
                t.userId,
                REVOKED_EXP,
                view.shareVersion + 1,
            ),
        );
    } catch (e) {
        return handleRouteError("POST /api/saved-views/share", e);
    }
}
