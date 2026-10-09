import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { showcaseItems } from "@/db/schema";
import { handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

function body<T>(schema: {
    safeParse: (
        v: unknown,
    ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}) {
    return {
        safeParse: (v: unknown) => {
            const r = schema.safeParse(v);
            if (r.success) return { success: true as const, data: r.data };
            return {
                success: false as const,
                error: {
                    issues: r.error.issues.map((i) => ({
                        path: i.path.filter(
                            (p): p is string | number =>
                                typeof p === "string" || typeof p === "number",
                        ),
                        message: i.message,
                    })),
                },
            };
        },
    };
}

const reorderSchema = z.object({
    items: z
        .array(z.object({ id: z.uuid(), sortOrder: z.number().int().min(0).max(1000000) }))
        .min(1)
        .max(500),
});

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_showcase",
            module: "members",
        });
        const data = await parseBody(body(reorderSchema), request);

        await t.db.transaction(async (tx) => {
            for (const item of data.items) {
                await tx
                    .update(showcaseItems)
                    .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
                    .where(
                        and(
                            eq(showcaseItems.id, item.id),
                            eq(showcaseItems.workspaceId, t.workspaceId),
                            isNull(showcaseItems.deletedAt),
                        ),
                    );
            }
        });

        return ok({ reordered: true });
    } catch (e) {
        return handleRouteError("PUT /api/showcase/reorder", e);
    }
}
