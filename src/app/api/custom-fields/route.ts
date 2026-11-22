import { NextRequest } from "next/server";
import { and, asc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { customFieldDefs } from "@/db/schema";
import {
    decodeCursorValues,
    encodeCursorValues,
    fail,
    handleRouteError,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { isFeatureEnabled } from "@/lib/deployment";
import { requireTenant } from "@/lib/tenant";

const createDefSchema = z.object({
    entityType: z.string().trim().min(1).max(64),
    key: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(/^[a-zA-Z0-9_]+$/),
    label: z.string().trim().min(1).max(128),
    fieldType: z.enum(["text", "number", "date", "select", "boolean"]),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).max(50).optional(),
    position: z.number().int().min(0).optional(),
});
type CreateDefInput = z.infer<typeof createDefSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        if (!isFeatureEnabled(t.portal, "custom_fields")) return fail("Forbidden", 403);
        const entityType = new URL(request.url).searchParams.get("entityType");
        const { limit, cursor } = parsePagination(request.nextUrl.searchParams);
        const vals = decodeCursorValues(cursor);
        const after =
            vals && typeof vals[0] === "number" && typeof vals[1] === "string"
                ? gt(customFieldDefs.position, vals[0])
                : undefined;
        const rows = await t.db.query.customFieldDefs.findMany({
            where: and(
                entityType
                    ? and(
                          eq(customFieldDefs.workspaceId, t.workspaceId),
                          eq(customFieldDefs.entityType, entityType),
                      )
                    : eq(customFieldDefs.workspaceId, t.workspaceId),
                after,
            ),
            orderBy: [asc(customFieldDefs.position), asc(customFieldDefs.label)],
            limit: limit + 1,
        });
        const items = rows.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last ? encodeCursorValues([last.position, last.label]) : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/custom-fields", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_custom_fields",
            module: "members",
        });
        if (!isFeatureEnabled(t.portal, "custom_fields")) return fail("Forbidden", 403);
        const body = await parseBody<CreateDefInput>(createDefSchema as never, request);
        const [row] = await t.db
            .insert(customFieldDefs)
            .values({
                workspaceId: t.workspaceId,
                entityType: body.entityType,
                key: body.key,
                label: body.label,
                fieldType: body.fieldType,
                required: body.required ?? false,
                options: body.options ?? [],
                position: body.position ?? 0,
            })
            .returning();
        return ok(row, 201);
    } catch (e) {
        return handleRouteError("POST /api/custom-fields", e);
    }
}
