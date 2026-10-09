import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { cooperationRequests } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";
import { writeAuditLog } from "@/lib/audit";

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

const COOPERATION_STATUSES = ["pending", "under_review", "approved", "rejected"] as const;
const statusSchema = z.object({ status: z.enum(COOPERATION_STATUSES) });

const withAliases = <
    T extends { contactEmail: string; submittedBy: { id: string; name: string | null } | null },
>(
    r: T,
) => ({
    ...r,
    email: r.contactEmail,
    createdBy: r.submittedBy ? { id: r.submittedBy.id, name: r.submittedBy.name } : null,
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "partnerships" });
        const { id } = await params;
        const requestId = requireUuid(id);

        const row = await t.db.query.cooperationRequests.findFirst({
            where: and(
                eq(cooperationRequests.id, requestId),
                eq(cooperationRequests.workspaceId, t.workspaceId),
                isNull(cooperationRequests.deletedAt),
            ),
            with: {
                submittedBy: { columns: { id: true, name: true, email: true, image: true } },
                reviewedBy: { columns: { id: true, name: true, image: true } },
            },
        });
        if (!row) throw new ApiError("Cooperation request not found", 404);

        return ok(withAliases(row));
    } catch (e) {
        return handleRouteError("GET /api/cooperation/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_partnerships",
            module: "partnerships",
        });
        const { id } = await params;
        const requestId = requireUuid(id);
        const data = await parseBody(body(statusSchema), request);

        const existing = await t.db.query.cooperationRequests.findFirst({
            where: and(
                eq(cooperationRequests.id, requestId),
                eq(cooperationRequests.workspaceId, t.workspaceId),
                isNull(cooperationRequests.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Cooperation request not found", 404);

        const [updated] = await t.db
            .update(cooperationRequests)
            .set({ status: data.status, reviewedById: t.userId, updatedAt: new Date() })
            .where(eq(cooperationRequests.id, requestId))
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "reviewed",
            entityType: "cooperation_request",
            entityId: requestId,
            metadata: { status: data.status, previousStatus: existing.status },
            ipAddress: clientIp(request),
        });

        return ok(withAliases({ ...updated, submittedBy: null, reviewedBy: null }));
    } catch (e) {
        return handleRouteError("PUT /api/cooperation/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "partnerships" });
        const { id } = await params;
        const requestId = requireUuid(id);

        const existing = await t.db.query.cooperationRequests.findFirst({
            where: and(
                eq(cooperationRequests.id, requestId),
                eq(cooperationRequests.workspaceId, t.workspaceId),
                isNull(cooperationRequests.deletedAt),
            ),
            columns: { id: true, clubName: true, submittedById: true },
        });
        if (!existing) throw new ApiError("Cooperation request not found", 404);

        if (existing.submittedById !== t.userId && !t.permissions.includes("manage_partnerships")) {
            throw new ApiError("Only the submitter or a manager can delete this request", 403);
        }

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            await t.db.delete(cooperationRequests).where(eq(cooperationRequests.id, requestId));
        } else {
            await t.db
                .update(cooperationRequests)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(cooperationRequests.id, requestId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "cooperation_request",
                entityId: requestId,
                metadata: { clubName: existing.clubName },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/cooperation/[id]", e);
    }
}
