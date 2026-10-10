import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { PortalDb } from "@/db/client";
import { approvals, events, memberships, meetings, proposals, tasks, workflows } from "@/db/schema";
import {
    ApiError,
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

type Stage = {
    name: string;
    approverRoleId?: string;
    approverId?: string;
    slaHours?: number;
    escalationRoleId?: string;
};

const createApprovalSchema = z.object({
    entityType: z.string().trim().min(1),
    entityId: z.string().min(1),
    workflowId: z.string().uuid().nullable().optional(),
});
type CreateApprovalInput = z.infer<typeof createApprovalSchema>;

export async function resolveStageApprover(
    db: PortalDb,
    workspaceId: string,
    stage: Stage,
): Promise<string | null> {
    if (stage.approverId) return stage.approverId;
    if (!stage.approverRoleId) return null;
    const m = await db.query.memberships.findFirst({
        where: and(
            eq(memberships.workspaceId, workspaceId),
            eq(memberships.roleId, stage.approverRoleId),
        ),
        columns: { userId: true },
    });
    return m?.userId ?? null;
}

export function stageDueAt(stage: Stage): Date | null {
    if (!stage.slaHours || stage.slaHours <= 0) return null;
    return new Date(Date.now() + stage.slaHours * 3_600_000);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [
            eq(approvals.workspaceId, t.workspaceId),
            eq(approvals.approverId, t.userId),
            eq(approvals.status, "pending"),
        ];
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: approvals.createdAt, value: at }],
                        approvals.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.approvals.findMany({
            where: and(...conds),
            orderBy: [desc(approvals.createdAt), desc(approvals.id)],
            limit: limit + 1,
            with: {
                workflow: true,
                approver: { columns: { id: true, name: true, email: true, image: true } },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const byType = new Map<string, string[]>();
        for (const r of rows) {
            const list = byType.get(r.entityType) ?? [];
            list.push(r.entityId);
            byType.set(r.entityType, list);
        }
        const titles = new Map<string, string>();
        await Promise.all(
            [...byType.entries()].map(async ([type, ids]) => {
                if (type === "event") {
                    const found = await t.db.query.events.findMany({
                        where: and(eq(events.workspaceId, t.workspaceId), inArray(events.id, ids)),
                        columns: { id: true, title: true },
                    });
                    for (const f of found) titles.set(`event:${f.id}`, f.title);
                } else if (type === "proposal") {
                    const found = await t.db.query.proposals.findMany({
                        where: and(
                            eq(proposals.workspaceId, t.workspaceId),
                            inArray(proposals.id, ids),
                        ),
                        columns: { id: true, title: true },
                    });
                    for (const f of found) titles.set(`proposal:${f.id}`, f.title);
                } else if (type === "task") {
                    const found = await t.db.query.tasks.findMany({
                        where: and(eq(tasks.workspaceId, t.workspaceId), inArray(tasks.id, ids)),
                        columns: { id: true, title: true },
                    });
                    for (const f of found) titles.set(`task:${f.id}`, f.title);
                } else if (type === "meeting") {
                    const found = await t.db.query.meetings.findMany({
                        where: and(
                            eq(meetings.workspaceId, t.workspaceId),
                            inArray(meetings.id, ids),
                        ),
                        columns: { id: true, title: true },
                    });
                    for (const f of found) titles.set(`meeting:${f.id}`, f.title);
                }
            }),
        );

        const items = rows.map((r) => ({
            ...r,
            entity: {
                type: r.entityType,
                id: r.entityId,
                title: titles.get(`${r.entityType}:${r.entityId}`) ?? null,
            },
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/approvals", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<CreateApprovalInput>(createApprovalSchema as never, request);

        const workflow = body.workflowId
            ? await t.db.query.workflows.findFirst({
                  where: and(
                      eq(workflows.id, body.workflowId),
                      eq(workflows.workspaceId, t.workspaceId),
                  ),
              })
            : await t.db.query.workflows.findFirst({
                  where: and(
                      eq(workflows.workspaceId, t.workspaceId),
                      eq(workflows.entityType, body.entityType),
                      eq(workflows.isActive, true),
                  ),
              });
        if (!workflow) throw new ApiError("No workflow configured for this entity type", 400);
        if (workflow.entityType !== body.entityType)
            throw new ApiError("Workflow does not apply to this entity type", 400);
        const stages = (workflow.stages ?? []) as Stage[];
        if (stages.length === 0) throw new ApiError("Workflow has no stages", 400);

        const stage = stages[0];
        const approverId = await resolveStageApprover(t.db, t.workspaceId, stage);
        const id = randomUUID();
        const [[created]] = await Promise.all([
            t.db
                .insert(approvals)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    workflowId: workflow.id,
                    entityType: body.entityType,
                    entityId: body.entityId,
                    stageIndex: 0,
                    approverId,
                    dueAt: stageDueAt(stage),
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "submit",
                entityType: "approval",
                entityId: id,
                metadata: {
                    entityType: body.entityType,
                    entityId: body.entityId,
                    workflowId: workflow.id,
                },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/approvals", e);
    }
}
