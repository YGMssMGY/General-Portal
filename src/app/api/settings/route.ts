import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { workspaces } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        return ok({
            id: t.workspace.id,
            name: t.workspace.name,
            description: t.workspace.description,
            logoUrl: t.workspace.logoUrl,
            settings: t.workspace.settings ?? {},
        });
    } catch (e) {
        return handleRouteError("GET /api/settings", e);
    }
}

const updateSettingsSchema = z.object({
    name: z.string().trim().min(1).max(200).nullish(),
    description: z.string().trim().max(2000).nullish(),
    logoUrl: z.string().trim().max(2000).nullish(),
    settings: z
        .record(z.string(), z.boolean())
        .refine((v) => Object.keys(v).length <= 50, { message: "Too many settings keys (max 50)" })
        .nullish(),
});
type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_settings" });
        const body = await parseBody<UpdateSettingsInput>(updateSettingsSchema as never, request);

        const patch: {
            name?: string;
            description?: string | null;
            logoUrl?: string | null;
            settings?: Record<string, boolean>;
        } = {};
        if (body.name) patch.name = body.name;
        if (body.description !== undefined) patch.description = body.description;
        if (body.logoUrl !== undefined) patch.logoUrl = body.logoUrl;
        if (body.settings !== undefined && body.settings !== null) patch.settings = body.settings;

        const [updated] = await t.db
            .update(workspaces)
            .set({ ...patch, updatedAt: new Date() })
            .where(eq(workspaces.id, t.workspaceId))
            .returning();
        if (!updated) throw new ApiError("Workspace not found", 404);

        return ok({
            id: updated.id,
            name: updated.name,
            description: updated.description,
            logoUrl: updated.logoUrl,
            settings: updated.settings ?? {},
        });
    } catch (e) {
        return handleRouteError("PUT /api/settings", e);
    }
}
