import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { PortalDb } from "@/db/client";
import { approvals, events, proposals } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";
import { resolveStageApprover, stageDueAt } from "../route";

const decisionSchema = z.object({
    decision: z.enum(["approved", "rejected"]),
    comment: z.string().max(2000).nullable().optional(),
});
type DecisionInput = z.infer<typeof decisionSchema>;

type Stage = {
    name: string;
    approverRoleId?: string;
    approverId?: string;
    slaHours?: number;
    escalationRoleId?: string;
};

async function markEntity(
    db: PortalDb,
    workspaceId: string,
    entityType: string,
    entityId: string,
    verdict: "approved" | "rejected",
): Promise<void> {
    if (entityType === "event") {
        await db
            .update(events)
            .set({ approvalStatus: verdict, updatedAt: new Date() })
            .where(
                and(
                    eq(events.id, entityId),
                    eq(events.workspaceId, workspaceId),
                    isNull(events.deletedAt),
                ),
            );
    } else if (entityType === "proposal") {
        await db
            .update(proposals)
            .set({ status: verdict, updatedAt: new Date() })
            .where(
                and(
                    eq(proposals.id, entityId),
                    eq(proposals.workspaceId, workspaceId),
                    isNull(proposals.deletedAt),
                ),
            );
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id } = await params;
        requireUuid(id);

        const approval = await t.db.query.approvals.findFirst({
            where: and(eq(approvals.id, id), eq(approvals.workspaceId, t.workspaceId)),
            with: { workflow: true },
        });
        if (!approval) throw new ApiError("Approval not found", 404);
        if (approval.approverId !== t.userId && !t.permissions.includes("manage_workflows")) {
            throw new ApiError("Forbidden", 403);
        }
        if (approval.status !== "pending") throw new ApiError("Approval already decided", 400);

        const body = await parseBody<DecisionInput>(decisionSchema as never, request);
        const now = new Date();
        const ipAddress = clientIp(request);
        const verdict = body.decision;

        const result = await t.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(approvals)
                .set({ status: verdict, comment: body.comment ?? null, decidedAt: now })
                .where(and(eq(approvals.id, id), eq(approvals.status, "pending")))
                .returning();
            if (!updated) throw new ApiError("Approval already decided", 400);

            if (verdict === "rejected") {
                await markEntity(
                    tx,
                    t.workspaceId,
                    approval.entityType,
                    approval.entityId,
                    verdict,
                );
                await emitSideEffects(tx, {
                    workspaceId: t.workspaceId,
                    userId: t.userId,
                    action: "reject",
                    entityType: "approval",
                    entityId: id,
                    metadata: { entityType: approval.entityType, entityId: approval.entityId },
                    ipAddress,
                });
                return { updated };
            }

            const stages = (approval.workflow?.stages ?? []) as Stage[];
            const nextIndex = approval.stageIndex + 1;
            if (approval.workflow && nextIndex < stages.length) {
                const next = stages[nextIndex];
                const approverId = await resolveStageApprover(tx, t.workspaceId, next);
                const nextId = randomUUID();
                await tx.insert(approvals).values({
                    id: nextId,
                    workspaceId: t.workspaceId,
                    workflowId: approval.workflowId,
                    entityType: approval.entityType,
                    entityId: approval.entityId,
                    stageIndex: nextIndex,
                    approverId,
                    dueAt: stageDueAt(next),
                });
                await emitSideEffects(tx, {
                    workspaceId: t.workspaceId,
                    userId: t.userId,
                    action: "approve",
                    entityType: "approval",
                    entityId: id,
                    metadata: {
                        entityType: approval.entityType,
                        entityId: approval.entityId,
                        advancedTo: nextIndex,
                    },
                    ipAddress,
                });
                return { updated, nextApprovalId: nextId };
            }

            await markEntity(tx, t.workspaceId, approval.entityType, approval.entityId, verdict);
            await emitSideEffects(tx, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "approve",
                entityType: "approval",
                entityId: id,
                metadata: {
                    entityType: approval.entityType,
                    entityId: approval.entityId,
                    completed: true,
                },
                ipAddress,
            });
            return { updated };
        });

        return result.nextApprovalId
            ? ok({ ...result.updated, nextApprovalId: result.nextApprovalId })
            : ok(result.updated);
    } catch (e) {
        return handleRouteError("POST /api/approvals/[id]", e);
    }
}
