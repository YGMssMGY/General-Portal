import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { customFieldDefs } from "@/db/schema";
import { handleRouteError, ok, parseBody } from "@/lib/api";
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
        const entityType = new URL(request.url).searchParams.get("entityType");
        const rows = await t.db.query.customFieldDefs.findMany({
            where: entityType
                ? and(
                      eq(customFieldDefs.workspaceId, t.workspaceId),
                      eq(customFieldDefs.entityType, entityType),
                  )
                : eq(customFieldDefs.workspaceId, t.workspaceId),
            orderBy: [asc(customFieldDefs.position), asc(customFieldDefs.label)],
        });
        return ok(rows);
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
