import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { memberDues } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const actionSchema = z.object({ action: z.enum(["pay", "waive"]) });
type ActionInput = z.infer<typeof actionSchema>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const id = requireUuid((await params).id);
        const body = await parseBody<ActionInput>(actionSchema as never, request);
        const due = await t.db.query.memberDues.findFirst({
            where: and(eq(memberDues.id, id), eq(memberDues.workspaceId, t.workspaceId)),
        });
        if (!due) throw new ApiError("Due not found", 404);
        if (body.action === "pay") {
            const canManage = t.permissions.includes("manage_dues");
            if (due.userId !== t.userId && !canManage) throw new ApiError("Forbidden", 403);
            if (due.status === "paid") throw new ApiError("Due is already paid", 409);
            const [updated] = await t.db
                .update(memberDues)
                .set({ status: "paid", paidAt: new Date() })
                .where(eq(memberDues.id, id))
                .returning();
            await emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "paid",
                entityType: "member_due",
                entityId: id,
                metadata: { title: due.title, amountCents: due.amountCents },
                ipAddress: clientIp(request),
            });
            return ok(updated);
        }
        if (!t.permissions.includes("manage_dues")) throw new ApiError("Forbidden", 403);
        if (due.status === "waived") throw new ApiError("Due is already waived", 409);
        const [updated] = await t.db
            .update(memberDues)
            .set({ status: "waived" })
            .where(eq(memberDues.id, id))
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "waived",
            entityType: "member_due",
            entityId: id,
            metadata: { title: due.title, amountCents: due.amountCents },
            ipAddress: clientIp(request),
        });
        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/dues/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_dues", module: "finance" });
        const id = requireUuid((await params).id);
        const due = await t.db.query.memberDues.findFirst({
            where: and(eq(memberDues.id, id), eq(memberDues.workspaceId, t.workspaceId)),
            columns: { id: true, title: true },
        });
        if (!due) throw new ApiError("Due not found", 404);
        await Promise.all([
            t.db.delete(memberDues).where(eq(memberDues.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "member_due",
                entityId: id,
                metadata: { title: due.title },
                ipAddress: clientIp(request),
            }),
        ]);
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/dues/[id]", e);
    }
}
