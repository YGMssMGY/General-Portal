import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { proposalTemplates } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

type BodySchema<T> = {
    safeParse: (v: unknown) =>
        | { success: true; data: T }
        | {
              success: false;
              error: { issues: Array<{ path: (string | number)[]; message: string }> };
          };
};

async function parse<T>(schema: z.ZodType<T>, request: NextRequest): Promise<T> {
    return parseBody(schema as unknown as BodySchema<T>, request);
}

const updateTemplateSchema = z.object({
    title: z.string().trim().min(1, "Title must be a non-empty string").optional(),
    description: z.string().trim().min(1, "Description must be a non-empty string").optional(),
    category: z.string().trim().nullable().optional(),
});

const scoped = (id: string, workspaceId: string) =>
    and(
        eq(proposalTemplates.id, id),
        eq(proposalTemplates.workspaceId, workspaceId),
        isNull(proposalTemplates.deletedAt),
    );

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const id = requireUuid((await params).id);
        const template = await t.db.query.proposalTemplates.findFirst({
            where: scoped(id, t.workspaceId),
            with: {
                createdBy: { columns: { id: true, name: true, image: true } },
            },
        });
        if (!template) throw new ApiError("Template not found", 404);
        return ok(template);
    } catch (e) {
        return handleRouteError("GET /api/proposals/templates/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "approve_proposal",
            module: "proposals",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.proposalTemplates.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Template not found", 404);

        const body = await parse(updateTemplateSchema, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);

        const set: Partial<typeof proposalTemplates.$inferInsert> = { updatedAt: new Date() };
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;
        if (body.category !== undefined) set.category = body.category;

        const updated = await t.db
            .update(proposalTemplates)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const template = updated[0];
        if (!template) throw new ApiError("Template not found", 404);
        return ok(template);
    } catch (e) {
        return handleRouteError("PUT /api/proposals/templates/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "approve_proposal",
            module: "proposals",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.proposalTemplates.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Template not found", 404);

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        if (permanent && t.roleName === "admin") {
            await t.db
                .delete(proposalTemplates)
                .where(
                    and(
                        eq(proposalTemplates.id, id),
                        eq(proposalTemplates.workspaceId, t.workspaceId),
                    ),
                );
        } else {
            await t.db
                .update(proposalTemplates)
                .set({ deletedAt: new Date() })
                .where(scoped(id, t.workspaceId));
        }

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/proposals/templates/[id]", e);
    }
}
