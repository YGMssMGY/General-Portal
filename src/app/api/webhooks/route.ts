import { NextRequest } from "next/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";
import { webhooks } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { isUrlSafe } from "@/lib/ssrf";
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
        const { limit, cursor } = parsePagination(request.nextUrl.searchParams);
        const vals = decodeCursorValues(cursor);
        const cursorCond =
            vals && typeof vals[0] === "string" && typeof vals[1] === "string"
                ? or(
                      lt(webhooks.createdAt, new Date(vals[0])),
                      and(eq(webhooks.createdAt, new Date(vals[0])), lt(webhooks.id, vals[1])),
                  )
                : undefined;
        const rows = await t.db.query.webhooks.findMany({
            where: and(eq(webhooks.workspaceId, t.workspaceId), cursorCond),
            orderBy: [desc(webhooks.createdAt), desc(webhooks.id)],
            limit: limit + 1,
        });
        const items = rows.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok(items.map((r) => ({ ...r, secret: r.secret ? "••••••" : null })));
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
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
        if (!(await isUrlSafe(body.url))) throw new ApiError("Webhook URL is not allowed", 400);
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
