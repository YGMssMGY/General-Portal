import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { proposals } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

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

const updateProposalSchema = z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
});

const scoped = (id: string, workspaceId: string) =>
    and(eq(proposals.id, id), eq(proposals.workspaceId, workspaceId), isNull(proposals.deletedAt));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const id = requireUuid((await params).id);
        const proposal = await t.db.query.proposals.findFirst({
            where: scoped(id, t.workspaceId),
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
            },
        });
        if (!proposal) throw new ApiError("Proposal not found", 404);
        return ok(proposal);
    } catch (e) {
        return handleRouteError("GET /api/proposals/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.proposals.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Proposal not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("approve_proposal")) {
            throw new ApiError("Forbidden", 403);
        }

        const body = await parse(updateProposalSchema, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);

        const set: Partial<typeof proposals.$inferInsert> = { updatedAt: new Date() };
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;

        const updated = await t.db
            .update(proposals)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const proposal = updated[0];
        if (!proposal) throw new ApiError("Proposal not found", 404);

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "proposal",
                entityId: id,
                metadata: { changes: body },
                ipAddress: clientIp(request),
            },
            t.db,
        );

        return ok(proposal);
    } catch (e) {
        return handleRouteError("PUT /api/proposals/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.proposals.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Proposal not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("approve_proposal")) {
            throw new ApiError("Forbidden", 403);
        }

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        if (permanent && t.roleName === "admin") {
            await t.db
                .delete(proposals)
                .where(and(eq(proposals.id, id), eq(proposals.workspaceId, t.workspaceId)));
        } else {
            await t.db
                .update(proposals)
                .set({ deletedAt: new Date() })
                .where(scoped(id, t.workspaceId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "proposal",
                entityId: id,
                metadata: { title: existing.title },
                ipAddress: clientIp(request),
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/proposals/[id]", e);
    }
}
