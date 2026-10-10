import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { webhooks } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const createWebhookSchema = z.object({
    name: z.string().trim().min(1).max(128),
    url: z
        .string()
        .trim()
        .url()
        .refine((u) => u.startsWith("https://"), "URL must use https"),
    secret: z.string().max(256).nullish(),
    events: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
    active: z.boolean().optional(),
});
type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_webhooks",
            module: "members",
        });
        const rows = await t.db.query.webhooks.findMany({
            where: eq(webhooks.workspaceId, t.workspaceId),
            orderBy: [desc(webhooks.createdAt)],
        });
        return ok(rows.map((r) => ({ ...r, secret: r.secret ? "••••••" : null })));
    } catch (e) {
        return handleRouteError("GET /api/webhooks", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_webhooks",
            module: "members",
        });
        const body = await parseBody<CreateWebhookInput>(createWebhookSchema as never, request);
        const [row] = await t.db
            .insert(webhooks)
            .values({
                workspaceId: t.workspaceId,
                name: body.name,
                url: body.url,
                secret: body.secret ?? null,
                events: body.events,
                active: body.active ?? true,
            })
            .returning();
        if (!row) throw new ApiError("Failed to create webhook", 500);
        return ok({ ...row, secret: row.secret ? "••••••" : null }, 201);
    } catch (e) {
        return handleRouteError("POST /api/webhooks", e);
    }
}
